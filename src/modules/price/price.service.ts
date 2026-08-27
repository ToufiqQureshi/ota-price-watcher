import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomPriceEntity } from '../../database/entities/room-price.entity';
import { HotelSessionEntity } from '../../database/entities/hotel-session.entity';
import { EngineService } from '../engine/engine.service';
import { SessionService } from '../session/session.service';
import { WebhookService } from '../webhook/webhook.service';

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);

  constructor(
    @InjectRepository(RoomPriceEntity)
    private readonly prices: Repository<RoomPriceEntity>,
    private readonly engine: EngineService,
    private readonly sessionService: SessionService,
    private readonly webhookService: WebhookService,
  ) {}

  async latestForSession(sessionId: string): Promise<RoomPriceEntity[]> {
    // Latest snapshot per (roomType, stayDate) — good enough at sqlite/single-hotel scale;
    // move to a proper "current price" table with upserts if this needs to scale to many hotels.
    const all = await this.prices.find({
      where: { hotelSessionId: sessionId },
      order: { scrapedAt: 'DESC' },
    });
    const seen = new Set<string>();
    return all.filter((row) => {
      const key = `${row.roomType}::${row.stayDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** Scrapes current prices, diffs against the last known snapshot, persists, and fires
   *  webhooks for anything that changed. Called on a poll interval and on-demand refresh. */
  async refresh(session: HotelSessionEntity): Promise<RoomPriceEntity[]> {
    const previous = await this.latestForSession(session.id);
    const previousByKey = new Map(previous.map((p) => [`${p.roomType}::${p.stayDate}`, p]));

    const siteConfig = this.sessionService.parseSiteConfig(session);
    const scraped = await this.engine.scrapePrices(session.id, session.siteType, siteConfig);
    const saved: RoomPriceEntity[] = [];

    for (const room of scraped) {
      const key = `${room.roomType}::${room.stayDate}`;
      const prior = previousByKey.get(key);
      const changed = !prior || prior.price !== room.price || prior.soldOut !== room.soldOut;

      const entity = this.prices.create({
        hotelSessionId: session.id,
        roomType: room.roomType,
        stayDate: room.stayDate,
        price: room.price,
        soldOut: room.soldOut,
      });
      saved.push(await this.prices.save(entity));

      if (changed) {
        await this.webhookService.dispatch({
          hotelSessionId: session.id,
          roomType: room.roomType,
          stayDate: room.stayDate,
          previousPrice: prior?.price ?? null,
          price: room.price,
          soldOut: room.soldOut,
          changedAt: new Date().toISOString(),
        });
      }
    }

    return saved;
  }
}

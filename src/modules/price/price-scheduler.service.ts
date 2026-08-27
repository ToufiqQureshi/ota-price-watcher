import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotelSessionEntity } from '../../database/entities/hotel-session.entity';
import { PriceService } from './price.service';

@Injectable()
export class PriceSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriceSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private polling = false;

  constructor(
    @InjectRepository(HotelSessionEntity)
    private readonly sessions: Repository<HotelSessionEntity>,
    private readonly priceService: PriceService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.config.get<number>('pollIntervalMs')!;
    this.timer = setInterval(() => void this.pollActiveSessions(), intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async pollActiveSessions(): Promise<void> {
    // Skip overlapping runs — a slow scrape (or many hotels) should never stack polls.
    if (this.polling) return;
    this.polling = true;

    try {
      const activeSessions = await this.sessions.find({ where: { status: 'active' } });
      for (const session of activeSessions) {
        try {
          await this.priceService.refresh(session);
          session.lastPolledAt = new Date();
          session.lastError = null;
        } catch (err) {
          session.lastError = (err as Error).message;
          this.logger.warn(`Poll failed for session ${session.id}: ${session.lastError}`);
        }
        await this.sessions.save(session);
      }
    } finally {
      this.polling = false;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { WebhookConfigEntity } from '../../database/entities/webhook-config.entity';
import { signWebhookPayload } from '../../common/webhook-signer.util';
import { ConfigureWebhookDto } from './dto/configure-webhook.dto';

export interface PriceChangeEvent {
  hotelSessionId: string;
  roomType: string;
  stayDate: string;
  previousPrice: number | null;
  price: number;
  soldOut: boolean;
  changedAt: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(WebhookConfigEntity)
    private readonly configs: Repository<WebhookConfigEntity>,
    private readonly config: ConfigService,
  ) {}

  async configure(hotelSessionId: string, dto: ConfigureWebhookDto): Promise<WebhookConfigEntity> {
    let webhook = await this.configs.findOne({ where: { hotelSessionId } });
    if (!webhook) {
      webhook = this.configs.create({ hotelSessionId });
    }
    webhook.targetUrl = dto.targetUrl;
    webhook.secret = dto.secret;
    webhook.enabled = dto.enabled ?? true;
    return this.configs.save(webhook);
  }

  async dispatch(event: PriceChangeEvent): Promise<void> {
    const webhook = await this.configs.findOne({
      where: { hotelSessionId: event.hotelSessionId, enabled: true },
    });
    if (!webhook) return;

    const payload = JSON.stringify(event);
    const signature = signWebhookPayload(payload, webhook.secret);
    const signingHeader = this.config.get<string>('webhookSigningHeader')!;

    try {
      await axios.post(webhook.targetUrl, payload, {
        headers: { 'Content-Type': 'application/json', [signingHeader]: signature },
        timeout: 5000,
      });
    } catch (err) {
      this.logger.warn(
        `Webhook dispatch failed for session ${event.hotelSessionId}: ${(err as Error).message}`,
      );
    }
  }
}

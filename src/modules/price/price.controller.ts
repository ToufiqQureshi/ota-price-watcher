import { Controller, Get, Param, Post } from '@nestjs/common';
import { PriceService } from './price.service';
import { SessionService } from '../session/session.service';

@Controller('sessions/:sessionId')
export class PriceController {
  constructor(
    private readonly priceService: PriceService,
    private readonly sessionService: SessionService,
  ) {}

  @Get('prices')
  async getPrices(@Param('sessionId') sessionId: string) {
    return this.priceService.latestForSession(sessionId);
  }

  @Post('refresh')
  async refresh(@Param('sessionId') sessionId: string) {
    const session = await this.sessionService.findOrThrow(sessionId);
    return this.priceService.refresh(session);
  }
}

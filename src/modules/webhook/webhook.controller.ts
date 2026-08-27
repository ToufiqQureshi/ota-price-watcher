import { Body, Controller, Param, Put } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { ConfigureWebhookDto } from './dto/configure-webhook.dto';

@Controller('sessions/:sessionId/webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Put()
  configure(@Param('sessionId') sessionId: string, @Body() dto: ConfigureWebhookDto) {
    return this.webhookService.configure(sessionId, dto);
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { EngineModule } from './modules/engine/engine.module';
import { SessionModule } from './modules/session/session.module';
import { PriceModule } from './modules/price/price.module';
import { WebhookModule } from './modules/webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    EngineModule,
    SessionModule,
    PriceModule,
    WebhookModule,
  ],
})
export class AppModule {}

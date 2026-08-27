import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoomPriceEntity } from '../../database/entities/room-price.entity';
import { HotelSessionEntity } from '../../database/entities/hotel-session.entity';
import { EngineModule } from '../engine/engine.module';
import { SessionModule } from '../session/session.module';
import { WebhookModule } from '../webhook/webhook.module';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';
import { PriceSchedulerService } from './price-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomPriceEntity, HotelSessionEntity]),
    EngineModule,
    SessionModule,
    WebhookModule,
  ],
  controllers: [PriceController],
  providers: [PriceService, PriceSchedulerService],
})
export class PriceModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HotelSessionEntity } from './entities/hotel-session.entity';
import { RoomPriceEntity } from './entities/room-price.entity';
import { WebhookConfigEntity } from './entities/webhook-config.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'sqlite',
        database: config.get<string>('databasePath'),
        entities: [HotelSessionEntity, RoomPriceEntity, WebhookConfigEntity],
        synchronize: true, // fine for sqlite/single-node; swap for migrations before scaling out
      }),
    }),
  ],
})
export class DatabaseModule {}

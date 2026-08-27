import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('room_prices')
@Index(['hotelSessionId', 'roomType', 'stayDate'])
export class RoomPriceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hotelSessionId: string;

  @Column()
  roomType: string;

  @Column()
  stayDate: string; // YYYY-MM-DD

  @Column('float')
  price: number;

  @Column({ default: false })
  soldOut: boolean;

  @CreateDateColumn()
  scrapedAt: Date;
}

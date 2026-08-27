import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type HotelSessionStatus = 'pending_otp' | 'active' | 'expired' | 'login_failed';

@Entity('hotel_sessions')
export class HotelSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hotelName: string;

  @Column()
  gommtUsernameEncrypted: string;

  @Column()
  gommtPasswordEncrypted: string;

  @Column({ type: 'text', nullable: true })
  browserStateEncrypted: string | null;

  @Column({ default: 'pending_otp' })
  status: HotelSessionStatus;

  @Column({ nullable: true })
  lastLoginAt: Date | null;

  @Column({ nullable: true })
  lastPolledAt: Date | null;

  @Column({ nullable: true })
  lastError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

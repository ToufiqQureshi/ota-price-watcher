import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type HotelSessionStatus = 'pending_otp' | 'active' | 'expired' | 'login_failed';

/** One row = one property being watched on one site (GoMMT, Swiftbook, ...). */
@Entity('hotel_sessions')
export class HotelSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hotelName: string;

  /** Matches a registered SiteAdapter's siteType, e.g. "gommt" or "swiftbook". */
  @Column({ default: 'gommt' })
  siteType: string;

  /** Adapter-specific config (propertyId, roomIds, checkIn/checkOut, ...) as JSON. */
  @Column({ type: 'text', nullable: true })
  siteConfig: string | null;

  /** Only sites whose adapter has requiresLogin=true need these. */
  @Column({ type: 'text', nullable: true })
  usernameEncrypted: string | null;

  @Column({ type: 'text', nullable: true })
  passwordEncrypted: string | null;

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

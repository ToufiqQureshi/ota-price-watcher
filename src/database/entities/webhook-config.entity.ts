import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('webhook_configs')
export class WebhookConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  hotelSessionId: string;

  @Column()
  targetUrl: string;

  @Column()
  secret: string;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('exchange_rates')
@Unique('UQ_exchange_rate_currency_date', ['currency', 'date'])
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @Column({ length: 10 })
  currency: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'buy_rate', type: 'decimal', precision: 14, scale: 4, nullable: true })
  buyRate: number;

  @Column({ name: 'sell_rate', type: 'decimal', precision: 14, scale: 4, nullable: true })
  sellRate: number;

  @Column({ name: 'observed_rate', type: 'decimal', precision: 14, scale: 4 })
  observedRate: number;

  @Column({ length: 20, default: 'API' })
  source: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

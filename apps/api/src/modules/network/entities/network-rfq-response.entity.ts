import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NetworkRfq } from './network-rfq.entity';

@Entity('network_rfq_responses')
export class NetworkRfqResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rfq_id' })
  rfqId: string;

  @ManyToOne(() => NetworkRfq, (rfq) => rfq.responses)
  @JoinColumn({ name: 'rfq_id' })
  rfq: NetworkRfq;

  @Column({ name: 'responder_tenant_id' })
  responderTenantId: string;

  @Column({ type: 'jsonb', default: '[]' })
  items: any[];

  @Column({ name: 'total_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPrice: number;

  @Column({ name: 'delivery_days', default: 0 })
  deliveryDays: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ length: 30, default: 'pending' })
  status: string; // 'pending' | 'accepted' | 'rejected' | 'withdrawn'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NetworkTransaction } from './network-transaction.entity';

@Entity('network_ratings')
export class NetworkRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id' })
  transactionId: string;

  @ManyToOne(() => NetworkTransaction, (t) => t.ratings)
  @JoinColumn({ name: 'transaction_id' })
  transaction: NetworkTransaction;

  @Column({ name: 'rater_tenant_id' })
  raterTenantId: string;

  @Column({ name: 'rated_tenant_id' })
  ratedTenantId: string;

  @Column({ type: 'smallint' })
  score: number; // 1-5

  @Column({ name: 'delivery_score', type: 'smallint', nullable: true })
  deliveryScore: number;

  @Column({ name: 'quality_score', type: 'smallint', nullable: true })
  qualityScore: number;

  @Column({ name: 'communication_score', type: 'smallint', nullable: true })
  communicationScore: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

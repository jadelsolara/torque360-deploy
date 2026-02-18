import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { NetworkRfqResponse } from './network-rfq-response.entity';

@Entity('network_rfqs')
export class NetworkRfq {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'requester_tenant_id' })
  requesterTenantId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: '[]' })
  items: any[];

  @Column({ name: 'target_actor_types', type: 'varchar', array: true, default: '{}' })
  targetActorTypes: string[];

  @Column({ name: 'target_regions', type: 'varchar', array: true, default: '{}' })
  targetRegions: string[];

  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date | null;

  @Column({ length: 30, default: 'open' })
  status: string; // 'open' | 'closed' | 'cancelled' | 'awarded'

  @Column({ name: 'responses_count', default: 0 })
  responsesCount: number;

  @OneToMany(() => NetworkRfqResponse, (r) => r.rfq)
  responses: NetworkRfqResponse[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

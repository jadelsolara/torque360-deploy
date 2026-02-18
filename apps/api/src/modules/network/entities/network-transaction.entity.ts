import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { NetworkListing } from './network-listing.entity';
import { NetworkRfqResponse } from './network-rfq-response.entity';
import { NetworkRating } from './network-rating.entity';

@Entity('network_transactions')
export class NetworkTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'buyer_tenant_id' })
  buyerTenantId: string;

  @Column({ name: 'seller_tenant_id' })
  sellerTenantId: string;

  @Column({ name: 'listing_id', nullable: true })
  listingId: string | null;

  @ManyToOne(() => NetworkListing)
  @JoinColumn({ name: 'listing_id' })
  listing: NetworkListing;

  @Column({ name: 'rfq_response_id', nullable: true })
  rfqResponseId: string | null;

  @ManyToOne(() => NetworkRfqResponse)
  @JoinColumn({ name: 'rfq_response_id' })
  rfqResponse: NetworkRfqResponse;

  @Column({ type: 'jsonb', default: '[]' })
  items: any[];

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 4, default: 0.03 })
  commissionRate: number;

  @Column({ name: 'commission_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  commissionAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ length: 30, default: 'pending' })
  status: string; // 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'disputed'

  @OneToMany(() => NetworkRating, (r) => r.transaction)
  ratings: NetworkRating[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('network_listings')
export class NetworkListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'actor_type', length: 20 })
  actorType: string; // 'sstt' | 'dyp' | 'importador'

  @Column({ name: 'item_type', length: 20 })
  itemType: string; // 'part' | 'service' | 'import_offer'

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ length: 100, nullable: true })
  brand: string;

  @Column({ name: 'part_number', length: 100, nullable: true })
  partNumber: string;

  @Column({ name: 'oem_number', length: 100, nullable: true })
  oemNumber: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  price: number;

  @Column({ length: 3, default: 'CLP' })
  currency: string;

  @Column({ name: 'min_quantity', default: 1 })
  minQuantity: number;

  @Column({ name: 'stock_available', default: 0 })
  stockAvailable: number;

  @Column({ name: 'location_city', length: 100, nullable: true })
  locationCity: string;

  @Column({ name: 'location_region', length: 100, nullable: true })
  locationRegion: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'views_count', default: 0 })
  viewsCount: number;

  @Column({ name: 'inquiries_count', default: 0 })
  inquiriesCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

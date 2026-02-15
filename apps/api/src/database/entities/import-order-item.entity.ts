import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ImportOrder } from './import-order.entity';

@Entity('import_order_items')
export class ImportOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'import_order_id' })
  importOrderId: string;

  @ManyToOne(() => ImportOrder, (o) => o.items)
  @JoinColumn({ name: 'import_order_id' })
  importOrder: ImportOrder;

  // Legacy column alias
  @Column({ name: 'item_id', nullable: true })
  itemId: string;

  @Column({ length: 500 })
  description: string;

  @Column({ name: 'hs_code', length: 20, nullable: true })
  hsCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 4, comment: 'FOB unit price in USD' })
  unitPrice: number;

  // Legacy column kept for backward compatibility
  @Column({ name: 'total_price', type: 'decimal', precision: 14, scale: 2, nullable: true })
  totalPrice: number;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 2, nullable: true })
  weightKg: number;

  @Column({ name: 'volume_cbm', type: 'decimal', precision: 10, scale: 4, nullable: true })
  volumeCbm: number;

  // Legacy column kept for backward compatibility
  @Column({ name: 'landed_unit_cost', type: 'decimal', precision: 12, scale: 4, nullable: true })
  landedUnitCost: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

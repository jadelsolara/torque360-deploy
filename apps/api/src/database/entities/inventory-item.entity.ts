import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 100, nullable: true })
  sku: string;

  @Column({ length: 255 })
  name: string;

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

  @Column({ length: 20, default: 'unit' })
  unit: string;

  @Column({ name: 'cost_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  costPrice: number;

  @Column({ name: 'sell_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  sellPrice: number;

  @Column({ name: 'stock_quantity', type: 'decimal', precision: 10, scale: 2, default: 0 })
  stockQuantity: number;

  @Column({ name: 'min_stock', type: 'decimal', precision: 10, scale: 2, default: 0 })
  minStock: number;

  @Column({ length: 100, nullable: true })
  location: string;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

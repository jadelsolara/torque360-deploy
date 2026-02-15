import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'item_id' })
  itemId: string;

  @Column({ name: 'from_warehouse_id', nullable: true })
  fromWarehouseId: string;

  @Column({ name: 'from_location_id', nullable: true })
  fromLocationId: string;

  @Column({ name: 'to_warehouse_id', nullable: true })
  toWarehouseId: string;

  @Column({ name: 'to_location_id', nullable: true })
  toLocationId: string;

  @Column({ name: 'movement_type', length: 50 })
  movementType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ name: 'reference_type', length: 50, nullable: true })
  referenceType: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'performed_by', nullable: true })
  performedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

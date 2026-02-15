import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WorkOrder } from './work-order.entity';

@Entity('work_order_parts')
export class WorkOrderPart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'work_order_id' })
  workOrderId: string;

  @ManyToOne(() => WorkOrder, (wo) => wo.parts)
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @Column({ name: 'part_id', nullable: true })
  partId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'part_number', length: 100, nullable: true })
  partNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPrice: number;

  @Column({ name: 'is_oem', default: false })
  isOem: boolean;

  // ── Sales Pipeline dispatch tracking ──
  @Column({ name: 'inventory_item_id', nullable: true })
  inventoryItemId: string;

  @Column({ name: 'warehouse_location_id', nullable: true })
  warehouseLocationId: string;

  @Column({ name: 'is_dispatched', default: false })
  isDispatched: boolean;

  @Column({ name: 'dispatched_at', type: 'timestamptz', nullable: true })
  dispatchedAt: Date;

  @Column({ name: 'stock_movement_id', nullable: true })
  stockMovementId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

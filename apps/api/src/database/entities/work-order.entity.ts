import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { WorkOrderPart } from './work-order-part.entity';

@Entity('work_orders')
export class WorkOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'order_number', generated: 'increment' })
  orderNumber: number;

  @Column({ name: 'vehicle_id' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, (v) => v.workOrders)
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @Column({ length: 50, default: 'pending' })
  status: string; // pending, in_progress, completed, invoiced

  @Column({ length: 50, default: 'repair' })
  type: string;

  @Column({ length: 20, default: 'normal' })
  priority: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  diagnosis: string;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes: string;

  @Column({ name: 'estimated_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedHours: number;

  @Column({ name: 'actual_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualHours: number;

  @Column({ name: 'labor_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  laborCost: number;

  @Column({ name: 'parts_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  partsCost: number;

  @Column({ name: 'total_cost', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalCost: number;

  @OneToMany(() => WorkOrderPart, (p) => p.workOrder)
  parts: WorkOrderPart[];

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  // ── Sales Pipeline fields ──
  @Column({ name: 'quotation_id', nullable: true })
  quotationId: string;

  @Column({ name: 'invoice_id', nullable: true })
  invoiceId: string;

  @Column({ name: 'parts_dispatched', default: false })
  partsDispatched: boolean;

  @Column({ name: 'dispatched_at', type: 'timestamptz', nullable: true })
  dispatchedAt: Date;

  @Column({ name: 'dispatched_by', nullable: true })
  dispatchedBy: string;

  @Column({ name: 'invoiced_at', type: 'timestamptz', nullable: true })
  invoicedAt: Date;

  @Column({ name: 'invoiced_by', nullable: true })
  invoicedBy: string;

  @Column({ name: 'pipeline_stage', length: 50, default: 'work_order' })
  pipelineStage: string; // work_order, dispatched, invoiced

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

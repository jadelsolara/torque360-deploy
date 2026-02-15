import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('quotations')
export class Quotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'quote_number', generated: 'increment' })
  quoteNumber: number;

  @Column({ name: 'vehicle_id' })
  vehicleId: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ length: 50, default: 'draft' })
  status: string; // draft, sent, approved, converted, rejected

  @Column({ type: 'jsonb', default: [] })
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    inventoryItemId?: string;
  }>;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true })
  validUntil: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'work_order_id', nullable: true })
  workOrderId: string;

  @Column({ name: 'invoice_id', nullable: true })
  invoiceId: string;

  @Column({ name: 'pipeline_stage', length: 50, default: 'quotation' })
  pipelineStage: string; // quotation, work_order, dispatched, invoiced

  @Column({ name: 'converted_at', type: 'timestamptz', nullable: true })
  convertedAt: Date;

  @Column({ name: 'converted_by', nullable: true })
  convertedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupplierInvoiceItem } from './supplier-invoice-item.entity';
import { SupplierPayment } from './supplier-payment.entity';
import { Supplier } from './supplier.entity';

export type SupplierInvoiceType =
  | 'FACTURA_COMPRA'
  | 'NOTA_CREDITO_COMPRA'
  | 'NOTA_DEBITO_COMPRA'
  | 'BOLETA_COMPRA'
  | 'FACTURA_IMPORTACION';

export type SupplierInvoicePaymentCondition =
  | 'CONTADO'
  | '30_DIAS'
  | '60_DIAS'
  | '90_DIAS'
  | 'CUSTOM';

export type SupplierInvoiceStatus =
  | 'RECEIVED'
  | 'APPROVED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'DISPUTED'
  | 'VOIDED';

@Entity('supplier_invoices')
export class SupplierInvoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  // ── Supplier ──
  @Column({ name: 'supplier_id' })
  supplierId: string;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  // ── Invoice identification ──
  @Column({ name: 'invoice_number', length: 100 })
  invoiceNumber: string;

  @Column({
    name: 'invoice_type',
    length: 30,
    default: 'FACTURA_COMPRA',
  })
  invoiceType: SupplierInvoiceType;

  @Column({
    name: 'dte_type',
    type: 'smallint',
    nullable: true,
    comment: '46=factura compra, 56=nota debito, 61=nota credito',
  })
  dteType: number;

  // ── Dates ──
  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'reception_date', type: 'date', nullable: true })
  receptionDate: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string;

  // ── Amounts ──
  @Column({ name: 'monto_neto', type: 'decimal', precision: 14, scale: 2, default: 0 })
  montoNeto: number;

  @Column({ name: 'monto_exento', type: 'decimal', precision: 14, scale: 2, default: 0 })
  montoExento: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  iva: number;

  @Column({ name: 'monto_total', type: 'decimal', precision: 14, scale: 2, default: 0 })
  montoTotal: number;

  // ── Currency ──
  @Column({ length: 10, default: 'CLP' })
  currency: string;

  @Column({ name: 'exchange_rate', type: 'decimal', precision: 14, scale: 4, nullable: true })
  exchangeRate: number;

  @Column({ name: 'monto_total_clp', type: 'decimal', precision: 14, scale: 2, nullable: true })
  montoTotalClp: number;

  // ── Payment condition ──
  @Column({
    name: 'payment_condition',
    length: 20,
    default: 'CONTADO',
  })
  paymentCondition: SupplierInvoicePaymentCondition;

  // ── Status & balances ──
  @Column({ length: 20, default: 'RECEIVED' })
  status: SupplierInvoiceStatus;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ name: 'pending_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  pendingAmount: number;

  // ── Related orders ──
  @Column({ name: 'related_import_order_id', nullable: true })
  relatedImportOrderId: string;

  @Column({ name: 'related_purchase_order_id', nullable: true })
  relatedPurchaseOrderId: string;

  // ── SII ──
  @Column({ name: 'sii_track_id', length: 100, nullable: true })
  siiTrackId: string;

  // ── Metadata ──
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'document_url', length: 500, nullable: true })
  documentUrl: string;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  // ── Relations ──
  @OneToMany(() => SupplierInvoiceItem, (item) => item.supplierInvoice, { cascade: true })
  items: SupplierInvoiceItem[];

  @OneToMany(() => SupplierPayment, (p) => p.supplierInvoice)
  payments: SupplierPayment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

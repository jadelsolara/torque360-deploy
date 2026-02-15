import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { SupplierInvoice } from './supplier-invoice.entity';

export type SupplierPaymentMethod =
  | 'TRANSFERENCIA'
  | 'CHEQUE'
  | 'EFECTIVO'
  | 'TARJETA'
  | 'COMPENSACION'
  | 'LETRA';

export type SupplierPaymentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'BOUNCED'
  | 'VOIDED';

@Entity('supplier_payments')
export class SupplierPayment {
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

  // ── Invoice (nullable — can be a general payment) ──
  @Column({ name: 'supplier_invoice_id', nullable: true })
  supplierInvoiceId: string;

  @ManyToOne(() => SupplierInvoice, (inv) => inv.payments)
  @JoinColumn({ name: 'supplier_invoice_id' })
  supplierInvoice: SupplierInvoice;

  // ── Payment identification ──
  @Column({ name: 'payment_number', length: 20 })
  paymentNumber: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  // ── Amount ──
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ length: 10, default: 'CLP' })
  currency: string;

  @Column({ name: 'exchange_rate', type: 'decimal', precision: 14, scale: 4, nullable: true })
  exchangeRate: number;

  @Column({ name: 'amount_clp', type: 'decimal', precision: 14, scale: 2, nullable: true })
  amountClp: number;

  // ── Payment method ──
  @Column({ name: 'payment_method', length: 20, default: 'TRANSFERENCIA' })
  paymentMethod: SupplierPaymentMethod;

  // ── Bank details ──
  @Column({ name: 'bank_name', length: 100, nullable: true })
  bankName: string;

  @Column({ name: 'account_number', length: 50, nullable: true })
  accountNumber: string;

  @Column({ name: 'transaction_ref', length: 100, nullable: true })
  transactionRef: string;

  // ── Cheque details ──
  @Column({ name: 'cheque_number', length: 50, nullable: true })
  chequeNumber: string;

  @Column({ name: 'cheque_date', type: 'date', nullable: true })
  chequeDate: string;

  @Column({ name: 'cheque_bank_name', length: 100, nullable: true })
  chequeBankName: string;

  // ── Status ──
  @Column({ length: 20, default: 'PENDING' })
  status: SupplierPaymentStatus;

  // ── Metadata ──
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'receipt_url', length: 500, nullable: true })
  receiptUrl: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'confirmed_by', nullable: true })
  confirmedBy: string;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

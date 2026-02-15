import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { Invoice } from './invoice.entity';

export type ClientPaymentMethod =
  | 'TRANSFERENCIA'
  | 'EFECTIVO'
  | 'CHEQUE'
  | 'TARJETA_CREDITO'
  | 'TARJETA_DEBITO'
  | 'WEBPAY'
  | 'FLOW'
  | 'COMPENSACION';

export type ClientPaymentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'BOUNCED'
  | 'VOIDED';

@Entity('client_payments')
export class ClientPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  // ── Client ──
  @Column({ name: 'client_id' })
  clientId: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  // ── Invoice (the sales invoice being paid) ──
  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @ManyToOne(() => Invoice)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  // ── Payment identification ──
  @Column({ name: 'payment_number', length: 20 })
  paymentNumber: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: string;

  // ── Amount ──
  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  // ── Payment method ──
  @Column({ name: 'payment_method', length: 20, default: 'TRANSFERENCIA' })
  paymentMethod: ClientPaymentMethod;

  // ── Bank details ──
  @Column({ name: 'bank_name', length: 100, nullable: true })
  bankName: string;

  @Column({ name: 'transaction_ref', length: 100, nullable: true })
  transactionRef: string;

  // ── Cheque details ──
  @Column({ name: 'cheque_number', length: 50, nullable: true })
  chequeNumber: string;

  // ── Status ──
  @Column({ length: 20, default: 'PENDING' })
  status: ClientPaymentStatus;

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

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { InvoiceItem } from './invoice-item.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  // ── DTE Identification ──
  @Column({ name: 'dte_type', type: 'smallint' })
  dteType: number; // 33=Factura, 34=Factura Exenta, 39=Boleta, 41=Boleta Exenta, 56=Nota Débito, 61=Nota Crédito, 52=Guía Despacho

  @Column({ type: 'int' })
  folio: number; // Sequential per DTE type per tenant

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string; // YYYY-MM-DD format required by SII

  @Column({ length: 50, default: 'draft' })
  status: string; // draft, issued, sent_to_sii, accepted, rejected, cancelled, void

  // ── Emisor (Sender = Tenant company) ──
  @Column({ name: 'emisor_rut', length: 12 })
  emisorRut: string;

  @Column({ name: 'emisor_razon_social', length: 255 })
  emisorRazonSocial: string;

  @Column({ name: 'emisor_giro', length: 255 })
  emisorGiro: string; // Business activity description

  @Column({ name: 'emisor_direccion', length: 255 })
  emisorDireccion: string;

  @Column({ name: 'emisor_comuna', length: 100 })
  emisorComuna: string;

  @Column({ name: 'emisor_ciudad', length: 100 })
  emisorCiudad: string;

  @Column({ name: 'emisor_actividad_economica', type: 'int', nullable: true })
  emisorActividadEconomica: number; // SII activity code

  // ── Receptor (Receiver = Client) ──
  @Column({ name: 'receptor_rut', length: 12 })
  receptorRut: string;

  @Column({ name: 'receptor_razon_social', length: 255 })
  receptorRazonSocial: string;

  @Column({ name: 'receptor_giro', length: 255, nullable: true })
  receptorGiro: string;

  @Column({ name: 'receptor_direccion', length: 255, nullable: true })
  receptorDireccion: string;

  @Column({ name: 'receptor_comuna', length: 100, nullable: true })
  receptorComuna: string;

  @Column({ name: 'receptor_ciudad', length: 100, nullable: true })
  receptorCiudad: string;

  @Column({ name: 'receptor_contacto', length: 255, nullable: true })
  receptorContacto: string;

  // ── Montos (Amounts) ──
  @Column({ name: 'monto_neto', type: 'decimal', precision: 14, scale: 2, default: 0 })
  montoNeto: number; // Net amount (before tax)

  @Column({ name: 'monto_exento', type: 'decimal', precision: 14, scale: 2, default: 0 })
  montoExento: number; // Exempt amount

  @Column({ name: 'tasa_iva', type: 'decimal', precision: 5, scale: 2, default: 19 })
  tasaIva: number; // IVA rate (19% standard Chile)

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  iva: number; // IVA amount

  @Column({ name: 'monto_total', type: 'decimal', precision: 14, scale: 2, default: 0 })
  montoTotal: number; // Total amount

  // ── Referencia (for Notas de Crédito/Débito) ──
  @Column({ name: 'ref_dte_type', type: 'smallint', nullable: true })
  refDteType: number; // Referenced document type

  @Column({ name: 'ref_folio', type: 'int', nullable: true })
  refFolio: number; // Referenced document folio

  @Column({ name: 'ref_fecha', type: 'date', nullable: true })
  refFecha: string; // Referenced document date

  @Column({ name: 'ref_razon', length: 255, nullable: true })
  refRazon: string; // Reference reason

  @Column({ name: 'ref_codigo', type: 'smallint', nullable: true })
  refCodigo: number; // 1=anula, 2=corrige texto, 3=corrige monto

  // ── Relaciones internas TORQUE ──
  @Column({ name: 'client_id', nullable: true })
  clientId: string;

  @Column({ name: 'work_order_id', nullable: true })
  workOrderId: string;

  @Column({ name: 'quotation_id', nullable: true })
  quotationId: string;

  // ── SII Integration ──
  @Column({ name: 'sii_track_id', length: 100, nullable: true })
  siiTrackId: string; // SII tracking ID after submission

  @Column({ name: 'sii_status', length: 50, nullable: true })
  siiStatus: string; // SII response status

  @Column({ name: 'sii_response', type: 'jsonb', nullable: true })
  siiResponse: Record<string, unknown>; // Full SII response

  @Column({ name: 'timbre_electronico', type: 'text', nullable: true })
  timbreElectronico: string; // TED XML signature

  @Column({ name: 'xml_dte', type: 'text', nullable: true })
  xmlDte: string; // Full DTE XML

  @Column({ name: 'pdf_url', length: 500, nullable: true })
  pdfUrl: string;

  // ── Metadata ──
  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'payment_method', length: 50, nullable: true })
  paymentMethod: string; // efectivo, transferencia, tarjeta, cheque, credito

  @Column({ name: 'payment_condition', length: 50, nullable: true })
  paymentCondition: string; // contado, 30dias, 60dias, 90dias

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string;

  @Column({ name: 'is_paid', default: false })
  isPaid: boolean;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  paidAmount: number;

  // ── Items relation ──
  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items: InvoiceItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

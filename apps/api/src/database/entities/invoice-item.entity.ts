import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @ManyToOne(() => Invoice, (inv) => inv.items)
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @Column({ name: 'line_number', type: 'smallint' })
  lineNumber: number;

  // ── SII Detail Fields ──
  @Column({ name: 'item_code', length: 50, nullable: true })
  itemCode: string; // Internal or SII item code

  @Column({ name: 'item_name', length: 255 })
  itemName: string; // NmbItem in SII XML

  @Column({ name: 'item_description', type: 'text', nullable: true })
  itemDescription: string; // DscItem

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 1 })
  quantity: number; // QtyItem

  @Column({ name: 'unit_measure', length: 20, nullable: true })
  unitMeasure: string; // UnmdItem (UN, KG, LT, MT, HR, etc.)

  @Column({ name: 'unit_price', type: 'decimal', precision: 14, scale: 2 })
  unitPrice: number; // PrcItem

  @Column({ name: 'discount_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPct: number; // DescuentoPct

  @Column({ name: 'discount_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  discountAmount: number; // DescuentoMonto

  @Column({ name: 'surcharge_pct', type: 'decimal', precision: 5, scale: 2, default: 0 })
  surchargePct: number; // RecargoPct

  @Column({ name: 'surcharge_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  surchargeAmount: number; // RecargoMonto

  @Column({ name: 'is_exempt', default: false })
  isExempt: boolean; // IndExe (exempt from IVA)

  @Column({ name: 'total_line', type: 'decimal', precision: 14, scale: 2 })
  totalLine: number; // MontoItem

  // ── Internal references ──
  @Column({ name: 'inventory_item_id', nullable: true })
  inventoryItemId: string; // Link to InventoryItem

  @Column({ name: 'work_order_part_id', nullable: true })
  workOrderPartId: string; // Link to WorkOrderPart
}

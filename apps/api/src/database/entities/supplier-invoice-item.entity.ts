import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SupplierInvoice } from './supplier-invoice.entity';

@Entity('supplier_invoice_items')
export class SupplierInvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'supplier_invoice_id' })
  supplierInvoiceId: string;

  @ManyToOne(() => SupplierInvoice, (inv) => inv.items)
  @JoinColumn({ name: 'supplier_invoice_id' })
  supplierInvoice: SupplierInvoice;

  @Column({ name: 'inventory_item_id', nullable: true })
  inventoryItemId: string;

  @Column({ length: 500 })
  description: string;

  @Column({ type: 'decimal', precision: 14, scale: 4, default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 14, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ name: 'total_line', type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalLine: number;

  @Column({ name: 'is_exempt', default: false })
  isExempt: boolean;
}

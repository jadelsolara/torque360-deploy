import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ImportOrderItem } from './import-order-item.entity';

@Entity('import_orders')
export class ImportOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'order_number', generated: 'increment' })
  orderNumber: number;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({
    length: 50,
    default: 'draft',
    comment: 'draft|confirmed|shipped|in_transit|at_port|customs|cleared|received|closed',
  })
  status: string;

  @Column({ length: 10, nullable: true })
  incoterm: string;

  @Column({ name: 'origin_country', length: 100, nullable: true })
  originCountry: string;

  @Column({ name: 'origin_port', length: 200, nullable: true })
  originPort: string;

  @Column({ name: 'destination_port', length: 200, nullable: true })
  destinationPort: string;

  @Column({ length: 10, nullable: true })
  currency: string;

  @Column({ name: 'exchange_rate', type: 'decimal', precision: 14, scale: 4, nullable: true })
  exchangeRate: number;

  // --- Costs in USD ---
  @Column({ name: 'fob_total', type: 'decimal', precision: 14, scale: 2, nullable: true })
  fobTotal: number;

  @Column({ name: 'freight_cost', type: 'decimal', precision: 14, scale: 2, nullable: true })
  freightCost: number;

  @Column({ name: 'insurance_cost', type: 'decimal', precision: 14, scale: 2, nullable: true })
  insuranceCost: number;

  @Column({ name: 'cif_total', type: 'decimal', precision: 14, scale: 2, nullable: true })
  cifTotal: number;

  @Column({ name: 'customs_duty', type: 'decimal', precision: 14, scale: 2, nullable: true })
  customsDuty: number;

  @Column({ name: 'customs_tax', type: 'decimal', precision: 14, scale: 2, nullable: true })
  customsTax: number;

  @Column({ name: 'other_costs', type: 'decimal', precision: 14, scale: 2, nullable: true })
  otherCosts: number;

  @Column({ name: 'landed_cost_total', type: 'decimal', precision: 14, scale: 2, nullable: true })
  landedCostTotal: number;

  // --- Letter of Credit ---
  @Column({ name: 'lc_number', length: 100, nullable: true })
  lcNumber: string;

  @Column({ name: 'lc_bank', length: 200, nullable: true })
  lcBank: string;

  @Column({ name: 'lc_amount', type: 'decimal', precision: 14, scale: 2, nullable: true })
  lcAmount: number;

  @Column({ name: 'lc_expiry', type: 'date', nullable: true })
  lcExpiry: Date;

  // --- Shipping ---
  @Column({ name: 'bl_number', length: 100, nullable: true })
  blNumber: string;

  @Column({ name: 'container_number', length: 50, nullable: true })
  containerNumber: string;

  @Column({ name: 'vessel_name', length: 200, nullable: true })
  vesselName: string;

  // --- Dates ---
  @Column({ type: 'date', nullable: true, comment: 'Estimated Time of Departure' })
  etd: Date;

  @Column({ type: 'date', nullable: true, comment: 'Estimated Time of Arrival' })
  eta: Date;

  @Column({ name: 'actual_arrival', type: 'date', nullable: true })
  actualArrival: Date;

  @Column({ name: 'customs_clearance_date', type: 'date', nullable: true })
  customsClearanceDate: Date;

  // --- Notes & Meta ---
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @OneToMany(() => ImportOrderItem, (i) => i.importOrder)
  items: ImportOrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

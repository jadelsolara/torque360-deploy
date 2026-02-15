import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('traceability_chain')
export class TraceabilityEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'item_id' })
  itemId: string;

  @Column({ name: 'lot_number', length: 100, nullable: true })
  lotNumber: string;

  @Column({ name: 'serial_number', length: 100, nullable: true })
  serialNumber: string;

  @Column({ name: 'event_type', length: 50 })
  eventType: string;

  @Column({ name: 'event_data', type: 'jsonb', default: {} })
  eventData: Record<string, unknown>;

  @Column({ name: 'reference_type', length: 50, nullable: true })
  referenceType: string;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: string;

  @Column({ length: 255, nullable: true })
  location: string;

  @Column({ name: 'performed_by', nullable: true })
  performedBy: string;

  @Column({ name: 'prev_hash', length: 64, nullable: true })
  prevHash: string;

  @Column({ length: 64, nullable: true })
  hash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

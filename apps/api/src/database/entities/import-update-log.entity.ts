import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ImportOrder } from './import-order.entity';
import { ExternalAccess } from './external-access.entity';

export enum UpdateSource {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export enum UpdateAction {
  STATUS_CHANGE = 'STATUS_CHANGE',
  FIELD_UPDATE = 'FIELD_UPDATE',
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  COST_UPDATE = 'COST_UPDATE',
  NOTE_ADDED = 'NOTE_ADDED',
}

@Entity('import_update_logs')
export class ImportUpdateLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'import_order_id' })
  importOrderId: string;

  @ManyToOne(() => ImportOrder)
  @JoinColumn({ name: 'import_order_id' })
  importOrder: ImportOrder;

  @Column({ name: 'external_access_id', nullable: true })
  externalAccessId: string;

  @ManyToOne(() => ExternalAccess, { nullable: true })
  @JoinColumn({ name: 'external_access_id' })
  externalAccess: ExternalAccess;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: UpdateSource.INTERNAL,
  })
  source: UpdateSource;

  @Column({ name: 'agent_type', length: 50, nullable: true })
  agentType: string;

  @Column({ name: 'agent_name', length: 255, nullable: true })
  agentName: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  action: UpdateAction;

  @Column({ name: 'field_name', length: 100, nullable: true })
  fieldName: string;

  @Column({ name: 'old_value', type: 'text', nullable: true })
  oldValue: string;

  @Column({ name: 'new_value', type: 'text', nullable: true })
  newValue: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ImportOrder } from './import-order.entity';

export enum AgentType {
  CUSTOMS_BROKER = 'CUSTOMS_BROKER',
  FREIGHT_FORWARDER = 'FREIGHT_FORWARDER',
  SHIPPING_LINE = 'SHIPPING_LINE',
  INLAND_TRANSPORT = 'INLAND_TRANSPORT',
  PORT_AGENT = 'PORT_AGENT',
  INSPECTOR = 'INSPECTOR',
}

export interface ExternalAccessPermissions {
  canUpdateStatus: boolean;
  canUploadDocuments: boolean;
  canUpdateDates: boolean;
  canUpdateCosts: boolean;
  allowedStatusTransitions: string[];
  allowedFields: string[];
}

@Entity('external_accesses')
export class ExternalAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'import_order_id' })
  importOrderId: string;

  @ManyToOne(() => ImportOrder)
  @JoinColumn({ name: 'import_order_id' })
  importOrder: ImportOrder;

  @Column({
    name: 'agent_type',
    type: 'varchar',
    length: 50,
  })
  agentType: AgentType;

  @Column({ name: 'agent_name', length: 255 })
  agentName: string;

  @Column({ name: 'agent_email', length: 255 })
  agentEmail: string;

  @Column({ name: 'agent_phone', length: 50, nullable: true })
  agentPhone: string;

  @Column({ name: 'token_hash', length: 255 })
  tokenHash: string;

  @Column({
    type: 'jsonb',
    default: () => `'${JSON.stringify({
      canUpdateStatus: false,
      canUploadDocuments: false,
      canUpdateDates: false,
      canUpdateCosts: false,
      allowedStatusTransitions: [],
      allowedFields: [],
    })}'`,
  })
  permissions: ExternalAccessPermissions;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'last_access_at', type: 'timestamptz', nullable: true })
  lastAccessAt: Date;

  @Column({ name: 'access_count', type: 'int', default: 0 })
  accessCount: number;

  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

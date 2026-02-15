import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'entity_type', length: 100 })
  entityType: string;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ length: 50 })
  action: string;

  @Column({ type: 'jsonb', default: {} })
  changes: Record<string, unknown>;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ name: 'prev_hash', length: 64, nullable: true })
  prevHash: string;

  @Column({ length: 64, nullable: true })
  hash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

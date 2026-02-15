import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('approvals')
export class Approval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'entity_type', length: 100 })
  entityType: string;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ name: 'approval_type', length: 50 })
  approvalType: string;

  @Column({ length: 50, default: 'pending' })
  status: string;

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @Column({ name: 'required_role', length: 50 })
  requiredRole: string;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @Column({ name: 'decided_by', nullable: true })
  decidedBy: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  context: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

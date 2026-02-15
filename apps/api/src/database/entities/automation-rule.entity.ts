import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('automation_rules')
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'trigger_type', length: 50 })
  triggerType: string;

  @Column({ name: 'trigger_entity', length: 100 })
  triggerEntity: string;

  @Column({ name: 'trigger_conditions', type: 'jsonb', default: {} })
  triggerConditions: Record<string, unknown>;

  @Column({ name: 'action_type', length: 50 })
  actionType: string;

  @Column({ name: 'action_config', type: 'jsonb', default: {} })
  actionConfig: Record<string, unknown>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'execution_count', default: 0 })
  executionCount: number;

  @Column({ name: 'last_executed_at', type: 'timestamptz', nullable: true })
  lastExecutedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

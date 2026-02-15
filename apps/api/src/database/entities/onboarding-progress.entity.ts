import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('onboarding_progress')
@Unique('UQ_onboarding_tenant_user_module_step', ['tenantId', 'userId', 'moduleId', 'stepId'])
export class OnboardingProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  @Index('IDX_onboarding_tenant')
  tenantId: string;

  @Column({ name: 'user_id' })
  @Index('IDX_onboarding_user')
  userId: string;

  @Column({ name: 'module_id', length: 100 })
  moduleId: string;

  @Column({ name: 'step_id', length: 100 })
  stepId: string;

  @Column({ default: false })
  completed: boolean;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ default: false })
  skipped: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

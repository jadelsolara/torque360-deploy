import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('bug_reports')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'severity'])
@Index(['tenantId', 'contentHash'], { unique: true })
export class BugReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;

  @Column({ name: 'user_label', length: 200, nullable: true })
  userLabel: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 20, default: 'medium' })
  severity: string; // low | medium | high | critical

  @Column({ length: 255 })
  section: string;

  @Column({ length: 500, nullable: true })
  url: string | null;

  @Column({ length: 30, nullable: true })
  viewport: string | null;

  @Column({ name: 'user_agent', length: 200, nullable: true })
  userAgent: string | null;

  @Column({ name: 'browser_lang', length: 10, nullable: true })
  browserLang: string | null;

  @Column({ name: 'js_errors', type: 'jsonb', nullable: true })
  jsErrors: Record<string, unknown>[] | null;

  @Column({ length: 20, default: 'new' })
  status: string; // new | viewed | in_progress | fixed | dismissed

  @Column({ name: 'content_hash', length: 64 })
  contentHash: string;

  @Column({ length: 100, nullable: true })
  project: string | null;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

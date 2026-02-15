import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ReportType =
  | 'GESTION'
  | 'RECLAMO_FALENCIA'
  | 'INCUMPLIMIENTO_MERCADO'
  | 'CUSTOM';

export type ReportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

@Entity('report_requests')
export class ReportRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @Column({
    name: 'report_type',
    type: 'varchar',
    length: 30,
  })
  reportType: ReportType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: {} })
  scope: {
    module: string;
    dateFrom: string;
    dateTo: string;
    filters?: Record<string, unknown>;
  };

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PENDING',
  })
  status: ReportStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ name: 'is_paid', default: false })
  isPaid: boolean;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date;

  @Column({ name: 'payment_reference', length: 255, nullable: true })
  paymentReference: string;

  @Column({ name: 'report_url', length: 500, nullable: true })
  reportUrl: string;

  @Column({ name: 'ai_analysis', type: 'text', nullable: true })
  aiAnalysis: string;

  @Column({ name: 'generated_at', type: 'timestamptz', nullable: true })
  generatedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

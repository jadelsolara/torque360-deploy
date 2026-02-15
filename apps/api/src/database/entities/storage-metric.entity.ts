import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AlertLevel {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EXCEEDED = 'EXCEEDED',
}

@Entity('storage_metrics')
export class StorageMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Index()
  @Column({ name: 'measured_at', type: 'timestamptz' })
  measuredAt: Date;

  @Column({ name: 'db_size_bytes', type: 'bigint', default: 0 })
  dbSizeBytes: number;

  @Column({ name: 'file_size_bytes', type: 'bigint', default: 0 })
  fileSizeBytes: number;

  @Column({ name: 'backup_size_bytes', type: 'bigint', default: 0 })
  backupSizeBytes: number;

  @Column({ name: 'total_size_bytes', type: 'bigint', default: 0 })
  totalSizeBytes: number;

  @Column({ name: 'row_count_total', type: 'integer', default: 0 })
  rowCountTotal: number;

  @Column({ name: 'quota_bytes', type: 'bigint', default: 0 })
  quotaBytes: number;

  @Column({ name: 'usage_percent', type: 'decimal', precision: 5, scale: 2, default: 0 })
  usagePercent: number;

  @Column({ name: 'alert_level', type: 'enum', enum: AlertLevel, default: AlertLevel.NORMAL })
  alertLevel: AlertLevel;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

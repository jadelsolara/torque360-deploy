import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum BackupType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  DIFFERENTIAL = 'DIFFERENTIAL',
}

export enum StorageTarget {
  LOCAL = 'LOCAL',
  R2_CLOUD = 'R2_CLOUD',
  BOTH = 'BOTH',
}

export enum BackupStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum BackupTrigger {
  SCHEDULED = 'SCHEDULED',
  MANUAL = 'MANUAL',
  AUTO_SCALE = 'AUTO_SCALE',
}

@Entity('backup_records')
export class BackupRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @Column({ name: 'backup_type', type: 'enum', enum: BackupType })
  backupType: BackupType;

  @Column({ name: 'storage_target', type: 'enum', enum: StorageTarget })
  storageTarget: StorageTarget;

  @Column({ type: 'enum', enum: BackupStatus, default: BackupStatus.PENDING })
  status: BackupStatus;

  @Column({ name: 'local_path', nullable: true })
  localPath: string;

  @Column({ name: 'cloud_url', nullable: true })
  cloudUrl: string;

  @Column({ name: 'cloud_bucket', nullable: true })
  cloudBucket: string;

  @Column({ name: 'size_bytes', type: 'bigint', default: 0 })
  sizeBytes: number;

  @Column({ name: 'tables_included', type: 'jsonb', default: [] })
  tablesIncluded: string[];

  @Column({ name: 'row_counts', type: 'jsonb', default: {} })
  rowCounts: Record<string, number>;

  @Column({ name: 'checksum_sha256', length: 64, nullable: true })
  checksumSha256: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'triggered_by', type: 'enum', enum: BackupTrigger })
  triggeredBy: BackupTrigger;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

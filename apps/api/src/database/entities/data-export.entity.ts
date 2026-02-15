import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type ExportType = 'CSV' | 'EXCEL' | 'PDF';

export type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

@Entity('data_exports')
export class DataExport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'requested_by' })
  requestedBy: string;

  @Column({
    name: 'export_type',
    type: 'varchar',
    length: 10,
  })
  exportType: ExportType;

  @Column({ length: 50 })
  module: string;

  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, unknown>;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PENDING',
  })
  status: ExportStatus;

  @Column({ name: 'file_url', length: 500, nullable: true })
  fileUrl: string;

  @Column({ name: 'file_size_bytes', type: 'int', nullable: true })
  fileSizeBytes: number;

  @Column({ name: 'row_count', type: 'int', nullable: true })
  rowCount: number;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

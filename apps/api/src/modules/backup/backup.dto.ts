import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { BackupType, StorageTarget, BackupStatus } from '../../database/entities/backup-record.entity';

export class CreateBackupDto {
  @IsEnum(BackupType)
  backupType: BackupType;

  @IsEnum(StorageTarget)
  storageTarget: StorageTarget;
}

export class BackupFiltersDto {
  @IsOptional()
  @IsEnum(BackupStatus)
  status?: BackupStatus;

  @IsOptional()
  @IsEnum(BackupType)
  backupType?: BackupType;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  fullBackupCron?: string;

  @IsOptional()
  @IsString()
  incrementalBackupCron?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  retentionDays?: number;

  @IsOptional()
  @IsBoolean()
  autoScaleEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(70)
  @Max(95)
  autoScaleThreshold?: number;
}

export class AdjustQuotaDto {
  @IsNumber()
  @Min(1073741824) // 1 GB minimum
  quotaBytes: number;
}

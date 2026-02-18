import { IsString, IsOptional, IsObject, IsIn, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAuditLogDto {
  @IsString()
  entityType: string;

  @IsString()
  entityId: string;

  @IsIn(['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'LOGIN', 'STOCK_ADJUST'])
  action: string;

  @IsOptional()
  @IsObject()
  changes?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ListAuditLogsQueryDto {
  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

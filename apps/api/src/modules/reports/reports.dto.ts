import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsDateString,
  IsObject,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Request Report DTO ──

export class RequestReportScopeDto {
  @IsString()
  module: string;

  @IsDateString()
  dateFrom: string;

  @IsDateString()
  dateTo: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}

export class RequestReportDto {
  @IsIn(['GESTION', 'RECLAMO_FALENCIA', 'INCUMPLIMIENTO_MERCADO', 'CUSTOM'])
  reportType: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @Type(() => RequestReportScopeDto)
  scope: RequestReportScopeDto;

  // Only required for CUSTOM report type
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}

// ── Report Filters DTO ──

export class ReportFiltersDto {
  @IsOptional()
  @IsIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsIn(['GESTION', 'RECLAMO_FALENCIA', 'INCUMPLIMIENTO_MERCADO', 'CUSTOM'])
  reportType?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ── Mark Paid DTO ──

export class MarkReportPaidDto {
  @IsString()
  @MaxLength(255)
  paymentReference: string;
}

// ── Request Export DTO ──

export class RequestExportDto {
  @IsIn(['CSV', 'EXCEL', 'PDF'])
  exportType: string;

  @IsIn([
    'work-orders',
    'clients',
    'vehicles',
    'inventory',
    'invoices',
    'payments',
    'suppliers',
    'employees',
  ])
  module: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}

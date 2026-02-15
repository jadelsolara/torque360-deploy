import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  IsUUID,
  IsDateString,
  IsBoolean,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class QuotationItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateQuotationDto {
  @IsUUID()
  vehicleId: string;

  @IsUUID()
  clientId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateQuotationDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items?: QuotationItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateQuotationStatusDto {
  @IsIn(['draft', 'sent', 'approved', 'converted', 'rejected'])
  status: string;
}

// ── Legacy list query ──

export class ListQuotationsQueryDto {
  @IsOptional()
  @IsIn(['draft', 'sent', 'approved', 'converted', 'rejected'])
  status?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

// ── Enhanced filter DTO for quotation tracking ──

export class QuotationFiltersDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',');
    return value;
  })
  @IsArray()
  @IsIn(['draft', 'sent', 'approved', 'converted', 'rejected', 'expired'], { each: true })
  status?: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'validUntil', 'total', 'status', 'quoteNumber'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

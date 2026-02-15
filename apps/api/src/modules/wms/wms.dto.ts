import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsDateString,
  MinLength,
  Min,
} from 'class-validator';

// ─── Warehouse DTOs ────────────────────────────────────────────────

export class CreateWarehouseDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  code: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Location DTOs ─────────────────────────────────────────────────

export class CreateLocationDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  aisle?: string;

  @IsOptional()
  @IsString()
  rack?: string;

  @IsOptional()
  @IsString()
  shelf?: string;

  @IsOptional()
  @IsString()
  bin?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;
}

// ─── Stock Operation DTOs ──────────────────────────────────────────

export class StockOperationDto {
  @IsUUID()
  itemId: string;

  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsUUID()
  performedBy: string;
}

export class TransferStockDto {
  @IsUUID()
  itemId: string;

  @IsUUID()
  fromWarehouseId: string;

  @IsOptional()
  @IsUUID()
  fromLocationId?: string;

  @IsUUID()
  toWarehouseId: string;

  @IsOptional()
  @IsUUID()
  toLocationId?: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsUUID()
  performedBy: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AdjustStockDto {
  @IsUUID()
  itemId: string;

  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsNumber()
  quantity: number;

  @IsString()
  @MinLength(1)
  reason: string;

  @IsUUID()
  performedBy: string;
}

// ─── Filter DTOs ───────────────────────────────────────────────────

export class MovementFiltersDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsString()
  movementType?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

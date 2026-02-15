import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsBoolean,
  IsUUID,
  IsDateString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateInventoryItemDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsOptional()
  @IsString()
  oemNumber?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;
}

export class UpdateInventoryItemDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsOptional()
  @IsString()
  oemNumber?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AdjustStockDto {
  @IsNumber()
  quantity: number;

  @IsIn(['add', 'subtract', 'set'])
  operation: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ListInventoryQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  lowStock?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: string;
}

// ─── Cost / CPP DTOs ──────────────────────────────────────────────────

export class StockEntryDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsIn(['purchase', 'import', 'return', 'receive'])
  movementType: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}

export class StockExitDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsIn(['dispatch', 'sale'])
  movementType: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}

export class StockAdjustmentDto {
  @IsNumber()
  quantityDelta: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsString()
  @MinLength(1)
  reason: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;
}

export class CostHistoryQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

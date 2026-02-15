import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
  Length,
  IsIn,
  IsDateString,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Import Item DTOs ───────────────────────────────────────────────

export class CreateImportItemDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  partNumber?: string;

  @IsString()
  @Length(1, 500)
  description: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  hsCode?: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volumeCbm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  arancelRate?: number;
}

// ─── Import Order DTOs ──────────────────────────────────────────────

export class CreateImportOrderDto {
  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  supplierName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  incoterm?: string = 'FOB';

  @IsOptional()
  @IsString()
  @Length(1, 100)
  originCountry?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  originPort?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  destinationPort?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  currency?: string = 'USD';

  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  arancelRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customsDutyRate?: number = 0.06;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freightCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gastosPuerto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  agenteAduana?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transporteInterno?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otrosGastos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCosts?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateImportItemDto)
  items: CreateImportItemDto[];
}

export class UpdateImportOrderDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  supplierName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  incoterm?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  originCountry?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  originPort?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  destinationPort?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  arancelRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customsDutyRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  freightCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gastosPuerto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  agenteAduana?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transporteInterno?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otrosGastos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCosts?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  lcNumber?: string;

  @IsOptional()
  @IsString()
  lcBank?: string;

  @IsOptional()
  @IsNumber()
  lcAmount?: number;

  @IsOptional()
  @IsString()
  lcExpiry?: string;

  @IsOptional()
  @IsString()
  blNumber?: string;

  @IsOptional()
  @IsString()
  containerNumber?: string;

  @IsOptional()
  @IsString()
  shippingLine?: string;

  @IsOptional()
  @IsString()
  vesselName?: string;

  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @IsOptional()
  @IsString()
  etd?: string;

  @IsOptional()
  @IsString()
  eta?: string;

  @IsOptional()
  @IsString()
  orderDate?: string;

  @IsOptional()
  @IsString()
  estimatedShipDate?: string;

  @IsOptional()
  @IsString()
  actualShipDate?: string;
}

export class UpdateStatusDto {
  @IsString()
  @IsIn(['draft', 'confirmed', 'shipped', 'in_transit', 'at_port', 'customs', 'cleared', 'received', 'closed'])
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Exchange Rate DTOs ─────────────────────────────────────────────

export class UpdateExchangeRateDto {
  @IsString()
  @Length(1, 10)
  currency: string;

  @IsNumber()
  @Min(0.0001)
  observedRate: number;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  source?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  buyRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellRate?: number;
}

// ─── Landed Cost DTOs ───────────────────────────────────────────────

export class UpdateCostsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  freightCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  insuranceCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  arancelRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gastosPuerto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  agenteAduana?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  transporteInterno?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otrosGastos?: number;
}

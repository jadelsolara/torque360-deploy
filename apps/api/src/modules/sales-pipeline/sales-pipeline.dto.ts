import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsUUID,
  IsInt,
  IsIn,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Convert Quotation to Work Order ──

export class ConvertQuotationDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsIn(['repair', 'maintenance', 'inspection', 'body_work', 'electrical', 'other'])
  type?: string;

  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;
}

// ── Dispatch Parts from Warehouse ──

export class DispatchPartItemDto {
  @IsUUID()
  inventoryItemId: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsUUID()
  warehouseLocationId: string;
}

export class DispatchPartsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DispatchPartItemDto)
  items: DispatchPartItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Invoice Work Order ──

export class InvoiceWorkOrderDto {
  @IsInt()
  @IsIn([33, 34, 39, 41])
  dteType: number; // 33=Factura, 34=Factura Exenta, 39=Boleta, 41=Boleta Exenta

  @IsOptional()
  @IsIn(['contado', '30dias', '60dias', '90dias'])
  paymentCondition?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string; // efectivo, transferencia, tarjeta, cheque, credito
}

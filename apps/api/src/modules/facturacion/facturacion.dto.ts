import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsIn,
  IsUUID,
  IsDateString,
  IsInt,
  ValidateNested,
  ArrayMinSize,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Invoice Item DTO ──

export class CreateInvoiceItemDto {
  @IsString()
  @MaxLength(255)
  itemName: string;

  @IsOptional()
  @IsString()
  itemDescription?: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unitMeasure?: string = 'UN';

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPct?: number = 0;

  @IsOptional()
  @IsBoolean()
  isExempt?: boolean = false;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  itemCode?: string;

  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;

  @IsOptional()
  @IsUUID()
  workOrderPartId?: string;
}

// ── Create Invoice DTO ──

export class CreateInvoiceDto {
  @IsIn([33, 34, 39, 41, 52, 56, 61])
  dteType: number;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsString()
  @Matches(/^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$/, {
    message: 'receptorRut must be a valid Chilean RUT format (e.g. 12345678-9 or 12.345.678-9)',
  })
  receptorRut: string;

  @IsString()
  @MaxLength(255)
  receptorRazonSocial: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  receptorGiro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  receptorDireccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  receptorComuna?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  receptorCiudad?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @IsOptional()
  @IsUUID()
  quotationId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  @ArrayMinSize(1)
  items: CreateInvoiceItemDto[];

  @IsOptional()
  @IsIn(['efectivo', 'transferencia', 'tarjeta', 'cheque', 'credito'])
  paymentMethod?: string;

  @IsOptional()
  @IsIn(['contado', '30dias', '60dias', '90dias'])
  paymentCondition?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Credit Note DTO ──

export class CreateCreditNoteDto {
  @IsString()
  @Matches(/^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$/, {
    message: 'receptorRut must be a valid Chilean RUT format (e.g. 12345678-9 or 12.345.678-9)',
  })
  receptorRut: string;

  @IsString()
  @MaxLength(255)
  receptorRazonSocial: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  receptorGiro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  receptorDireccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  receptorComuna?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  receptorCiudad?: string;

  @IsIn([33, 34, 39, 41, 52, 56, 61])
  refDteType: number;

  @IsInt()
  @Min(1)
  refFolio: number;

  @IsDateString()
  refFecha: string;

  @IsString()
  @MaxLength(255)
  refRazon: string;

  @IsIn([1, 2, 3])
  refCodigo: number; // 1=anula, 2=corrige texto, 3=corrige monto

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items?: CreateInvoiceItemDto[];

  @IsOptional()
  @IsIn(['efectivo', 'transferencia', 'tarjeta', 'cheque', 'credito'])
  paymentMethod?: string;

  @IsOptional()
  @IsIn(['contado', '30dias', '60dias', '90dias'])
  paymentCondition?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}

// ── Upload CAF DTO ──

export class UploadCafDto {
  @IsIn([33, 34, 39, 41, 52, 56, 61])
  dteType: number;

  @IsString()
  cafXml: string;
}

// ── Invoice Filters DTO ──

export class InvoiceFiltersDto {
  @IsOptional()
  @IsIn([33, 34, 39, 41, 52, 56, 61])
  dteType?: number;

  @IsOptional()
  @IsIn(['draft', 'issued', 'sent_to_sii', 'accepted', 'rejected', 'cancelled', 'void'])
  status?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

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
  folioFrom?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  folioTo?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

// ── Mark Paid DTO ──

export class MarkPaidDto {
  @IsNumber()
  @Min(0)
  paidAmount: number;

  @IsOptional()
  @IsIn(['efectivo', 'transferencia', 'tarjeta', 'cheque', 'credito'])
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

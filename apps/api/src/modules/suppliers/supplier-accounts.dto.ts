import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════════════════════════

export enum InvoiceTypeEnum {
  FACTURA_COMPRA = 'FACTURA_COMPRA',
  NOTA_CREDITO_COMPRA = 'NOTA_CREDITO_COMPRA',
  NOTA_DEBITO_COMPRA = 'NOTA_DEBITO_COMPRA',
  BOLETA_COMPRA = 'BOLETA_COMPRA',
  FACTURA_IMPORTACION = 'FACTURA_IMPORTACION',
}

export enum PaymentConditionEnum {
  CONTADO = 'CONTADO',
  '30_DIAS' = '30_DIAS',
  '60_DIAS' = '60_DIAS',
  '90_DIAS' = '90_DIAS',
  CUSTOM = 'CUSTOM',
}

export enum InvoiceStatusEnum {
  RECEIVED = 'RECEIVED',
  APPROVED = 'APPROVED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  DISPUTED = 'DISPUTED',
  VOIDED = 'VOIDED',
}

export enum PaymentMethodEnum {
  TRANSFERENCIA = 'TRANSFERENCIA',
  CHEQUE = 'CHEQUE',
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  COMPENSACION = 'COMPENSACION',
  LETRA = 'LETRA',
}

export enum PaymentStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  BOUNCED = 'BOUNCED',
  VOIDED = 'VOIDED',
}

// ═══════════════════════════════════════════════════════════════════════════
// Supplier Invoice Item DTO
// ═══════════════════════════════════════════════════════════════════════════

export class CreateSupplierInvoiceItemDto {
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;

  @IsString()
  @Length(1, 500)
  description: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  totalLine: number;

  @IsOptional()
  @IsBoolean()
  isExempt?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Supplier Invoice DTOs
// ═══════════════════════════════════════════════════════════════════════════

export class CreateSupplierInvoiceDto {
  @IsUUID()
  supplierId: string;

  @IsString()
  @Length(1, 100)
  invoiceNumber: string;

  @IsEnum(InvoiceTypeEnum)
  invoiceType: InvoiceTypeEnum;

  @IsOptional()
  @IsNumber()
  dteType?: number;

  @IsDateString()
  issueDate: string;

  @IsOptional()
  @IsDateString()
  receptionDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsNumber()
  @Min(0)
  montoNeto: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoExento?: number;

  @IsNumber()
  @Min(0)
  iva: number;

  @IsNumber()
  @Min(0)
  montoTotal: number;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  currency?: string;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsEnum(PaymentConditionEnum)
  paymentCondition: PaymentConditionEnum;

  @IsOptional()
  @IsUUID()
  relatedImportOrderId?: string;

  @IsOptional()
  @IsUUID()
  relatedPurchaseOrderId?: string;

  @IsOptional()
  @IsString()
  siiTrackId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierInvoiceItemDto)
  items: CreateSupplierInvoiceItemDto[];
}

export class UpdateSupplierInvoiceDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  invoiceNumber?: string;

  @IsOptional()
  @IsEnum(InvoiceTypeEnum)
  invoiceType?: InvoiceTypeEnum;

  @IsOptional()
  @IsNumber()
  dteType?: number;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  receptionDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoNeto?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoExento?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  iva?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoTotal?: number;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  currency?: string;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsOptional()
  @IsEnum(PaymentConditionEnum)
  paymentCondition?: PaymentConditionEnum;

  @IsOptional()
  @IsUUID()
  relatedImportOrderId?: string;

  @IsOptional()
  @IsUUID()
  relatedPurchaseOrderId?: string;

  @IsOptional()
  @IsString()
  siiTrackId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierInvoiceItemDto)
  items?: CreateSupplierInvoiceItemDto[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Supplier Payment DTO
// ═══════════════════════════════════════════════════════════════════════════

export class CreateSupplierPaymentDto {
  @IsUUID()
  supplierId: string;

  @IsOptional()
  @IsUUID()
  supplierInvoiceId?: string;

  @IsDateString()
  paymentDate: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  currency?: string;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @IsEnum(PaymentMethodEnum)
  paymentMethod: PaymentMethodEnum;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  transactionRef?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  chequeNumber?: string;

  @IsOptional()
  @IsDateString()
  chequeDate?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  chequeBankName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Filter DTOs
// ═══════════════════════════════════════════════════════════════════════════

export class InvoiceFiltersDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  invoiceType?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @IsOptional()
  @IsDateString()
  dueTo?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  overdue?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}

export class PaymentFiltersDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

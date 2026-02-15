import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsDateString,
  IsIn,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Record Payment DTO ──

export class RecordPaymentDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  invoiceId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsIn([
    'TRANSFERENCIA',
    'EFECTIVO',
    'CHEQUE',
    'TARJETA_CREDITO',
    'TARJETA_DEBITO',
    'WEBPAY',
    'FLOW',
    'COMPENSACION',
  ])
  paymentMethod: string;

  @IsDateString()
  paymentDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  transactionRef?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  chequeNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ── Payment Filters DTO ──

export class PaymentFiltersDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  invoiceId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn([
    'TRANSFERENCIA',
    'EFECTIVO',
    'CHEQUE',
    'TARJETA_CREDITO',
    'TARJETA_DEBITO',
    'WEBPAY',
    'FLOW',
    'COMPENSACION',
  ])
  method?: string;

  @IsOptional()
  @IsIn(['PENDING', 'CONFIRMED', 'BOUNCED', 'VOIDED'])
  status?: string;

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

// ── Receivables Filters DTO ──

export class ReceivablesFiltersDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(2020)
  year?: number;

  @IsOptional()
  @IsIn([30, 60, 90])
  @Type(() => Number)
  days?: number;
}

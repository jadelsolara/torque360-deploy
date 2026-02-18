import {
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsIn,
  IsArray,
  Min,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TransactionItemDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsNumber()
  @Min(0)
  totalPrice: number;
}

export class CreateTransactionDto {
  @IsUUID()
  sellerTenantId: string;

  @IsOptional()
  @IsUUID()
  listingId?: string;

  @IsOptional()
  @IsUUID()
  rfqResponseId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  items: TransactionItemDto[];

  @IsNumber()
  @Min(0)
  subtotal: number;
}

export class UpdateTransactionStatusDto {
  @IsIn(['confirmed', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed'])
  status: string;
}

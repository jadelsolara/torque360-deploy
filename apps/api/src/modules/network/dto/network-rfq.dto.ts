import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  IsDateString,
  Min,
  MaxLength,
  IsInt,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RfqItemDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRfqDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RfqItemDto)
  items: RfqItemDto[];

  @IsOptional()
  @IsArray()
  @IsIn(['sstt', 'dyp', 'importador'], { each: true })
  targetActorTypes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetRegions?: string[];

  @IsOptional()
  @IsDateString()
  deadline?: string;
}

export class CreateRfqResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RfqResponseItemDto)
  items: RfqResponseItemDto[];

  @IsNumber()
  @Min(0)
  totalPrice: number;

  @IsInt()
  @Min(0)
  deliveryDays: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RfqResponseItemDto {
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

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListRfqsQueryDto {
  @IsOptional()
  @IsIn(['open', 'closed', 'cancelled', 'awarded'])
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'deadline', 'responses_count'])
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

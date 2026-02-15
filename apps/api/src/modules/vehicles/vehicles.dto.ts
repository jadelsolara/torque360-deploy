import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  IsIn,
  Min,
} from 'class-validator';

export class CreateVehicleDto {
  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsString()
  plate?: string;

  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsNumber()
  @Min(1900)
  year: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  engineType?: string;

  @IsOptional()
  @IsString()
  transmission?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsString()
  plate?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(1900)
  year?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  engineType?: string;

  @IsOptional()
  @IsString()
  transmission?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'scrapped'])
  status?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ListVehiclesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  plate?: string;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsString()
  clientId?: string;
}

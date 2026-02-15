import { IsString, IsOptional, IsEmail, IsBoolean, IsNumber, Min, Max, Length } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  rut?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  currency?: string = 'CLP';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  rut?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  country?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  contactName?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRatingDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;
}

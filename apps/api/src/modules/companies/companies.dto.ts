import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsEmail,
  MinLength,
} from 'class-validator';

// ─── Company DTOs ──────────────────────────────────────────────────

export class CreateCompanyDto {
  @IsString()
  @MinLength(1)
  rut: string;

  @IsString()
  @MinLength(1)
  businessName: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  parentCompanyId?: string;
}

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  rut?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  businessName?: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  parentCompanyId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  settings?: Record<string, unknown>;
}

// ─── Contact DTOs ──────────────────────────────────────────────────

export class CreateContactDto {
  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  canApproveQuotes?: boolean;

  @IsOptional()
  @IsBoolean()
  canAuthorizeWork?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  canApproveQuotes?: boolean;

  @IsOptional()
  @IsBoolean()
  canAuthorizeWork?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Filter DTOs ───────────────────────────────────────────────────

export class CompanyFiltersDto {
  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class LinkClientDto {
  @IsUUID()
  clientId: string;
}

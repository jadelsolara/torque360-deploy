import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsIn(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'])
  role?: string;
}

export class RegisterTenantDto {
  @IsString()
  tenantName: string;

  @IsString()
  tenantSlug: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  plan?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

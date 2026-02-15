import { IsString, IsOptional, IsObject, IsIn } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsIn(['starter', 'professional', 'enterprise'])
  plan?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['starter', 'professional', 'enterprise'])
  plan?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

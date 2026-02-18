import { IsString, IsIn, IsOptional } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsIn(['starter', 'pro', 'enterprise'])
  plan: string;

  @IsString()
  @IsIn(['stripe', 'mercadopago'])
  provider: string;

  @IsOptional()
  @IsString()
  successUrl?: string;

  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class ChangePlanDto {
  @IsString()
  @IsIn(['starter', 'pro', 'enterprise'])
  plan: string;
}

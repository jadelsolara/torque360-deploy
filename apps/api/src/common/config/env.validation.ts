import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  API_PORT = 3001;

  // Database
  @IsString()
  @IsOptional()
  DATABASE_HOST = 'localhost';

  @IsNumber()
  @IsOptional()
  DATABASE_PORT = 5432;

  @IsString()
  @IsOptional()
  DATABASE_USER = 'torque';

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  @IsOptional()
  DATABASE_NAME = 'torque360';

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN = '15m';

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN = '7d';

  // Redis
  @IsString()
  @IsOptional()
  REDIS_HOST = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  // Meilisearch
  @IsString()
  @IsOptional()
  MEILI_HOST = 'http://localhost:7700';

  @IsString()
  @IsOptional()
  MEILI_MASTER_KEY?: string;

  // SMTP
  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT = 587;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM = 'TORQUE 360 <noreply@torque360.cl>';

  // Cloudflare R2
  @IsString()
  @IsOptional()
  R2_ACCOUNT_ID?: string;

  @IsString()
  @IsOptional()
  R2_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  R2_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  R2_BUCKET = 'torque360';

  @IsString()
  @IsOptional()
  R2_PUBLIC_URL?: string;

  // CORS
  @IsString()
  @IsOptional()
  CORS_ORIGIN = 'http://localhost:3000';

  // Billing
  @IsString()
  @IsOptional()
  STRIPE_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  STRIPE_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  STRIPE_PRICE_PRO?: string;

  @IsString()
  @IsOptional()
  STRIPE_PRICE_ENTERPRISE?: string;

  @IsString()
  @IsOptional()
  MERCADOPAGO_ACCESS_TOKEN?: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('\n')}`,
    );
  }

  return validated;
}

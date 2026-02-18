import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  Length,
  IsObject,
} from 'class-validator';

export class CreateBugReportDto {
  @IsString()
  @Length(1, 2000)
  description: string;

  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity: string;

  @IsString()
  @Length(1, 255)
  section: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  url?: string;

  @IsOptional()
  @IsString()
  @Length(0, 30)
  viewport?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  userAgent?: string;

  @IsOptional()
  @IsString()
  @Length(0, 10)
  browserLang?: string;

  @IsOptional()
  @IsArray()
  jsErrors?: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  @Length(0, 200)
  userLabel?: string;

  @IsOptional()
  @IsString()
  @Length(0, 100)
  project?: string;
}

export class UpdateBugStatusDto {
  @IsString()
  @IsIn(['new', 'viewed', 'in_progress', 'fixed', 'dismissed'])
  status: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  notes?: string;
}

export class BugFiltersDto {
  @IsOptional()
  @IsString()
  @IsIn(['new', 'viewed', 'in_progress', 'fixed', 'dismissed'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  section?: string;
}

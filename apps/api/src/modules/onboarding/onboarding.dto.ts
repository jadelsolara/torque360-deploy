import { IsString, IsOptional } from 'class-validator';

export class ModuleIdParamDto {
  @IsString()
  moduleId: string;
}

export class StepIdParamDto {
  @IsString()
  moduleId: string;

  @IsString()
  stepId: string;
}

export class ActivateOnboardingDto {
  @IsOptional()
  @IsString()
  role?: string;
}

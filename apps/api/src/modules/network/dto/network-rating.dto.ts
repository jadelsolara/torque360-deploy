import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateRatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  deliveryScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  qualityScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  communicationScore?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

import {
  IsString,
  IsOptional,
  IsEmail,
  IsIn,
  IsBoolean,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'])
  role?: string;
}

export class DeactivateUserDto {
  @IsBoolean()
  isActive: boolean;
}

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'])
  role?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: string;
}

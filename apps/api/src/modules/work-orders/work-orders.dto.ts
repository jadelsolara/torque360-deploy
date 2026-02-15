import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  IsBoolean,
  IsUUID,
  IsDateString,
  IsArray,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateWorkOrderDto {
  @IsUUID()
  vehicleId: string;

  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsIn(['repair', 'maintenance', 'inspection', 'bodywork', 'electrical', 'other'])
  type?: string;

  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCost?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateWorkOrderDto {
  @IsOptional()
  @IsIn(['repair', 'maintenance', 'inspection', 'bodywork', 'electrical', 'other'])
  type?: string;

  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  laborCost?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateStatusDto {
  @IsIn(['pending', 'in_progress', 'waiting_parts', 'waiting_approval', 'completed', 'invoiced', 'cancelled'])
  status: string;
}

export class AssignTechnicianDto {
  @IsUUID()
  assignedTo: string;
}

export class AddPartDto {
  @IsOptional()
  @IsString()
  partId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsBoolean()
  isOem?: boolean;
}

// ── Enhanced filter DTO for order tracking ──

export class OrderFiltersDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',');
    return value;
  })
  @IsArray()
  @IsIn(
    ['pending', 'in_progress', 'waiting_parts', 'waiting_approval', 'completed', 'invoiced', 'cancelled'],
    { each: true },
  )
  status?: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsString()
  pipelineStage?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isOverdue?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  agingDays?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'dueDate', 'priority', 'status', 'orderNumber', 'totalCost'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

// ── Legacy DTO kept for backwards compatibility (subset of OrderFiltersDto) ──

export class ListWorkOrdersQueryDto {
  @IsOptional()
  @IsIn(['pending', 'in_progress', 'waiting_parts', 'waiting_approval', 'completed', 'invoiced', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;
}

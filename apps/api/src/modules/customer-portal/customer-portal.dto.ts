import {
  IsString,
  IsOptional,
  IsEmail,
  IsIn,
  Length,
  MaxLength,
} from 'class-validator';

// ── Staff: Create client portal access ──

export class CreateCustomerAccessDto {
  @IsString()
  clientId: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}

// ── Public: Client login ──

export class CustomerLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 6)
  pin: string;
}

// ── Public: Create ticket ──

export class CreateTicketDto {
  @IsString()
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsIn(['CONSULTA_ESTADO', 'CONSULTA_PRESUPUESTO', 'RECLAMO', 'SOLICITUD_INFORME', 'GENERAL'])
  category: string;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority?: string;

  @IsOptional()
  @IsString()
  workOrderId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsString()
  @Length(1, 5000)
  message: string;
}

// ── Public: Send message ──

export class SendMessageDto {
  @IsString()
  @Length(1, 5000)
  message: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

// ── Public: Request paid report ──

export class RequestReportDto {
  @IsString()
  @IsIn(['INSPECCION_VEHICULAR', 'HISTORIAL_MANTENIMIENTO', 'DIAGNOSTICO_TECNICO', 'VALUACION'])
  reportType: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

// ── Staff: Reply ticket ──

export class StaffReplyDto {
  @IsString()
  @Length(1, 5000)
  message: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}

// ── Staff: Update ticket status ──

export class UpdateTicketStatusDto {
  @IsString()
  @IsIn(['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'])
  status: string;
}

// ── Staff: Filter tickets ──

export class FilterTicketsDto {
  @IsOptional()
  @IsString()
  @IsIn(['OPEN', 'IN_PROGRESS', 'WAITING_CLIENT', 'RESOLVED', 'CLOSED'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['CONSULTA_ESTADO', 'CONSULTA_PRESUPUESTO', 'RECLAMO', 'SOLICITUD_INFORME', 'GENERAL'])
  category?: string;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority?: string;
}

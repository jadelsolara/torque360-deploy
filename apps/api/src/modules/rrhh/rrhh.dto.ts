import {
  IsString,
  IsOptional,
  IsEmail,
  IsIn,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsUUID,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

// ═══════════════════════════════════════════════════════════════════════════════
// Employee DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateEmployeeDto {
  // ── Personal ────────────────────────────────────────────────────────
  @IsString()
  @Matches(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/, {
    message: 'RUT debe tener formato XX.XXX.XXX-X',
  })
  rut: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsIn(['MASCULINO', 'FEMENINO', 'OTRO'])
  gender?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsIn(['SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNION_CIVIL'])
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  comuna?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  // ── Employment ──────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @IsDateString()
  hireDate: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @IsOptional()
  @IsIn(['INDEFINIDO', 'PLAZO_FIJO', 'POR_OBRA', 'HONORARIOS'])
  contractType?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsIn(['FULL_TIME', 'PART_TIME'])
  workSchedule?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(45)
  weeklyHours?: number;

  // ── Compensation ────────────────────────────────────────────────────
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  baseSalary: number;

  @IsOptional()
  @IsIn(['ARTICULO_47', 'ARTICULO_50'])
  gratificationType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  colacionAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  movilizacionAmount?: number;

  // ── Health ──────────────────────────────────────────────────────────
  @IsOptional()
  @IsIn(['FONASA', 'ISAPRE'])
  healthSystem?: string;

  @IsOptional()
  @IsString()
  isapre?: string;

  @IsOptional()
  @IsString()
  isapreCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  isaprePlanUf?: number;

  @IsOptional()
  @IsIn(['A', 'B', 'C', 'D'])
  fonasaTramo?: string;

  // ── Pension ─────────────────────────────────────────────────────────
  @IsOptional()
  @IsIn(['CAPITAL', 'CUPRUM', 'HABITAT', 'MODELO', 'PLANVITAL', 'PROVIDA', 'UNO'])
  afpName?: string;

  @IsOptional()
  @IsString()
  afpCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  @Type(() => Number)
  afpRate?: number;

  @IsOptional()
  @IsBoolean()
  isAfpVoluntary?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  voluntaryAfpAmount?: number;

  // ── Other ───────────────────────────────────────────────────────────
  @IsOptional()
  @IsIn(['INDEFINIDO_EMPLOYER', 'PLAZO_FIJO'])
  seguroCesantiaType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  apvAmount?: number;

  @IsOptional()
  @IsIn(['A', 'B', 'C', 'D'])
  familyAllowanceTramo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfDependents?: number;
}

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/, {
    message: 'RUT debe tener formato XX.XXX.XXX-X',
  })
  rut?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsIn(['MASCULINO', 'FEMENINO', 'OTRO'])
  gender?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsIn(['SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNION_CIVIL'])
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  comuna?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  employeeCode?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @IsOptional()
  @IsIn(['INDEFINIDO', 'PLAZO_FIJO', 'POR_OBRA', 'HONORARIOS'])
  contractType?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsIn(['FULL_TIME', 'PART_TIME'])
  workSchedule?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(45)
  weeklyHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  baseSalary?: number;

  @IsOptional()
  @IsIn(['ARTICULO_47', 'ARTICULO_50'])
  gratificationType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  colacionAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  movilizacionAmount?: number;

  @IsOptional()
  @IsIn(['FONASA', 'ISAPRE'])
  healthSystem?: string;

  @IsOptional()
  @IsString()
  isapre?: string;

  @IsOptional()
  @IsString()
  isapreCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  isaprePlanUf?: number;

  @IsOptional()
  @IsIn(['A', 'B', 'C', 'D'])
  fonasaTramo?: string;

  @IsOptional()
  @IsIn(['CAPITAL', 'CUPRUM', 'HABITAT', 'MODELO', 'PLANVITAL', 'PROVIDA', 'UNO'])
  afpName?: string;

  @IsOptional()
  @IsString()
  afpCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  @Type(() => Number)
  afpRate?: number;

  @IsOptional()
  @IsBoolean()
  isAfpVoluntary?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  voluntaryAfpAmount?: number;

  @IsOptional()
  @IsIn(['INDEFINIDO_EMPLOYER', 'PLAZO_FIJO'])
  seguroCesantiaType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  apvAmount?: number;

  @IsOptional()
  @IsIn(['A', 'B', 'C', 'D'])
  familyAllowanceTramo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  numberOfDependents?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListEmployeesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsIn(['INDEFINIDO', 'PLAZO_FIJO', 'POR_OBRA', 'HONORARIOS'])
  contractType?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  isActive?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Payroll DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreatePayrollDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Periodo debe tener formato YYYY-MM' })
  period: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  ufValue: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  utmValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  ingresoMinimo?: number;
}

export class CalculatePayrollDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  mutualidadRate?: number;
}

export class PayrollDetailOverrideDto {
  @IsUUID()
  employeeId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bonos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  comisiones?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  otrosHaberes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  horasExtra?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  anticipos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  prestamos?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  otrosDescuentos?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  daysWorked?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  daysAbsent?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Attendance DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export class CreateAttendanceDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  checkIn?: string;

  @IsOptional()
  @IsString()
  checkOut?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  hoursWorked?: number;

  @IsOptional()
  @IsIn(['NORMAL', 'HORA_EXTRA', 'FERIADO', 'LICENCIA_MEDICA', 'VACACIONES', 'PERMISO'])
  type?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListAttendanceQueryDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'Periodo debe tener formato YYYY-MM' })
  period?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class PayrollSummaryQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Anio debe tener formato YYYY' })
  year?: string;
}

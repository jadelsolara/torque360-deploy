import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RrhhService } from './rrhh.service';
import { PayrollService } from './payroll.service';
import { AttendanceService } from './attendance.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  ListEmployeesQueryDto,
  CreatePayrollDto,
  CalculatePayrollDto,
  PayrollDetailOverrideDto,
  CreateAttendanceDto,
  ListAttendanceQueryDto,
  PayrollSummaryQueryDto,
} from './rrhh.dto';
import { Tenant, Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('rrhh')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class RrhhController {
  constructor(
    private readonly rrhhService: RrhhService,
    private readonly payrollService: PayrollService,
    private readonly attendanceService: AttendanceService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  // Employee Endpoints
  // ═══════════════════════════════════════════════════════════════════

  @Post('employees')
  @Roles('MANAGER')
  createEmployee(
    @Tenant() tenantId: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.rrhhService.createEmployee(tenantId, dto);
  }

  @Get('employees')
  @Roles('MANAGER')
  findAllEmployees(
    @Tenant() tenantId: string,
    @Query() query: ListEmployeesQueryDto,
  ) {
    return this.rrhhService.findAll(tenantId, query);
  }

  @Get('employees/headcount')
  @Roles('MANAGER')
  getHeadcount(@Tenant() tenantId: string) {
    return this.rrhhService.getHeadcount(tenantId);
  }

  @Get('employees/by-department')
  @Roles('MANAGER')
  getByDepartment(@Tenant() tenantId: string) {
    return this.rrhhService.getEmployeesByDepartment(tenantId);
  }

  @Get('employees/:id')
  @Roles('MANAGER')
  findOneEmployee(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.rrhhService.findOne(tenantId, id);
  }

  @Patch('employees/:id')
  @Roles('MANAGER')
  updateEmployee(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.rrhhService.updateEmployee(tenantId, id, dto);
  }

  @Delete('employees/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivateEmployee(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.rrhhService.deactivateEmployee(tenantId, id);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Payroll Endpoints
  // ═══════════════════════════════════════════════════════════════════

  @Post('payroll')
  @Roles('MANAGER')
  createPayroll(
    @Tenant() tenantId: string,
    @Body() dto: CreatePayrollDto,
  ) {
    return this.payrollService.createPayroll(tenantId, dto);
  }

  @Get('payroll')
  @Roles('MANAGER')
  findAllPayrolls(@Tenant() tenantId: string) {
    return this.payrollService.findAllPayrolls(tenantId);
  }

  @Get('payroll/summary')
  @Roles('MANAGER')
  getPayrollSummary(
    @Tenant() tenantId: string,
    @Query() query: PayrollSummaryQueryDto,
  ) {
    const year = query.year || new Date().getFullYear().toString();
    return this.payrollService.getPayrollSummary(tenantId, year);
  }

  @Get('payroll/:id')
  @Roles('MANAGER')
  findOnePayroll(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.findPayroll(tenantId, id);
  }

  @Get('payroll/:id/details')
  @Roles('MANAGER')
  getPayrollDetail(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.getPayrollDetail(tenantId, id);
  }

  @Get('payroll/:id/employee/:empId/payslip')
  @Roles('MANAGER')
  getEmployeePayslip(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('empId') empId: string,
  ) {
    return this.payrollService.getEmployeePayslip(tenantId, id, empId);
  }

  @Post('payroll/:id/calculate')
  @Roles('MANAGER')
  calculatePayroll(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body()
    body: {
      overrides?: PayrollDetailOverrideDto[];
      mutualidadRate?: number;
    },
  ) {
    return this.payrollService.calculatePayroll(
      tenantId,
      id,
      body?.overrides,
      body?.mutualidadRate,
    );
  }

  @Patch('payroll/:id/approve')
  @Roles('ADMIN')
  approvePayroll(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.payrollService.approvePayroll(tenantId, id, userId);
  }

  @Patch('payroll/:id/pay')
  @Roles('ADMIN')
  markPaid(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.markPaid(tenantId, id);
  }

  @Patch('payroll/:id/void')
  @Roles('ADMIN')
  voidPayroll(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.voidPayroll(tenantId, id);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Attendance Endpoints
  // ═══════════════════════════════════════════════════════════════════

  @Post('attendance')
  @Roles('OPERATOR')
  recordAttendance(
    @Tenant() tenantId: string,
    @Body() dto: CreateAttendanceDto,
  ) {
    return this.attendanceService.recordAttendance(tenantId, dto);
  }

  @Get('attendance')
  @Roles('OPERATOR')
  findAllAttendance(
    @Tenant() tenantId: string,
    @Query() query: ListAttendanceQueryDto,
  ) {
    return this.attendanceService.findAll(tenantId, query);
  }

  @Get('attendance/employee/:empId')
  @Roles('OPERATOR')
  getMonthlyAttendance(
    @Tenant() tenantId: string,
    @Param('empId') empId: string,
    @Query('period') period: string,
  ) {
    return this.attendanceService.getMonthlyAttendance(tenantId, empId, period);
  }

  @Get('attendance/employee/:empId/overtime')
  @Roles('MANAGER')
  getOvertimeHours(
    @Tenant() tenantId: string,
    @Param('empId') empId: string,
    @Query('period') period: string,
  ) {
    return this.attendanceService.getOvertimeHours(tenantId, empId, period);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance } from '../../database/entities/attendance.entity';
import { Employee } from '../../database/entities/employee.entity';
import { CreateAttendanceDto, ListAttendanceQueryDto } from './rrhh.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private attendanceRepo: Repository<Attendance>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
  ) {}

  async recordAttendance(
    tenantId: string,
    dto: CreateAttendanceDto,
  ): Promise<Attendance> {
    // Verify employee exists and belongs to tenant
    const employee = await this.employeeRepo.findOne({
      where: { id: dto.employeeId, tenantId },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Calculate hours worked if check-in and check-out provided
    let hoursWorked = dto.hoursWorked ?? 0;
    if (dto.checkIn && dto.checkOut && !dto.hoursWorked) {
      const checkIn = new Date(dto.checkIn);
      const checkOut = new Date(dto.checkOut);
      const diffMs = checkOut.getTime() - checkIn.getTime();
      hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    }

    const attendance = this.attendanceRepo.create({
      tenantId,
      employeeId: dto.employeeId,
      date: dto.date,
      checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
      checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
      hoursWorked,
      type: dto.type || 'NORMAL',
      notes: dto.notes,
    });

    return this.attendanceRepo.save(attendance) as Promise<Attendance>;
  }

  async findAll(
    tenantId: string,
    query: ListAttendanceQueryDto,
  ): Promise<Attendance[]> {
    const qb = this.attendanceRepo
      .createQueryBuilder('att')
      .leftJoinAndSelect('att.employee', 'emp')
      .where('att.tenantId = :tenantId', { tenantId });

    if (query.employeeId) {
      qb.andWhere('att.employeeId = :employeeId', { employeeId: query.employeeId });
    }

    if (query.period) {
      // period is YYYY-MM, get first and last day
      const [year, month] = query.period.split('-').map(Number);
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      qb.andWhere('att.date >= :firstDay AND att.date <= :lastDay', {
        firstDay: firstDay.toISOString().split('T')[0],
        lastDay: lastDay.toISOString().split('T')[0],
      });
    }

    if (query.dateFrom) {
      qb.andWhere('att.date >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      qb.andWhere('att.date <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('att.date', 'DESC').addOrderBy('emp.lastName', 'ASC');

    return qb.getMany();
  }

  async getMonthlyAttendance(
    tenantId: string,
    employeeId: string,
    period: string,
  ): Promise<{
    employee: Employee;
    records: Attendance[];
    summary: {
      totalDays: number;
      normalDays: number;
      overtimeHours: number;
      absences: number;
      vacationDays: number;
      sickDays: number;
    };
  }> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, tenantId },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    const [year, month] = period.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const records = await this.attendanceRepo.find({
      where: {
        tenantId,
        employeeId,
        date: Between(
          firstDay.toISOString().split('T')[0] as any,
          lastDay.toISOString().split('T')[0] as any,
        ),
      },
      order: { date: 'ASC' },
    });

    const normalDays = records.filter((r) => r.type === 'NORMAL').length;
    const overtimeHours = records
      .filter((r) => r.type === 'HORA_EXTRA')
      .reduce((sum, r) => sum + Number(r.hoursWorked), 0);
    const absences = records.filter(
      (r) => r.type === 'PERMISO',
    ).length;
    const vacationDays = records.filter((r) => r.type === 'VACACIONES').length;
    const sickDays = records.filter((r) => r.type === 'LICENCIA_MEDICA').length;

    return {
      employee,
      records,
      summary: {
        totalDays: records.length,
        normalDays,
        overtimeHours,
        absences,
        vacationDays,
        sickDays,
      },
    };
  }

  async getOvertimeHours(
    tenantId: string,
    employeeId: string,
    period: string,
  ): Promise<number> {
    const [year, month] = period.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const result = await this.attendanceRepo
      .createQueryBuilder('att')
      .select('COALESCE(SUM(att.hoursWorked), 0)', 'total')
      .where('att.tenantId = :tenantId', { tenantId })
      .andWhere('att.employeeId = :employeeId', { employeeId })
      .andWhere('att.type = :type', { type: 'HORA_EXTRA' })
      .andWhere('att.date >= :firstDay AND att.date <= :lastDay', {
        firstDay: firstDay.toISOString().split('T')[0],
        lastDay: lastDay.toISOString().split('T')[0],
      })
      .getRawOne();

    return Number(result?.total ?? 0);
  }
}

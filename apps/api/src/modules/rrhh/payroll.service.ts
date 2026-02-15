import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll } from '../../database/entities/payroll.entity';
import { PayrollDetail } from '../../database/entities/payroll-detail.entity';
import { Employee } from '../../database/entities/employee.entity';
import {
  CreatePayrollDto,
  PayrollDetailOverrideDto,
} from './rrhh.dto';
import {
  calculatePayrollLine,
  PayrollLineInput,
  INGRESO_MINIMO_DEFAULT,
} from './chilean-tax.helper';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Payroll) private payrollRepo: Repository<Payroll>,
    @InjectRepository(PayrollDetail) private detailRepo: Repository<PayrollDetail>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
  ) {}

  // ── Create draft payroll ──────────────────────────────────────────
  async createPayroll(tenantId: string, dto: CreatePayrollDto): Promise<Payroll> {
    // Check for existing payroll for same period
    const existing = await this.payrollRepo.findOne({
      where: { tenantId, period: dto.period },
    });
    if (existing && existing.status !== 'VOIDED') {
      throw new ConflictException(
        `Ya existe una nomina para el periodo ${dto.period} (estado: ${existing.status})`,
      );
    }

    const payroll = this.payrollRepo.create({
      tenantId,
      period: dto.period,
      status: 'DRAFT',
      ufValue: dto.ufValue,
      utmValue: dto.utmValue,
      ingresoMinimo: dto.ingresoMinimo ?? INGRESO_MINIMO_DEFAULT,
      employeeCount: 0,
      totalHaberes: 0,
      totalDescuentos: 0,
      totalLiquido: 0,
      totalCostoEmpresa: 0,
    });

    return this.payrollRepo.save(payroll) as Promise<Payroll>;
  }

  // ── Calculate all payroll lines ───────────────────────────────────
  async calculatePayroll(
    tenantId: string,
    payrollId: string,
    overrides?: PayrollDetailOverrideDto[],
    mutualidadRate?: number,
  ): Promise<Payroll> {
    const payroll = await this.findPayroll(tenantId, payrollId);

    if (payroll.status !== 'DRAFT' && payroll.status !== 'CALCULATED') {
      throw new BadRequestException(
        `No se puede recalcular una nomina con estado ${payroll.status}`,
      );
    }

    // Delete existing details if recalculating
    await this.detailRepo.delete({ payrollId, tenantId });

    // Get all active employees
    const employees = await this.employeeRepo.find({
      where: { tenantId, isActive: true },
    });

    if (employees.length === 0) {
      throw new BadRequestException('No hay empleados activos para calcular la nomina');
    }

    // Build overrides map
    const overrideMap = new Map<string, PayrollDetailOverrideDto>();
    if (overrides) {
      for (const ov of overrides) {
        overrideMap.set(ov.employeeId, ov);
      }
    }

    let totalHaberes = 0;
    let totalDescuentos = 0;
    let totalLiquido = 0;
    let totalCostoEmpresa = 0;

    const detailEntities: PayrollDetail[] = [];

    for (const emp of employees) {
      // Skip HONORARIOS — they are boleta, not payroll
      if (emp.contractType === 'HONORARIOS') continue;

      const ov = overrideMap.get(emp.id);

      const input: PayrollLineInput = {
        baseSalary: Number(emp.baseSalary),
        gratificationType: emp.gratificationType || 'ARTICULO_47',
        colacionAmount: Number(emp.colacionAmount) || 0,
        movilizacionAmount: Number(emp.movilizacionAmount) || 0,
        horasExtra: ov?.horasExtra ?? 0,
        weeklyHours: emp.weeklyHours || 45,
        bonos: ov?.bonos ?? 0,
        comisiones: ov?.comisiones ?? 0,
        otrosHaberes: ov?.otrosHaberes ?? 0,
        healthSystem: emp.healthSystem || 'FONASA',
        isaprePlanUf: Number(emp.isaprePlanUf) || 0,
        afpRate: Number(emp.afpRate) || 0,
        contractType: emp.contractType || 'INDEFINIDO',
        apvAmount: Number(emp.apvAmount) || 0,
        anticipos: ov?.anticipos ?? 0,
        prestamos: ov?.prestamos ?? 0,
        otrosDescuentos: ov?.otrosDescuentos ?? 0,
        daysWorked: ov?.daysWorked ?? 30,
        daysAbsent: ov?.daysAbsent ?? 0,
        ufValue: Number(payroll.ufValue),
        utmValue: Number(payroll.utmValue),
        ingresoMinimo: Number(payroll.ingresoMinimo) || INGRESO_MINIMO_DEFAULT,
        mutualidadRate,
      };

      const result = calculatePayrollLine(input);

      const detail = this.detailRepo.create({
        tenantId,
        payrollId,
        employeeId: emp.id,
        ...result,
      });

      detailEntities.push(detail);

      totalHaberes += result.totalHaberes;
      totalDescuentos += result.totalDescuentos;
      totalLiquido += result.sueldoLiquido;
      totalCostoEmpresa += result.costoTotalEmpresa;
    }

    // Bulk save all details
    await this.detailRepo.save(detailEntities);

    // Update payroll header
    payroll.status = 'CALCULATED';
    payroll.employeeCount = detailEntities.length;
    payroll.totalHaberes = totalHaberes;
    payroll.totalDescuentos = totalDescuentos;
    payroll.totalLiquido = totalLiquido;
    payroll.totalCostoEmpresa = totalCostoEmpresa;
    payroll.calculatedAt = new Date();

    return this.payrollRepo.save(payroll) as Promise<Payroll>;
  }

  // ── Approve ───────────────────────────────────────────────────────
  async approvePayroll(
    tenantId: string,
    payrollId: string,
    userId: string,
  ): Promise<Payroll> {
    const payroll = await this.findPayroll(tenantId, payrollId);

    if (payroll.status !== 'CALCULATED') {
      throw new BadRequestException(
        `Solo se puede aprobar una nomina con estado CALCULATED (actual: ${payroll.status})`,
      );
    }

    payroll.status = 'APPROVED';
    payroll.approvedBy = userId;
    payroll.approvedAt = new Date();

    return this.payrollRepo.save(payroll) as Promise<Payroll>;
  }

  // ── Mark Paid ─────────────────────────────────────────────────────
  async markPaid(tenantId: string, payrollId: string): Promise<Payroll> {
    const payroll = await this.findPayroll(tenantId, payrollId);

    if (payroll.status !== 'APPROVED') {
      throw new BadRequestException(
        `Solo se puede marcar como pagada una nomina APPROVED (actual: ${payroll.status})`,
      );
    }

    payroll.status = 'PAID';
    payroll.paidAt = new Date();

    return this.payrollRepo.save(payroll) as Promise<Payroll>;
  }

  // ── Void ──────────────────────────────────────────────────────────
  async voidPayroll(tenantId: string, payrollId: string): Promise<Payroll> {
    const payroll = await this.findPayroll(tenantId, payrollId);

    if (payroll.status === 'PAID') {
      throw new BadRequestException(
        'No se puede anular una nomina que ya fue pagada',
      );
    }

    payroll.status = 'VOIDED';

    // Remove associated details
    await this.detailRepo.delete({ payrollId, tenantId });

    return this.payrollRepo.save(payroll) as Promise<Payroll>;
  }

  // ── Queries ───────────────────────────────────────────────────────
  async findPayroll(tenantId: string, payrollId: string): Promise<Payroll> {
    const payroll = await this.payrollRepo.findOne({
      where: { id: payrollId, tenantId },
    });
    if (!payroll) {
      throw new NotFoundException('Nomina no encontrada');
    }
    return payroll;
  }

  async findAllPayrolls(tenantId: string): Promise<Payroll[]> {
    return this.payrollRepo.find({
      where: { tenantId },
      order: { period: 'DESC' },
    });
  }

  async getPayrollDetail(
    tenantId: string,
    payrollId: string,
  ): Promise<{ payroll: Payroll; details: PayrollDetail[] }> {
    const payroll = await this.findPayroll(tenantId, payrollId);

    const details = await this.detailRepo.find({
      where: { payrollId, tenantId },
      relations: ['employee'],
      order: { createdAt: 'ASC' },
    });

    return { payroll, details };
  }

  async getEmployeePayslip(
    tenantId: string,
    payrollId: string,
    employeeId: string,
  ): Promise<{ payroll: Payroll; detail: PayrollDetail; employee: Employee }> {
    const payroll = await this.findPayroll(tenantId, payrollId);

    const detail = await this.detailRepo.findOne({
      where: { payrollId, employeeId, tenantId },
      relations: ['employee'],
    });

    if (!detail) {
      throw new NotFoundException(
        'No se encontro liquidacion para este empleado en esta nomina',
      );
    }

    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, tenantId },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return { payroll, detail, employee };
  }

  async getPayrollSummary(
    tenantId: string,
    year: string,
  ): Promise<{
    year: string;
    months: {
      period: string;
      status: string;
      employeeCount: number;
      totalHaberes: number;
      totalDescuentos: number;
      totalLiquido: number;
      totalCostoEmpresa: number;
    }[];
    totals: {
      totalHaberes: number;
      totalDescuentos: number;
      totalLiquido: number;
      totalCostoEmpresa: number;
    };
  }> {
    const payrolls = await this.payrollRepo
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.period LIKE :year', { year: `${year}-%` })
      .andWhere('p.status != :voided', { voided: 'VOIDED' })
      .orderBy('p.period', 'ASC')
      .getMany();

    const months = payrolls.map((p) => ({
      period: p.period,
      status: p.status,
      employeeCount: p.employeeCount,
      totalHaberes: Number(p.totalHaberes),
      totalDescuentos: Number(p.totalDescuentos),
      totalLiquido: Number(p.totalLiquido),
      totalCostoEmpresa: Number(p.totalCostoEmpresa),
    }));

    const totals = months.reduce(
      (acc, m) => ({
        totalHaberes: acc.totalHaberes + m.totalHaberes,
        totalDescuentos: acc.totalDescuentos + m.totalDescuentos,
        totalLiquido: acc.totalLiquido + m.totalLiquido,
        totalCostoEmpresa: acc.totalCostoEmpresa + m.totalCostoEmpresa,
      }),
      { totalHaberes: 0, totalDescuentos: 0, totalLiquido: 0, totalCostoEmpresa: 0 },
    );

    return { year, months, totals };
  }
}

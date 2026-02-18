import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { Payroll } from '../../database/entities/payroll.entity';
import { PayrollDetail } from '../../database/entities/payroll-detail.entity';
import { Employee } from '../../database/entities/employee.entity';
import {
  createMockRepository,
  createMockDataSource,
  createEmployee,
} from '../../../test/helpers/test.utils';
import { INGRESO_MINIMO_DEFAULT } from './chilean-tax.helper';

describe('PayrollService', () => {
  let service: PayrollService;
  let payrollRepo: ReturnType<typeof createMockRepository>;
  let detailRepo: ReturnType<typeof createMockRepository>;
  let employeeRepo: ReturnType<typeof createMockRepository>;
  let dataSource: ReturnType<typeof createMockDataSource>;

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    payrollRepo = createMockRepository();
    detailRepo = createMockRepository();
    employeeRepo = createMockRepository();
    dataSource = createMockDataSource();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: getRepositoryToken(Payroll), useValue: payrollRepo },
        { provide: getRepositoryToken(PayrollDetail), useValue: detailRepo },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════════════
  //  createPayroll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createPayroll', () => {
    const dto = {
      period: '2024-01',
      ufValue: 37000,
      utmValue: 65000,
    };

    it('should create a DRAFT payroll', async () => {
      payrollRepo.findOne.mockResolvedValue(null);
      const created = {
        id: 'payroll-1',
        tenantId,
        period: dto.period,
        status: 'DRAFT',
        ufValue: dto.ufValue,
        utmValue: dto.utmValue,
        ingresoMinimo: INGRESO_MINIMO_DEFAULT,
        employeeCount: 0,
        totalHaberes: 0,
        totalDescuentos: 0,
        totalLiquido: 0,
        totalCostoEmpresa: 0,
      };
      payrollRepo.create.mockReturnValue(created);
      payrollRepo.save.mockResolvedValue(created);

      const result = await service.createPayroll(tenantId, dto as any);

      expect(result.status).toBe('DRAFT');
      expect(result.period).toBe('2024-01');
      expect(result.employeeCount).toBe(0);
    });

    it('should throw ConflictException if period already exists (non-VOIDED)', async () => {
      payrollRepo.findOne.mockResolvedValue({
        id: 'existing',
        period: dto.period,
        status: 'DRAFT',
      });

      await expect(service.createPayroll(tenantId, dto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow re-creation if previous payroll is VOIDED', async () => {
      payrollRepo.findOne.mockResolvedValue({
        id: 'existing',
        period: dto.period,
        status: 'VOIDED',
      });
      const created = { id: 'new', tenantId, period: dto.period, status: 'DRAFT' };
      payrollRepo.create.mockReturnValue(created);
      payrollRepo.save.mockResolvedValue(created);

      const result = await service.createPayroll(tenantId, dto as any);

      expect(result.status).toBe('DRAFT');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  calculatePayroll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('calculatePayroll', () => {
    it('should calculate payroll for all active employees', async () => {
      const payroll = {
        id: 'payroll-1',
        tenantId,
        status: 'DRAFT',
        ufValue: 37000,
        utmValue: 65000,
        ingresoMinimo: INGRESO_MINIMO_DEFAULT,
      };
      payrollRepo.findOne.mockResolvedValue(payroll);
      detailRepo.delete.mockResolvedValue({ affected: 0 });

      const employees = [
        createEmployee({ tenantId, baseSalary: 600000, contractType: 'INDEFINIDO' }),
        createEmployee({ tenantId, baseSalary: 800000, contractType: 'INDEFINIDO' }),
      ];
      employeeRepo.find.mockResolvedValue(employees);
      detailRepo.create.mockImplementation((data: any) => data);
      detailRepo.save.mockResolvedValue([]);
      payrollRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.calculatePayroll(tenantId, 'payroll-1');

      expect(result.status).toBe('CALCULATED');
      expect(result.employeeCount).toBe(2);
      expect(result.totalHaberes).toBeGreaterThan(0);
      expect(result.totalDescuentos).toBeGreaterThan(0);
      expect(result.totalLiquido).toBeGreaterThan(0);
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('should skip HONORARIOS employees', async () => {
      const payroll = {
        id: 'payroll-1',
        tenantId,
        status: 'DRAFT',
        ufValue: 37000,
        utmValue: 65000,
        ingresoMinimo: INGRESO_MINIMO_DEFAULT,
      };
      payrollRepo.findOne.mockResolvedValue(payroll);
      detailRepo.delete.mockResolvedValue({ affected: 0 });

      const employees = [
        createEmployee({ tenantId, contractType: 'INDEFINIDO' }),
        createEmployee({ tenantId, contractType: 'HONORARIOS' }),
      ];
      employeeRepo.find.mockResolvedValue(employees);
      detailRepo.create.mockImplementation((data: any) => data);
      detailRepo.save.mockResolvedValue([]);
      payrollRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.calculatePayroll(tenantId, 'payroll-1');

      expect(result.employeeCount).toBe(1); // Only INDEFINIDO
    });

    it('should throw if no active employees', async () => {
      const payroll = { id: 'payroll-1', tenantId, status: 'DRAFT', ufValue: 37000, utmValue: 65000, ingresoMinimo: 500000 };
      payrollRepo.findOne.mockResolvedValue(payroll);
      detailRepo.delete.mockResolvedValue({ affected: 0 });
      employeeRepo.find.mockResolvedValue([]);

      await expect(
        service.calculatePayroll(tenantId, 'payroll-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject calculation on APPROVED payroll', async () => {
      payrollRepo.findOne.mockResolvedValue({
        id: 'payroll-1',
        tenantId,
        status: 'APPROVED',
      });

      await expect(
        service.calculatePayroll(tenantId, 'payroll-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow recalculation on CALCULATED payroll', async () => {
      const payroll = {
        id: 'payroll-1',
        tenantId,
        status: 'CALCULATED',
        ufValue: 37000,
        utmValue: 65000,
        ingresoMinimo: INGRESO_MINIMO_DEFAULT,
      };
      payrollRepo.findOne.mockResolvedValue(payroll);
      detailRepo.delete.mockResolvedValue({ affected: 2 });
      const employees = [createEmployee({ tenantId })];
      employeeRepo.find.mockResolvedValue(employees);
      detailRepo.create.mockImplementation((data: any) => data);
      detailRepo.save.mockResolvedValue([]);
      payrollRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.calculatePayroll(tenantId, 'payroll-1');

      expect(dataSource._mockManager.delete).toHaveBeenCalledWith(PayrollDetail, { payrollId: 'payroll-1', tenantId });
      expect(result.status).toBe('CALCULATED');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Status Lifecycle: approve → markPaid → void
  // ═══════════════════════════════════════════════════════════════════════════

  describe('approvePayroll', () => {
    it('should approve a CALCULATED payroll', async () => {
      payrollRepo.findOne.mockResolvedValue({ id: 'p1', tenantId, status: 'CALCULATED' });
      payrollRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.approvePayroll(tenantId, 'p1', 'admin-1');

      expect(result.status).toBe('APPROVED');
      expect(result.approvedBy).toBe('admin-1');
      expect(result.approvedAt).toBeInstanceOf(Date);
    });

    it('should reject approval of DRAFT payroll', async () => {
      payrollRepo.findOne.mockResolvedValue({ id: 'p1', tenantId, status: 'DRAFT' });

      await expect(service.approvePayroll(tenantId, 'p1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markPaid', () => {
    it('should mark APPROVED payroll as PAID', async () => {
      payrollRepo.findOne.mockResolvedValue({ id: 'p1', tenantId, status: 'APPROVED' });
      payrollRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.markPaid(tenantId, 'p1');

      expect(result.status).toBe('PAID');
      expect(result.paidAt).toBeInstanceOf(Date);
    });

    it('should reject marking DRAFT as paid', async () => {
      payrollRepo.findOne.mockResolvedValue({ id: 'p1', tenantId, status: 'DRAFT' });

      await expect(service.markPaid(tenantId, 'p1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('voidPayroll', () => {
    it('should void a DRAFT payroll and delete details', async () => {
      payrollRepo.findOne.mockResolvedValue({ id: 'p1', tenantId, status: 'DRAFT' });
      detailRepo.delete.mockResolvedValue({ affected: 5 });
      payrollRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.voidPayroll(tenantId, 'p1');

      expect(result.status).toBe('VOIDED');
      expect(dataSource._mockManager.delete).toHaveBeenCalledWith(PayrollDetail, { payrollId: 'p1', tenantId });
    });

    it('should reject voiding a PAID payroll', async () => {
      payrollRepo.findOne.mockResolvedValue({ id: 'p1', tenantId, status: 'PAID' });

      await expect(service.voidPayroll(tenantId, 'p1')).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  findPayroll
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findPayroll', () => {
    it('should return payroll if found', async () => {
      const payroll = { id: 'p1', tenantId, status: 'DRAFT' };
      payrollRepo.findOne.mockResolvedValue(payroll);

      const result = await service.findPayroll(tenantId, 'p1');

      expect(result.id).toBe('p1');
    });

    it('should throw NotFoundException if not found', async () => {
      payrollRepo.findOne.mockResolvedValue(null);

      await expect(service.findPayroll(tenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

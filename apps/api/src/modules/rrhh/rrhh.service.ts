import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../database/entities/employee.entity';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  ListEmployeesQueryDto,
} from './rrhh.dto';
import { AFP_RATES } from './chilean-tax.helper';

@Injectable()
export class RrhhService {
  constructor(
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
  ) {}

  async createEmployee(tenantId: string, dto: CreateEmployeeDto): Promise<Employee> {
    // Check for duplicate RUT within tenant
    const existing = await this.employeeRepo.findOne({
      where: { tenantId, rut: dto.rut },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un empleado con RUT ${dto.rut} en esta empresa`);
    }

    // Auto-fill AFP rate from name if not provided
    let afpRate = dto.afpRate;
    if (!afpRate && dto.afpName) {
      afpRate = AFP_RATES[dto.afpName.toUpperCase()] || 0;
    }

    const employee = this.employeeRepo.create({
      tenantId,
      ...dto,
      afpRate: afpRate ?? 0,
    });

    return this.employeeRepo.save(employee);
  }

  async updateEmployee(
    tenantId: string,
    employeeId: string,
    dto: UpdateEmployeeDto,
  ): Promise<Employee> {
    const employee = await this.findOne(tenantId, employeeId);

    // If changing RUT, check for duplicates
    if (dto.rut && dto.rut !== employee.rut) {
      const existing = await this.employeeRepo.findOne({
        where: { tenantId, rut: dto.rut },
      });
      if (existing) {
        throw new ConflictException(`Ya existe un empleado con RUT ${dto.rut} en esta empresa`);
      }
    }

    // Auto-fill AFP rate if name changes
    if (dto.afpName && !dto.afpRate) {
      dto.afpRate = AFP_RATES[dto.afpName.toUpperCase()] || employee.afpRate;
    }

    Object.assign(employee, dto);
    return this.employeeRepo.save(employee);
  }

  async findAll(tenantId: string, query: ListEmployeesQueryDto): Promise<Employee[]> {
    const qb = this.employeeRepo
      .createQueryBuilder('emp')
      .where('emp.tenantId = :tenantId', { tenantId });

    if (query.search) {
      qb.andWhere(
        '(emp.firstName ILIKE :search OR emp.lastName ILIKE :search OR emp.rut ILIKE :search OR emp.employeeCode ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.department) {
      qb.andWhere('emp.department = :department', { department: query.department });
    }

    if (query.contractType) {
      qb.andWhere('emp.contractType = :contractType', { contractType: query.contractType });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('emp.isActive = :isActive', { isActive: query.isActive === 'true' });
    }

    qb.orderBy('emp.lastName', 'ASC').addOrderBy('emp.firstName', 'ASC');

    return qb.getMany();
  }

  async findOne(tenantId: string, employeeId: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id: employeeId, tenantId },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return employee;
  }

  async deactivateEmployee(tenantId: string, employeeId: string): Promise<Employee> {
    const employee = await this.findOne(tenantId, employeeId);
    employee.isActive = false;
    employee.terminationDate = new Date();
    return this.employeeRepo.save(employee);
  }

  async getEmployeesByDepartment(
    tenantId: string,
  ): Promise<{ department: string; count: number }[]> {
    const result = await this.employeeRepo
      .createQueryBuilder('emp')
      .select('emp.department', 'department')
      .addSelect('COUNT(*)', 'count')
      .where('emp.tenantId = :tenantId', { tenantId })
      .andWhere('emp.isActive = true')
      .groupBy('emp.department')
      .orderBy('count', 'DESC')
      .getRawMany();

    return result.map((r) => ({
      department: r.department || 'Sin Departamento',
      count: parseInt(r.count, 10),
    }));
  }

  async getHeadcount(tenantId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byContractType: Record<string, number>;
  }> {
    const all = await this.employeeRepo.find({ where: { tenantId } });
    const active = all.filter((e) => e.isActive);
    const byContractType: Record<string, number> = {};

    for (const emp of active) {
      const ct = emp.contractType || 'INDEFINIDO';
      byContractType[ct] = (byContractType[ct] || 0) + 1;
    }

    return {
      total: all.length,
      active: active.length,
      inactive: all.length - active.length,
      byContractType,
    };
  }

  async getActiveEmployees(tenantId: string): Promise<Employee[]> {
    return this.employeeRepo.find({
      where: { tenantId, isActive: true },
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }
}

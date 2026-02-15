import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Supplier } from '../../database/entities/supplier.entity';
import { CreateSupplierDto, UpdateSupplierDto } from './suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
  ) {}

  async create(tenantId: string, dto: CreateSupplierDto): Promise<Supplier> {
    // Validate RUT uniqueness per tenant if provided
    if (dto.rut) {
      const existing = await this.supplierRepo.findOne({
        where: { tenantId, rut: dto.rut },
      });
      if (existing) {
        throw new ConflictException(`Supplier with RUT ${dto.rut} already exists`);
      }
    }

    const supplier = this.supplierRepo.create({
      tenantId,
      name: dto.name,
      rut: dto.rut,
      country: dto.country,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      paymentTerms: dto.paymentTerms,
      currency: dto.currency || 'CLP',
      notes: dto.notes,
    });

    return this.supplierRepo.save(supplier);
  }

  async findAll(
    tenantId: string,
    filters?: { country?: string; search?: string; minRating?: number },
  ): Promise<Supplier[]> {
    const qb = this.supplierRepo
      .createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .orderBy('s.name', 'ASC');

    if (filters?.country) {
      qb.andWhere('s.country = :country', { country: filters.country });
    }

    if (filters?.search) {
      qb.andWhere(
        '(s.name ILIKE :search OR s.rut ILIKE :search OR s.contact_name ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.minRating) {
      qb.andWhere('s.rating >= :minRating', { minRating: filters.minRating });
    }

    return qb.getMany();
  }

  async findOne(tenantId: string, id: string): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({
      where: { id, tenantId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(tenantId: string, id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(tenantId, id);

    // Validate RUT uniqueness if changing RUT
    if (dto.rut && dto.rut !== supplier.rut) {
      const existing = await this.supplierRepo.findOne({
        where: { tenantId, rut: dto.rut },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Supplier with RUT ${dto.rut} already exists`);
      }
    }

    Object.assign(supplier, dto);
    return this.supplierRepo.save(supplier);
  }

  async deactivate(tenantId: string, id: string): Promise<Supplier> {
    const supplier = await this.findOne(tenantId, id);
    supplier.isActive = false;
    return this.supplierRepo.save(supplier);
  }

  async updateRating(tenantId: string, id: string, rating: number): Promise<Supplier> {
    const supplier = await this.findOne(tenantId, id);
    supplier.rating = rating;
    return this.supplierRepo.save(supplier);
  }

  async getTopSuppliers(tenantId: string, limit: number = 10): Promise<Supplier[]> {
    return this.supplierRepo.find({
      where: { tenantId, isActive: true },
      order: { rating: 'DESC' },
      take: limit,
    });
  }
}

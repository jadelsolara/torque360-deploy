import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../database/entities/tenant.entity';
import { CreateTenantDto, UpdateTenantSettingsDto } from './tenants.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenantRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Tenant slug already exists');
    }

    const tenant = this.tenantRepo.create({
      name: dto.name,
      slug: dto.slug,
      plan: dto.plan || 'starter',
      settings: dto.settings || {},
    });

    return this.tenantRepo.save(tenant);
  }

  async findById(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateTenantSettingsDto,
  ): Promise<Tenant> {
    const tenant = await this.findById(tenantId);

    if (dto.name !== undefined) tenant.name = dto.name;
    if (dto.plan !== undefined) tenant.plan = dto.plan;
    if (dto.settings !== undefined) {
      tenant.settings = { ...tenant.settings, ...dto.settings };
    }

    return this.tenantRepo.save(tenant);
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../database/entities/company.entity';
import { ClientContact } from '../../database/entities/client-contact.entity';
import { Client } from '../../database/entities/client.entity';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CreateContactDto,
  UpdateContactDto,
  CompanyFiltersDto,
} from './companies.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(ClientContact)
    private contactRepo: Repository<ClientContact>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
  ) {}

  // ─── Companies ─────────────────────────────────────────────────

  async create(tenantId: string, dto: CreateCompanyDto) {
    const existing = await this.companyRepo.findOne({
      where: { tenantId, rut: dto.rut },
    });
    if (existing) {
      throw new ConflictException(`Company with RUT "${dto.rut}" already exists for this tenant`);
    }

    // Validate parent company if provided
    if (dto.parentCompanyId) {
      const parent = await this.companyRepo.findOne({
        where: { id: dto.parentCompanyId, tenantId },
      });
      if (!parent) {
        throw new NotFoundException('Parent company not found');
      }
    }

    const company = this.companyRepo.create({
      tenantId,
      rut: dto.rut,
      businessName: dto.businessName,
      tradeName: dto.tradeName,
      industry: dto.industry,
      address: dto.address,
      city: dto.city,
      region: dto.region,
      phone: dto.phone,
      email: dto.email,
      parentCompanyId: dto.parentCompanyId || undefined,
    });

    return this.companyRepo.save(company) as Promise<Company>;
  }

  async findAll(tenantId: string, filters?: CompanyFiltersDto) {
    const qb = this.companyRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId });

    if (filters?.industry) {
      qb.andWhere('c.industry = :industry', { industry: filters.industry });
    }

    if (filters?.search) {
      qb.andWhere(
        '(c.business_name ILIKE :search OR c.trade_name ILIKE :search OR c.rut ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('c.business_name', 'ASC');

    const companies = await qb.getMany();

    // Add contacts count for each company
    const result = await Promise.all(
      companies.map(async (company) => {
        const contactsCount = await this.contactRepo.count({
          where: { tenantId, clientId: company.id },
        });
        return { ...company, contactsCount };
      }),
    );

    return result;
  }

  async findOne(tenantId: string, id: string) {
    const company = await this.companyRepo.findOne({
      where: { id, tenantId },
      relations: ['contacts'],
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Get linked clients (contacts linked via client_id)
    const linkedClients = await this.contactRepo
      .createQueryBuilder('cc')
      .where('cc.tenant_id = :tenantId', { tenantId })
      .andWhere('cc.client_id = :clientId', { clientId: id })
      .andWhere('cc.client_id IS NOT NULL')
      .getMany();

    // Get client details
    const clientIds = [...new Set(linkedClients.map((c) => c.clientId))];
    const clients = clientIds.length
      ? await this.clientRepo
          .createQueryBuilder('cl')
          .where('cl.id IN (:...clientIds)', { clientIds })
          .andWhere('cl.tenant_id = :tenantId', { tenantId })
          .getMany()
      : [];

    return { ...company, linkedClients: clients };
  }

  async update(tenantId: string, id: string, dto: UpdateCompanyDto) {
    const company = await this.companyRepo.findOne({
      where: { id, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // If updating RUT, check uniqueness
    if (dto.rut && dto.rut !== company.rut) {
      const existing = await this.companyRepo.findOne({
        where: { tenantId, rut: dto.rut },
      });
      if (existing) {
        throw new ConflictException(`Company with RUT "${dto.rut}" already exists for this tenant`);
      }
    }

    // Validate parent company if changing
    if (dto.parentCompanyId && dto.parentCompanyId !== company.parentCompanyId) {
      if (dto.parentCompanyId === id) {
        throw new ConflictException('Company cannot be its own parent');
      }
      const parent = await this.companyRepo.findOne({
        where: { id: dto.parentCompanyId, tenantId },
      });
      if (!parent) {
        throw new NotFoundException('Parent company not found');
      }
    }

    Object.assign(company, dto);
    return this.companyRepo.save(company);
  }

  // ─── Contacts ──────────────────────────────────────────────────

  async addContact(tenantId: string, companyId: string, dto: CreateContactDto) {
    const company = await this.companyRepo.findOne({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // If setting as primary, unset existing primary contacts
    if (dto.isPrimary) {
      await this.contactRepo
        .createQueryBuilder()
        .update(ClientContact)
        .set({ isPrimary: false })
        .where('tenant_id = :tenantId', { tenantId })
        .andWhere('client_id = :clientId', { clientId: companyId })
        .andWhere('is_primary = true')
        .execute();
    }

    const contact = this.contactRepo.create({
      tenantId,
      clientId: companyId, // default: link to company as client reference
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      position: dto.position,
      role: dto.role || 'contact',
      isPrimary: dto.isPrimary || false,
      canApproveQuotes: dto.canApproveQuotes || false,
      canAuthorizeWork: dto.canAuthorizeWork || false,
      notes: dto.notes,
    });

    return this.contactRepo.save(contact);
  }

  async updateContact(tenantId: string, contactId: string, dto: UpdateContactDto) {
    const contact = await this.contactRepo.findOne({
      where: { id: contactId, tenantId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // If setting as primary, unset existing primary contacts in same company
    if (dto.isPrimary && contact.clientId) {
      await this.contactRepo
        .createQueryBuilder()
        .update(ClientContact)
        .set({ isPrimary: false })
        .where('tenant_id = :tenantId', { tenantId })
        .andWhere('client_id = :clientId', { clientId: contact.clientId })
        .andWhere('id != :contactId', { contactId })
        .andWhere('is_primary = true')
        .execute();
    }

    Object.assign(contact, dto);
    return this.contactRepo.save(contact);
  }

  async removeContact(tenantId: string, contactId: string) {
    const contact = await this.contactRepo.findOne({
      where: { id: contactId, tenantId },
    });
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Soft delete — set inactive
    contact.isActive = false;
    await this.contactRepo.save(contact);

    return { message: 'Contact deactivated successfully' };
  }

  async getContacts(tenantId: string, companyId: string) {
    const company = await this.companyRepo.findOne({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.contactRepo.find({
      where: { tenantId, clientId: companyId, isActive: true },
      order: { isPrimary: 'DESC', lastName: 'ASC' },
    });
  }

  // ─── Subsidiaries & Linking ────────────────────────────────────

  async getSubsidiaries(tenantId: string, parentId: string) {
    const parent = await this.companyRepo.findOne({
      where: { id: parentId, tenantId },
    });
    if (!parent) {
      throw new NotFoundException('Parent company not found');
    }

    const subsidiaries = await this.companyRepo.find({
      where: { tenantId, parentCompanyId: parentId },
      order: { businessName: 'ASC' },
    });

    // Add contacts count
    const result = await Promise.all(
      subsidiaries.map(async (sub) => {
        const contactsCount = await this.contactRepo.count({
          where: { tenantId, clientId: sub.id },
        });
        return { ...sub, contactsCount };
      }),
    );

    return result;
  }

  async linkClient(tenantId: string, companyId: string, clientId: string) {
    const company = await this.companyRepo.findOne({
      where: { id: companyId, tenantId },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const client = await this.clientRepo.findOne({
      where: { id: clientId, tenantId },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    // Check if already linked
    const existing = await this.contactRepo.findOne({
      where: { tenantId, clientId },
    });
    if (existing) {
      throw new ConflictException('Client is already linked to this company');
    }

    // Create a contact record linking client to company
    const contact = this.contactRepo.create({
      tenantId,
      clientId,
      firstName: client.firstName || client.companyName || '',
      lastName: client.lastName || '',
      email: client.email,
      phone: client.phone,
      role: 'linked_client',
      isPrimary: false,
    });

    await this.contactRepo.save(contact);

    return { message: 'Client linked to company successfully', contact };
  }
}

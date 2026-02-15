import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Quotation } from '../../database/entities/quotation.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  UpdateQuotationStatusDto,
  ListQuotationsQueryDto,
  QuotationFiltersDto,
  QuotationItemDto,
} from './quotations.dto';

// ── Statuses considered "open" (still actionable) ──
const OPEN_QUOTATION_STATUSES = ['draft', 'sent', 'approved'];
const CLOSED_QUOTATION_STATUSES = ['converted', 'rejected'];

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent'],
  sent: ['approved', 'rejected'],
  approved: ['converted'],
  converted: [],
  rejected: [],
};

// ── Interfaces ──

export interface QuotationStats {
  totalOpen: number;
  draft: number;
  sent: number;
  awaitingApproval: number;
  approved: number;
  expiringSoon: number;
  expired: number;
  conversionRate: number;
}

export interface PaginatedQuotations {
  data: Quotation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: QuotationStats;
}

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation)
    private quotationRepo: Repository<Quotation>,
    @InjectRepository(WorkOrder)
    private workOrderRepo: Repository<WorkOrder>,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════════════════════════

  async create(
    tenantId: string,
    userId: string,
    dto: CreateQuotationDto,
  ): Promise<Quotation> {
    const items = dto.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = dto.tax || 0;
    const total = subtotal + tax;

    const quotation = this.quotationRepo.create({
      tenantId,
      vehicleId: dto.vehicleId,
      clientId: dto.clientId,
      createdBy: userId,
      status: 'draft',
      items,
      subtotal,
      tax,
      total,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      notes: dto.notes,
    });

    return this.quotationRepo.save(quotation) as Promise<Quotation>;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FIND ALL — Legacy (backwards compatible)
  // ═══════════════════════════════════════════════════════════════════

  async findAll(
    tenantId: string,
    query: ListQuotationsQueryDto,
  ): Promise<Quotation[]> {
    const qb = this.quotationRepo
      .createQueryBuilder('q')
      .where('q.tenantId = :tenantId', { tenantId });

    if (query.status) {
      qb.andWhere('q.status = :status', { status: query.status });
    }

    if (query.clientId) {
      qb.andWhere('q.clientId = :clientId', { clientId: query.clientId });
    }

    if (query.vehicleId) {
      qb.andWhere('q.vehicleId = :vehicleId', {
        vehicleId: query.vehicleId,
      });
    }

    if (query.dateFrom) {
      qb.andWhere('q.createdAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }

    if (query.dateTo) {
      qb.andWhere('q.createdAt <= :dateTo', {
        dateTo: new Date(query.dateTo),
      });
    }

    qb.orderBy('q.createdAt', 'DESC');

    return qb.getMany();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FIND ALL — Enhanced with comprehensive filters + pagination
  // ═══════════════════════════════════════════════════════════════════

  async findAllFiltered(
    tenantId: string,
    filters: QuotationFiltersDto,
  ): Promise<PaginatedQuotations> {
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const offset = (page - 1) * limit;

    const qb = this.quotationRepo
      .createQueryBuilder('q')
      .where('q.tenantId = :tenantId', { tenantId });

    // ── Status filter (multi-select) ──
    if (filters.status && filters.status.length > 0) {
      // Handle "expired" as a virtual status (validUntil < now AND not converted/rejected)
      const realStatuses = filters.status.filter((s) => s !== 'expired');
      const hasExpired = filters.status.includes('expired');

      if (realStatuses.length > 0 && hasExpired) {
        qb.andWhere(
          new Brackets((sub) => {
            sub
              .where('q.status IN (:...statuses)', { statuses: realStatuses })
              .orWhere(
                new Brackets((inner) => {
                  inner
                    .where('q.validUntil IS NOT NULL')
                    .andWhere('q.validUntil < :now', { now: new Date() })
                    .andWhere('q.status IN (:...expirableStatuses)', {
                      expirableStatuses: ['draft', 'sent'],
                    });
                }),
              );
          }),
        );
      } else if (hasExpired) {
        qb.andWhere('q.validUntil IS NOT NULL');
        qb.andWhere('q.validUntil < :now', { now: new Date() });
        qb.andWhere('q.status IN (:...expirableStatuses)', {
          expirableStatuses: ['draft', 'sent'],
        });
      } else if (realStatuses.length > 0) {
        qb.andWhere('q.status IN (:...statuses)', { statuses: realStatuses });
      }
    }

    // ── isOpen shortcut ──
    if (filters.isOpen === true) {
      qb.andWhere('q.status IN (:...openStatuses)', {
        openStatuses: OPEN_QUOTATION_STATUSES,
      });
    } else if (filters.isOpen === false) {
      qb.andWhere('q.status IN (:...closedStatuses)', {
        closedStatuses: CLOSED_QUOTATION_STATUSES,
      });
    }

    // ── Client ──
    if (filters.clientId) {
      qb.andWhere('q.clientId = :clientId', { clientId: filters.clientId });
    }

    // ── Vehicle ──
    if (filters.vehicleId) {
      qb.andWhere('q.vehicleId = :vehicleId', { vehicleId: filters.vehicleId });
    }

    // ── Created date range ──
    if (filters.dateFrom) {
      qb.andWhere('q.createdAt >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
    }
    if (filters.dateTo) {
      qb.andWhere('q.createdAt <= :dateTo', { dateTo: new Date(filters.dateTo) });
    }

    // ── Full-text search (quote number, notes) ──
    if (filters.search && filters.search.trim().length > 0) {
      const searchTerm = `%${filters.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('CAST(q.quoteNumber AS TEXT) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(q.notes) LIKE :search', { search: searchTerm });
        }),
      );
    }

    // ── Sorting ──
    const sortOrder = filters.sortOrder || 'DESC';
    if (filters.sortBy === 'validUntil') {
      qb.orderBy('q.validUntil IS NULL', 'ASC');
      qb.addOrderBy('q.validUntil', sortOrder);
    } else if (filters.sortBy === 'total') {
      qb.orderBy('q.total', sortOrder);
    } else if (filters.sortBy === 'quoteNumber') {
      qb.orderBy('q.quoteNumber', sortOrder);
    } else if (filters.sortBy === 'status') {
      qb.orderBy('q.status', sortOrder);
    } else {
      qb.orderBy('q.createdAt', sortOrder);
    }

    // ── Count + paginate ──
    const total = await qb.getCount();
    qb.skip(offset).take(limit);
    const data = await qb.getMany();

    const stats = await this.getOpenQuotationStats(tenantId);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  OPEN QUOTATION STATS
  // ═══════════════════════════════════════════════════════════════════

  async getOpenQuotationStats(tenantId: string): Promise<QuotationStats> {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // ── All quotations for this tenant ──
    const allQuotations = await this.quotationRepo
      .createQueryBuilder('q')
      .where('q.tenantId = :tenantId', { tenantId })
      .getMany();

    const openQuotations = allQuotations.filter((q) =>
      OPEN_QUOTATION_STATUSES.includes(q.status),
    );

    const totalOpen = openQuotations.length;
    const draft = openQuotations.filter((q) => q.status === 'draft').length;
    const sent = openQuotations.filter((q) => q.status === 'sent').length;
    const awaitingApproval = sent; // "sent" means awaiting client approval
    const approved = openQuotations.filter(
      (q) => q.status === 'approved',
    ).length;

    // ── Expiring soon: validUntil within 7 days AND not closed ──
    const expiringSoon = openQuotations.filter(
      (q) =>
        q.validUntil &&
        new Date(q.validUntil) > now &&
        new Date(q.validUntil) <= sevenDaysFromNow,
    ).length;

    // ── Expired: validUntil < now AND still in draft/sent ──
    const expired = allQuotations.filter(
      (q) =>
        q.validUntil &&
        new Date(q.validUntil) < now &&
        ['draft', 'sent'].includes(q.status),
    ).length;

    // ── Conversion rate: converted / (converted + rejected + approved + sent) ──
    const converted = allQuotations.filter(
      (q) => q.status === 'converted',
    ).length;
    const rejected = allQuotations.filter(
      (q) => q.status === 'rejected',
    ).length;
    const decidedTotal = converted + rejected + approved + sent;
    const conversionRate =
      decidedTotal > 0 ? Math.round((converted / decidedTotal) * 100) : 0;

    return {
      totalOpen,
      draft,
      sent,
      awaitingApproval,
      approved,
      expiringSoon,
      expired,
      conversionRate,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FIND BY ID
  // ═══════════════════════════════════════════════════════════════════

  async findById(tenantId: string, quotationId: string): Promise<Quotation> {
    const quotation = await this.quotationRepo.findOne({
      where: { id: quotationId, tenantId },
    });
    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }
    return quotation;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════════════════

  async update(
    tenantId: string,
    quotationId: string,
    dto: UpdateQuotationDto,
  ): Promise<Quotation> {
    const quotation = await this.findById(tenantId, quotationId);

    if (quotation.status !== 'draft') {
      throw new BadRequestException(
        'Can only edit quotations in draft status',
      );
    }

    if (dto.items) {
      quotation.items = dto.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));

      quotation.subtotal = quotation.items.reduce(
        (sum, item) => sum + item.total,
        0,
      );
    }

    if (dto.tax !== undefined) {
      quotation.tax = dto.tax;
    }

    quotation.total = Number(quotation.subtotal) + Number(quotation.tax);

    if (dto.validUntil !== undefined) {
      quotation.validUntil = dto.validUntil
        ? new Date(dto.validUntil)
        : (undefined as any);
    }

    if (dto.notes !== undefined) {
      quotation.notes = dto.notes;
    }

    return this.quotationRepo.save(quotation) as Promise<Quotation>;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE STATUS
  // ═══════════════════════════════════════════════════════════════════

  async updateStatus(
    tenantId: string,
    quotationId: string,
    dto: UpdateQuotationStatusDto,
  ): Promise<Quotation> {
    const quotation = await this.findById(tenantId, quotationId);

    const allowedTransitions =
      VALID_STATUS_TRANSITIONS[quotation.status] || [];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from '${quotation.status}' to '${dto.status}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
      );
    }

    quotation.status = dto.status;

    return this.quotationRepo.save(quotation) as Promise<Quotation>;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  CONVERT TO WORK ORDER
  // ═══════════════════════════════════════════════════════════════════

  async convertToWorkOrder(
    tenantId: string,
    quotationId: string,
  ): Promise<WorkOrder> {
    const quotation = await this.findById(tenantId, quotationId);

    if (quotation.status !== 'approved') {
      throw new BadRequestException(
        'Only approved quotations can be converted to work orders',
      );
    }

    const workOrder = this.workOrderRepo.create({
      tenantId,
      vehicleId: quotation.vehicleId,
      clientId: quotation.clientId,
      status: 'pending',
      type: 'repair',
      priority: 'normal',
      description: `Created from quotation #${quotation.quoteNumber}. ${quotation.notes || ''}`.trim(),
      laborCost: quotation.total,
      totalCost: quotation.total,
    });

    const savedWorkOrder = await this.workOrderRepo.save(workOrder) as WorkOrder;

    quotation.status = 'converted';
    quotation.workOrderId = savedWorkOrder.id;
    await this.quotationRepo.save(quotation);

    return savedWorkOrder;
  }
}

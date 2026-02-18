import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, DataSource } from 'typeorm';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { WorkOrderPart } from '../../database/entities/work-order-part.entity';
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  UpdateStatusDto,
  AssignTechnicianDto,
  AddPartDto,
  ListWorkOrdersQueryDto,
  OrderFiltersDto,
} from './work-orders.dto';

// ── Statuses considered "open" (not finished) ──
const OPEN_STATUSES = ['pending', 'in_progress', 'waiting_parts', 'waiting_approval'];
const CLOSED_STATUSES = ['completed', 'invoiced', 'cancelled'];

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['in_progress', 'waiting_parts', 'waiting_approval', 'cancelled'],
  in_progress: ['waiting_parts', 'waiting_approval', 'completed', 'cancelled'],
  waiting_parts: ['in_progress', 'cancelled'],
  waiting_approval: ['in_progress', 'cancelled'],
  completed: ['invoiced'],
  invoiced: [],
  cancelled: [],
};

// ── Priority sort weight (higher = more urgent → sorts first when DESC) ──
const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

// ── Interfaces ──

export interface OrderStats {
  totalOpen: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdue: number;
  avgDaysOpen: number;
  oldestOpenDays: number;
  closedThisWeek: number;
  closedThisMonth: number;
  avgClosureTime: number;
}

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  count: number;
  orders: WorkOrder[];
}

export interface AgingReport {
  within7Days: WorkOrder[];
  within14Days: WorkOrder[];
  within30Days: WorkOrder[];
  over30Days: WorkOrder[];
  over60Days: WorkOrder[];
  over90Days: WorkOrder[];
}

export interface PaginatedWorkOrders {
  data: WorkOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: OrderStats;
}

@Injectable()
export class WorkOrdersService {
  constructor(
    @InjectRepository(WorkOrder)
    private workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(WorkOrderPart)
    private partRepo: Repository<WorkOrderPart>,
    private dataSource: DataSource,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════════════════════════

  async create(
    tenantId: string,
    dto: CreateWorkOrderDto,
  ): Promise<WorkOrder> {
    // Get next per-tenant order number (atomic via DB function)
    const [{ next_tenant_sequence: orderNumber }] = await this.dataSource.query(
      `SELECT next_tenant_sequence($1, 'order_number')`,
      [tenantId],
    );

    const workOrder = this.workOrderRepo.create({
      tenantId,
      orderNumber: Number(orderNumber),
      vehicleId: dto.vehicleId,
      clientId: dto.clientId,
      assignedTo: dto.assignedTo,
      type: dto.type || 'repair',
      priority: dto.priority || 'normal',
      description: dto.description,
      diagnosis: dto.diagnosis,
      internalNotes: dto.internalNotes,
      estimatedHours: dto.estimatedHours,
      laborCost: dto.laborCost || 0,
      status: 'pending',
    });

    return this.workOrderRepo.save(workOrder) as Promise<WorkOrder>;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FIND ALL — Legacy (backwards compatible)
  // ═══════════════════════════════════════════════════════════════════

  async findAll(
    tenantId: string,
    query: ListWorkOrdersQueryDto,
  ): Promise<WorkOrder[]> {
    const qb = this.workOrderRepo
      .createQueryBuilder('wo')
      .leftJoinAndSelect('wo.vehicle', 'vehicle')
      .leftJoinAndSelect('wo.parts', 'parts')
      .where('wo.tenantId = :tenantId', { tenantId });

    if (query.status) {
      qb.andWhere('wo.status = :status', { status: query.status });
    }

    if (query.assignedTo) {
      qb.andWhere('wo.assignedTo = :assignedTo', {
        assignedTo: query.assignedTo,
      });
    }

    if (query.dateFrom) {
      qb.andWhere('wo.createdAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }

    if (query.dateTo) {
      qb.andWhere('wo.createdAt <= :dateTo', {
        dateTo: new Date(query.dateTo),
      });
    }

    if (query.vehicleId) {
      qb.andWhere('wo.vehicleId = :vehicleId', {
        vehicleId: query.vehicleId,
      });
    }

    if (query.clientId) {
      qb.andWhere('wo.clientId = :clientId', {
        clientId: query.clientId,
      });
    }

    qb.orderBy('wo.createdAt', 'DESC');

    return qb.getMany();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FIND ALL — Enhanced with comprehensive filters + pagination
  // ═══════════════════════════════════════════════════════════════════

  async findAllFiltered(
    tenantId: string,
    filters: OrderFiltersDto,
  ): Promise<PaginatedWorkOrders> {
    const page = filters.page || 1;
    const limit = filters.limit || 25;
    const offset = (page - 1) * limit;

    const qb = this.workOrderRepo
      .createQueryBuilder('wo')
      .leftJoinAndSelect('wo.vehicle', 'vehicle')
      .leftJoinAndSelect('wo.parts', 'parts')
      .where('wo.tenantId = :tenantId', { tenantId });

    // ── Status filter (multi-select) ──
    if (filters.status && filters.status.length > 0) {
      qb.andWhere('wo.status IN (:...statuses)', { statuses: filters.status });
    }

    // ── isOpen shortcut ──
    if (filters.isOpen === true) {
      qb.andWhere('wo.status IN (:...openStatuses)', { openStatuses: OPEN_STATUSES });
    } else if (filters.isOpen === false) {
      qb.andWhere('wo.status IN (:...closedStatuses)', { closedStatuses: CLOSED_STATUSES });
    }

    // ── Client ──
    if (filters.clientId) {
      qb.andWhere('wo.clientId = :clientId', { clientId: filters.clientId });
    }

    // ── Vehicle ──
    if (filters.vehicleId) {
      qb.andWhere('wo.vehicleId = :vehicleId', { vehicleId: filters.vehicleId });
    }

    // ── Assigned technician ──
    if (filters.assignedTo) {
      qb.andWhere('wo.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    // ── Priority ──
    if (filters.priority) {
      qb.andWhere('wo.priority = :priority', { priority: filters.priority });
    }

    // ── Pipeline stage ──
    if (filters.pipelineStage) {
      qb.andWhere('wo.pipelineStage = :pipelineStage', { pipelineStage: filters.pipelineStage });
    }

    // ── Created date range ──
    if (filters.dateFrom) {
      qb.andWhere('wo.createdAt >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
    }
    if (filters.dateTo) {
      qb.andWhere('wo.createdAt <= :dateTo', { dateTo: new Date(filters.dateTo) });
    }

    // ── Aging days: orders open > X days ──
    if (filters.agingDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filters.agingDays);
      qb.andWhere('wo.createdAt <= :agingCutoff', { agingCutoff: cutoff });
      qb.andWhere('wo.status IN (:...openStatusesAging)', { openStatusesAging: OPEN_STATUSES });
    }

    // ── Full-text search (order number, client name via relation, vehicle plate) ──
    if (filters.search && filters.search.trim().length > 0) {
      const searchTerm = `%${filters.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('CAST(wo.orderNumber AS TEXT) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(wo.description) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(vehicle.plate) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(vehicle.brand) LIKE :search', { search: searchTerm })
            .orWhere('LOWER(vehicle.model) LIKE :search', { search: searchTerm });
        }),
      );
    }

    // ── Sorting ──
    const sortOrder = filters.sortOrder || 'DESC';
    if (filters.sortBy === 'priority') {
      // Custom priority sorting via CASE expression
      qb.addSelect(
        `CASE wo.priority
          WHEN 'urgent' THEN 4
          WHEN 'high' THEN 3
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 1
          ELSE 0
        END`,
        'priority_weight',
      );
      qb.orderBy('priority_weight', sortOrder);
    } else if (filters.sortBy === 'orderNumber') {
      qb.orderBy('wo.orderNumber', sortOrder);
    } else if (filters.sortBy === 'totalCost') {
      qb.orderBy('wo.totalCost', sortOrder);
    } else if (filters.sortBy === 'status') {
      qb.orderBy('wo.status', sortOrder);
    } else {
      // Default: createdAt
      qb.orderBy('wo.createdAt', sortOrder);
    }

    // ── Get total count before pagination ──
    const total = await qb.getCount();

    // ── Apply pagination ──
    qb.skip(offset).take(limit);

    const data = await qb.getMany();

    // ── Compute stats for the current tenant (unfiltered open orders) ──
    const stats = await this.getOpenOrderStats(tenantId);

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
  //  OPEN ORDER STATS
  // ═══════════════════════════════════════════════════════════════════

  async getOpenOrderStats(tenantId: string): Promise<OrderStats> {
    const now = new Date();

    // ── All open orders ──
    const openOrders = await this.workOrderRepo
      .createQueryBuilder('wo')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.status IN (:...openStatuses)', { openStatuses: OPEN_STATUSES })
      .getMany();

    const totalOpen = openOrders.length;

    // ── By status ──
    const byStatus: Record<string, number> = {};
    for (const s of OPEN_STATUSES) {
      byStatus[s] = openOrders.filter((o) => o.status === s).length;
    }

    // ── By priority ──
    const byPriority: Record<string, number> = { urgent: 0, high: 0, normal: 0, low: 0 };
    for (const o of openOrders) {
      const p = o.priority || 'normal';
      if (byPriority[p] !== undefined) {
        byPriority[p]++;
      }
    }

    // ── Overdue: due date < now AND still open ──
    const overdue = openOrders.filter(
      () => false, // dueDate column not in work_orders table
    ).length;

    // ── Average days open ──
    let avgDaysOpen = 0;
    let oldestOpenDays = 0;
    if (totalOpen > 0) {
      const daysList = openOrders.map((o) => {
        const created = new Date(o.createdAt);
        return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });
      avgDaysOpen = Math.round(daysList.reduce((a, b) => a + b, 0) / daysList.length);
      oldestOpenDays = Math.max(...daysList);
    }

    // ── Closed this week ──
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const closedThisWeek = await this.workOrderRepo
      .createQueryBuilder('wo')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.status IN (:...closedStatuses)', { closedStatuses: ['completed', 'invoiced'] })
      .andWhere('wo.completedAt >= :startOfWeek', { startOfWeek })
      .getCount();

    // ── Closed this month ──
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const closedThisMonth = await this.workOrderRepo
      .createQueryBuilder('wo')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.status IN (:...closedStatuses)', { closedStatuses: ['completed', 'invoiced'] })
      .andWhere('wo.completedAt >= :startOfMonth', { startOfMonth })
      .getCount();

    // ── Average closure time (days from created → completed) ──
    const closedOrders = await this.workOrderRepo
      .createQueryBuilder('wo')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.completedAt IS NOT NULL')
      .andWhere('wo.completedAt >= :threeMonthsAgo', {
        threeMonthsAgo: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
      })
      .getMany();

    let avgClosureTime = 0;
    if (closedOrders.length > 0) {
      const closureDays = closedOrders.map((o) => {
        const created = new Date(o.createdAt);
        const completed = new Date(o.completedAt);
        return Math.floor((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });
      avgClosureTime = Math.round(
        closureDays.reduce((a, b) => a + b, 0) / closureDays.length,
      );
    }

    return {
      totalOpen,
      byStatus,
      byPriority,
      overdue,
      avgDaysOpen,
      oldestOpenDays,
      closedThisWeek,
      closedThisMonth,
      avgClosureTime,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  AGING REPORT
  // ═══════════════════════════════════════════════════════════════════

  async getAgingReport(tenantId: string): Promise<AgingReport> {
    const now = new Date();

    const openOrders = await this.workOrderRepo
      .createQueryBuilder('wo')
      .leftJoinAndSelect('wo.vehicle', 'vehicle')
      .where('wo.tenantId = :tenantId', { tenantId })
      .andWhere('wo.status IN (:...openStatuses)', { openStatuses: OPEN_STATUSES })
      .orderBy('wo.createdAt', 'ASC')
      .getMany();

    const report: AgingReport = {
      within7Days: [],
      within14Days: [],
      within30Days: [],
      over30Days: [],
      over60Days: [],
      over90Days: [],
    };

    for (const order of openOrders) {
      const created = new Date(order.createdAt);
      const daysOpen = Math.floor(
        (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysOpen > 90) {
        report.over90Days.push(order);
      } else if (daysOpen > 60) {
        report.over60Days.push(order);
      } else if (daysOpen > 30) {
        report.over30Days.push(order);
      } else if (daysOpen > 14) {
        report.within30Days.push(order);
      } else if (daysOpen > 7) {
        report.within14Days.push(order);
      } else {
        report.within7Days.push(order);
      }
    }

    return report;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  FIND BY ID
  // ═══════════════════════════════════════════════════════════════════

  async findById(tenantId: string, workOrderId: string): Promise<WorkOrder> {
    const workOrder = await this.workOrderRepo.findOne({
      where: { id: workOrderId, tenantId },
      relations: ['vehicle', 'parts'],
    });
    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }
    return workOrder;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════════════════

  async update(
    tenantId: string,
    workOrderId: string,
    dto: UpdateWorkOrderDto,
  ): Promise<WorkOrder> {
    const workOrder = await this.findById(tenantId, workOrderId);

    Object.assign(workOrder, dto);
    await this.recalculateTotal(workOrder);

    return this.workOrderRepo.save(workOrder) as Promise<WorkOrder>;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  UPDATE STATUS
  // ═══════════════════════════════════════════════════════════════════

  async updateStatus(
    tenantId: string,
    workOrderId: string,
    dto: UpdateStatusDto,
  ): Promise<WorkOrder> {
    const workOrder = await this.findById(tenantId, workOrderId);

    const allowedTransitions =
      VALID_STATUS_TRANSITIONS[workOrder.status] || [];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from '${workOrder.status}' to '${dto.status}'. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
      );
    }

    workOrder.status = dto.status;

    if (dto.status === 'in_progress' && !workOrder.startedAt) {
      workOrder.startedAt = new Date();
    }

    if (dto.status === 'completed' && !workOrder.completedAt) {
      workOrder.completedAt = new Date();
    }

    return this.workOrderRepo.save(workOrder) as Promise<WorkOrder>;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ASSIGN TECHNICIAN
  // ═══════════════════════════════════════════════════════════════════

  async assignTechnician(
    tenantId: string,
    workOrderId: string,
    dto: AssignTechnicianDto,
  ): Promise<WorkOrder> {
    const workOrder = await this.findById(tenantId, workOrderId);

    workOrder.assignedTo = dto.assignedTo;

    return this.workOrderRepo.save(workOrder) as Promise<WorkOrder>;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PARTS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  async addPart(
    tenantId: string,
    workOrderId: string,
    dto: AddPartDto,
  ): Promise<WorkOrderPart> {
    const workOrder = await this.findById(tenantId, workOrderId);

    const totalPrice = dto.quantity * dto.unitPrice;

    const part = this.partRepo.create({
      tenantId,
      workOrderId: workOrder.id,
      partId: dto.partId,
      name: dto.name,
      partNumber: dto.partNumber,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      totalPrice,
      isOem: dto.isOem || false,
    });

    // Atomic: save part + recalculate + update work order total
    return this.dataSource.transaction(async (manager) => {
      const savedPart = await manager.save(WorkOrderPart, part);
      await this.recalculateTotal(workOrder);
      await manager.save(WorkOrder, workOrder);
      return savedPart;
    });
  }

  async removePart(
    tenantId: string,
    workOrderId: string,
    partId: string,
  ): Promise<void> {
    const workOrder = await this.findById(tenantId, workOrderId);

    const part = await this.partRepo.findOne({
      where: { id: partId, workOrderId, tenantId },
    });
    if (!part) {
      throw new NotFoundException('Part not found in this work order');
    }

    // Atomic: remove part + recalculate + update work order total
    await this.dataSource.transaction(async (manager) => {
      await manager.remove(WorkOrderPart, part);
      await this.recalculateTotal(workOrder);
      await manager.save(WorkOrder, workOrder);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════

  private async recalculateTotal(workOrder: WorkOrder): Promise<void> {
    const parts = await this.partRepo.find({
      where: { workOrderId: workOrder.id, tenantId: workOrder.tenantId },
    });

    const partsCost = parts.reduce(
      (sum, p) => sum + Number(p.totalPrice),
      0,
    );

    workOrder.partsCost = partsCost;
    workOrder.totalCost = Number(workOrder.laborCost) + partsCost;
  }
}

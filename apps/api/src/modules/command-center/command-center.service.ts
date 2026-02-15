import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../database/entities/tenant.entity';
import { User } from '../../database/entities/user.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { Quotation } from '../../database/entities/quotation.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { ImportOrder } from '../../database/entities/import-order.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Client } from '../../database/entities/client.entity';

@Injectable()
export class CommandCenterService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(WorkOrder) private woRepo: Repository<WorkOrder>,
    @InjectRepository(Quotation) private quoteRepo: Repository<Quotation>,
    @InjectRepository(InventoryItem) private invRepo: Repository<InventoryItem>,
    @InjectRepository(StockMovement) private movementRepo: Repository<StockMovement>,
    @InjectRepository(ImportOrder) private importRepo: Repository<ImportOrder>,
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
  ) {}

  // ─── Global KPIs (no tenant_id filter) ────────────────────────

  async getOverview() {
    const [
      totalTenants,
      totalUsers,
      totalActiveUsers,
      totalWorkOrders,
      totalQuotations,
      totalVehicles,
      totalClients,
      totalInventoryItems,
      pendingApprovals,
      revenueResult,
    ] = await Promise.all([
      this.tenantRepo.count(),
      this.userRepo.count(),
      this.userRepo.count({ where: { isActive: true } }),
      this.woRepo.count(),
      this.quoteRepo.count(),
      this.vehicleRepo.count(),
      this.clientRepo.count(),
      this.invRepo.count(),
      this.woRepo.count({ where: { status: 'pending' } }),
      this.quoteRepo
        .createQueryBuilder('q')
        .select('COALESCE(SUM(q.total), 0)', 'revenue')
        .where('q.status IN (:...statuses)', {
          statuses: ['approved', 'completed'],
        })
        .getRawOne(),
    ]);

    return {
      totalTenants,
      totalUsers,
      totalActiveUsers,
      totalWorkOrders,
      totalQuotations,
      totalVehicles,
      totalClients,
      totalRevenue: Number(revenueResult?.revenue || 0),
      totalInventoryItems,
      pendingApprovals,
      lastUpdated: new Date().toISOString(),
    };
  }

  // ─── All Tenants with Stats ────────────────────────────────────

  async getTenants() {
    const tenants = await this.tenantRepo.find({
      order: { createdAt: 'DESC' },
    });

    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const [userCount, woCount, lastActivityResult] = await Promise.all([
          this.userRepo.count({ where: { tenantId: tenant.id } }),
          this.woRepo.count({ where: { tenantId: tenant.id } }),
          this.woRepo
            .createQueryBuilder('wo')
            .select('MAX(wo.updated_at)', 'lastActivity')
            .where('wo.tenant_id = :tenantId', { tenantId: tenant.id })
            .getRawOne(),
        ]);

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          isActive: tenant.isActive,
          createdAt: tenant.createdAt,
          userCount,
          workOrderCount: woCount,
          lastActivity: lastActivityResult?.lastActivity || null,
        };
      }),
    );

    return tenantsWithStats;
  }

  // ─── Market Intelligence (cross-tenant aggregations) ───────────

  async getMarketIntelligence() {
    // Average work order value across all tenants
    const avgWoResult = await this.woRepo
      .createQueryBuilder('wo')
      .select('COALESCE(AVG(wo.total_cost), 0)', 'avgValue')
      .where('wo.total_cost > 0')
      .getRawOne();

    // Average completion time (hours between created_at and completed_at)
    const avgCompletionResult = await this.woRepo
      .createQueryBuilder('wo')
      .select(
        'COALESCE(AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at)) / 3600), 0)',
        'avgHours',
      )
      .where('wo.status = :status', { status: 'completed' })
      .andWhere('wo.completed_at IS NOT NULL')
      .getRawOne();

    // Top vehicle brands across all tenants
    const topVehicleBrands = await this.vehicleRepo
      .createQueryBuilder('v')
      .select('v.brand', 'brand')
      .addSelect('COUNT(*)', 'count')
      .groupBy('v.brand')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Top repair types across all tenants
    const topRepairTypes = await this.woRepo
      .createQueryBuilder('wo')
      .select('wo.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('wo.type')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Monthly trend - last 6 months of work order count
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyTrend = await this.woRepo
      .createQueryBuilder('wo')
      .select("TO_CHAR(wo.created_at, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(wo.total_cost), 0)', 'revenue')
      .where('wo.created_at >= :since', { since: sixMonthsAgo })
      .groupBy("TO_CHAR(wo.created_at, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();

    return {
      avgWorkOrderValue: Math.round(Number(avgWoResult?.avgValue || 0) * 100) / 100,
      avgCompletionTimeHours:
        Math.round(Number(avgCompletionResult?.avgHours || 0) * 10) / 10,
      topVehicleBrands: topVehicleBrands.map((r) => ({
        brand: r.brand,
        count: Number(r.count),
      })),
      topRepairTypes: topRepairTypes.map((r) => ({
        type: r.type,
        count: Number(r.count),
      })),
      monthlyTrend: monthlyTrend.map((r) => ({
        month: r.month,
        count: Number(r.count),
        revenue: Number(r.revenue),
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Tenant Detail Deep Dive ───────────────────────────────────

  async getTenantDetail(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const [users, recentWorkOrders, recentQuotations, inventoryValueResult] =
      await Promise.all([
        this.userRepo.find({
          where: { tenantId },
          select: [
            'id',
            'email',
            'firstName',
            'lastName',
            'role',
            'isActive',
            'lastLogin',
            'createdAt',
          ],
          order: { createdAt: 'DESC' },
        }),

        this.woRepo.find({
          where: { tenantId },
          order: { createdAt: 'DESC' },
          take: 20,
          relations: ['vehicle'],
        }),

        this.quoteRepo.find({
          where: { tenantId },
          order: { createdAt: 'DESC' },
          take: 20,
        }),

        this.invRepo
          .createQueryBuilder('i')
          .select(
            'COALESCE(SUM(i.stock_quantity * i.cost_price), 0)',
            'totalValue',
          )
          .addSelect('COUNT(*)', 'totalItems')
          .addSelect(
            'SUM(CASE WHEN i.stock_quantity <= i.min_stock AND i.is_active = true AND i.min_stock > 0 THEN 1 ELSE 0 END)',
            'lowStockCount',
          )
          .where('i.tenant_id = :tenantId', { tenantId })
          .getRawOne(),
      ]);

    // Work order stats for this tenant
    const woStats = await this.woRepo
      .createQueryBuilder('wo')
      .select('wo.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('wo.tenant_id = :tenantId', { tenantId })
      .groupBy('wo.status')
      .getRawMany();

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
      },
      users,
      userCount: users.length,
      activeUsers: users.filter((u) => u.isActive).length,
      recentWorkOrders,
      recentQuotations,
      workOrdersByStatus: woStats.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
      inventory: {
        totalItems: Number(inventoryValueResult?.totalItems || 0),
        totalValue:
          Math.round(Number(inventoryValueResult?.totalValue || 0) * 100) / 100,
        lowStockCount: Number(inventoryValueResult?.lowStockCount || 0),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Cross-Tenant Alerts ───────────────────────────────────────

  async getAlerts() {
    // Tenants with overdue work orders (status in_progress, created > 7 days ago)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const overdueWorkOrders = await this.woRepo
      .createQueryBuilder('wo')
      .select('wo.tenant_id', 'tenantId')
      .addSelect('COUNT(*)', 'overdueCount')
      .where('wo.status = :status', { status: 'in_progress' })
      .andWhere('wo.created_at < :threshold', { threshold: sevenDaysAgo })
      .groupBy('wo.tenant_id')
      .getRawMany();

    // Enrich with tenant names
    const overdueAlerts = await Promise.all(
      overdueWorkOrders.map(async (row) => {
        const tenant = await this.tenantRepo.findOne({
          where: { id: row.tenantId },
          select: ['id', 'name', 'slug'],
        });
        return {
          tenantId: row.tenantId,
          tenantName: tenant?.name || 'Unknown',
          tenantSlug: tenant?.slug || '',
          overdueCount: Number(row.overdueCount),
          type: 'overdue_work_orders' as const,
          severity: Number(row.overdueCount) >= 5 ? 'critical' : 'warning',
        };
      }),
    );

    // Low stock items across all tenants
    const lowStockByTenant = await this.invRepo
      .createQueryBuilder('i')
      .select('i.tenant_id', 'tenantId')
      .addSelect('COUNT(*)', 'lowStockCount')
      .where('i.is_active = true')
      .andWhere('i.min_stock > 0')
      .andWhere('i.stock_quantity <= i.min_stock')
      .groupBy('i.tenant_id')
      .getRawMany();

    const lowStockAlerts = await Promise.all(
      lowStockByTenant.map(async (row) => {
        const tenant = await this.tenantRepo.findOne({
          where: { id: row.tenantId },
          select: ['id', 'name', 'slug'],
        });
        return {
          tenantId: row.tenantId,
          tenantName: tenant?.name || 'Unknown',
          tenantSlug: tenant?.slug || '',
          lowStockCount: Number(row.lowStockCount),
          type: 'low_stock' as const,
          severity: Number(row.lowStockCount) >= 10 ? 'critical' : 'warning',
        };
      }),
    );

    // High pending approvals per tenant (> 5 pending)
    const pendingByTenant = await this.woRepo
      .createQueryBuilder('wo')
      .select('wo.tenant_id', 'tenantId')
      .addSelect('COUNT(*)', 'pendingCount')
      .where('wo.status = :status', { status: 'pending' })
      .groupBy('wo.tenant_id')
      .having('COUNT(*) > 5')
      .getRawMany();

    const pendingAlerts = await Promise.all(
      pendingByTenant.map(async (row) => {
        const tenant = await this.tenantRepo.findOne({
          where: { id: row.tenantId },
          select: ['id', 'name', 'slug'],
        });
        return {
          tenantId: row.tenantId,
          tenantName: tenant?.name || 'Unknown',
          tenantSlug: tenant?.slug || '',
          pendingCount: Number(row.pendingCount),
          type: 'high_pending_approvals' as const,
          severity: Number(row.pendingCount) >= 15 ? 'critical' : 'warning',
        };
      }),
    );

    // Inactive tenants (no WO activity in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeTenantIds = await this.woRepo
      .createQueryBuilder('wo')
      .select('DISTINCT wo.tenant_id', 'tenantId')
      .where('wo.created_at >= :since', { since: thirtyDaysAgo })
      .getRawMany();

    const activeTenantIdSet = new Set(activeTenantIds.map((r) => r.tenantId));
    const allTenants = await this.tenantRepo.find({
      where: { isActive: true },
      select: ['id', 'name', 'slug'],
    });

    const inactiveAlerts = allTenants
      .filter((t) => !activeTenantIdSet.has(t.id))
      .map((t) => ({
        tenantId: t.id,
        tenantName: t.name,
        tenantSlug: t.slug,
        type: 'inactive_tenant' as const,
        severity: 'info' as const,
        message: 'No work order activity in the last 30 days',
      }));

    return {
      overdueWorkOrders: overdueAlerts,
      lowStock: lowStockAlerts,
      highPendingApprovals: pendingAlerts,
      inactiveTenants: inactiveAlerts,
      totalAlerts:
        overdueAlerts.length +
        lowStockAlerts.length +
        pendingAlerts.length +
        inactiveAlerts.length,
      criticalCount: [
        ...overdueAlerts,
        ...lowStockAlerts,
        ...pendingAlerts,
      ].filter((a) => a.severity === 'critical').length,
      generatedAt: new Date().toISOString(),
    };
  }
}

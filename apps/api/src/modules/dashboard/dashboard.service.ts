import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Client } from '../../database/entities/client.entity';
import { Quotation } from '../../database/entities/quotation.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { Approval } from '../../database/entities/approval.entity';
import { Notification } from '../../database/entities/notification.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(WorkOrder) private woRepo: Repository<WorkOrder>,
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(Quotation) private quoteRepo: Repository<Quotation>,
    @InjectRepository(InventoryItem) private invRepo: Repository<InventoryItem>,
    @InjectRepository(Approval) private approvalRepo: Repository<Approval>,
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
  ) {}

  async getStats(tenantId: string) {
    const [totalVehicles, totalClients, activeWorkOrders, pendingQuotations] =
      await Promise.all([
        this.vehicleRepo.count({ where: { tenantId } }),
        this.clientRepo.count({ where: { tenantId } }),
        this.woRepo.count({
          where: { tenantId, status: 'in_progress' },
        }),
        this.quoteRepo.count({
          where: { tenantId, status: 'draft' },
        }),
      ]);

    const lowStockItems = await this.invRepo
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.stock_quantity <= i.min_stock')
      .andWhere('i.is_active = true')
      .getCount();

    const pendingApprovals = await this.approvalRepo.count({
      where: { tenantId, status: 'pending' },
    });

    return {
      totalVehicles,
      totalClients,
      activeWorkOrders,
      pendingQuotations,
      lowStockItems,
      pendingApprovals,
    };
  }

  async getRecent(tenantId: string) {
    const [recentOrders, recentQuotes] = await Promise.all([
      this.woRepo.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take: 10,
        relations: ['vehicle'],
      }),
      this.quoteRepo.find({
        where: { tenantId },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    return { recentOrders, recentQuotes };
  }

  async getKpis(tenantId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const completedThisMonth = await this.woRepo.find({
      where: {
        tenantId,
        status: 'completed',
        completedAt: MoreThan(startOfMonth),
      },
    });

    const revenueThisMonth = completedThisMonth.reduce(
      (sum, wo) => sum + Number(wo.totalCost || 0),
      0,
    );

    let avgRepairHours = 0;
    const withHours = completedThisMonth.filter((wo) => wo.actualHours);
    if (withHours.length > 0) {
      avgRepairHours =
        withHours.reduce((sum, wo) => sum + Number(wo.actualHours), 0) /
        withHours.length;
    }

    const topBrands = await this.vehicleRepo
      .createQueryBuilder('v')
      .select('v.brand', 'brand')
      .addSelect('COUNT(*)', 'count')
      .where('v.tenant_id = :tenantId', { tenantId })
      .groupBy('v.brand')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      revenueThisMonth,
      avgRepairHours: Math.round(avgRepairHours * 10) / 10,
      completedOrdersThisMonth: completedThisMonth.length,
      topBrands,
    };
  }

  async getOwnerDashboard(tenantId: string) {
    const [stats, kpis, recent] = await Promise.all([
      this.getStats(tenantId),
      this.getKpis(tenantId),
      this.getRecent(tenantId),
    ]);

    const pendingApprovals = await this.approvalRepo.find({
      where: { tenantId, status: 'pending' },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return {
      stats,
      kpis,
      recent,
      pendingApprovals,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getNotifications(tenantId: string, userId: string, unreadOnly = false) {
    const where: Record<string, unknown> = { tenantId, userId };
    if (unreadOnly) where.isRead = false;

    return this.notifRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markNotificationRead(tenantId: string, userId: string, notifId: string) {
    await this.notifRepo.update(
      { id: notifId, tenantId, userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllRead(tenantId: string, userId: string) {
    await this.notifRepo.update(
      { tenantId, userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Client } from '../../database/entities/client.entity';
import { Quotation } from '../../database/entities/quotation.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { Approval } from '../../database/entities/approval.entity';
import { Notification } from '../../database/entities/notification.entity';
import {
  createMockRepository,
  createMockQueryBuilder,
} from '../../../test/helpers/test.utils';

describe('DashboardService', () => {
  let service: DashboardService;
  let woRepo: ReturnType<typeof createMockRepository>;
  let vehicleRepo: ReturnType<typeof createMockRepository>;
  let clientRepo: ReturnType<typeof createMockRepository>;
  let quoteRepo: ReturnType<typeof createMockRepository>;
  let invRepo: ReturnType<typeof createMockRepository>;
  let approvalRepo: ReturnType<typeof createMockRepository>;
  let notifRepo: ReturnType<typeof createMockRepository>;

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    woRepo = createMockRepository();
    vehicleRepo = createMockRepository();
    clientRepo = createMockRepository();
    quoteRepo = createMockRepository();
    invRepo = createMockRepository();
    approvalRepo = createMockRepository();
    notifRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(WorkOrder), useValue: woRepo },
        { provide: getRepositoryToken(Vehicle), useValue: vehicleRepo },
        { provide: getRepositoryToken(Client), useValue: clientRepo },
        { provide: getRepositoryToken(Quotation), useValue: quoteRepo },
        { provide: getRepositoryToken(InventoryItem), useValue: invRepo },
        { provide: getRepositoryToken(Approval), useValue: approvalRepo },
        { provide: getRepositoryToken(Notification), useValue: notifRepo },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  //  getStats
  // ═══════════════════════════════════════════════════════════════════

  describe('getStats', () => {
    it('should return dashboard statistics', async () => {
      vehicleRepo.count.mockResolvedValue(15);
      clientRepo.count.mockResolvedValue(10);
      woRepo.count.mockResolvedValue(3);
      quoteRepo.count.mockResolvedValue(2);
      approvalRepo.count.mockResolvedValue(1);

      const qb = createMockQueryBuilder();
      invRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getCount.mockResolvedValue(5);

      const result = await service.getStats(tenantId);

      expect(result.totalVehicles).toBe(15);
      expect(result.totalClients).toBe(10);
      expect(result.activeWorkOrders).toBe(3);
      expect(result.pendingQuotations).toBe(2);
      expect(result.lowStockItems).toBe(5);
      expect(result.pendingApprovals).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  getRecent
  // ═══════════════════════════════════════════════════════════════════

  describe('getRecent', () => {
    it('should return recent orders and quotations', async () => {
      woRepo.find.mockResolvedValue([{ id: 'wo1' }, { id: 'wo2' }]);
      quoteRepo.find.mockResolvedValue([{ id: 'q1' }]);

      const result = await service.getRecent(tenantId);

      expect(result.recentOrders).toHaveLength(2);
      expect(result.recentQuotes).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  getKpis
  // ═══════════════════════════════════════════════════════════════════

  describe('getKpis', () => {
    it('should calculate revenue and avg repair hours', async () => {
      woRepo.find.mockResolvedValue([
        { totalCost: 100000, actualHours: 4 },
        { totalCost: 50000, actualHours: 2 },
      ]);

      const qb = createMockQueryBuilder();
      vehicleRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getRawMany.mockResolvedValue([{ brand: 'Toyota', count: '5' }]);

      const result = await service.getKpis(tenantId);

      expect(result.revenueThisMonth).toBe(150000);
      expect(result.avgRepairHours).toBe(3);
      expect(result.completedOrdersThisMonth).toBe(2);
      expect(result.topBrands).toHaveLength(1);
    });

    it('should return 0 avgRepairHours when no orders have hours', async () => {
      woRepo.find.mockResolvedValue([{ totalCost: 10000, actualHours: null }]);
      const qb = createMockQueryBuilder();
      vehicleRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getRawMany.mockResolvedValue([]);

      const result = await service.getKpis(tenantId);

      expect(result.avgRepairHours).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  getNotifications
  // ═══════════════════════════════════════════════════════════════════

  describe('getNotifications', () => {
    it('should return notifications for a user', async () => {
      notifRepo.find.mockResolvedValue([{ id: 'n1' }]);

      const result = await service.getNotifications(tenantId, 'user-1');

      expect(result).toHaveLength(1);
      expect(notifRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, userId: 'user-1' },
        }),
      );
    });

    it('should filter unread-only when requested', async () => {
      notifRepo.find.mockResolvedValue([]);

      await service.getNotifications(tenantId, 'user-1', true);

      expect(notifRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, userId: 'user-1', isRead: false },
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  markNotificationRead / markAllRead
  // ═══════════════════════════════════════════════════════════════════

  describe('markNotificationRead', () => {
    it('should mark a single notification as read', async () => {
      notifRepo.update.mockResolvedValue({ affected: 1 });

      await service.markNotificationRead(tenantId, 'user-1', 'n1');

      expect(notifRepo.update).toHaveBeenCalledWith(
        { id: 'n1', tenantId, userId: 'user-1' },
        { isRead: true, readAt: expect.any(Date) },
      );
    });
  });

  describe('markAllRead', () => {
    it('should mark all unread notifications as read', async () => {
      notifRepo.update.mockResolvedValue({ affected: 5 });

      await service.markAllRead(tenantId, 'user-1');

      expect(notifRepo.update).toHaveBeenCalledWith(
        { tenantId, userId: 'user-1', isRead: false },
        { isRead: true, readAt: expect.any(Date) },
      );
    });
  });
});

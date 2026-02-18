import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { createWorkOrder } from '../../../test/helpers/test.utils';

describe('WorkOrdersController', () => {
  let controller: WorkOrdersController;
  let service: Record<string, jest.Mock>;

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      assignTechnician: jest.fn(),
      addPart: jest.fn(),
      removePart: jest.fn(),
      getOpenOrderStats: jest.fn(),
      getAgingReport: jest.fn(),
      findAllFiltered: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkOrdersController],
      providers: [{ provide: WorkOrdersService, useValue: service }],
    }).compile();

    controller = module.get<WorkOrdersController>(WorkOrdersController);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  //  create
  // ═══════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should delegate to service.create with tenantId', async () => {
      const dto = { vehicleId: 'v1', clientId: 'c1', description: 'Test' } as any;
      const expected = createWorkOrder({ tenantId });
      service.create!.mockResolvedValue(expected as any);

      const result = await controller.create(tenantId, dto);

      expect(service.create).toHaveBeenCalledWith(tenantId, dto);
      expect(result).toEqual(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findAll
  // ═══════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should delegate to service.findAll', async () => {
      const orders = [createWorkOrder({ tenantId })];
      service.findAll!.mockResolvedValue(orders as any);

      const result = await controller.findAll(tenantId, {} as any);

      expect(service.findAll).toHaveBeenCalledWith(tenantId, {});
      expect(result).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findById
  // ═══════════════════════════════════════════════════════════════════

  describe('findById', () => {
    it('should delegate to service.findById', async () => {
      const wo = createWorkOrder({ tenantId });
      service.findById!.mockResolvedValue(wo as any);

      const result = await controller.findById(tenantId, wo.id as string);

      expect(service.findById).toHaveBeenCalledWith(tenantId, wo.id);
      expect(result.id).toBe(wo.id);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  update
  // ═══════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should delegate to service.update', async () => {
      const dto = { description: 'Updated' } as any;
      const wo = createWorkOrder({ tenantId, description: 'Updated' });
      service.update!.mockResolvedValue(wo as any);

      const result = await controller.update(tenantId, 'wo-1', dto);

      expect(service.update).toHaveBeenCalledWith(tenantId, 'wo-1', dto);
      expect(result.description).toBe('Updated');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  updateStatus
  // ═══════════════════════════════════════════════════════════════════

  describe('updateStatus', () => {
    it('should delegate to service.updateStatus', async () => {
      const dto = { status: 'in_progress' } as any;
      const wo = createWorkOrder({ tenantId, status: 'in_progress' });
      service.updateStatus!.mockResolvedValue(wo as any);

      const result = await controller.updateStatus(tenantId, 'wo-1', dto);

      expect(service.updateStatus).toHaveBeenCalledWith(tenantId, 'wo-1', dto);
      expect(result.status).toBe('in_progress');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  assignTechnician
  // ═══════════════════════════════════════════════════════════════════

  describe('assignTechnician', () => {
    it('should delegate to service.assignTechnician', async () => {
      const dto = { assignedTo: 'tech-1' } as any;
      const wo = createWorkOrder({ tenantId, assignedTo: 'tech-1' });
      service.assignTechnician!.mockResolvedValue(wo as any);

      const result = await controller.assignTechnician(tenantId, 'wo-1', dto);

      expect(service.assignTechnician).toHaveBeenCalledWith(tenantId, 'wo-1', dto);
      expect(result.assignedTo).toBe('tech-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  addPart / removePart
  // ═══════════════════════════════════════════════════════════════════

  describe('addPart', () => {
    it('should delegate to service.addPart', async () => {
      const dto = { name: 'Filter', quantity: 1, unitPrice: 5000 } as any;
      const part = { id: 'wp-1', ...dto, totalPrice: 5000 };
      service.addPart!.mockResolvedValue(part as any);

      const result = await controller.addPart(tenantId, 'wo-1', dto);

      expect(service.addPart).toHaveBeenCalledWith(tenantId, 'wo-1', dto);
      expect(result.totalPrice).toBe(5000);
    });
  });

  describe('removePart', () => {
    it('should delegate to service.removePart', async () => {
      service.removePart!.mockResolvedValue(undefined as any);

      await controller.removePart(tenantId, 'wo-1', 'wp-1');

      expect(service.removePart).toHaveBeenCalledWith(tenantId, 'wo-1', 'wp-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  getStats / getAgingReport
  // ═══════════════════════════════════════════════════════════════════

  describe('getStats', () => {
    it('should delegate to service.getOpenOrderStats', async () => {
      const stats = { totalOpen: 5, byStatus: {}, byPriority: {} };
      service.getOpenOrderStats!.mockResolvedValue(stats as any);

      const result = await controller.getStats(tenantId);

      expect(service.getOpenOrderStats).toHaveBeenCalledWith(tenantId);
      expect(result.totalOpen).toBe(5);
    });
  });

  describe('getAgingReport', () => {
    it('should delegate to service.getAgingReport', async () => {
      const report = { within7Days: [], within14Days: [] };
      service.getAgingReport!.mockResolvedValue(report as any);

      const result = await controller.getAgingReport(tenantId);

      expect(service.getAgingReport).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(report);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findAllFiltered / getOverdue
  // ═══════════════════════════════════════════════════════════════════

  describe('findAllFiltered', () => {
    it('should delegate to service.findAllFiltered', async () => {
      const filters = { status: ['pending'] } as any;
      const paginated = { data: [], total: 0, page: 1, limit: 25, totalPages: 0 };
      service.findAllFiltered!.mockResolvedValue(paginated as any);

      const result = await controller.findAllFiltered(tenantId, filters);

      expect(service.findAllFiltered).toHaveBeenCalledWith(tenantId, filters);
      expect(result.total).toBe(0);
    });
  });

  describe('getOverdue', () => {
    it('should call findAllFiltered with isOverdue=true', async () => {
      const paginated = { data: [], total: 0 };
      service.findAllFiltered!.mockResolvedValue(paginated as any);

      await controller.getOverdue(tenantId);

      expect(service.findAllFiltered).toHaveBeenCalledWith(tenantId, {
        isOverdue: true,
        sortBy: 'dueDate',
        sortOrder: 'ASC',
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { WorkOrderPart } from '../../database/entities/work-order-part.entity';
import {
  createMockRepository,
  createMockQueryBuilder,
  createMockDataSource,
  createWorkOrder,
} from '../../../test/helpers/test.utils';

describe('WorkOrdersService', () => {
  let service: WorkOrdersService;
  let woRepo: ReturnType<typeof createMockRepository>;
  let partRepo: ReturnType<typeof createMockRepository>;
  let dataSource: ReturnType<typeof createMockDataSource>;

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    woRepo = createMockRepository();
    partRepo = createMockRepository();
    dataSource = createMockDataSource();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrdersService,
        { provide: getRepositoryToken(WorkOrder), useValue: woRepo },
        { provide: getRepositoryToken(WorkOrderPart), useValue: partRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<WorkOrdersService>(WorkOrdersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════════════
  //  create
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should create a work order with status pending and per-tenant sequence', async () => {
      const dto = {
        vehicleId: 'vehicle-1',
        clientId: 'client-1',
        description: 'Oil change',
        laborCost: 30000,
      };
      dataSource.query.mockResolvedValue([{ next_tenant_sequence: 42 }]);
      const expected = createWorkOrder({ ...dto, tenantId, status: 'pending', orderNumber: 42 });
      woRepo.create.mockReturnValue(expected);
      woRepo.save.mockResolvedValue(expected);

      const result = await service.create(tenantId, dto as any);

      expect(dataSource.query).toHaveBeenCalledWith(
        `SELECT next_tenant_sequence($1, 'order_number')`,
        [tenantId],
      );
      expect(woRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          vehicleId: dto.vehicleId,
          orderNumber: 42,
          status: 'pending',
        }),
      );
      expect(result.status).toBe('pending');
    });

    it('should default type to repair and priority to normal', async () => {
      const dto = { vehicleId: 'v1', clientId: 'c1', description: 'Test' };
      dataSource.query.mockResolvedValue([{ next_tenant_sequence: 1 }]);
      woRepo.create.mockImplementation((data: any) => data);
      woRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      await service.create(tenantId, dto as any);

      expect(woRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'repair',
          priority: 'normal',
          laborCost: 0,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  findById
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findById', () => {
    it('should return work order with relations', async () => {
      const wo = createWorkOrder({ tenantId });
      woRepo.findOne.mockResolvedValue(wo);

      const result = await service.findById(tenantId, wo.id as string);

      expect(result.id).toBe(wo.id);
      expect(woRepo.findOne).toHaveBeenCalledWith({
        where: { id: wo.id, tenantId },
        relations: ['vehicle', 'parts'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      woRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  updateStatus — State Machine
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateStatus', () => {
    const validTransitions = [
      { from: 'pending', to: 'in_progress' },
      { from: 'pending', to: 'waiting_parts' },
      { from: 'pending', to: 'waiting_approval' },
      { from: 'pending', to: 'cancelled' },
      { from: 'in_progress', to: 'waiting_parts' },
      { from: 'in_progress', to: 'completed' },
      { from: 'in_progress', to: 'cancelled' },
      { from: 'waiting_parts', to: 'in_progress' },
      { from: 'completed', to: 'invoiced' },
    ];

    it.each(validTransitions)(
      'should allow transition from $from to $to',
      async ({ from, to }) => {
        const wo = createWorkOrder({ tenantId, status: from });
        woRepo.findOne.mockResolvedValue(wo);
        woRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

        const result = await service.updateStatus(tenantId, wo.id as string, { status: to } as any);

        expect(result.status).toBe(to);
      },
    );

    const invalidTransitions = [
      { from: 'pending', to: 'completed' },
      { from: 'pending', to: 'invoiced' },
      { from: 'completed', to: 'pending' },
      { from: 'invoiced', to: 'pending' },
      { from: 'cancelled', to: 'in_progress' },
    ];

    it.each(invalidTransitions)(
      'should reject transition from $from to $to',
      async ({ from, to }) => {
        const wo = createWorkOrder({ tenantId, status: from });
        woRepo.findOne.mockResolvedValue(wo);

        await expect(
          service.updateStatus(tenantId, wo.id as string, { status: to } as any),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('should set startedAt when transitioning to in_progress', async () => {
      const wo = createWorkOrder({ tenantId, status: 'pending', startedAt: null });
      woRepo.findOne.mockResolvedValue(wo);
      woRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.updateStatus(tenantId, wo.id as string, {
        status: 'in_progress',
      } as any);

      expect(result.startedAt).toBeInstanceOf(Date);
    });

    it('should set completedAt when transitioning to completed', async () => {
      const wo = createWorkOrder({ tenantId, status: 'in_progress', completedAt: null });
      woRepo.findOne.mockResolvedValue(wo);
      woRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.updateStatus(tenantId, wo.id as string, {
        status: 'completed',
      } as any);

      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should NOT overwrite startedAt if already set', async () => {
      const originalDate = new Date('2024-01-01');
      const wo = createWorkOrder({
        tenantId,
        status: 'waiting_parts',
        startedAt: originalDate,
      });
      woRepo.findOne.mockResolvedValue(wo);
      woRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.updateStatus(tenantId, wo.id as string, {
        status: 'in_progress',
      } as any);

      expect(result.startedAt).toBe(originalDate);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  assignTechnician
  // ═══════════════════════════════════════════════════════════════════════════

  describe('assignTechnician', () => {
    it('should update the assignedTo field', async () => {
      const wo = createWorkOrder({ tenantId });
      woRepo.findOne.mockResolvedValue(wo);
      woRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.assignTechnician(tenantId, wo.id as string, {
        assignedTo: 'tech-1',
      } as any);

      expect(result.assignedTo).toBe('tech-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  addPart / removePart + cost recalculation
  // ═══════════════════════════════════════════════════════════════════════════

  describe('addPart', () => {
    it('should add a part and recalculate total', async () => {
      const wo = createWorkOrder({ tenantId, laborCost: 50000, partsCost: 0, totalCost: 50000 });
      woRepo.findOne.mockResolvedValue(wo);
      const partDto = {
        partId: 'part-1',
        name: 'Oil Filter',
        partNumber: 'OF-123',
        quantity: 2,
        unitPrice: 5000,
      };
      const savedPart = { id: 'wp-1', ...partDto, totalPrice: 10000, tenantId, workOrderId: wo.id };
      partRepo.create.mockReturnValue(savedPart);
      partRepo.save.mockResolvedValue(savedPart);
      partRepo.find.mockResolvedValue([savedPart]);
      woRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.addPart(tenantId, wo.id as string, partDto as any);

      expect(result.totalPrice).toBe(10000);
      expect(partRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 2, unitPrice: 5000, totalPrice: 10000 }),
      );
    });
  });

  describe('removePart', () => {
    it('should remove part and recalculate total', async () => {
      const wo = createWorkOrder({ tenantId, laborCost: 50000 });
      woRepo.findOne.mockResolvedValue(wo);
      const part = { id: 'wp-1', workOrderId: wo.id, tenantId, totalPrice: 10000 };
      partRepo.findOne.mockResolvedValue(part);
      partRepo.remove.mockResolvedValue(part);
      partRepo.find.mockResolvedValue([]); // no parts left
      woRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      await service.removePart(tenantId, wo.id as string, 'wp-1');

      expect(dataSource._mockManager.remove).toHaveBeenCalledWith(WorkOrderPart, part);
      expect(wo.partsCost).toBe(0);
      expect(wo.totalCost).toBe(50000);
    });

    it('should throw NotFoundException if part not found', async () => {
      const wo = createWorkOrder({ tenantId });
      woRepo.findOne.mockResolvedValue(wo);
      partRepo.findOne.mockResolvedValue(null);

      await expect(service.removePart(tenantId, wo.id as string, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  findAll (legacy)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return work orders with default ordering', async () => {
      const qb = createMockQueryBuilder();
      woRepo.createQueryBuilder.mockReturnValue(qb);
      const orders = [createWorkOrder({ tenantId }), createWorkOrder({ tenantId })];
      qb.getMany.mockResolvedValue(orders);

      const result = await service.findAll(tenantId, {} as any);

      expect(result).toHaveLength(2);
      expect(qb.where).toHaveBeenCalledWith('wo.tenantId = :tenantId', { tenantId });
      expect(qb.orderBy).toHaveBeenCalledWith('wo.createdAt', 'DESC');
    });

    it('should apply status filter', async () => {
      const qb = createMockQueryBuilder();
      woRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { status: 'in_progress' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('wo.status = :status', {
        status: 'in_progress',
      });
    });

    it('should apply date range filters', async () => {
      const qb = createMockQueryBuilder();
      woRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('wo.createdAt >= :dateFrom', {
        dateFrom: expect.any(Date),
      });
      expect(qb.andWhere).toHaveBeenCalledWith('wo.createdAt <= :dateTo', {
        dateTo: expect.any(Date),
      });
    });
  });
});

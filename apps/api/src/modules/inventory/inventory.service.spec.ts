import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { InventoryCostService } from './inventory-cost.service';
import {
  createMockRepository,
  createMockQueryBuilder,
  createInventoryItem,
} from '../../../test/helpers/test.utils';

describe('InventoryService', () => {
  let service: InventoryService;
  let itemRepo: ReturnType<typeof createMockRepository>;
  let costService: Partial<InventoryCostService>;

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    itemRepo = createMockRepository();
    costService = {
      processEntry: jest.fn(),
      processExit: jest.fn(),
      processAdjustment: jest.fn(),
      getItemValuation: jest.fn(),
      getCostHistory: jest.fn(),
      getWarehouseValuation: jest.fn(),
      recalculateAverageCost: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(InventoryItem), useValue: itemRepo },
        { provide: InventoryCostService, useValue: costService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════════════
  //  create
  // ═══════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should create an inventory item', async () => {
      const dto = { name: 'Oil Filter', sku: 'OF-001', costPrice: 5000, sellPrice: 8000 };
      const item = createInventoryItem({ ...dto, tenantId });
      itemRepo.create.mockReturnValue(item);
      itemRepo.save.mockResolvedValue(item);

      const result = await service.create(tenantId, dto as any);

      expect(result.name).toBe('Oil Filter');
      expect(itemRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId }));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  findById
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findById', () => {
    it('should return item when found', async () => {
      const item = createInventoryItem({ tenantId });
      itemRepo.findOne.mockResolvedValue(item);

      const result = await service.findById(tenantId, item.id as string);

      expect(result.id).toBe(item.id);
    });

    it('should throw NotFoundException when not found', async () => {
      itemRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  adjustStock
  // ═══════════════════════════════════════════════════════════════════════════

  describe('adjustStock', () => {
    it('should ADD stock correctly', async () => {
      const item = createInventoryItem({ tenantId, stockQuantity: 50 });
      itemRepo.findOne.mockResolvedValue(item);
      itemRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.adjustStock(tenantId, item.id as string, {
        operation: 'add',
        quantity: 10,
      } as any);

      expect(result.stockQuantity).toBe(60);
    });

    it('should SUBTRACT stock correctly', async () => {
      const item = createInventoryItem({ tenantId, stockQuantity: 50 });
      itemRepo.findOne.mockResolvedValue(item);
      itemRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.adjustStock(tenantId, item.id as string, {
        operation: 'subtract',
        quantity: 20,
      } as any);

      expect(result.stockQuantity).toBe(30);
    });

    it('should throw BadRequestException when subtracting more than available', async () => {
      const item = createInventoryItem({ tenantId, stockQuantity: 5 });
      itemRepo.findOne.mockResolvedValue(item);

      await expect(
        service.adjustStock(tenantId, item.id as string, {
          operation: 'subtract',
          quantity: 10,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should SET stock to exact quantity', async () => {
      const item = createInventoryItem({ tenantId, stockQuantity: 50 });
      itemRepo.findOne.mockResolvedValue(item);
      itemRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.adjustStock(tenantId, item.id as string, {
        operation: 'set',
        quantity: 100,
      } as any);

      expect(result.stockQuantity).toBe(100);
    });

    it('should reject negative SET quantity', async () => {
      const item = createInventoryItem({ tenantId, stockQuantity: 50 });
      itemRepo.findOne.mockResolvedValue(item);

      await expect(
        service.adjustStock(tenantId, item.id as string, {
          operation: 'set',
          quantity: -5,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  findAll — search & filters
  // ═══════════════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return all items for tenant with default ordering', async () => {
      const qb = createMockQueryBuilder();
      itemRepo.createQueryBuilder.mockReturnValue(qb);
      const items = [createInventoryItem({ tenantId })];
      qb.getMany.mockResolvedValue(items);

      const result = await service.findAll(tenantId, {} as any);

      expect(result).toHaveLength(1);
      expect(qb.orderBy).toHaveBeenCalledWith('item.name', 'ASC');
    });

    it('should apply search filter across multiple fields', async () => {
      const qb = createMockQueryBuilder();
      itemRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { search: 'brake' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ search: '%brake%' }),
      );
    });

    it('should filter low stock items', async () => {
      const qb = createMockQueryBuilder();
      itemRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { lowStock: 'true' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('item.stockQuantity <= item.minStock');
    });

    it('should filter by category', async () => {
      const qb = createMockQueryBuilder();
      itemRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { category: 'brakes' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('item.category = :category', {
        category: 'brakes',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  getLowStockAlerts
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getLowStockAlerts', () => {
    it('should return active items at or below min stock', async () => {
      const qb = createMockQueryBuilder();
      itemRepo.createQueryBuilder.mockReturnValue(qb);
      const lowItems = [
        createInventoryItem({ tenantId, stockQuantity: 2, minStock: 10 }),
      ];
      qb.getMany.mockResolvedValue(lowItems);

      const result = await service.getLowStockAlerts(tenantId);

      expect(result).toHaveLength(1);
      expect(qb.andWhere).toHaveBeenCalledWith('item.stockQuantity <= item.minStock');
      expect(qb.andWhere).toHaveBeenCalledWith('item.isActive = true');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Cost-integrated operations (delegate to InventoryCostService)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('stockEntry', () => {
    it('should delegate to costService.processEntry', async () => {
      const dto = {
        itemId: 'item-1',
        quantity: 10,
        unitCost: 5000,
        movementType: 'purchase',
        warehouseId: 'wh-1',
      };

      await service.stockEntry(tenantId, dto as any);

      expect(costService.processEntry).toHaveBeenCalledWith(
        tenantId,
        dto.itemId,
        dto.quantity,
        dto.unitCost,
        dto.movementType,
        expect.any(Object),
      );
    });
  });

  describe('stockExit', () => {
    it('should delegate to costService.processExit', async () => {
      const dto = {
        itemId: 'item-1',
        quantity: 5,
        movementType: 'work_order',
        warehouseId: 'wh-1',
      };

      await service.stockExit(tenantId, dto as any);

      expect(costService.processExit).toHaveBeenCalledWith(
        tenantId,
        dto.itemId,
        dto.quantity,
        dto.movementType,
        expect.any(Object),
      );
    });
  });
});

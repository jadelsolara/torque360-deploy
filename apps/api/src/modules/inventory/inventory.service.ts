import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  AdjustStockDto,
  ListInventoryQueryDto,
  StockEntryDto,
  StockExitDto,
  StockAdjustmentDto,
} from './inventory.dto';
import { InventoryCostService } from './inventory-cost.service';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private itemRepo: Repository<InventoryItem>,
    private costService: InventoryCostService,
  ) {}

  async create(
    tenantId: string,
    dto: CreateInventoryItemDto,
  ): Promise<InventoryItem> {
    const item = this.itemRepo.create({
      tenantId,
      ...dto,
    });
    return this.itemRepo.save(item);
  }

  async findAll(
    tenantId: string,
    query: ListInventoryQueryDto,
  ): Promise<InventoryItem[]> {
    const qb = this.itemRepo
      .createQueryBuilder('item')
      .where('item.tenantId = :tenantId', { tenantId });

    if (query.search) {
      qb.andWhere(
        '(item.name ILIKE :search OR item.sku ILIKE :search OR item.partNumber ILIKE :search OR item.oemNumber ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.name) {
      qb.andWhere('item.name ILIKE :name', { name: `%${query.name}%` });
    }

    if (query.sku) {
      qb.andWhere('item.sku ILIKE :sku', { sku: `%${query.sku}%` });
    }

    if (query.partNumber) {
      qb.andWhere('item.partNumber ILIKE :partNumber', {
        partNumber: `%${query.partNumber}%`,
      });
    }

    if (query.category) {
      qb.andWhere('item.category = :category', {
        category: query.category,
      });
    }

    if (query.lowStock === 'true') {
      qb.andWhere('item.stockQuantity <= item.minStock');
    }

    if (query.isActive !== undefined) {
      qb.andWhere('item.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    }

    qb.orderBy('item.name', 'ASC');

    return qb.getMany();
  }

  async findById(
    tenantId: string,
    itemId: string,
  ): Promise<InventoryItem> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, tenantId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    return item;
  }

  async update(
    tenantId: string,
    itemId: string,
    dto: UpdateInventoryItemDto,
  ): Promise<InventoryItem> {
    const item = await this.findById(tenantId, itemId);

    Object.assign(item, dto);

    return this.itemRepo.save(item);
  }

  async adjustStock(
    tenantId: string,
    itemId: string,
    dto: AdjustStockDto,
  ): Promise<InventoryItem> {
    const item = await this.findById(tenantId, itemId);

    switch (dto.operation) {
      case 'add':
        item.stockQuantity = Number(item.stockQuantity) + dto.quantity;
        break;
      case 'subtract':
        const newQty = Number(item.stockQuantity) - dto.quantity;
        if (newQty < 0) {
          throw new BadRequestException(
            `Insufficient stock. Current: ${item.stockQuantity}, attempting to subtract: ${dto.quantity}`,
          );
        }
        item.stockQuantity = newQty;
        break;
      case 'set':
        if (dto.quantity < 0) {
          throw new BadRequestException('Stock quantity cannot be negative');
        }
        item.stockQuantity = dto.quantity;
        break;
    }

    return this.itemRepo.save(item);
  }

  async getLowStockAlerts(tenantId: string): Promise<InventoryItem[]> {
    return this.itemRepo
      .createQueryBuilder('item')
      .where('item.tenantId = :tenantId', { tenantId })
      .andWhere('item.stockQuantity <= item.minStock')
      .andWhere('item.isActive = true')
      .orderBy('item.stockQuantity', 'ASC')
      .getMany();
  }

  // ─── CPP Cost-Integrated Operations ─────────────────────────────────

  async stockEntry(tenantId: string, dto: StockEntryDto) {
    return this.costService.processEntry(
      tenantId,
      dto.itemId,
      dto.quantity,
      dto.unitCost,
      dto.movementType,
      {
        type: dto.referenceType,
        id: dto.referenceId,
        reason: dto.reason,
        warehouseId: dto.warehouseId,
        locationId: dto.locationId,
      },
    );
  }

  async stockExit(tenantId: string, dto: StockExitDto) {
    return this.costService.processExit(
      tenantId,
      dto.itemId,
      dto.quantity,
      dto.movementType,
      {
        type: dto.referenceType,
        id: dto.referenceId,
        reason: dto.reason,
        warehouseId: dto.warehouseId,
        locationId: dto.locationId,
      },
    );
  }

  async stockAdjustmentWithCost(
    tenantId: string,
    itemId: string,
    dto: StockAdjustmentDto,
  ) {
    return this.costService.processAdjustment(
      tenantId,
      itemId,
      dto.quantityDelta,
      dto.unitCost,
      {
        reason: dto.reason,
        warehouseId: dto.warehouseId,
        locationId: dto.locationId,
      },
    );
  }

  async getItemValuation(tenantId: string, itemId: string) {
    return this.costService.getItemValuation(tenantId, itemId);
  }

  async getCostHistory(
    tenantId: string,
    itemId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    return this.costService.getCostHistory(tenantId, itemId, dateFrom, dateTo);
  }

  async getWarehouseValuation(tenantId: string, warehouseId?: string) {
    return this.costService.getWarehouseValuation(tenantId, warehouseId);
  }

  async recalculateItemCost(tenantId: string, itemId: string) {
    return this.costService.recalculateAverageCost(tenantId, itemId);
  }
}

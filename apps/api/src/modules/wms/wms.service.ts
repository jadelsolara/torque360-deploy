import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../../database/entities/warehouse.entity';
import { WarehouseLocation } from '../../database/entities/warehouse-location.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  CreateLocationDto,
  StockOperationDto,
  TransferStockDto,
  AdjustStockDto,
  MovementFiltersDto,
} from './wms.dto';
import { InventoryCostService } from '../inventory/inventory-cost.service';

@Injectable()
export class WmsService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(WarehouseLocation)
    private locationRepo: Repository<WarehouseLocation>,
    @InjectRepository(StockMovement)
    private movementRepo: Repository<StockMovement>,
    @InjectRepository(InventoryItem)
    private itemRepo: Repository<InventoryItem>,
    @Optional() @Inject(InventoryCostService)
    private costService?: InventoryCostService,
  ) {}

  // ─── Warehouses ────────────────────────────────────────────────

  async createWarehouse(tenantId: string, dto: CreateWarehouseDto) {
    const existing = await this.warehouseRepo.findOne({
      where: { tenantId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Warehouse code "${dto.code}" already exists for this tenant`);
    }

    const warehouse = this.warehouseRepo.create({
      tenantId,
      name: dto.name,
      code: dto.code,
      address: dto.address,
      city: dto.city,
      region: dto.region,
      type: dto.type || 'main',
    });

    return this.warehouseRepo.save(warehouse);
  }

  async getWarehouses(tenantId: string) {
    const warehouses = await this.warehouseRepo.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });

    // Add locations count for each warehouse
    const result = await Promise.all(
      warehouses.map(async (w) => {
        const locationsCount = await this.locationRepo.count({
          where: { tenantId, warehouseId: w.id },
        });
        return { ...w, locationsCount };
      }),
    );

    return result;
  }

  async getWarehouse(tenantId: string, id: string) {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id, tenantId },
      relations: ['locations'],
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Get recent movements for this warehouse
    const recentMovements = await this.movementRepo.find({
      where: [
        { tenantId, fromWarehouseId: id },
        { tenantId, toWarehouseId: id },
      ],
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return { ...warehouse, recentMovements };
  }

  async updateWarehouse(tenantId: string, id: string, dto: UpdateWarehouseDto) {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id, tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // If updating code, check uniqueness
    if (dto.code && dto.code !== warehouse.code) {
      const existing = await this.warehouseRepo.findOne({
        where: { tenantId, code: dto.code },
      });
      if (existing) {
        throw new ConflictException(`Warehouse code "${dto.code}" already exists for this tenant`);
      }
    }

    Object.assign(warehouse, dto);
    return this.warehouseRepo.save(warehouse);
  }

  // ─── Locations ─────────────────────────────────────────────────

  async createLocation(tenantId: string, warehouseId: string, dto: CreateLocationDto) {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id: warehouseId, tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const existing = await this.locationRepo.findOne({
      where: { tenantId, warehouseId, code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Location code "${dto.code}" already exists in this warehouse`);
    }

    const location = this.locationRepo.create({
      tenantId,
      warehouseId,
      code: dto.code,
      name: dto.name,
      zone: dto.zone,
      aisle: dto.aisle,
      rack: dto.rack,
      shelf: dto.shelf,
      bin: dto.bin,
      capacity: dto.capacity,
    });

    return this.locationRepo.save(location);
  }

  async getLocations(tenantId: string, warehouseId: string) {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id: warehouseId, tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    return this.locationRepo.find({
      where: { tenantId, warehouseId },
      order: { code: 'ASC' },
    });
  }

  // ─── Stock Operations ──────────────────────────────────────────

  async receiveStock(tenantId: string, dto: StockOperationDto) {
    const item = await this.itemRepo.findOne({
      where: { id: dto.itemId, tenantId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const warehouse = await this.warehouseRepo.findOne({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // If unitCost is provided and cost service is available, use CPP
    if (dto.unitCost !== undefined && dto.unitCost !== null && this.costService) {
      const costResult = await this.costService.processEntry(
        tenantId,
        dto.itemId,
        dto.quantity,
        dto.unitCost,
        'receive',
        {
          type: dto.referenceType,
          id: dto.referenceId,
          reason: dto.reason,
          performedBy: dto.performedBy,
          warehouseId: dto.warehouseId,
          locationId: dto.locationId,
        },
      );
      return {
        movementId: costResult.movementId,
        updatedStock: costResult.newStock,
        averageCost: costResult.newAverageCost,
        totalStockValue: costResult.newTotalValue,
      };
    }

    // Fallback: original behavior (no cost tracking)
    const movement = this.movementRepo.create({
      tenantId,
      itemId: dto.itemId,
      toWarehouseId: dto.warehouseId,
      toLocationId: dto.locationId ?? undefined,
      movementType: 'receive',
      quantity: dto.quantity,
      referenceType: dto.referenceType ?? undefined,
      referenceId: dto.referenceId ?? undefined,
      reason: dto.reason ?? undefined,
      performedBy: dto.performedBy,
    });
    await this.movementRepo.save(movement);

    // Update inventory item stock
    item.stockQuantity = Number(item.stockQuantity) + Number(dto.quantity);
    await this.itemRepo.save(item);

    return { movement, updatedStock: item.stockQuantity };
  }

  async dispatchStock(tenantId: string, dto: StockOperationDto) {
    const item = await this.itemRepo.findOne({
      where: { id: dto.itemId, tenantId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    if (Number(item.stockQuantity) < Number(dto.quantity)) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${item.stockQuantity}, Requested: ${dto.quantity}`,
      );
    }

    const warehouse = await this.warehouseRepo.findOne({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // If cost service is available, use CPP exit tracking
    if (this.costService) {
      const costResult = await this.costService.processExit(
        tenantId,
        dto.itemId,
        dto.quantity,
        'dispatch',
        {
          type: dto.referenceType,
          id: dto.referenceId,
          reason: dto.reason,
          performedBy: dto.performedBy,
          warehouseId: dto.warehouseId,
          locationId: dto.locationId,
        },
      );
      return {
        movementId: costResult.movementId,
        updatedStock: costResult.remainingStock,
        costOfExit: costResult.costOfExit,
        averageCost: costResult.averageCost,
        remainingValue: costResult.remainingValue,
      };
    }

    // Fallback: original behavior
    const movement = this.movementRepo.create({
      tenantId,
      itemId: dto.itemId,
      fromWarehouseId: dto.warehouseId,
      fromLocationId: dto.locationId ?? undefined,
      movementType: 'dispatch',
      quantity: dto.quantity,
      referenceType: dto.referenceType ?? undefined,
      referenceId: dto.referenceId ?? undefined,
      reason: dto.reason ?? undefined,
      performedBy: dto.performedBy,
    });
    await this.movementRepo.save(movement);

    item.stockQuantity = Number(item.stockQuantity) - Number(dto.quantity);
    await this.itemRepo.save(item);

    return { movement, updatedStock: item.stockQuantity };
  }

  async transferStock(tenantId: string, dto: TransferStockDto) {
    const item = await this.itemRepo.findOne({
      where: { id: dto.itemId, tenantId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    if (Number(item.stockQuantity) < Number(dto.quantity)) {
      throw new BadRequestException(
        `Insufficient stock for transfer. Available: ${item.stockQuantity}, Requested: ${dto.quantity}`,
      );
    }

    const fromWarehouse = await this.warehouseRepo.findOne({
      where: { id: dto.fromWarehouseId, tenantId },
    });
    if (!fromWarehouse) {
      throw new NotFoundException('Source warehouse not found');
    }

    const toWarehouse = await this.warehouseRepo.findOne({
      where: { id: dto.toWarehouseId, tenantId },
    });
    if (!toWarehouse) {
      throw new NotFoundException('Destination warehouse not found');
    }

    const movement = this.movementRepo.create({
      tenantId,
      itemId: dto.itemId,
      fromWarehouseId: dto.fromWarehouseId,
      fromLocationId: dto.fromLocationId ?? undefined,
      toWarehouseId: dto.toWarehouseId,
      toLocationId: dto.toLocationId ?? undefined,
      movementType: 'transfer',
      quantity: dto.quantity,
      reason: dto.reason ?? undefined,
      performedBy: dto.performedBy,
    });
    await this.movementRepo.save(movement);

    // Transfer does NOT change total stockQuantity — it moves between warehouses
    return { movement, currentStock: item.stockQuantity };
  }

  async adjustStock(tenantId: string, dto: AdjustStockDto) {
    const item = await this.itemRepo.findOne({
      where: { id: dto.itemId, tenantId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const warehouse = await this.warehouseRepo.findOne({
      where: { id: dto.warehouseId, tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    const newStock = Number(item.stockQuantity) + Number(dto.quantity);
    if (newStock < 0) {
      throw new BadRequestException(
        `Adjustment would result in negative stock. Current: ${item.stockQuantity}, Adjustment: ${dto.quantity}`,
      );
    }

    const movement = this.movementRepo.create({
      tenantId,
      itemId: dto.itemId,
      toWarehouseId: dto.warehouseId,
      toLocationId: dto.locationId ?? undefined,
      movementType: 'adjustment',
      quantity: dto.quantity,
      reason: dto.reason,
      performedBy: dto.performedBy,
    });
    await this.movementRepo.save(movement);

    item.stockQuantity = newStock;
    await this.itemRepo.save(item);

    return { movement, updatedStock: item.stockQuantity };
  }

  // ─── Queries ───────────────────────────────────────────────────

  async getMovements(tenantId: string, filters: MovementFiltersDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const qb = this.movementRepo
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId', { tenantId });

    if (filters.warehouseId) {
      qb.andWhere(
        '(m.from_warehouse_id = :wid OR m.to_warehouse_id = :wid)',
        { wid: filters.warehouseId },
      );
    }

    if (filters.itemId) {
      qb.andWhere('m.item_id = :itemId', { itemId: filters.itemId });
    }

    if (filters.movementType) {
      qb.andWhere('m.movement_type = :movementType', {
        movementType: filters.movementType,
      });
    }

    if (filters.dateFrom) {
      qb.andWhere('m.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('m.created_at <= :dateTo', { dateTo: filters.dateTo });
    }

    qb.orderBy('m.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStockByWarehouse(tenantId: string, warehouseId: string) {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id: warehouseId, tenantId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // Aggregate stock per item based on movements in this warehouse
    const result = await this.movementRepo
      .createQueryBuilder('m')
      .select('m.item_id', 'itemId')
      .addSelect(
        `SUM(CASE
          WHEN m.movement_type IN ('receive', 'adjustment') AND m.to_warehouse_id = :wid THEN m.quantity
          WHEN m.movement_type = 'dispatch' AND m.from_warehouse_id = :wid THEN -m.quantity
          WHEN m.movement_type = 'transfer' AND m.to_warehouse_id = :wid THEN m.quantity
          WHEN m.movement_type = 'transfer' AND m.from_warehouse_id = :wid THEN -m.quantity
          ELSE 0
        END)`,
        'warehouseStock',
      )
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere(
        '(m.from_warehouse_id = :wid OR m.to_warehouse_id = :wid)',
        { wid: warehouseId },
      )
      .groupBy('m.item_id')
      .getRawMany();

    // Enrich with item data
    const itemIds = result.map((r) => r.itemId);
    const items = itemIds.length
      ? await this.itemRepo
          .createQueryBuilder('i')
          .where('i.id IN (:...itemIds)', { itemIds })
          .andWhere('i.tenant_id = :tenantId', { tenantId })
          .getMany()
      : [];

    const itemMap = new Map(items.map((i) => [i.id, i]));

    return result.map((r) => ({
      itemId: r.itemId,
      item: itemMap.get(r.itemId) || null,
      warehouseStock: Number(r.warehouseStock),
    }));
  }

  async getLowStockAlerts(tenantId: string) {
    return this.itemRepo
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.is_active = true')
      .andWhere('i.min_stock > 0')
      .andWhere('i.stock_quantity <= i.min_stock')
      .orderBy('i.stock_quantity', 'ASC')
      .getMany();
  }
}

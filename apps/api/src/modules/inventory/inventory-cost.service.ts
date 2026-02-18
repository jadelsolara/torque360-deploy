import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';

// Movement types that ADD stock (entries)
const ENTRY_MOVEMENT_TYPES = [
  'purchase',
  'import',
  'return',
  'receive',
  'adjustment_in',
];

// Movement types that REMOVE stock (exits)
const EXIT_MOVEMENT_TYPES = [
  'dispatch',
  'sale',
  'adjustment_out',
];

export interface CostEntryResult {
  newAverageCost: number;
  newTotalValue: number;
  newStock: number;
  movementId: string;
}

export interface CostExitResult {
  costOfExit: number;
  averageCost: number;
  remainingStock: number;
  remainingValue: number;
  movementId: string;
}

export interface ItemValuation {
  itemId: string;
  name: string;
  sku: string;
  currentStock: number;
  averageCost: number;
  totalValue: number;
  lastPurchaseCost: number;
  costCurrency: string;
}

export interface WarehouseValuationItem {
  category: string;
  itemCount: number;
  totalValue: number;
}

export interface WarehouseValuationResult {
  warehouseId: string | null;
  totalValue: number;
  itemCount: number;
  byCategory: WarehouseValuationItem[];
}

export interface CostHistoryEntry {
  id: string;
  createdAt: Date;
  movementType: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  averageCostBefore: number;
  averageCostAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
}

@Injectable()
export class InventoryCostService {
  constructor(
    @InjectRepository(InventoryItem)
    private itemRepo: Repository<InventoryItem>,
    @InjectRepository(StockMovement)
    private movementRepo: Repository<StockMovement>,
    private dataSource: DataSource,
  ) {}

  // ─── Core Entry Processing (CPP Recalculation) ──────────────────────

  /**
   * Process a stock ENTRY (purchase, import, return).
   * Recalculates the weighted average cost.
   *
   * Formula:
   *   newAvgCost = (currentStock * currentAvgCost + newQty * newUnitCost) / (currentStock + newQty)
   *
   * If stock is 0, the new average cost = unitCost (no division by zero).
   */
  async processEntry(
    tenantId: string,
    inventoryItemId: string,
    quantity: number,
    unitCost: number,
    movementType: string,
    reference?: { type?: string; id?: string; reason?: string; performedBy?: string; warehouseId?: string; locationId?: string },
  ): Promise<CostEntryResult> {
    if (quantity <= 0) {
      throw new BadRequestException('Entry quantity must be greater than 0');
    }
    if (unitCost < 0) {
      throw new BadRequestException('Unit cost cannot be negative');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the item row for update to prevent concurrent modifications
      const item = await queryRunner.manager.findOne(InventoryItem, {
        where: { id: inventoryItemId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!item) {
        throw new NotFoundException('Inventory item not found');
      }

      const currentStock = Number(item.stockQuantity);
      const currentAvgCost = Number(item.costPrice);
      const avgCostBefore = currentAvgCost;

      // CPP calculation
      let newAverageCost: number;
      if (currentStock <= 0) {
        // Stock was zero — new average = incoming unit cost
        newAverageCost = unitCost;
      } else {
        // Weighted average formula
        const currentTotalValue = currentStock * currentAvgCost;
        const incomingValue = quantity * unitCost;
        newAverageCost = (currentTotalValue + incomingValue) / (currentStock + quantity);
      }

      // Round to 4 decimal places to match decimal(14,4)
      newAverageCost = Math.round(newAverageCost * 10000) / 10000;

      const newStock = currentStock + quantity;
      const newTotalValue = Math.round(newStock * newAverageCost * 100) / 100;
      const totalCostOfEntry = Math.round(quantity * unitCost * 100) / 100;

      // Update item
      item.stockQuantity = newStock;
      item.costPrice = newAverageCost;
      // costPrice already updated above
      await queryRunner.manager.save(InventoryItem, item);

      // Create movement record with cost data
      const movement = queryRunner.manager.create(StockMovement, {
        tenantId,
        itemId: inventoryItemId,
        toWarehouseId: reference?.warehouseId || undefined,
        toLocationId: reference?.locationId || undefined,
        movementType,
        quantity,
        unitCost,
        averageCostAfter: newAverageCost,
        referenceType: reference?.type || undefined,
        referenceId: reference?.id || undefined,
        reason: reference?.reason || `Entry: ${quantity} units @ ${unitCost}/unit, avg cost: ${avgCostBefore} -> ${newAverageCost}`,
        performedBy: reference?.performedBy || undefined,
      });
      const savedMovement = await queryRunner.manager.save(StockMovement, movement);

      await queryRunner.commitTransaction();

      return {
        newAverageCost,
        newTotalValue,
        newStock,
        movementId: savedMovement.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Core Exit Processing ───────────────────────────────────────────

  /**
   * Process a stock EXIT (dispatch, sale).
   * Uses the current average cost for valuation.
   * Average cost does NOT change on exit, only quantity decreases.
   */
  async processExit(
    tenantId: string,
    inventoryItemId: string,
    quantity: number,
    movementType: string,
    reference?: { type?: string; id?: string; reason?: string; performedBy?: string; warehouseId?: string; locationId?: string },
  ): Promise<CostExitResult> {
    if (quantity <= 0) {
      throw new BadRequestException('Exit quantity must be greater than 0');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = await queryRunner.manager.findOne(InventoryItem, {
        where: { id: inventoryItemId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!item) {
        throw new NotFoundException('Inventory item not found');
      }

      const currentStock = Number(item.stockQuantity);
      const currentAvgCost = Number(item.costPrice);

      if (currentStock < quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${currentStock}, Requested: ${quantity}`,
        );
      }

      // Cost of exit = quantity * current average cost
      const costOfExit = Math.round(quantity * currentAvgCost * 100) / 100;
      const remainingStock = currentStock - quantity;

      // Average cost stays the same on exit
      // If stock goes to zero, average cost resets to 0
      const newAvgCost = remainingStock <= 0 ? 0 : currentAvgCost;
      const remainingValue = Math.round(remainingStock * newAvgCost * 100) / 100;

      // Update item
      item.stockQuantity = remainingStock;
      item.costPrice = newAvgCost;
      // totalStockValue computed from stockQuantity * costPrice
      await queryRunner.manager.save(InventoryItem, item);

      // Create movement record with cost data
      const movement = queryRunner.manager.create(StockMovement, {
        tenantId,
        itemId: inventoryItemId,
        fromWarehouseId: reference?.warehouseId || undefined,
        fromLocationId: reference?.locationId || undefined,
        movementType,
        quantity,
        unitCost: currentAvgCost,
        averageCostAfter: newAvgCost,
        referenceType: reference?.type || undefined,
        referenceId: reference?.id || undefined,
        reason: reference?.reason || `Exit: ${quantity} units @ avg ${currentAvgCost}/unit`,
        performedBy: reference?.performedBy || undefined,
      });
      const savedMovement = await queryRunner.manager.save(StockMovement, movement);

      await queryRunner.commitTransaction();

      return {
        costOfExit,
        averageCost: newAvgCost,
        remainingStock,
        remainingValue,
        movementId: savedMovement.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Specialized Entry Methods ──────────────────────────────────────

  /**
   * Process an import entry where cost = landed cost (FOB + all import costs / qty).
   */
  async processImportEntry(
    tenantId: string,
    inventoryItemId: string,
    quantity: number,
    landedCostPerUnit: number,
    reference?: { type?: string; id?: string; reason?: string; performedBy?: string; warehouseId?: string; locationId?: string },
  ): Promise<CostEntryResult> {
    return this.processEntry(
      tenantId,
      inventoryItemId,
      quantity,
      landedCostPerUnit,
      'import',
      reference,
    );
  }

  /**
   * Process a local purchase entry.
   */
  async processLocalPurchase(
    tenantId: string,
    inventoryItemId: string,
    quantity: number,
    purchasePrice: number,
    reference?: { type?: string; id?: string; reason?: string; performedBy?: string; warehouseId?: string; locationId?: string },
  ): Promise<CostEntryResult> {
    return this.processEntry(
      tenantId,
      inventoryItemId,
      quantity,
      purchasePrice,
      'purchase',
      reference,
    );
  }

  /**
   * Process a stock return at a specific cost.
   */
  async processReturn(
    tenantId: string,
    inventoryItemId: string,
    quantity: number,
    returnCost: number,
    reference?: { type?: string; id?: string; reason?: string; performedBy?: string; warehouseId?: string; locationId?: string },
  ): Promise<CostEntryResult> {
    return this.processEntry(
      tenantId,
      inventoryItemId,
      quantity,
      returnCost,
      'return',
      reference,
    );
  }

  // ─── Adjustment Processing ──────────────────────────────────────────

  /**
   * Process an inventory adjustment (positive or negative).
   * If positive: recalculates weighted average with provided costPerUnit.
   * If negative: uses current average cost (same as exit).
   */
  async processAdjustment(
    tenantId: string,
    inventoryItemId: string,
    quantityDelta: number,
    costPerUnit?: number,
    reference?: { reason?: string; performedBy?: string; warehouseId?: string; locationId?: string },
  ): Promise<CostEntryResult | CostExitResult> {
    if (quantityDelta === 0) {
      throw new BadRequestException('Adjustment quantity cannot be zero');
    }

    if (quantityDelta > 0) {
      // Positive adjustment — treat as entry
      const unitCost = costPerUnit ?? 0;
      return this.processEntry(
        tenantId,
        inventoryItemId,
        quantityDelta,
        unitCost,
        'adjustment_in',
        {
          reason: reference?.reason,
          performedBy: reference?.performedBy,
          warehouseId: reference?.warehouseId,
          locationId: reference?.locationId,
        },
      );
    } else {
      // Negative adjustment — treat as exit (uses current avg cost)
      return this.processExit(
        tenantId,
        inventoryItemId,
        Math.abs(quantityDelta),
        'adjustment_out',
        {
          reason: reference?.reason,
          performedBy: reference?.performedBy,
          warehouseId: reference?.warehouseId,
          locationId: reference?.locationId,
        },
      );
    }
  }

  // ─── Valuation Queries ──────────────────────────────────────────────

  /**
   * Returns the current valuation for a single inventory item.
   */
  async getItemValuation(
    tenantId: string,
    inventoryItemId: string,
  ): Promise<ItemValuation> {
    const item = await this.itemRepo.findOne({
      where: { id: inventoryItemId, tenantId },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    return {
      itemId: item.id,
      name: item.name,
      sku: item.sku,
      currentStock: Number(item.stockQuantity),
      averageCost: Number(item.costPrice),
      totalValue: Number(item.stockQuantity) * Number(item.costPrice),
      lastPurchaseCost: Number(item.costPrice),
      costCurrency: 'CLP',
    };
  }

  /**
   * Returns the total warehouse valuation, grouped by category.
   * If warehouseId is provided, calculates based on movements per warehouse.
   * If not provided, uses the denormalized totalStockValue from all items.
   */
  async getWarehouseValuation(
    tenantId: string,
    warehouseId?: string,
  ): Promise<WarehouseValuationResult> {
    if (warehouseId) {
      // Per-warehouse valuation: aggregate from movements
      // Get all items that have movements in this warehouse
      const movementData = await this.movementRepo
        .createQueryBuilder('m')
        .select('m.item_id', 'itemId')
        .addSelect(
          `SUM(CASE
            WHEN m.movement_type IN ('receive', 'purchase', 'import', 'return', 'adjustment_in') AND m.to_warehouse_id = :wid THEN m.quantity
            WHEN m.movement_type IN ('dispatch', 'sale', 'adjustment_out') AND m.from_warehouse_id = :wid THEN -m.quantity
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

      const itemIds = movementData.map((r) => r.itemId).filter(Boolean);

      if (itemIds.length === 0) {
        return {
          warehouseId,
          totalValue: 0,
          itemCount: 0,
          byCategory: [],
        };
      }

      const items = await this.itemRepo
        .createQueryBuilder('i')
        .where('i.id IN (:...itemIds)', { itemIds })
        .andWhere('i.tenant_id = :tenantId', { tenantId })
        .getMany();

      const itemMap = new Map(items.map((i) => [i.id, i]));

      // Build category aggregation
      const categoryMap = new Map<string, { itemCount: number; totalValue: number }>();
      let totalValue = 0;
      let itemCount = 0;

      for (const md of movementData) {
        const whStock = Number(md.warehouseStock);
        if (whStock <= 0) continue;

        const item = itemMap.get(md.itemId);
        if (!item) continue;

        const avgCost = Number(item.costPrice);
        const value = Math.round(whStock * avgCost * 100) / 100;

        const cat = item.category || 'Sin Categoria';
        const existing = categoryMap.get(cat) || { itemCount: 0, totalValue: 0 };
        existing.itemCount += 1;
        existing.totalValue += value;
        categoryMap.set(cat, existing);

        totalValue += value;
        itemCount += 1;
      }

      const byCategory: WarehouseValuationItem[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          itemCount: data.itemCount,
          totalValue: Math.round(data.totalValue * 100) / 100,
        }))
        .sort((a, b) => b.totalValue - a.totalValue);

      return {
        warehouseId,
        totalValue: Math.round(totalValue * 100) / 100,
        itemCount,
        byCategory,
      };
    }

    // Global valuation — use denormalized totalStockValue
    const result = await this.itemRepo
      .createQueryBuilder('i')
      .select('COALESCE(i.category, \'Sin Categoria\')', 'category')
      .addSelect('COUNT(i.id)', 'itemCount')
      .addSelect('SUM(i.stock_quantity * i.cost_price)', 'totalValue')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.is_active = true')
      .andWhere('i.stock_quantity > 0')
      .groupBy('COALESCE(i.category, \'Sin Categoria\')')
      .orderBy('"totalValue"', 'DESC')
      .getRawMany();

    const byCategory: WarehouseValuationItem[] = result.map((r) => ({
      category: r.category,
      itemCount: Number(r.itemCount),
      totalValue: Math.round(Number(r.totalValue) * 100) / 100,
    }));

    const totalValue = byCategory.reduce((sum, c) => sum + c.totalValue, 0);
    const itemCount = byCategory.reduce((sum, c) => sum + c.itemCount, 0);

    return {
      warehouseId: null,
      totalValue: Math.round(totalValue * 100) / 100,
      itemCount,
      byCategory,
    };
  }

  // ─── Cost History ───────────────────────────────────────────────────

  /**
   * Returns the cost movement history for an item, showing how the average cost evolved.
   */
  async getCostHistory(
    tenantId: string,
    inventoryItemId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{ data: CostHistoryEntry[]; total: number }> {
    // Verify item exists
    const item = await this.itemRepo.findOne({
      where: { id: inventoryItemId, tenantId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const qb = this.movementRepo
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId', { tenantId })
      .andWhere('m.item_id = :itemId', { itemId: inventoryItemId })
;

    if (dateFrom) {
      qb.andWhere('m.created_at >= :dateFrom', { dateFrom });
    }
    if (dateTo) {
      qb.andWhere('m.created_at <= :dateTo', { dateTo });
    }

    qb.orderBy('m.created_at', 'DESC');

    const [movements, total] = await qb.getManyAndCount();

    // Build cost history — reconstruct averageCostBefore from previous movement's averageCostAfter
    const chronological = [...movements].reverse();
    const costBeforeMap = new Map<string, number>();
    let prevAvgCost = 0;
    for (const m of chronological) {
      costBeforeMap.set(m.id, prevAvgCost);
      prevAvgCost = m.averageCostAfter != null ? Number(m.averageCostAfter) : prevAvgCost;
    }

    const data: CostHistoryEntry[] = movements.map((m) => {
      const uc = m.unitCost != null ? Number(m.unitCost) : 0;
      const avgAfter = m.averageCostAfter != null ? Number(m.averageCostAfter) : 0;
      return {
        id: m.id,
        createdAt: m.createdAt,
        movementType: m.movementType,
        quantity: Number(m.quantity),
        unitCost: uc,
        totalCost: Math.round(Number(m.quantity) * uc * 100) / 100,
        averageCostBefore: costBeforeMap.get(m.id) ?? 0,
        averageCostAfter: avgAfter,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        reason: m.reason,
      };
    });

    return { data, total };
  }

  // ─── Recalculate from Scratch ───────────────────────────────────────

  /**
   * Recalculates the average cost from scratch using all historical movements.
   * Used for corrections and auditing.
   */
  async recalculateAverageCost(
    tenantId: string,
    inventoryItemId: string,
  ): Promise<ItemValuation> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = await queryRunner.manager.findOne(InventoryItem, {
        where: { id: inventoryItemId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!item) {
        throw new NotFoundException('Inventory item not found');
      }

      // Get all movements for this item, ordered chronologically
      const movements = await queryRunner.manager.find(StockMovement, {
        where: { tenantId, itemId: inventoryItemId },
        order: { createdAt: 'ASC' },
      });

      let stock = 0;
      let avgCost = 0;
      let lastPurchaseCost = 0;

      for (const mov of movements) {
        const qty = Number(mov.quantity);
        const unitCost = mov.unitCost != null ? Number(mov.unitCost) : 0;
        const movType = mov.movementType;

        const isEntry =
          ENTRY_MOVEMENT_TYPES.includes(movType) ||
          (movType === 'adjustment' && qty > 0);

        const isExit =
          EXIT_MOVEMENT_TYPES.includes(movType) ||
          (movType === 'adjustment' && qty < 0);

        const avgCostBefore = avgCost;

        if (isEntry) {
          if (stock <= 0) {
            avgCost = unitCost;
          } else {
            avgCost = (stock * avgCost + qty * unitCost) / (stock + qty);
          }
          avgCost = Math.round(avgCost * 10000) / 10000;
          stock += qty;

          if (['purchase', 'import', 'receive'].includes(movType)) {
            lastPurchaseCost = unitCost;
          }
        } else if (isExit) {
          stock -= Math.abs(qty);
          if (stock <= 0) {
            stock = 0;
            avgCost = 0;
          }
        }
        // Transfer movements don't affect average cost or total stock

        // Persist recalculated cost data back to the movement
        mov.averageCostAfter = avgCost;
        await queryRunner.manager.save(StockMovement, mov);
      }

      const totalValue = Math.round(stock * avgCost * 100) / 100;

      // Update item with recalculated values
      item.stockQuantity = stock;
      item.costPrice = avgCost;
      // totalStockValue computed from stockQuantity * costPrice
      item.costPrice = avgCost;
      await queryRunner.manager.save(InventoryItem, item);

      await queryRunner.commitTransaction();

      return {
        itemId: item.id,
        name: item.name,
        sku: item.sku,
        currentStock: stock,
        averageCost: avgCost,
        totalValue,
        lastPurchaseCost,
        costCurrency: 'CLP',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

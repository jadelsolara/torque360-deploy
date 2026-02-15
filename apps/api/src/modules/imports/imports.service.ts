import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportOrder } from '../../database/entities/import-order.entity';
import { ImportOrderItem } from '../../database/entities/import-order-item.entity';
import { Supplier } from '../../database/entities/supplier.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { Notification } from '../../database/entities/notification.entity';
import { Approval } from '../../database/entities/approval.entity';
import { LandedCostService } from './landed-cost.service';
import { ExchangeRateService } from './exchange-rate.service';
import {
  CreateImportOrderDto,
  CreateImportItemDto,
  UpdateImportOrderDto,
  UpdateStatusDto,
  UpdateCostsDto,
} from './imports.dto';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed'],
  confirmed: ['shipped'],
  shipped: ['in_transit'],
  in_transit: ['at_port', 'customs'],
  at_port: ['customs'],
  customs: ['cleared'],
  cleared: ['received'],
  received: ['closed'],
};

@Injectable()
export class ImportsService {
  constructor(
    @InjectRepository(ImportOrder) private orderRepo: Repository<ImportOrder>,
    @InjectRepository(ImportOrderItem) private itemRepo: Repository<ImportOrderItem>,
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(InventoryItem) private inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    @InjectRepository(Approval) private approvalRepo: Repository<Approval>,
    private landedCostService: LandedCostService,
    private exchangeRateService: ExchangeRateService,
  ) {}

  async create(
    tenantId: string,
    userId: string,
    dto: CreateImportOrderDto,
  ): Promise<ImportOrder> {
    // Validate supplier exists and belongs to tenant
    const supplier = await this.supplierRepo.findOne({
      where: { id: dto.supplierId, tenantId },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    // Get the current exchange rate if not provided
    let exchangeRate = dto.exchangeRate;
    if (!exchangeRate) {
      const latestRate = await this.exchangeRateService.getLatestRate('USD');
      if (latestRate) {
        exchangeRate = Number(latestRate.observedRate);
      }
    }

    // Create order
    const order = this.orderRepo.create({
      tenantId,
      supplierId: dto.supplierId,
      status: 'draft',
      incoterm: dto.incoterm || 'FOB',
      originCountry: dto.originCountry || supplier.country,
      originPort: dto.originPort,
      destinationPort: dto.destinationPort || 'Valparaiso',
      currency: dto.currency || 'USD',
      exchangeRate: exchangeRate,
      freightCost: dto.freightCost || 0,
      insuranceCost: dto.insuranceCost || 0,
      otherCosts: dto.otherCosts || dto.otrosGastos || 0,
      notes: dto.notes,
      createdBy: userId,
    });

    const savedOrder = await this.orderRepo.save(order);

    // Create items
    const items: ImportOrderItem[] = [];
    for (const itemDto of dto.items) {
      const totalPrice = itemDto.quantity * itemDto.unitPrice;
      const item = this.itemRepo.create({
        tenantId,
        importOrderId: savedOrder.id,
        itemId: itemDto.itemId || itemDto.inventoryItemId,
        description: itemDto.description,
        hsCode: itemDto.hsCode,
        quantity: itemDto.quantity,
        unitPrice: itemDto.unitPrice,
        totalPrice,
        weightKg: itemDto.weightKg,
        volumeCbm: itemDto.volumeCbm,
      });
      items.push(item);
    }
    await this.itemRepo.save(items);

    // Calculate landed costs using the new service
    try {
      await this.landedCostService.calculateLandedCost(tenantId, savedOrder.id);
    } catch {
      // If calculation fails (e.g., no exchange rate), order is still saved
    }

    return this.findOne(tenantId, savedOrder.id);
  }

  async findAll(
    tenantId: string,
    filters?: { status?: string; supplierId?: string; dateFrom?: string; dateTo?: string },
  ): Promise<ImportOrder[]> {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .where('o.tenant_id = :tenantId', { tenantId })
      .orderBy('o.created_at', 'DESC');

    if (filters?.status) {
      qb.andWhere('o.status = :status', { status: filters.status });
    }

    if (filters?.supplierId) {
      qb.andWhere('o.supplier_id = :supplierId', { supplierId: filters.supplierId });
    }

    if (filters?.dateFrom) {
      qb.andWhere('o.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters?.dateTo) {
      qb.andWhere('o.created_at <= :dateTo', { dateTo: filters.dateTo });
    }

    return qb.getMany();
  }

  async findOne(tenantId: string, id: string): Promise<ImportOrder> {
    const order = await this.orderRepo.findOne({
      where: { id, tenantId },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('Import order not found');
    return order;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateImportOrderDto,
  ): Promise<ImportOrder> {
    const order = await this.findOne(tenantId, id);

    if (order.status !== 'draft' && order.status !== 'confirmed') {
      throw new BadRequestException('Only draft or confirmed orders can be edited');
    }

    // If changing supplier, validate it exists
    if (dto.supplierId && dto.supplierId !== order.supplierId) {
      const supplier = await this.supplierRepo.findOne({
        where: { id: dto.supplierId, tenantId },
      });
      if (!supplier) throw new NotFoundException('Supplier not found');
      if (!dto.supplierName) dto.supplierName = supplier.name;
    }

    // Apply updates
    const {
      customsDutyRate,
      lcExpiry,
      etd,
      eta,
      orderDate,
      estimatedShipDate,
      actualShipDate,
      supplierName,
      arancelRate,
      gastosPuerto,
      agenteAduana,
      transporteInterno,
      otrosGastos,
      shippingLine,
      trackingUrl,
      ...rest
    } = dto;

    Object.assign(order, rest);
    if (customsDutyRate !== undefined) {
      order.customsDuty = customsDutyRate;
    }
    if (lcExpiry) order.lcExpiry = new Date(lcExpiry);
    if (etd) order.etd = new Date(etd);
    if (eta) order.eta = new Date(eta);

    await this.orderRepo.save(order);

    // Recalculate landed costs
    try {
      await this.landedCostService.calculateLandedCost(tenantId, id);
    } catch {
      // Non-blocking
    }

    return this.findOne(tenantId, id);
  }

  async updateCosts(
    tenantId: string,
    id: string,
    dto: UpdateCostsDto,
  ): Promise<ImportOrder> {
    const order = await this.findOne(tenantId, id);

    if (dto.freightCost !== undefined) order.freightCost = dto.freightCost;
    if (dto.insuranceCost !== undefined) order.insuranceCost = dto.insuranceCost;
    if (dto.arancelRate !== undefined) order.customsDuty = dto.arancelRate;
    // Sum additional costs into otherCosts
    const additionalCosts = (dto.gastosPuerto ?? 0) + (dto.agenteAduana ?? 0) +
      (dto.transporteInterno ?? 0) + (dto.otrosGastos ?? 0);
    if (additionalCosts > 0) order.otherCosts = additionalCosts;

    await this.orderRepo.save(order);

    // Recalculate
    await this.landedCostService.calculateLandedCost(tenantId, id);

    return this.findOne(tenantId, id);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    userId: string,
    dto: UpdateStatusDto,
  ): Promise<ImportOrder> {
    const order = await this.findOne(tenantId, id);

    // Validate status transition
    const allowedNext = VALID_TRANSITIONS[order.status];
    if (!allowedNext || !allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition: ${order.status} -> ${dto.status}. Allowed: ${allowedNext?.join(', ') || 'none'}`,
      );
    }

    order.status = dto.status;
    if (dto.notes) {
      order.notes = order.notes
        ? `${order.notes}\n[${dto.status}] ${dto.notes}`
        : `[${dto.status}] ${dto.notes}`;
    }

    // On 'confirmed' -> create approval request for ADMIN
    if (dto.status === 'confirmed') {
      // Snapshot the exchange rate at confirmation
      const latestRate = await this.exchangeRateService.getLatestRate('USD');
      if (latestRate) {
        order.exchangeRate = Number(latestRate.observedRate);
      }

      const approval = this.approvalRepo.create({
        tenantId,
        requestedBy: userId,
        entityType: 'import_order',
        entityId: order.id,
        approvalType: 'import_confirmation',
        requiredRole: 'ADMIN',
        description: `Import order #${order.orderNumber} confirmed - Total FOB: USD ${order.fobTotal}`,
        context: {
          orderNumber: order.orderNumber,
          supplierId: order.supplierId,
          fobTotal: order.fobTotal,
          landedCostTotal: order.landedCostTotal,
        },
        status: 'pending',
      });
      await this.approvalRepo.save(approval);

      await this.notifRepo.save(
        this.notifRepo.create({
          tenantId,
          userId,
          type: 'import_confirmed',
          channel: 'in_app',
          title: 'Import Order Confirmed',
          message: `Import order #${order.orderNumber} has been confirmed and requires approval`,
          entityType: 'import_order',
          entityId: order.id,
          actionUrl: `/importaciones?order=${order.id}`,
          metadata: { orderNumber: order.orderNumber },
        }),
      );
    }

    // On 'customs' -> snapshot exchange rate at customs
    if (dto.status === 'customs') {
      const latestRate = await this.exchangeRateService.getLatestRate('USD');
      if (latestRate) {
        order.exchangeRate = Number(latestRate.observedRate);
      }
    }

    // On 'cleared' -> record customs clearance date and recalculate with customs rate
    if (dto.status === 'cleared') {
      order.customsClearanceDate = new Date();
    }

    // On 'received' -> update inventory stock
    if (dto.status === 'received') {
      order.actualArrival = new Date();
      // Recalculate final landed cost
      await this.orderRepo.save(order);
      await this.landedCostService.calculateLandedCost(tenantId, id);
      const updatedOrder = await this.findOne(tenantId, id);
      await this.updateInventoryFromOrder(tenantId, updatedOrder);
      return updatedOrder;
    }

    await this.orderRepo.save(order);

    // Recalculate landed cost on status changes
    try {
      await this.landedCostService.calculateLandedCost(tenantId, id);
    } catch {
      // Non-blocking
    }

    return this.findOne(tenantId, id);
  }

  async addItem(
    tenantId: string,
    orderId: string,
    dto: CreateImportItemDto,
  ): Promise<ImportOrder> {
    const order = await this.findOne(tenantId, orderId);

    if (order.status !== 'draft') {
      throw new BadRequestException('Can only add items to draft orders');
    }

    const totalPrice = dto.quantity * dto.unitPrice;
    const item = this.itemRepo.create({
      tenantId,
      importOrderId: orderId,
      itemId: dto.itemId || dto.inventoryItemId,
      description: dto.description,
      hsCode: dto.hsCode,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      totalPrice,
      weightKg: dto.weightKg,
      volumeCbm: dto.volumeCbm,
    });
    await this.itemRepo.save(item);

    // Recalculate
    try {
      await this.landedCostService.calculateLandedCost(tenantId, orderId);
    } catch {
      // Non-blocking
    }

    return this.findOne(tenantId, orderId);
  }

  async removeItem(
    tenantId: string,
    orderId: string,
    itemId: string,
  ): Promise<ImportOrder> {
    const order = await this.findOne(tenantId, orderId);

    if (order.status !== 'draft') {
      throw new BadRequestException('Can only remove items from draft orders');
    }

    const item = await this.itemRepo.findOne({
      where: { id: itemId, importOrderId: orderId, tenantId },
    });
    if (!item) throw new NotFoundException('Import order item not found');

    await this.itemRepo.remove(item);

    // Recalculate
    try {
      await this.landedCostService.calculateLandedCost(tenantId, orderId);
    } catch {
      // Non-blocking if no items left
    }

    return this.findOne(tenantId, orderId);
  }

  async getBySupplier(tenantId: string, supplierId: string): Promise<ImportOrder[]> {
    return this.orderRepo.find({
      where: { tenantId, supplierId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPipelineSummary(tenantId: string): Promise<{
    byStatus: Record<string, { count: number; totalValue: number }>;
    totalOrders: number;
    totalPipelineValue: number;
    currentExchangeRate: number | null;
  }> {
    const orders = await this.orderRepo.find({ where: { tenantId } });

    const byStatus: Record<string, { count: number; totalValue: number }> = {};
    let totalOrders = 0;
    let totalPipelineValue = 0;

    for (const order of orders) {
      const status = order.status;
      if (!byStatus[status]) {
        byStatus[status] = { count: 0, totalValue: 0 };
      }
      byStatus[status].count++;
      const landedValue = Number(order.landedCostTotal) || 0;
      byStatus[status].totalValue += landedValue;
      totalOrders++;
      totalPipelineValue += landedValue;
    }

    // Get current exchange rate
    let currentExchangeRate: number | null = null;
    const latestRate = await this.exchangeRateService.getLatestRate('USD');
    if (latestRate) {
      currentExchangeRate = Number(latestRate.observedRate);
    }

    return { byStatus, totalOrders, totalPipelineValue, currentExchangeRate };
  }

  // --- Private Methods ---

  /**
   * When an import order is received, update inventory stock quantities
   * and cost prices based on landed unit costs.
   */
  private async updateInventoryFromOrder(
    tenantId: string,
    order: ImportOrder,
  ): Promise<void> {
    const items = order.items || [];

    for (const item of items) {
      const inventoryItemId = item.itemId;
      if (!inventoryItemId) continue;

      const inventoryItem = await this.inventoryRepo.findOne({
        where: { id: inventoryItemId, tenantId },
      });

      if (inventoryItem) {
        // Weighted average cost calculation
        const currentStock = Number(inventoryItem.stockQuantity) || 0;
        const currentCost = Number(inventoryItem.costPrice) || 0;
        const incomingQty = Number(item.quantity);
        const incomingCost = Number(item.landedUnitCost) || 0;

        const totalStock = currentStock + incomingQty;
        if (totalStock > 0) {
          inventoryItem.costPrice =
            (currentCost * currentStock + incomingCost * incomingQty) / totalStock;
        }
        inventoryItem.stockQuantity = totalStock;

        await this.inventoryRepo.save(inventoryItem);

        await this.itemRepo.save(item);
      }
    }
  }
}

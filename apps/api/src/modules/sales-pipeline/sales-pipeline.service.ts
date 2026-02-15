import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Quotation } from '../../database/entities/quotation.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { WorkOrderPart } from '../../database/entities/work-order-part.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { WarehouseLocation } from '../../database/entities/warehouse-location.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Client } from '../../database/entities/client.entity';
import { FacturacionService } from '../facturacion/facturacion.service';
import {
  ConvertQuotationDto,
  DispatchPartsDto,
  InvoiceWorkOrderDto,
} from './sales-pipeline.dto';

// ── Interfaces for return types ──

export interface QuotationValidation {
  valid: boolean;
  missingFields: string[];
  quotation: Quotation | null;
}

export interface WorkOrderReadiness {
  workOrderId: string;
  status: string;
  canDispatch: boolean;
  canInvoice: boolean;
  missingFields: string[];
  partsAdded: boolean;
  partsDispatched: boolean;
  laborRecorded: boolean;
  isCompleted: boolean;
  hasClient: boolean;
  hasVehicle: boolean;
}

export interface PipelineStatus {
  quotationId: string;
  currentStage: string;
  quotation: {
    id: string;
    quoteNumber: number;
    status: string;
    total: number;
    createdAt: Date;
    convertedAt: Date | null;
  };
  workOrder: {
    id: string;
    orderNumber: number;
    status: string;
    totalCost: number;
    partsDispatched: boolean;
    dispatchedAt: Date | null;
    completedAt: Date | null;
  } | null;
  dispatch: {
    dispatched: boolean;
    dispatchedAt: Date | null;
    partsCount: number;
    totalDispatched: number;
  };
  invoice: {
    id: string;
    folio: number;
    dteType: number;
    status: string;
    montoTotal: number;
    createdAt: Date;
  } | null;
}

@Injectable()
export class SalesPipelineService {
  constructor(
    @InjectRepository(Quotation)
    private quotationRepo: Repository<Quotation>,
    @InjectRepository(WorkOrder)
    private workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(WorkOrderPart)
    private workOrderPartRepo: Repository<WorkOrderPart>,
    @InjectRepository(InventoryItem)
    private inventoryItemRepo: Repository<InventoryItem>,
    @InjectRepository(StockMovement)
    private stockMovementRepo: Repository<StockMovement>,
    @InjectRepository(WarehouseLocation)
    private warehouseLocationRepo: Repository<WarehouseLocation>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    private facturacionService: FacturacionService,
    private dataSource: DataSource,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  //  STEP 1: Validate Quotation for Conversion
  // ═══════════════════════════════════════════════════════════════════

  async validateQuotationForConversion(
    tenantId: string,
    quotationId: string,
  ): Promise<QuotationValidation> {
    const quotation = await this.quotationRepo.findOne({
      where: { id: quotationId, tenantId },
    });

    if (!quotation) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    const missingFields: string[] = [];

    if (!quotation.clientId) {
      missingFields.push('clientId: La cotizacion debe tener un cliente asignado');
    }

    if (!quotation.vehicleId) {
      missingFields.push('vehicleId: La cotizacion debe tener un vehiculo asignado');
    }

    if (!quotation.items || quotation.items.length === 0) {
      missingFields.push('items: La cotizacion debe tener al menos un item');
    } else {
      // Validate each item has required fields
      for (let i = 0; i < quotation.items.length; i++) {
        const item = quotation.items[i];
        if (!item.description || item.description.trim() === '') {
          missingFields.push(`items[${i}].description: Descripcion requerida`);
        }
        if (!item.quantity || item.quantity <= 0) {
          missingFields.push(`items[${i}].quantity: Cantidad debe ser mayor a 0`);
        }
        if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice < 0) {
          missingFields.push(`items[${i}].unitPrice: Precio unitario requerido`);
        }
      }
    }

    if (Number(quotation.total) <= 0) {
      missingFields.push('total: El total de la cotizacion debe ser mayor a 0');
    }

    // Verify client exists
    if (quotation.clientId) {
      const client = await this.clientRepo.findOne({
        where: { id: quotation.clientId, tenantId },
      });
      if (!client) {
        missingFields.push('clientId: El cliente asociado no existe en el sistema');
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
      quotation,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STEP 2: Convert Quotation to Work Order
  // ═══════════════════════════════════════════════════════════════════

  async convertQuotationToWorkOrder(
    tenantId: string,
    quotationId: string,
    userId: string,
    dto: ConvertQuotationDto,
  ): Promise<{ workOrder: WorkOrder; quotation: Quotation }> {
    // Validate quotation status
    const quotation = await this.quotationRepo.findOne({
      where: { id: quotationId, tenantId },
    });

    if (!quotation) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    if (quotation.status !== 'approved') {
      throw new BadRequestException(
        `Solo cotizaciones aprobadas pueden convertirse a ordenes de trabajo. ` +
        `Estado actual: '${quotation.status}'. Estados validos para conversion: 'approved'.`,
      );
    }

    if (quotation.workOrderId) {
      throw new ConflictException(
        `Esta cotizacion ya fue convertida a la orden de trabajo ${quotation.workOrderId}`,
      );
    }

    // Validate all required fields
    const validation = await this.validateQuotationForConversion(tenantId, quotationId);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'La cotizacion no tiene todos los datos requeridos para conversion',
        missingFields: validation.missingFields,
      });
    }

    // Use a transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create Work Order from quotation data
      const workOrder = queryRunner.manager.create(WorkOrder, {
        tenantId,
        vehicleId: quotation.vehicleId,
        clientId: quotation.clientId,
        assignedTo: dto.assignedTo ?? undefined,
        status: 'pending',
        type: dto.type || 'repair',
        priority: dto.priority || 'normal',
        description: this.buildWorkOrderDescription(quotation, dto.notes),
        internalNotes: dto.notes ?? undefined,
        laborCost: 0,
        partsCost: 0,
        totalCost: 0,
        quotationId: quotation.id,
        partsDispatched: false,
        pipelineStage: 'work_order',
      });

      const savedWorkOrder = await queryRunner.manager.save(WorkOrder, workOrder);

      // Create WorkOrderParts from quotation items
      const parts: WorkOrderPart[] = [];
      for (const item of quotation.items) {
        const part = queryRunner.manager.create(WorkOrderPart, {
          tenantId,
          workOrderId: savedWorkOrder.id,
          partId: item.inventoryItemId ?? undefined,
          name: item.description,
          partNumber: undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.total,
          isOem: false,
          inventoryItemId: item.inventoryItemId ?? undefined,
          isDispatched: false,
        });
        parts.push(part);
      }

      if (parts.length > 0) {
        await queryRunner.manager.save(WorkOrderPart, parts);
      }

      // Recalculate work order totals
      const partsCost = parts.reduce((sum, p) => sum + Number(p.totalPrice), 0);
      savedWorkOrder.partsCost = partsCost;
      savedWorkOrder.totalCost = partsCost;
      await queryRunner.manager.save(WorkOrder, savedWorkOrder);

      // Update quotation status
      quotation.status = 'converted';
      quotation.workOrderId = savedWorkOrder.id;
      quotation.pipelineStage = 'work_order';
      quotation.convertedAt = new Date();
      quotation.convertedBy = userId;
      await queryRunner.manager.save(Quotation, quotation);

      await queryRunner.commitTransaction();

      // Reload work order with relations
      const fullWorkOrder = await this.workOrderRepo.findOne({
        where: { id: savedWorkOrder.id, tenantId },
        relations: ['parts'],
      });

      if (!fullWorkOrder) {
        throw new NotFoundException('Orden de trabajo recien creada no encontrada');
      }

      return { workOrder: fullWorkOrder, quotation };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STEP 3: Dispatch Parts for Work Order (Deduct from Warehouse)
  // ═══════════════════════════════════════════════════════════════════

  async dispatchPartsForWorkOrder(
    tenantId: string,
    workOrderId: string,
    dto: DispatchPartsDto,
    userId: string,
  ): Promise<{
    workOrder: WorkOrder;
    movements: StockMovement[];
    dispatchedParts: WorkOrderPart[];
  }> {
    // Validate work order exists and is in correct state
    const workOrder = await this.workOrderRepo.findOne({
      where: { id: workOrderId, tenantId },
      relations: ['parts'],
    });

    if (!workOrder) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    if (workOrder.status === 'invoiced') {
      throw new ConflictException(
        'No se pueden despachar repuestos a una orden ya facturada',
      );
    }

    if (!['pending', 'in_progress'].includes(workOrder.status)) {
      throw new BadRequestException(
        `Solo se pueden despachar repuestos a ordenes en estado 'pending' o 'in_progress'. ` +
        `Estado actual: '${workOrder.status}'`,
      );
    }

    // ── Phase 1: Pre-validate ALL items before dispatching ANY ──
    // This ensures atomicity: all or nothing
    const validationErrors: string[] = [];
    const itemsToDispatch: Array<{
      inventoryItem: InventoryItem;
      location: WarehouseLocation;
      quantity: number;
    }> = [];

    for (const dispatchItem of dto.items) {
      // Validate inventory item exists
      const inventoryItem = await this.inventoryItemRepo.findOne({
        where: { id: dispatchItem.inventoryItemId, tenantId },
      });

      if (!inventoryItem) {
        validationErrors.push(
          `Item de inventario ${dispatchItem.inventoryItemId} no encontrado`,
        );
        continue;
      }

      if (!inventoryItem.isActive) {
        validationErrors.push(
          `Item '${inventoryItem.name}' (${inventoryItem.id}) esta inactivo`,
        );
        continue;
      }

      // Validate warehouse location exists
      const location = await this.warehouseLocationRepo.findOne({
        where: { id: dispatchItem.warehouseLocationId, tenantId },
      });

      if (!location) {
        validationErrors.push(
          `Ubicacion de bodega ${dispatchItem.warehouseLocationId} no encontrada`,
        );
        continue;
      }

      if (!location.isActive) {
        validationErrors.push(
          `Ubicacion '${location.code}' esta inactiva`,
        );
        continue;
      }

      // Check stock availability
      const currentStock = Number(inventoryItem.stockQuantity);
      const requestedQty = Number(dispatchItem.quantity);

      if (currentStock < requestedQty) {
        validationErrors.push(
          `Stock insuficiente para '${inventoryItem.name}' (SKU: ${inventoryItem.sku || 'N/A'}). ` +
          `Disponible: ${currentStock}, Solicitado: ${requestedQty}`,
        );
        continue;
      }

      itemsToDispatch.push({
        inventoryItem,
        location,
        quantity: requestedQty,
      });
    }

    // Check for duplicate inventory items in the same dispatch (aggregate quantities)
    const itemQuantityMap = new Map<string, number>();
    for (const dispatchItem of dto.items) {
      const existing = itemQuantityMap.get(dispatchItem.inventoryItemId) || 0;
      itemQuantityMap.set(dispatchItem.inventoryItemId, existing + dispatchItem.quantity);
    }

    // Verify aggregated quantities don't exceed stock
    for (const [itemId, totalQty] of itemQuantityMap.entries()) {
      const inventoryItem = await this.inventoryItemRepo.findOne({
        where: { id: itemId, tenantId },
      });

      if (inventoryItem && Number(inventoryItem.stockQuantity) < totalQty) {
        validationErrors.push(
          `Stock insuficiente para '${inventoryItem.name}' considerando todas las lineas de despacho. ` +
          `Disponible: ${inventoryItem.stockQuantity}, Total solicitado: ${totalQty}`,
        );
      }
    }

    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Error de validacion en despacho de repuestos. Ningun item fue despachado.',
        errors: validationErrors,
      });
    }

    // ── Phase 2: Execute dispatch in a transaction ──
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const movements: StockMovement[] = [];
      const dispatchedParts: WorkOrderPart[] = [];

      for (const item of itemsToDispatch) {
        // Create stock movement record
        const movement = queryRunner.manager.create(StockMovement, {
          tenantId,
          itemId: item.inventoryItem.id,
          fromWarehouseId: item.location.warehouseId,
          fromLocationId: item.location.id,
          movementType: 'dispatch',
          quantity: item.quantity,
          referenceType: 'work_order',
          referenceId: workOrderId,
          reason: `Despacho para OT #${workOrder.orderNumber}${dto.notes ? ': ' + dto.notes : ''}`,
          performedBy: userId,
        });

        const savedMovement = await queryRunner.manager.save(StockMovement, movement);
        movements.push(savedMovement);

        // Deduct stock from inventory
        const currentStock = Number(item.inventoryItem.stockQuantity);
        item.inventoryItem.stockQuantity = currentStock - item.quantity;
        await queryRunner.manager.save(InventoryItem, item.inventoryItem);

        // Create or update WorkOrderPart for this dispatch
        const workOrderPart = queryRunner.manager.create(WorkOrderPart, {
          tenantId,
          workOrderId,
          partId: item.inventoryItem.id,
          name: item.inventoryItem.name,
          partNumber: item.inventoryItem.partNumber || item.inventoryItem.sku || undefined,
          quantity: item.quantity,
          unitPrice: Number(item.inventoryItem.sellPrice),
          totalPrice: item.quantity * Number(item.inventoryItem.sellPrice),
          isOem: false,
          inventoryItemId: item.inventoryItem.id,
          warehouseLocationId: item.location.id,
          isDispatched: true,
          dispatchedAt: new Date(),
          stockMovementId: savedMovement.id,
        });

        const savedPart = await queryRunner.manager.save(WorkOrderPart, workOrderPart);
        dispatchedParts.push(savedPart);
      }

      // Recalculate work order costs
      const allParts = await queryRunner.manager.find(WorkOrderPart, {
        where: { workOrderId, tenantId },
      });

      const partsCost = allParts.reduce(
        (sum, p) => sum + Number(p.totalPrice),
        0,
      );

      workOrder.partsCost = partsCost;
      workOrder.totalCost = Number(workOrder.laborCost) + partsCost;
      workOrder.partsDispatched = true;
      workOrder.dispatchedAt = new Date();
      workOrder.dispatchedBy = userId;
      workOrder.pipelineStage = 'dispatched';

      // Auto-advance to in_progress if still pending
      if (workOrder.status === 'pending') {
        workOrder.status = 'in_progress';
        workOrder.startedAt = new Date();
      }

      await queryRunner.manager.save(WorkOrder, workOrder);

      // Update quotation pipeline stage if linked
      if (workOrder.quotationId) {
        await queryRunner.manager.update(
          Quotation,
          { id: workOrder.quotationId, tenantId },
          { pipelineStage: 'dispatched' },
        );
      }

      await queryRunner.commitTransaction();

      // Reload work order with relations
      const fullWorkOrder = await this.workOrderRepo.findOne({
        where: { id: workOrderId, tenantId },
        relations: ['parts'],
      });

      if (!fullWorkOrder) {
        throw new NotFoundException('Orden de trabajo no encontrada despues de despacho');
      }

      return {
        workOrder: fullWorkOrder,
        movements,
        dispatchedParts,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STEP 4: Validate Work Order for Invoicing
  // ═══════════════════════════════════════════════════════════════════

  async validateWorkOrderForInvoicing(
    tenantId: string,
    workOrderId: string,
  ): Promise<{ valid: boolean; missingFields: string[] }> {
    const workOrder = await this.workOrderRepo.findOne({
      where: { id: workOrderId, tenantId },
      relations: ['parts'],
    });

    if (!workOrder) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    const missingFields: string[] = [];

    // Must be completed
    if (workOrder.status !== 'completed') {
      missingFields.push(
        `status: La orden debe estar en estado 'completed'. Estado actual: '${workOrder.status}'`,
      );
    }

    // Must have client
    if (!workOrder.clientId) {
      missingFields.push('clientId: La orden debe tener un cliente asignado');
    } else {
      const client = await this.clientRepo.findOne({
        where: { id: workOrder.clientId, tenantId },
      });
      if (!client) {
        missingFields.push('clientId: El cliente asociado no existe en el sistema');
      } else if (!client.rut) {
        missingFields.push('client.rut: El cliente debe tener RUT registrado para facturacion');
      }
    }

    // Must have vehicle
    if (!workOrder.vehicleId) {
      missingFields.push('vehicleId: La orden debe tener un vehiculo asignado');
    }

    // Must have parts dispatched
    if (!workOrder.partsDispatched) {
      missingFields.push(
        'partsDispatched: Los repuestos deben estar despachados antes de facturar',
      );
    }

    // Must have parts or labor
    const hasParts = workOrder.parts && workOrder.parts.length > 0;
    const hasLabor = Number(workOrder.laborCost) > 0;

    if (!hasParts && !hasLabor) {
      missingFields.push(
        'items: La orden debe tener al menos repuestos o mano de obra registrada',
      );
    }

    // Labor must be recorded (hours or cost)
    if (!hasLabor && (Number(workOrder.actualHours) || 0) === 0) {
      missingFields.push(
        'laborCost/actualHours: Se requiere registrar mano de obra (costo o horas) antes de facturar',
      );
    }

    // Must not already be invoiced
    if (workOrder.invoiceId) {
      missingFields.push(
        `invoiceId: La orden ya fue facturada con factura ${workOrder.invoiceId}`,
      );
    }

    if (workOrder.status === 'invoiced') {
      missingFields.push('status: La orden ya se encuentra en estado facturado');
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STEP 5: Invoice Work Order
  // ═══════════════════════════════════════════════════════════════════

  async invoiceWorkOrder(
    tenantId: string,
    workOrderId: string,
    dto: InvoiceWorkOrderDto,
    userId: string,
  ): Promise<{ invoice: Invoice; workOrder: WorkOrder }> {
    // Validate work order is ready for invoicing
    const validation = await this.validateWorkOrderForInvoicing(tenantId, workOrderId);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'La orden de trabajo no cumple los requisitos para facturacion',
        missingFields: validation.missingFields,
      });
    }

    const workOrder = await this.workOrderRepo.findOne({
      where: { id: workOrderId, tenantId },
      relations: ['parts'],
    });

    if (!workOrder) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    // Use facturacion service to create the invoice from the work order
    const invoice = await this.facturacionService.createFromWorkOrder(
      tenantId,
      workOrderId,
      dto.dteType,
      userId,
    );

    // Update invoice with additional fields from DTO
    if (dto.paymentCondition) {
      await this.invoiceRepo.update(
        { id: invoice.id, tenantId },
        {
          paymentCondition: dto.paymentCondition,
          paymentMethod: dto.paymentMethod ?? undefined,
          notes: dto.notes ?? undefined,
        },
      );
    }

    // Update work order with invoice reference
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update work order
      workOrder.status = 'invoiced';
      workOrder.invoiceId = invoice.id;
      workOrder.invoicedAt = new Date();
      workOrder.invoicedBy = userId;
      workOrder.pipelineStage = 'invoiced';
      await queryRunner.manager.save(WorkOrder, workOrder);

      // Update invoice with work order reference
      await queryRunner.manager.update(
        Invoice,
        { id: invoice.id, tenantId },
        {
          workOrderId: workOrder.id,
          quotationId: workOrder.quotationId ?? undefined,
        },
      );

      // Update quotation pipeline stage if linked
      if (workOrder.quotationId) {
        await queryRunner.manager.update(
          Quotation,
          { id: workOrder.quotationId, tenantId },
          {
            pipelineStage: 'invoiced',
            invoiceId: invoice.id,
          },
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Reload updated entities
    const updatedWorkOrder = await this.workOrderRepo.findOne({
      where: { id: workOrderId, tenantId },
      relations: ['parts'],
    });

    if (!updatedWorkOrder) {
      throw new NotFoundException('Orden de trabajo no encontrada despues de facturacion');
    }

    const updatedInvoice = await this.invoiceRepo.findOne({
      where: { id: invoice.id, tenantId },
      relations: ['items'],
    });

    if (!updatedInvoice) {
      throw new NotFoundException('Factura no encontrada despues de creacion');
    }

    return {
      invoice: updatedInvoice,
      workOrder: updatedWorkOrder,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  READINESS CHECK: Get Work Order Readiness
  // ═══════════════════════════════════════════════════════════════════

  async getWorkOrderReadiness(
    tenantId: string,
    workOrderId: string,
  ): Promise<WorkOrderReadiness> {
    const workOrder = await this.workOrderRepo.findOne({
      where: { id: workOrderId, tenantId },
      relations: ['parts'],
    });

    if (!workOrder) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    const missingFields: string[] = [];

    // Check basic data
    const hasClient = !!workOrder.clientId;
    const hasVehicle = !!workOrder.vehicleId;

    if (!hasClient) {
      missingFields.push('clientId: Falta asignar cliente');
    } else {
      const client = await this.clientRepo.findOne({
        where: { id: workOrder.clientId, tenantId },
      });
      if (!client) {
        missingFields.push('clientId: Cliente no encontrado en el sistema');
      } else if (!client.rut) {
        missingFields.push('client.rut: Cliente sin RUT (requerido para facturacion)');
      }
    }

    if (!hasVehicle) {
      missingFields.push('vehicleId: Falta asignar vehiculo');
    }

    // Check parts
    const hasParts = workOrder.parts && workOrder.parts.length > 0;
    const partsDispatched = workOrder.partsDispatched === true;

    if (!hasParts) {
      missingFields.push('parts: No hay repuestos registrados en la orden');
    }

    if (hasParts && !partsDispatched) {
      missingFields.push('partsDispatched: Los repuestos no han sido despachados de bodega');
    }

    // Check labor
    const laborRecorded = Number(workOrder.laborCost) > 0 || Number(workOrder.actualHours) > 0;

    if (!laborRecorded) {
      missingFields.push('laborCost: No se ha registrado mano de obra');
    }

    // Check completion
    const isCompleted = workOrder.status === 'completed';

    if (!isCompleted && workOrder.status !== 'invoiced') {
      missingFields.push(`status: La orden debe completarse antes de facturar. Estado actual: '${workOrder.status}'`);
    }

    // Dispatch readiness: WO exists and is in pending/in_progress
    const canDispatch =
      ['pending', 'in_progress'].includes(workOrder.status) &&
      workOrder.status !== 'invoiced';

    // Invoice readiness: WO is completed, parts dispatched, labor recorded, client with RUT
    const canInvoice =
      isCompleted &&
      partsDispatched &&
      laborRecorded &&
      hasClient &&
      hasVehicle &&
      !workOrder.invoiceId;

    return {
      workOrderId: workOrder.id,
      status: workOrder.status,
      canDispatch,
      canInvoice,
      missingFields,
      partsAdded: hasParts,
      partsDispatched,
      laborRecorded,
      isCompleted,
      hasClient,
      hasVehicle,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PIPELINE STATUS: Full Pipeline View
  // ═══════════════════════════════════════════════════════════════════

  async getPipelineStatus(
    tenantId: string,
    quotationId: string,
  ): Promise<PipelineStatus> {
    const quotation = await this.quotationRepo.findOne({
      where: { id: quotationId, tenantId },
    });

    if (!quotation) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    // Build base response
    const result: PipelineStatus = {
      quotationId: quotation.id,
      currentStage: quotation.pipelineStage || 'quotation',
      quotation: {
        id: quotation.id,
        quoteNumber: quotation.quoteNumber,
        status: quotation.status,
        total: Number(quotation.total),
        createdAt: quotation.createdAt,
        convertedAt: quotation.convertedAt || null,
      },
      workOrder: null,
      dispatch: {
        dispatched: false,
        dispatchedAt: null,
        partsCount: 0,
        totalDispatched: 0,
      },
      invoice: null,
    };

    // Load linked work order
    if (quotation.workOrderId) {
      const workOrder = await this.workOrderRepo.findOne({
        where: { id: quotation.workOrderId, tenantId },
        relations: ['parts'],
      });

      if (workOrder) {
        result.workOrder = {
          id: workOrder.id,
          orderNumber: workOrder.orderNumber,
          status: workOrder.status,
          totalCost: Number(workOrder.totalCost),
          partsDispatched: workOrder.partsDispatched,
          dispatchedAt: workOrder.dispatchedAt || null,
          completedAt: workOrder.completedAt || null,
        };

        // Dispatch info
        if (workOrder.partsDispatched) {
          const dispatchedParts = workOrder.parts
            ? workOrder.parts.filter((p) => p.isDispatched)
            : [];

          result.dispatch = {
            dispatched: true,
            dispatchedAt: workOrder.dispatchedAt || null,
            partsCount: dispatchedParts.length,
            totalDispatched: dispatchedParts.reduce(
              (sum, p) => sum + Number(p.totalPrice),
              0,
            ),
          };
        }

        // Invoice info
        if (workOrder.invoiceId) {
          const invoice = await this.invoiceRepo.findOne({
            where: { id: workOrder.invoiceId, tenantId },
          });

          if (invoice) {
            result.invoice = {
              id: invoice.id,
              folio: invoice.folio,
              dteType: invoice.dteType,
              status: invoice.status,
              montoTotal: Number(invoice.montoTotal),
              createdAt: invoice.createdAt,
            };
          }
        }
      }
    }

    // Also check for invoice linked directly to quotation
    if (!result.invoice && quotation.invoiceId) {
      const invoice = await this.invoiceRepo.findOne({
        where: { id: quotation.invoiceId, tenantId },
      });

      if (invoice) {
        result.invoice = {
          id: invoice.id,
          folio: invoice.folio,
          dteType: invoice.dteType,
          status: invoice.status,
          montoTotal: Number(invoice.montoTotal),
          createdAt: invoice.createdAt,
        };
      }
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════

  private buildWorkOrderDescription(
    quotation: Quotation,
    additionalNotes?: string,
  ): string {
    const parts: string[] = [
      `Generada desde cotizacion #${quotation.quoteNumber}`,
    ];

    if (quotation.notes) {
      parts.push(`Notas cotizacion: ${quotation.notes}`);
    }

    if (additionalNotes) {
      parts.push(`Notas adicionales: ${additionalNotes}`);
    }

    const itemSummary = quotation.items
      .map((item) => `- ${item.description} (x${item.quantity})`)
      .join('\n');

    if (itemSummary) {
      parts.push(`Items:\n${itemSummary}`);
    }

    return parts.join('\n');
  }
}

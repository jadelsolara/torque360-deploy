import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { ExternalAccess, ExternalAccessPermissions, AgentType } from '../../database/entities/external-access.entity';
import { ImportUpdateLog, UpdateSource, UpdateAction } from '../../database/entities/import-update-log.entity';
import { ImportOrder } from '../../database/entities/import-order.entity';
import {
  CreateExternalAccessDto,
  UpdateImportFieldsDto,
  UpdateImportStatusDto,
  AddDocumentDto,
  AddNoteDto,
} from './external-portal.dto';

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

// Fields that are date type on ImportOrder entity
const DATE_FIELDS = new Set([
  'etd',
  'eta',
  'actualArrival',
  'customsClearanceDate',
]);

// Fields that represent costs
const COST_FIELDS = new Set([
  'freightCost',
  'insuranceCost',
  'otherCosts',
]);

@Injectable()
export class ExternalPortalService {
  constructor(
    @InjectRepository(ExternalAccess)
    private accessRepo: Repository<ExternalAccess>,
    @InjectRepository(ImportUpdateLog)
    private logRepo: Repository<ImportUpdateLog>,
    @InjectRepository(ImportOrder)
    private orderRepo: Repository<ImportOrder>,
  ) {}

  // -------------------------------------------------------------------------
  // INTERNAL methods (for TORQUE users)
  // -------------------------------------------------------------------------

  async createAccess(
    tenantId: string,
    userId: string,
    dto: CreateExternalAccessDto,
  ): Promise<{ access: ExternalAccess; rawToken: string; portalUrl: string }> {
    // Validate import order exists and belongs to tenant
    const order = await this.orderRepo.findOne({
      where: { id: dto.importOrderId, tenantId },
    });
    if (!order) {
      throw new NotFoundException('Orden de importacion no encontrada');
    }

    // Generate cryptographically secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 12);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + dto.expiresInDays);

    const access = this.accessRepo.create({
      tenantId,
      importOrderId: dto.importOrderId,
      agentType: dto.agentType as AgentType,
      agentName: dto.agentName,
      agentEmail: dto.agentEmail,
      agentPhone: dto.agentPhone || undefined,
      tokenHash,
      permissions: dto.permissions,
      isActive: true,
      expiresAt,
      accessCount: 0,
      createdBy: userId,
    });

    const savedAccess = await this.accessRepo.save(access) as ExternalAccess;

    // Build portal URL with ext_ prefix
    const fullToken = `ext_${rawToken}`;
    const portalUrl = `/portal/${fullToken}`;

    // Log the creation
    await this.createLog({
      tenantId,
      importOrderId: dto.importOrderId,
      userId,
      source: UpdateSource.INTERNAL,
      action: UpdateAction.NOTE_ADDED,
      note: `Acceso externo creado para ${dto.agentName} (${dto.agentType}). Email: ${dto.agentEmail}. Expira: ${expiresAt.toISOString().split('T')[0]}`,
      ipAddress: undefined,
    });

    return {
      access: savedAccess,
      rawToken: fullToken,
      portalUrl,
    };
  }

  async revokeAccess(tenantId: string, accessId: string): Promise<void> {
    const access = await this.accessRepo.findOne({
      where: { id: accessId, tenantId },
    });
    if (!access) {
      throw new NotFoundException('Acceso externo no encontrado');
    }

    access.isActive = false;
    await this.accessRepo.save(access);

    await this.createLog({
      tenantId,
      importOrderId: access.importOrderId,
      userId: undefined,
      source: UpdateSource.INTERNAL,
      action: UpdateAction.NOTE_ADDED,
      note: `Acceso revocado para ${access.agentName} (${access.agentType})`,
      ipAddress: undefined,
    });
  }

  async listAccessByImportOrder(
    tenantId: string,
    importOrderId: string,
  ): Promise<ExternalAccess[]> {
    return this.accessRepo.find({
      where: { tenantId, importOrderId },
      order: { createdAt: 'DESC' },
    });
  }

  async regenerateToken(
    tenantId: string,
    accessId: string,
  ): Promise<{ rawToken: string; portalUrl: string }> {
    const access = await this.accessRepo.findOne({
      where: { id: accessId, tenantId },
    });
    if (!access) {
      throw new NotFoundException('Acceso externo no encontrado');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 12);

    access.tokenHash = tokenHash;
    access.accessCount = 0;
    await this.accessRepo.save(access);

    const fullToken = `ext_${rawToken}`;

    await this.createLog({
      tenantId,
      importOrderId: access.importOrderId,
      userId: undefined,
      source: UpdateSource.INTERNAL,
      action: UpdateAction.NOTE_ADDED,
      note: `Token regenerado para ${access.agentName} (${access.agentType})`,
      ipAddress: undefined,
    });

    return {
      rawToken: fullToken,
      portalUrl: `/portal/${fullToken}`,
    };
  }

  async getUpdateLog(
    tenantId: string,
    importOrderId: string,
  ): Promise<ImportUpdateLog[]> {
    return this.logRepo.find({
      where: { tenantId, importOrderId },
      order: { createdAt: 'DESC' },
    });
  }

  // -------------------------------------------------------------------------
  // EXTERNAL methods (for external agents)
  // -------------------------------------------------------------------------

  async getImportForAgent(
    externalAgent: {
      id: string;
      tenantId: string;
      importOrderId: string;
      permissions: ExternalAccessPermissions;
      agentType: string;
      agentName: string;
      agentEmail: string;
    },
  ): Promise<{
    order: Partial<ImportOrder>;
    agent: { id: string; agentType: string; agentName: string; agentEmail: string };
    permissions: ExternalAccessPermissions;
  }> {
    const order = await this.orderRepo.findOne({
      where: { id: externalAgent.importOrderId, tenantId: externalAgent.tenantId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Orden de importacion no encontrada');
    }

    // Build scoped view — always show these read-only fields
    const baseFields: Partial<ImportOrder> = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      originCountry: order.originCountry,
      originPort: order.originPort,
      destinationPort: order.destinationPort,
      incoterm: order.incoterm,
      currency: order.currency,
      blNumber: order.blNumber,
      containerNumber: order.containerNumber,
      vesselName: order.vesselName,
      etd: order.etd,
      eta: order.eta,
      actualArrival: order.actualArrival,
      customsClearanceDate: order.customsClearanceDate,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    // Include costs only if agent has cost permissions
    if (externalAgent.permissions.canUpdateCosts) {
      baseFields.fobTotal = order.fobTotal;
      baseFields.cifTotal = order.cifTotal;
      baseFields.freightCost = order.freightCost;
      baseFields.insuranceCost = order.insuranceCost;
      baseFields.otherCosts = order.otherCosts;
    }

    // Include items count
    baseFields.items = order.items;

    return {
      order: baseFields,
      agent: {
        id: externalAgent.id,
        agentType: externalAgent.agentType,
        agentName: externalAgent.agentName,
        agentEmail: externalAgent.agentEmail,
      },
      permissions: externalAgent.permissions,
    };
  }

  async updateImportByAgent(
    externalAgent: {
      id: string;
      tenantId: string;
      importOrderId: string;
      permissions: ExternalAccessPermissions;
      agentType: string;
      agentName: string;
    },
    dto: UpdateImportFieldsDto,
    ipAddress: string,
  ): Promise<Partial<ImportOrder>> {
    const order = await this.orderRepo.findOne({
      where: { id: externalAgent.importOrderId, tenantId: externalAgent.tenantId },
    });

    if (!order) {
      throw new NotFoundException('Orden de importacion no encontrada');
    }

    const allowedFields = externalAgent.permissions.allowedFields;
    const canUpdateDates = externalAgent.permissions.canUpdateDates;
    const canUpdateCosts = externalAgent.permissions.canUpdateCosts;

    const updates: Record<string, any> = {};
    const logEntries: Partial<ImportUpdateLog>[] = [];

    // Process each field in the DTO
    for (const [key, value] of Object.entries(dto)) {
      if (value === undefined || value === null) continue;

      // Check if field is allowed
      const isDateField = DATE_FIELDS.has(key);
      const isCostField = COST_FIELDS.has(key);

      if (isDateField && !canUpdateDates) {
        throw new ForbiddenException(
          `No tiene permiso para actualizar campos de fecha: ${key}`,
        );
      }

      if (isCostField && !canUpdateCosts) {
        throw new ForbiddenException(
          `No tiene permiso para actualizar campos de costo: ${key}`,
        );
      }

      if (!isDateField && !isCostField && !allowedFields.includes(key)) {
        throw new ForbiddenException(
          `No tiene permiso para actualizar el campo: ${key}`,
        );
      }

      const oldValue = (order as any)[key];

      // Convert date strings to Date objects
      if (isDateField) {
        updates[key] = new Date(value as string);
      } else {
        updates[key] = value;
      }

      logEntries.push({
        tenantId: externalAgent.tenantId,
        importOrderId: externalAgent.importOrderId,
        externalAccessId: externalAgent.id,
        source: UpdateSource.EXTERNAL,
        agentType: externalAgent.agentType,
        agentName: externalAgent.agentName,
        action: isCostField ? UpdateAction.COST_UPDATE : UpdateAction.FIELD_UPDATE,
        fieldName: key,
        oldValue: oldValue != null ? String(oldValue) : undefined,
        newValue: String(value),
        ipAddress,
      });
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No se proporcionaron campos para actualizar');
    }

    // Apply updates
    Object.assign(order, updates);
    await this.orderRepo.save(order);

    // Save all log entries
    await this.logRepo.save(logEntries.map((e) => this.logRepo.create(e)));

    // Return updated order (scoped)
    const result = await this.getImportForAgent(externalAgent as any);
    return result.order;
  }

  async updateStatusByAgent(
    externalAgent: {
      id: string;
      tenantId: string;
      importOrderId: string;
      permissions: ExternalAccessPermissions;
      agentType: string;
      agentName: string;
    },
    dto: UpdateImportStatusDto,
    ipAddress: string,
  ): Promise<Partial<ImportOrder>> {
    if (!externalAgent.permissions.canUpdateStatus) {
      throw new ForbiddenException(
        'No tiene permiso para actualizar el estado de la importacion',
      );
    }

    const order = await this.orderRepo.findOne({
      where: { id: externalAgent.importOrderId, tenantId: externalAgent.tenantId },
    });

    if (!order) {
      throw new NotFoundException('Orden de importacion no encontrada');
    }

    // Validate status transition is globally valid
    const globalAllowed = VALID_TRANSITIONS[order.status];
    if (!globalAllowed || !globalAllowed.includes(dto.newStatus)) {
      throw new BadRequestException(
        `Transicion de estado invalida: ${order.status} -> ${dto.newStatus}. Permitidas: ${globalAllowed?.join(', ') || 'ninguna'}`,
      );
    }

    // Validate status transition is allowed for this agent
    const agentAllowed = externalAgent.permissions.allowedStatusTransitions;
    if (agentAllowed.length > 0 && !agentAllowed.includes(dto.newStatus)) {
      throw new ForbiddenException(
        `No tiene permiso para cambiar a estado: ${dto.newStatus}. Permitidos: ${agentAllowed.join(', ')}`,
      );
    }

    const oldStatus = order.status;
    order.status = dto.newStatus;

    // Append note
    if (dto.note) {
      const noteEntry = `[${dto.newStatus}] (${externalAgent.agentName}) ${dto.note}`;
      order.notes = order.notes ? `${order.notes}\n${noteEntry}` : noteEntry;
    }

    // Auto-set dates based on status
    if (dto.newStatus === 'customs') {
      // Agent confirms arrival at customs
    }
    if (dto.newStatus === 'cleared') {
      order.customsClearanceDate = new Date();
    }
    if (dto.newStatus === 'received') {
      order.actualArrival = new Date();
    }

    await this.orderRepo.save(order);

    // Log the status change
    await this.logRepo.save(
      this.logRepo.create({
        tenantId: externalAgent.tenantId,
        importOrderId: externalAgent.importOrderId,
        externalAccessId: externalAgent.id,
        source: UpdateSource.EXTERNAL,
        agentType: externalAgent.agentType,
        agentName: externalAgent.agentName,
        action: UpdateAction.STATUS_CHANGE,
        fieldName: 'status',
        oldValue: oldStatus,
        newValue: dto.newStatus,
        note: dto.note || undefined,
        ipAddress,
      }),
    );

    const result = await this.getImportForAgent(externalAgent as any);
    return result.order;
  }

  async uploadDocumentByAgent(
    externalAgent: {
      id: string;
      tenantId: string;
      importOrderId: string;
      permissions: ExternalAccessPermissions;
      agentType: string;
      agentName: string;
    },
    dto: AddDocumentDto,
    ipAddress: string,
  ): Promise<{ name: string; url: string; type: string }[]> {
    if (!externalAgent.permissions.canUploadDocuments) {
      throw new ForbiddenException(
        'No tiene permiso para subir documentos',
      );
    }

    const order = await this.orderRepo.findOne({
      where: { id: externalAgent.importOrderId, tenantId: externalAgent.tenantId },
    });

    if (!order) {
      throw new NotFoundException('Orden de importacion no encontrada');
    }

    const newDoc = {
      name: dto.name,
      url: dto.url,
      type: dto.type,
      uploadedBy: externalAgent.agentName,
      uploadedAt: new Date().toISOString(),
      notes: dto.notes || '',
    };

    // documents column not in import_orders table - log only
    await this.orderRepo.save(order);

    // Log
    await this.logRepo.save(
      this.logRepo.create({
        tenantId: externalAgent.tenantId,
        importOrderId: externalAgent.importOrderId,
        externalAccessId: externalAgent.id,
        source: UpdateSource.EXTERNAL,
        agentType: externalAgent.agentType,
        agentName: externalAgent.agentName,
        action: UpdateAction.DOCUMENT_UPLOAD,
        fieldName: 'documents',
        newValue: `${dto.type}: ${dto.name}`,
        note: dto.notes || undefined,
        ipAddress,
      }),
    );

    return [];
  }

  async addNoteByAgent(
    externalAgent: {
      id: string;
      tenantId: string;
      importOrderId: string;
      permissions: ExternalAccessPermissions;
      agentType: string;
      agentName: string;
    },
    dto: AddNoteDto,
    ipAddress: string,
  ): Promise<{ notes: string }> {
    const order = await this.orderRepo.findOne({
      where: { id: externalAgent.importOrderId, tenantId: externalAgent.tenantId },
    });

    if (!order) {
      throw new NotFoundException('Orden de importacion no encontrada');
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const noteEntry = `[${timestamp}] (${externalAgent.agentName} - ${externalAgent.agentType}) ${dto.content}`;

    order.notes = order.notes ? `${order.notes}\n${noteEntry}` : noteEntry;
    await this.orderRepo.save(order);

    // Log
    await this.logRepo.save(
      this.logRepo.create({
        tenantId: externalAgent.tenantId,
        importOrderId: externalAgent.importOrderId,
        externalAccessId: externalAgent.id,
        source: UpdateSource.EXTERNAL,
        agentType: externalAgent.agentType,
        agentName: externalAgent.agentName,
        action: UpdateAction.NOTE_ADDED,
        note: dto.content,
        ipAddress,
      }),
    );

    return { notes: order.notes };
  }

  async getLogForAgent(
    externalAgent: {
      tenantId: string;
      importOrderId: string;
    },
  ): Promise<ImportUpdateLog[]> {
    return this.logRepo.find({
      where: {
        tenantId: externalAgent.tenantId,
        importOrderId: externalAgent.importOrderId,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getAgentActivity(
    tenantId: string,
    importOrderId: string,
  ): Promise<{
    agents: Array<{
      agentName: string;
      agentType: string;
      totalActions: number;
      lastAction: Date;
      actions: Record<string, number>;
    }>;
  }> {
    const logs = await this.logRepo.find({
      where: {
        tenantId,
        importOrderId,
        source: UpdateSource.EXTERNAL,
      },
      order: { createdAt: 'DESC' },
    });

    const agentMap = new Map<
      string,
      {
        agentName: string;
        agentType: string;
        totalActions: number;
        lastAction: Date;
        actions: Record<string, number>;
      }
    >();

    for (const log of logs) {
      const key = `${log.agentName}||${log.agentType}`;
      if (!agentMap.has(key)) {
        agentMap.set(key, {
          agentName: log.agentName,
          agentType: log.agentType,
          totalActions: 0,
          lastAction: log.createdAt,
          actions: {},
        });
      }
      const entry = agentMap.get(key)!;
      entry.totalActions++;
      entry.actions[log.action] = (entry.actions[log.action] || 0) + 1;
      if (log.createdAt > entry.lastAction) {
        entry.lastAction = log.createdAt;
      }
    }

    return { agents: Array.from(agentMap.values()) };
  }

  // -------------------------------------------------------------------------
  // PRIVATE helpers
  // -------------------------------------------------------------------------

  private async createLog(data: {
    tenantId: string;
    importOrderId: string;
    externalAccessId?: string;
    userId?: string;
    source: UpdateSource;
    agentType?: string;
    agentName?: string;
    action: UpdateAction;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    note?: string;
    ipAddress?: string;
  }): Promise<ImportUpdateLog> {
    return this.logRepo.save(this.logRepo.create(data)) as Promise<ImportUpdateLog>;
  }
}

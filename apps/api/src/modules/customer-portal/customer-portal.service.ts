import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { CustomerTicket } from '../../database/entities/customer-ticket.entity';
import { CustomerMessage } from '../../database/entities/customer-message.entity';
import { CustomerAccess } from '../../database/entities/customer-access.entity';
import { Client } from '../../database/entities/client.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Quotation } from '../../database/entities/quotation.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import {
  CreateCustomerAccessDto,
  CustomerLoginDto,
  CreateTicketDto,
  SendMessageDto,
  RequestReportDto,
  StaffReplyDto,
  UpdateTicketStatusDto,
} from './customer-portal.dto';

@Injectable()
export class CustomerPortalService {
  constructor(
    @InjectRepository(CustomerTicket)
    private ticketRepo: Repository<CustomerTicket>,
    @InjectRepository(CustomerMessage)
    private messageRepo: Repository<CustomerMessage>,
    @InjectRepository(CustomerAccess)
    private accessRepo: Repository<CustomerAccess>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    @InjectRepository(WorkOrder)
    private workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(Vehicle)
    private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Quotation)
    private quotationRepo: Repository<Quotation>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create portal access for a client. Generates a 6-digit PIN shown once.
   */
  async createAccess(tenantId: string, dto: CreateCustomerAccessDto) {
    // Validate client exists
    const client = await this.clientRepo.findOne({
      where: { id: dto.clientId, tenantId },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // Check if access already exists for this client
    const existing = await this.accessRepo.findOne({
      where: { tenantId, clientId: dto.clientId, isActive: true },
    });
    if (existing) {
      throw new ConflictException(
        'Este cliente ya tiene acceso al portal. Desactive el acceso existente primero.',
      );
    }

    // Generate 6-digit PIN
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const hashedPin = await bcrypt.hash(pin, 10);

    const access = this.accessRepo.create({
      tenantId,
      clientId: dto.clientId,
      accessCode: hashedPin,
      email: dto.email,
      phone: dto.phone || undefined,
    });

    await this.accessRepo.save(access);

    return {
      id: access.id,
      clientId: access.clientId,
      email: access.email,
      pin, // Show once only
      message: 'Acceso creado. Comparta el PIN con el cliente. Este PIN solo se muestra una vez.',
    };
  }

  /**
   * Deactivate client access
   */
  async deactivateAccess(tenantId: string, accessId: string) {
    const access = await this.accessRepo.findOne({
      where: { id: accessId, tenantId },
    });
    if (!access) {
      throw new NotFoundException('Acceso no encontrado');
    }
    access.isActive = false;
    await this.accessRepo.save(access);
    return { message: 'Acceso desactivado' };
  }

  /**
   * List all accesses for a tenant
   */
  async listAccesses(tenantId: string) {
    const accesses = await this.accessRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    // Enrich with client names
    const clientIds = [...new Set(accesses.map((a) => a.clientId))];
    const clients = clientIds.length
      ? await this.clientRepo
          .createQueryBuilder('c')
          .where('c.id IN (:...ids)', { ids: clientIds })
          .andWhere('c.tenant_id = :tenantId', { tenantId })
          .getMany()
      : [];

    const clientMap = new Map(clients.map((c) => [c.id, c]));

    return accesses.map((a) => {
      const client = clientMap.get(a.clientId);
      return {
        id: a.id,
        clientId: a.clientId,
        clientName: client
          ? client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim()
          : 'Desconocido',
        email: a.email,
        phone: a.phone,
        isActive: a.isActive,
        lastLoginAt: a.lastLoginAt,
        createdAt: a.createdAt,
      };
    });
  }

  /**
   * Regenerate PIN for an existing access
   */
  async regeneratePin(tenantId: string, accessId: string) {
    const access = await this.accessRepo.findOne({
      where: { id: accessId, tenantId, isActive: true },
    });
    if (!access) {
      throw new NotFoundException('Acceso activo no encontrado');
    }

    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const hashedPin = await bcrypt.hash(pin, 10);
    access.accessCode = hashedPin;
    await this.accessRepo.save(access);

    return {
      pin,
      message: 'PIN regenerado. Comparta el nuevo PIN con el cliente.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Validate client login: email + PIN → returns portal JWT
   */
  async validateAccess(dto: CustomerLoginDto) {
    // Find active access by email (across tenants — email is unique per access)
    const accesses = await this.accessRepo.find({
      where: { email: dto.email, isActive: true },
    });

    if (!accesses.length) {
      throw new ForbiddenException('Credenciales invalidas');
    }

    let matchedAccess: CustomerAccess | null = null;

    for (const access of accesses) {
      const isMatch = await bcrypt.compare(dto.pin, access.accessCode);
      if (isMatch) {
        matchedAccess = access;
        break;
      }
    }

    if (!matchedAccess) {
      throw new ForbiddenException('Credenciales invalidas');
    }

    // Update last login
    matchedAccess.lastLoginAt = new Date();
    await this.accessRepo.save(matchedAccess);

    // Get client name for display
    const client = await this.clientRepo.findOne({
      where: { id: matchedAccess.clientId, tenantId: matchedAccess.tenantId },
    });

    const clientName = client
      ? client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim()
      : 'Cliente';

    // Issue portal JWT (different secret from staff JWT)
    const secret = this.configService.get(
      'CUSTOMER_PORTAL_JWT_SECRET',
      'customer-portal-secret-change-me',
    );

    const token = await this.jwtService.signAsync(
      {
        type: 'customer_portal',
        tenantId: matchedAccess.tenantId,
        clientId: matchedAccess.clientId,
        email: matchedAccess.email,
      },
      { secret, expiresIn: '24h' },
    );

    return {
      accessToken: token,
      clientName,
      email: matchedAccess.email,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Client dashboard: vehicles, active work orders, quotations, invoices, open tickets
   */
  async getClientDashboard(tenantId: string, clientId: string) {
    // Get client info
    const client = await this.clientRepo.findOne({
      where: { id: clientId, tenantId },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // Get vehicles
    const vehicles = await this.vehicleRepo.find({
      where: { clientId, tenantId },
      order: { createdAt: 'DESC' },
    });

    // Get active work orders (not completed/invoiced)
    const activeWorkOrders = await this.workOrderRepo
      .createQueryBuilder('wo')
      .where('wo.client_id = :clientId', { clientId })
      .andWhere('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.status NOT IN (:...closedStatuses)', {
        closedStatuses: ['invoiced', 'cancelled'],
      })
      .orderBy('wo.created_at', 'DESC')
      .getMany();

    // Get recent quotations
    const quotations = await this.quotationRepo
      .createQueryBuilder('q')
      .where('q.client_id = :clientId', { clientId })
      .andWhere('q.tenant_id = :tenantId', { tenantId })
      .orderBy('q.created_at', 'DESC')
      .take(10)
      .getMany();

    // Get recent invoices
    const invoices = await this.invoiceRepo
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.client_rut = :rut', { rut: client.rut })
      .orderBy('i.created_at', 'DESC')
      .take(10)
      .getMany();

    // Get open tickets count
    const openTicketsCount = await this.ticketRepo.count({
      where: { tenantId, clientId, status: 'OPEN' },
    });

    // Get unread messages count
    const unreadMessages = await this.messageRepo
      .createQueryBuilder('m')
      .innerJoin('customer_tickets', 't', 't.id = m.ticket_id')
      .where('t.client_id = :clientId', { clientId })
      .andWhere('t.tenant_id = :tenantId', { tenantId })
      .andWhere('m.sender_type = :type', { type: 'STAFF' })
      .andWhere('m.is_read = false')
      .getCount();

    return {
      client: {
        id: client.id,
        name: client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim(),
        email: client.email,
        phone: client.phone,
      },
      vehicles: vehicles.map((v) => ({
        id: v.id,
        plate: v.plate,
        brand: v.brand,
        model: v.model,
        year: v.year,
        color: v.color,
        mileage: v.mileage,
      })),
      activeWorkOrders: activeWorkOrders.map((wo) => ({
        id: wo.id,
        orderNumber: wo.orderNumber,
        vehicleId: wo.vehicleId,
        status: wo.status,
        type: wo.type,
        description: wo.description,
        priority: wo.priority,
        progress: this.calculateProgress(wo.status),
        dueDate: null, // dueDate not in work_orders table
        startedAt: wo.startedAt,
        createdAt: wo.createdAt,
      })),
      quotations: quotations.map((q) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        status: (q as any).status,
        total: (q as any).total,
        createdAt: q.createdAt,
      })),
      recentInvoices: invoices.map((i) => ({
        id: i.id,
        folio: i.folio,
        dteType: i.dteType,
        status: i.status,
        issueDate: i.issueDate,
      })),
      openTicketsCount,
      unreadMessages,
    };
  }

  /**
   * Detailed work order progress for client view
   */
  async getWorkOrderProgress(tenantId: string, clientId: string, workOrderId: string) {
    const wo = await this.workOrderRepo.findOne({
      where: { id: workOrderId, tenantId, clientId },
      relations: ['parts', 'vehicle'],
    });

    if (!wo) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    // Build status timeline
    const timeline = this.buildStatusTimeline(wo);

    // Parts status summary (no prices shown to client)
    const partsStatus = wo.parts
      ? {
          total: wo.parts.length,
          received: wo.parts.filter((p: any) => p.status === 'received').length,
          pending: wo.parts.filter((p: any) => p.status === 'pending').length,
          ordered: wo.parts.filter((p: any) => p.status === 'ordered').length,
        }
      : { total: 0, received: 0, pending: 0, ordered: 0 };

    return {
      id: wo.id,
      orderNumber: wo.orderNumber,
      status: wo.status,
      type: wo.type,
      description: wo.description,
      diagnosis: wo.diagnosis,
      priority: wo.priority,
      progress: this.calculateProgress(wo.status),
      dueDate: null, // dueDate not in work_orders table
      startedAt: wo.startedAt,
      completedAt: wo.completedAt,
      createdAt: wo.createdAt,
      vehicle: wo.vehicle
        ? {
            plate: wo.vehicle.plate,
            brand: wo.vehicle.brand,
            model: wo.vehicle.model,
            year: wo.vehicle.year,
            color: wo.vehicle.color,
          }
        : null,
      partsStatus,
      timeline,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TICKETS — Client side
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new support ticket
   */
  async createTicket(tenantId: string, clientId: string, dto: CreateTicketDto) {
    // Get client for sender name
    const client = await this.clientRepo.findOne({
      where: { id: clientId, tenantId },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const clientName =
      client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim();

    // Generate ticket number: TKT-YYYYMM-NNNN
    const now = new Date();
    const prefix = `TKT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.ticketRepo
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.ticket_number LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    const ticketNumber = `${prefix}-${String(count + 1).padStart(4, '0')}`;

    const ticket = this.ticketRepo.create({
      tenantId,
      clientId,
      workOrderId: dto.workOrderId || undefined,
      vehicleId: dto.vehicleId || undefined,
      ticketNumber,
      subject: dto.subject,
      category: dto.category,
      priority: dto.priority || 'MEDIUM',
      status: 'OPEN',
    });

    await this.ticketRepo.save(ticket);

    // Create initial message
    const message = this.messageRepo.create({
      tenantId,
      ticketId: ticket.id,
      senderType: 'CLIENT',
      senderId: clientId,
      senderName: clientName,
      message: dto.message,
    });

    await this.messageRepo.save(message);

    return ticket;
  }

  /**
   * List client's tickets
   */
  async getTickets(tenantId: string, clientId: string) {
    const tickets = await this.ticketRepo.find({
      where: { tenantId, clientId },
      order: { createdAt: 'DESC' },
    });

    // Get unread count per ticket
    const ticketsWithUnread = await Promise.all(
      tickets.map(async (t) => {
        const unread = await this.messageRepo.count({
          where: {
            ticketId: t.id,
            senderType: 'STAFF',
            isRead: false,
          },
        });
        return { ...t, unreadCount: unread };
      }),
    );

    return ticketsWithUnread;
  }

  /**
   * Get messages for a ticket (validates client owns it)
   */
  async getTicketMessages(tenantId: string, ticketId: string, clientId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, tenantId, clientId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    const messages = await this.messageRepo.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });

    return { ticket, messages };
  }

  /**
   * Client sends a message in a ticket
   */
  async addMessage(
    tenantId: string,
    ticketId: string,
    clientId: string,
    dto: SendMessageDto,
  ) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, tenantId, clientId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('No se pueden enviar mensajes a un ticket cerrado');
    }

    // Get client name
    const client = await this.clientRepo.findOne({
      where: { id: clientId, tenantId },
    });
    const clientName = client
      ? client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim()
      : 'Cliente';

    const message = this.messageRepo.create({
      tenantId,
      ticketId,
      senderType: 'CLIENT',
      senderId: clientId,
      senderName: clientName,
      message: dto.message,
      attachmentUrl: dto.attachmentUrl || undefined,
    });

    await this.messageRepo.save(message);

    // If ticket was WAITING_CLIENT, move back to IN_PROGRESS
    if (ticket.status === 'WAITING_CLIENT') {
      ticket.status = 'IN_PROGRESS';
      await this.ticketRepo.save(ticket);
    }

    return message;
  }

  /**
   * Mark staff messages as read by the client
   */
  async markMessagesRead(tenantId: string, ticketId: string, clientId: string) {
    // Validate ticket belongs to client
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, tenantId, clientId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    await this.messageRepo
      .createQueryBuilder()
      .update()
      .set({ isRead: true })
      .where('ticket_id = :ticketId', { ticketId })
      .andWhere('sender_type = :type', { type: 'STAFF' })
      .andWhere('is_read = false')
      .execute();

    return { message: 'Mensajes marcados como leidos' };
  }

  /**
   * Request a paid technical report
   */
  async requestPaidReport(
    tenantId: string,
    clientId: string,
    dto: RequestReportDto,
  ) {
    const reportLabels: Record<string, string> = {
      INSPECCION_VEHICULAR: 'Inspeccion Vehicular Completa',
      HISTORIAL_MANTENIMIENTO: 'Historial de Mantenimiento',
      DIAGNOSTICO_TECNICO: 'Diagnostico Tecnico Detallado',
      VALUACION: 'Valuacion del Vehiculo',
    };

    const subject = `Solicitud de Informe: ${reportLabels[dto.reportType] || dto.reportType}`;
    const message = dto.notes
      ? `Solicito el siguiente informe: ${reportLabels[dto.reportType]}.\n\nNotas adicionales: ${dto.notes}`
      : `Solicito el siguiente informe: ${reportLabels[dto.reportType]}.`;

    // Create ticket with SOLICITUD_INFORME category
    const ticket = await this.createTicket(tenantId, clientId, {
      subject,
      category: 'SOLICITUD_INFORME',
      priority: 'MEDIUM',
      message,
    });

    // Mark as paid report
    ticket.isPaidReport = true;
    await this.ticketRepo.save(ticket);

    return ticket;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TICKETS — Staff side
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all tickets for tenant (staff view) with optional filters
   */
  async staffGetAllTickets(
    tenantId: string,
    filters: { status?: string; category?: string; priority?: string },
  ) {
    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId });

    if (filters.status) {
      qb.andWhere('t.status = :status', { status: filters.status });
    }
    if (filters.category) {
      qb.andWhere('t.category = :category', { category: filters.category });
    }
    if (filters.priority) {
      qb.andWhere('t.priority = :priority', { priority: filters.priority });
    }

    qb.orderBy('t.created_at', 'DESC');

    const tickets = await qb.getMany();

    // Enrich with client names and unread counts
    const clientIds = [...new Set(tickets.map((t) => t.clientId))];
    const clients = clientIds.length
      ? await this.clientRepo
          .createQueryBuilder('c')
          .where('c.id IN (:...ids)', { ids: clientIds })
          .andWhere('c.tenant_id = :tenantId', { tenantId })
          .getMany()
      : [];
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    const enriched = await Promise.all(
      tickets.map(async (t) => {
        const client = clientMap.get(t.clientId);
        const unreadCount = await this.messageRepo.count({
          where: {
            ticketId: t.id,
            senderType: 'CLIENT',
            isRead: false,
          },
        });
        return {
          ...t,
          clientName: client
            ? client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim()
            : 'Desconocido',
          unreadCount,
        };
      }),
    );

    return enriched;
  }

  /**
   * Staff replies to a ticket
   */
  async staffReplyTicket(
    tenantId: string,
    ticketId: string,
    userId: string,
    userName: string,
    dto: StaffReplyDto,
  ) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, tenantId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    const message = this.messageRepo.create({
      tenantId,
      ticketId,
      senderType: 'STAFF',
      senderId: userId,
      senderName: userName,
      message: dto.message,
      attachmentUrl: dto.attachmentUrl || undefined,
    });

    await this.messageRepo.save(message);

    // Auto-update status to WAITING_CLIENT if currently OPEN or IN_PROGRESS
    if (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') {
      ticket.status = 'WAITING_CLIENT';
      await this.ticketRepo.save(ticket);
    }

    return message;
  }

  /**
   * Staff updates ticket status
   */
  async staffUpdateTicketStatus(
    tenantId: string,
    ticketId: string,
    dto: UpdateTicketStatusDto,
  ) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, tenantId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    ticket.status = dto.status;
    if (dto.status === 'CLOSED' || dto.status === 'RESOLVED') {
      ticket.closedAt = new Date();
    }

    await this.ticketRepo.save(ticket);
    return ticket;
  }

  /**
   * Get ticket messages (staff view — no client ownership check)
   */
  async staffGetTicketMessages(tenantId: string, ticketId: string) {
    const ticket = await this.ticketRepo.findOne({
      where: { id: ticketId, tenantId },
    });
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    const messages = await this.messageRepo.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });

    // Mark client messages as read by staff
    await this.messageRepo
      .createQueryBuilder()
      .update()
      .set({ isRead: true })
      .where('ticket_id = :ticketId', { ticketId })
      .andWhere('sender_type = :type', { type: 'CLIENT' })
      .andWhere('is_read = false')
      .execute();

    return { ticket, messages };
  }

  /**
   * Count tickets with unread client messages
   */
  async staffGetUnreadCount(tenantId: string) {
    const result = await this.messageRepo
      .createQueryBuilder('m')
      .innerJoin('customer_tickets', 't', 't.id = m.ticket_id')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('m.sender_type = :type', { type: 'CLIENT' })
      .andWhere('m.is_read = false')
      .select('COUNT(DISTINCT m.ticket_id)', 'count')
      .getRawOne();

    return { unreadTickets: parseInt(result?.count || '0', 10) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private calculateProgress(status: string): number {
    const progressMap: Record<string, number> = {
      pending: 10,
      in_progress: 50,
      completed: 90,
      invoiced: 100,
      dispatched: 80,
      cancelled: 0,
    };
    return progressMap[status] ?? 0;
  }

  private buildStatusTimeline(wo: WorkOrder) {
    const timeline: { label: string; date: Date | null; completed: boolean }[] = [
      {
        label: 'Orden Creada',
        date: wo.createdAt,
        completed: true,
      },
      {
        label: 'En Progreso',
        date: wo.startedAt,
        completed: !!wo.startedAt,
      },
      {
        label: 'Completada',
        date: wo.completedAt,
        completed: !!wo.completedAt,
      },
      {
        label: 'Facturada',
        date: wo.invoicedAt,
        completed: !!wo.invoicedAt,
      },
    ];

    return timeline;
  }
}

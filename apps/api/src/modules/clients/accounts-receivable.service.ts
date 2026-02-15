import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientPayment } from '../../database/entities/client-payment.entity';
import { Invoice } from '../../database/entities/invoice.entity';
import { Client } from '../../database/entities/client.entity';
import {
  RecordPaymentDto,
  PaymentFiltersDto,
} from './accounts-receivable.dto';

@Injectable()
export class AccountsReceivableService {
  constructor(
    @InjectRepository(ClientPayment)
    private paymentRepo: Repository<ClientPayment>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
  ) {}

  // =========================================================================
  // PAYMENT RECORDING
  // =========================================================================

  /**
   * Record a payment received from a client against a sales invoice.
   * Validates amount does not exceed pending balance.
   * Updates Invoice paidAmount and isPaid flag accordingly.
   */
  async recordPayment(
    tenantId: string,
    dto: RecordPaymentDto,
    userId: string,
  ): Promise<ClientPayment> {
    // Validate client exists and belongs to tenant
    const client = await this.clientRepo.findOne({
      where: { id: dto.clientId, tenantId },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    // Validate invoice exists and belongs to tenant
    const invoice = await this.invoiceRepo.findOne({
      where: { id: dto.invoiceId, tenantId },
    });
    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    // Validate invoice belongs to this client
    if (invoice.clientId !== dto.clientId) {
      throw new BadRequestException(
        'La factura no pertenece al cliente indicado',
      );
    }

    // Validate invoice is not voided/cancelled
    if (invoice.status === 'void' || invoice.status === 'cancelled') {
      throw new BadRequestException(
        'No se puede registrar pago contra una factura anulada o cancelada',
      );
    }

    // Calculate pending amount
    const pendingAmount =
      Math.round((Number(invoice.montoTotal) - Number(invoice.paidAmount)) * 100) / 100;

    if (pendingAmount <= 0) {
      throw new BadRequestException('La factura ya esta completamente pagada');
    }

    if (dto.amount > pendingAmount) {
      throw new BadRequestException(
        `El monto del pago ($${dto.amount}) excede el saldo pendiente ($${pendingAmount})`,
      );
    }

    // Generate payment number: COB-YYYYMM-NNNN
    const paymentNumber = await this.generatePaymentNumber(tenantId);

    // Create payment record
    const payment = this.paymentRepo.create({
      tenantId,
      clientId: dto.clientId,
      invoiceId: dto.invoiceId,
      paymentNumber,
      paymentDate: dto.paymentDate,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod as ClientPayment['paymentMethod'],
      bankName: dto.bankName || undefined,
      transactionRef: dto.transactionRef || undefined,
      chequeNumber: dto.chequeNumber || undefined,
      receiptUrl: dto.receiptUrl || undefined,
      notes: dto.notes || undefined,
      status: 'PENDING',
      createdBy: userId,
    });

    const savedPayment = await this.paymentRepo.save(payment) as ClientPayment;

    // Update invoice paidAmount
    const newPaidAmount =
      Math.round((Number(invoice.paidAmount) + dto.amount) * 100) / 100;
    const totalAmount = Number(invoice.montoTotal);

    invoice.paidAmount = newPaidAmount;

    // Mark as fully paid if balance is zero
    if (Math.abs(newPaidAmount - totalAmount) < 0.01) {
      invoice.isPaid = true;
      invoice.paidAt = new Date();
    }

    await this.invoiceRepo.save(invoice);

    return this.findPaymentById(tenantId, savedPayment.id);
  }

  /**
   * Confirm a pending payment (MANAGER+).
   */
  async confirmPayment(
    tenantId: string,
    paymentId: string,
    userId: string,
  ): Promise<ClientPayment> {
    const payment = await this.findPaymentById(tenantId, paymentId);

    if (payment.status !== 'PENDING') {
      throw new BadRequestException(
        `Solo se pueden confirmar pagos en estado PENDING. Estado actual: ${payment.status}`,
      );
    }

    payment.status = 'CONFIRMED';
    payment.confirmedBy = userId;
    payment.confirmedAt = new Date();

    return this.paymentRepo.save(payment) as Promise<ClientPayment>;
  }

  /**
   * Void a payment. Restores the invoice pending amount.
   * Only ADMIN+ can void.
   */
  async voidPayment(
    tenantId: string,
    paymentId: string,
  ): Promise<ClientPayment> {
    const payment = await this.findPaymentById(tenantId, paymentId);

    if (payment.status === 'VOIDED') {
      throw new BadRequestException('El pago ya esta anulado');
    }

    // Restore invoice balance
    const invoice = await this.invoiceRepo.findOne({
      where: { id: payment.invoiceId, tenantId },
    });

    if (invoice) {
      const restoredPaid =
        Math.round((Number(invoice.paidAmount) - Number(payment.amount)) * 100) / 100;
      invoice.paidAmount = Math.max(0, restoredPaid);
      invoice.isPaid = false;
      invoice.paidAt = undefined as any;
      await this.invoiceRepo.save(invoice);
    }

    payment.status = 'VOIDED';
    return this.paymentRepo.save(payment) as Promise<ClientPayment>;
  }

  /**
   * Find all payments for a tenant with optional filters.
   */
  async findAllPayments(
    tenantId: string,
    filters: PaymentFiltersDto,
  ): Promise<{ data: ClientPayment[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.client', 'client')
      .leftJoinAndSelect('p.invoice', 'invoice')
      .where('p.tenantId = :tenantId', { tenantId });

    if (filters.clientId) {
      qb.andWhere('p.clientId = :clientId', { clientId: filters.clientId });
    }

    if (filters.invoiceId) {
      qb.andWhere('p.invoiceId = :invoiceId', { invoiceId: filters.invoiceId });
    }

    if (filters.dateFrom) {
      qb.andWhere('p.paymentDate >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('p.paymentDate <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.method) {
      qb.andWhere('p.paymentMethod = :method', { method: filters.method });
    }

    if (filters.status) {
      qb.andWhere('p.status = :status', { status: filters.status });
    }

    qb.orderBy('p.createdAt', 'DESC');
    qb.skip(offset).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Find a single payment by ID.
   */
  async findPaymentById(
    tenantId: string,
    paymentId: string,
  ): Promise<ClientPayment> {
    const payment = await this.paymentRepo.findOne({
      where: { id: paymentId, tenantId },
      relations: ['client', 'invoice'],
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    return payment;
  }

  // =========================================================================
  // ACCOUNTS RECEIVABLE QUERIES
  // =========================================================================

  /**
   * Summary of all receivables for the tenant.
   */
  async getReceivablesSummary(tenantId: string): Promise<{
    totalPending: number;
    totalOverdue: number;
    totalCollectedThisMonth: number;
    averageDaysToCollect: number;
    byClient: {
      clientId: string;
      name: string;
      rut: string;
      pending: number;
      overdue: number;
      oldestDueDate: string;
    }[];
    byAge: {
      current: number;
      days1_30: number;
      days31_60: number;
      days61_90: number;
      over90: number;
    };
    overdueInvoices: Invoice[];
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Total pending (unpaid invoices)
    const pendingResult = await this.invoiceRepo
      .createQueryBuilder('inv')
      .select(
        'COALESCE(SUM(inv.montoTotal - inv.paidAmount), 0)::numeric',
        'totalPending',
      )
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.isPaid = false')
      .andWhere("inv.status NOT IN ('void', 'cancelled', 'draft')")
      .getRawOne();

    // Total overdue
    const overdueResult = await this.invoiceRepo
      .createQueryBuilder('inv')
      .select(
        'COALESCE(SUM(inv.montoTotal - inv.paidAmount), 0)::numeric',
        'totalOverdue',
      )
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.isPaid = false')
      .andWhere("inv.status NOT IN ('void', 'cancelled', 'draft')")
      .andWhere('inv.dueDate IS NOT NULL')
      .andWhere('inv.dueDate < :today', { today })
      .getRawOne();

    // Total collected this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    const monthStart = firstDayOfMonth.toISOString().split('T')[0];

    const collectedResult = await this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)::numeric', 'totalCollected')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere("p.status NOT IN ('VOIDED')")
      .andWhere('p.paymentDate >= :monthStart', { monthStart })
      .getRawOne();

    // Average days to collect (from invoices that have been paid)
    const avgDaysResult = await this.invoiceRepo
      .createQueryBuilder('inv')
      .select(
        "COALESCE(AVG(EXTRACT(EPOCH FROM (inv.paidAt - inv.createdAt)) / 86400), 0)::numeric",
        'avgDays',
      )
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.isPaid = true')
      .andWhere('inv.paidAt IS NOT NULL')
      .getRawOne();

    // Pending by client
    const byClientRaw = await this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoin('inv.client', 'c', 'c.id = inv.clientId AND c.tenantId = :tenantId', { tenantId })
      .select('inv.clientId', 'clientId')
      .addSelect(
        "COALESCE(c.companyName, CONCAT(c.firstName, ' ', c.lastName))",
        'name',
      )
      .addSelect('COALESCE(c.rut, \'\')', 'rut')
      .addSelect(
        'COALESCE(SUM(inv.montoTotal - inv.paidAmount), 0)::numeric',
        'pending',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.dueDate IS NOT NULL AND inv.dueDate < '${today}' THEN inv.montoTotal - inv.paidAmount ELSE 0 END), 0)::numeric`,
        'overdue',
      )
      .addSelect('MIN(inv.dueDate)', 'oldestDueDate')
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.isPaid = false')
      .andWhere("inv.status NOT IN ('void', 'cancelled', 'draft')")
      .andWhere('inv.clientId IS NOT NULL')
      .groupBy('inv.clientId')
      .addGroupBy('c.companyName')
      .addGroupBy('c.firstName')
      .addGroupBy('c.lastName')
      .addGroupBy('c.rut')
      .orderBy('pending', 'DESC')
      .getRawMany();

    const byClient = byClientRaw.map((r) => ({
      clientId: r.clientId,
      name: (r.name || '').trim(),
      rut: r.rut || '',
      pending: parseFloat(r.pending),
      overdue: parseFloat(r.overdue),
      oldestDueDate: r.oldestDueDate || '',
    }));

    // Aging buckets
    const agingResult = await this.invoiceRepo
      .createQueryBuilder('inv')
      .select(
        `COALESCE(SUM(CASE WHEN inv.dueDate IS NULL OR inv.dueDate >= '${today}' THEN inv.montoTotal - inv.paidAmount ELSE 0 END), 0)::numeric`,
        'current',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.dueDate < '${today}' AND inv.dueDate >= ('${today}'::date - INTERVAL '30 days')::date THEN inv.montoTotal - inv.paidAmount ELSE 0 END), 0)::numeric`,
        'days1_30',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.dueDate < ('${today}'::date - INTERVAL '30 days')::date AND inv.dueDate >= ('${today}'::date - INTERVAL '60 days')::date THEN inv.montoTotal - inv.paidAmount ELSE 0 END), 0)::numeric`,
        'days31_60',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.dueDate < ('${today}'::date - INTERVAL '60 days')::date AND inv.dueDate >= ('${today}'::date - INTERVAL '90 days')::date THEN inv.montoTotal - inv.paidAmount ELSE 0 END), 0)::numeric`,
        'days61_90',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.dueDate < ('${today}'::date - INTERVAL '90 days')::date THEN inv.montoTotal - inv.paidAmount ELSE 0 END), 0)::numeric`,
        'over90',
      )
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.isPaid = false')
      .andWhere("inv.status NOT IN ('void', 'cancelled', 'draft')")
      .getRawOne();

    const byAge = {
      current: parseFloat(agingResult.current),
      days1_30: parseFloat(agingResult.days1_30),
      days31_60: parseFloat(agingResult.days31_60),
      days61_90: parseFloat(agingResult.days61_90),
      over90: parseFloat(agingResult.over90),
    };

    // Top 20 overdue invoices by amount
    const overdueInvoices = await this.invoiceRepo
      .createQueryBuilder('inv')
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.isPaid = false')
      .andWhere("inv.status NOT IN ('void', 'cancelled', 'draft')")
      .andWhere('inv.dueDate IS NOT NULL')
      .andWhere('inv.dueDate < :today', { today })
      .orderBy('(inv.montoTotal - inv.paidAmount)', 'DESC')
      .take(20)
      .getMany();

    return {
      totalPending: parseFloat(pendingResult.totalPending),
      totalOverdue: parseFloat(overdueResult.totalOverdue),
      totalCollectedThisMonth: parseFloat(collectedResult.totalCollected),
      averageDaysToCollect: Math.round(parseFloat(avgDaysResult.avgDays)),
      byClient,
      byAge,
      overdueInvoices,
    };
  }

  /**
   * Get full balance detail for a specific client.
   */
  async getClientBalance(
    tenantId: string,
    clientId: string,
  ): Promise<{
    clientName: string;
    rut: string;
    totalInvoiced: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    invoices: {
      id: string;
      folio: number;
      dteType: number;
      issueDate: string;
      dueDate: string;
      montoTotal: number;
      paidAmount: number;
      pending: number;
      daysOverdue: number;
      status: string;
    }[];
    lastPaymentDate: string;
    averagePaymentDays: number;
  }> {
    const client = await this.clientRepo.findOne({
      where: { id: clientId, tenantId },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const clientName =
      client.companyName ||
      `${client.firstName || ''} ${client.lastName || ''}`.trim();

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Get all non-void invoices for the client
    const invoices = await this.invoiceRepo
      .createQueryBuilder('inv')
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.clientId = :clientId', { clientId })
      .andWhere("inv.status NOT IN ('void', 'cancelled', 'draft')")
      .orderBy('inv.issueDate', 'DESC')
      .getMany();

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    const invoiceDetails = invoices.map((inv) => {
      const total = Number(inv.montoTotal);
      const paid = Number(inv.paidAmount);
      const pending = Math.round((total - paid) * 100) / 100;

      totalInvoiced += total;
      totalPaid += paid;
      totalPending += pending;

      let daysOverdue = 0;
      if (inv.dueDate && !inv.isPaid) {
        const dueDate = new Date(inv.dueDate);
        const diffMs = today.getTime() - dueDate.getTime();
        daysOverdue = Math.max(0, Math.floor(diffMs / 86400000));
        if (daysOverdue > 0) {
          totalOverdue += pending;
        }
      }

      return {
        id: inv.id,
        folio: inv.folio,
        dteType: inv.dteType,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate || '',
        montoTotal: total,
        paidAmount: paid,
        pending,
        daysOverdue,
        status: inv.status,
      };
    });

    // Last payment date
    const lastPayment = await this.paymentRepo
      .createQueryBuilder('p')
      .select('MAX(p.paymentDate)', 'lastDate')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.clientId = :clientId', { clientId })
      .andWhere("p.status NOT IN ('VOIDED')")
      .getRawOne();

    // Average payment days for paid invoices
    const avgResult = await this.invoiceRepo
      .createQueryBuilder('inv')
      .select(
        "COALESCE(AVG(EXTRACT(EPOCH FROM (inv.paidAt - inv.createdAt)) / 86400), 0)::numeric",
        'avgDays',
      )
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.clientId = :clientId', { clientId })
      .andWhere('inv.isPaid = true')
      .andWhere('inv.paidAt IS NOT NULL')
      .getRawOne();

    return {
      clientName,
      rut: client.rut || '',
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      invoices: invoiceDetails,
      lastPaymentDate: lastPayment?.lastDate || '',
      averagePaymentDays: Math.round(parseFloat(avgResult?.avgDays || '0')),
    };
  }

  /**
   * Full aging analysis report with breakdowns per client.
   */
  async getAgingReport(tenantId: string): Promise<{
    byClient: {
      clientId: string;
      name: string;
      rut: string;
      current: number;
      days1_30: number;
      days31_60: number;
      days61_90: number;
      over90: number;
      total: number;
    }[];
    totals: {
      current: number;
      days1_30: number;
      days31_60: number;
      days61_90: number;
      over90: number;
      grandTotal: number;
    };
  }> {
    const today = new Date().toISOString().split('T')[0];

    const rawData = await this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoin('inv.client', 'c', 'c.id = inv.clientId AND c.tenantId = :tenantId', { tenantId })
      .select('inv.clientId', 'clientId')
      .addSelect(
        "COALESCE(c.companyName, CONCAT(c.firstName, ' ', c.lastName))",
        'name',
      )
      .addSelect('COALESCE(c.rut, \'\')', 'rut')
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.dueDate IS NULL OR inv.dueDate >= '${today}' THEN inv.montoTotal - inv.paidAmount ELSE 0 END), 0)::numeric`,
        'current',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.dueDate < '${today}' AND inv.dueDate >= ('${today}'::date - INTERVAL '30 days')::date THEN inv.montoTotal - inv.paidAmount ELSE 0 END), 0)::numeric`,
        'days1_30',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.dueDate < ('${today}'::date - INTERVAL '30 days')::date AND inv.dueDate >= ('${today}'::date - INTERVAL '60 days')::date THEN inv.montoTotal - inv.paidAmount ELSE 0 END), 0)::numeric`,
        'days31_60',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.dueDate < ('${today}'::date - INTERVAL '60 days')::date AND inv.dueDate >= ('${today}'::date - INTERVAL '90 days')::date THEN inv.montoTotal - inv.paidAmount ELSE 0 END), 0)::numeric`,
        'days61_90',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN inv.dueDate < ('${today}'::date - INTERVAL '90 days')::date THEN inv.montoTotal - inv.paidAmount ELSE 0 END), 0)::numeric`,
        'over90',
      )
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.isPaid = false')
      .andWhere("inv.status NOT IN ('void', 'cancelled', 'draft')")
      .andWhere('inv.clientId IS NOT NULL')
      .groupBy('inv.clientId')
      .addGroupBy('c.companyName')
      .addGroupBy('c.firstName')
      .addGroupBy('c.lastName')
      .addGroupBy('c.rut')
      .getRawMany();

    const totals = {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      over90: 0,
      grandTotal: 0,
    };

    const byClient = rawData.map((r) => {
      const current = parseFloat(r.current);
      const d1_30 = parseFloat(r.days1_30);
      const d31_60 = parseFloat(r.days31_60);
      const d61_90 = parseFloat(r.days61_90);
      const o90 = parseFloat(r.over90);
      const total = current + d1_30 + d31_60 + d61_90 + o90;

      totals.current += current;
      totals.days1_30 += d1_30;
      totals.days31_60 += d31_60;
      totals.days61_90 += d61_90;
      totals.over90 += o90;
      totals.grandTotal += total;

      return {
        clientId: r.clientId,
        name: (r.name || '').trim(),
        rut: r.rut || '',
        current,
        days1_30: d1_30,
        days31_60: d31_60,
        days61_90: d61_90,
        over90: o90,
        total,
      };
    });

    // Sort by total descending
    byClient.sort((a, b) => b.total - a.total);

    return { byClient, totals };
  }

  /**
   * Collection calendar: invoices due per day in a given month.
   */
  async getCollectionCalendar(
    tenantId: string,
    month: number,
    year: number,
  ): Promise<{
    days: {
      date: string;
      invoiceCount: number;
      totalDue: number;
      invoices: {
        id: string;
        folio: number;
        clientName: string;
        pending: number;
      }[];
    }[];
  }> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const invoices = await this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoin(Client, 'c', 'c.id = inv.clientId AND c.tenantId = :tenantId', { tenantId })
      .select('inv.id', 'id')
      .addSelect('inv.folio', 'folio')
      .addSelect('inv.dueDate', 'dueDate')
      .addSelect('(inv.montoTotal - inv.paidAmount)::numeric', 'pending')
      .addSelect(
        "COALESCE(c.companyName, CONCAT(c.firstName, ' ', c.lastName))",
        'clientName',
      )
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.isPaid = false')
      .andWhere("inv.status NOT IN ('void', 'cancelled', 'draft')")
      .andWhere('inv.dueDate >= :startDate', { startDate })
      .andWhere('inv.dueDate < :endDate', { endDate })
      .orderBy('inv.dueDate', 'ASC')
      .getRawMany();

    // Group by date
    const dayMap: Record<
      string,
      {
        date: string;
        invoiceCount: number;
        totalDue: number;
        invoices: { id: string; folio: number; clientName: string; pending: number }[];
      }
    > = {};

    for (const inv of invoices) {
      const dateKey = inv.dueDate;
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = {
          date: dateKey,
          invoiceCount: 0,
          totalDue: 0,
          invoices: [],
        };
      }
      const pending = parseFloat(inv.pending);
      dayMap[dateKey].invoiceCount += 1;
      dayMap[dateKey].totalDue += pending;
      dayMap[dateKey].invoices.push({
        id: inv.id,
        folio: inv.folio,
        clientName: (inv.clientName || '').trim(),
        pending,
      });
    }

    const days = Object.values(dayMap).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return { days };
  }

  /**
   * Expected incoming cash flow based on due dates.
   */
  async getCashFlowIncoming(
    tenantId: string,
    days: number,
  ): Promise<{
    byWeek: {
      weekStart: string;
      weekEnd: string;
      totalExpected: number;
      invoiceCount: number;
    }[];
    total: number;
    clientCount: number;
  }> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all pending invoices with due dates in the range
    const invoices = await this.invoiceRepo
      .createQueryBuilder('inv')
      .select('inv.dueDate', 'dueDate')
      .addSelect('(inv.montoTotal - inv.paidAmount)::numeric', 'pending')
      .addSelect('inv.clientId', 'clientId')
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.isPaid = false')
      .andWhere("inv.status NOT IN ('void', 'cancelled', 'draft')")
      .andWhere('inv.dueDate >= :todayStr', { todayStr })
      .andWhere('inv.dueDate <= :endDateStr', { endDateStr })
      .orderBy('inv.dueDate', 'ASC')
      .getRawMany();

    // Group by week
    const weekMap: Record<
      string,
      { weekStart: string; weekEnd: string; totalExpected: number; invoiceCount: number }
    > = {};

    const clientIds = new Set<string>();
    let total = 0;

    for (const inv of invoices) {
      const dueDate = new Date(inv.dueDate);
      const dayOfWeek = dueDate.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(dueDate);
      weekStart.setDate(weekStart.getDate() + mondayOffset);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekKey = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      if (!weekMap[weekKey]) {
        weekMap[weekKey] = {
          weekStart: weekKey,
          weekEnd: weekEndStr,
          totalExpected: 0,
          invoiceCount: 0,
        };
      }

      const pending = parseFloat(inv.pending);
      weekMap[weekKey].totalExpected += pending;
      weekMap[weekKey].invoiceCount += 1;
      total += pending;
      if (inv.clientId) clientIds.add(inv.clientId);
    }

    const byWeek = Object.values(weekMap).sort((a, b) =>
      a.weekStart.localeCompare(b.weekStart),
    );

    return {
      byWeek,
      total: Math.round(total * 100) / 100,
      clientCount: clientIds.size,
    };
  }

  /**
   * Get clients with overdue invoices, sorted by amount owed.
   */
  async getOverdueClients(tenantId: string): Promise<
    {
      clientId: string;
      name: string;
      rut: string;
      totalOverdue: number;
      overdueInvoiceCount: number;
      oldestDueDate: string;
      maxDaysOverdue: number;
    }[]
  > {
    const today = new Date().toISOString().split('T')[0];

    const rawData = await this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoin('inv.client', 'c', 'c.id = inv.clientId AND c.tenantId = :tenantId', { tenantId })
      .select('inv.clientId', 'clientId')
      .addSelect(
        "COALESCE(c.companyName, CONCAT(c.firstName, ' ', c.lastName))",
        'name',
      )
      .addSelect('COALESCE(c.rut, \'\')', 'rut')
      .addSelect(
        'COALESCE(SUM(inv.montoTotal - inv.paidAmount), 0)::numeric',
        'totalOverdue',
      )
      .addSelect('COUNT(*)::int', 'overdueInvoiceCount')
      .addSelect('MIN(inv.dueDate)', 'oldestDueDate')
      .addSelect(
        `MAX(('${today}'::date - inv.dueDate::date))::int`,
        'maxDaysOverdue',
      )
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.isPaid = false')
      .andWhere("inv.status NOT IN ('void', 'cancelled', 'draft')")
      .andWhere('inv.dueDate IS NOT NULL')
      .andWhere('inv.dueDate < :today', { today })
      .andWhere('inv.clientId IS NOT NULL')
      .groupBy('inv.clientId')
      .addGroupBy('c.companyName')
      .addGroupBy('c.firstName')
      .addGroupBy('c.lastName')
      .addGroupBy('c.rut')
      .orderBy('totalOverdue', 'DESC')
      .getRawMany();

    return rawData.map((r) => ({
      clientId: r.clientId,
      name: (r.name || '').trim(),
      rut: r.rut || '',
      totalOverdue: parseFloat(r.totalOverdue),
      overdueInvoiceCount: r.overdueInvoiceCount,
      oldestDueDate: r.oldestDueDate || '',
      maxDaysOverdue: r.maxDaysOverdue || 0,
    }));
  }

  /**
   * Monthly collection totals vs invoiced for a given year.
   */
  async getMonthlyCollections(
    tenantId: string,
    year: number,
  ): Promise<{
    months: {
      month: number;
      monthName: string;
      invoiced: number;
      collected: number;
      invoiceCount: number;
      paymentCount: number;
    }[];
    yearTotalInvoiced: number;
    yearTotalCollected: number;
  }> {
    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    // Invoiced per month
    const invoicedRaw = await this.invoiceRepo
      .createQueryBuilder('inv')
      .select("EXTRACT(MONTH FROM inv.issueDate::date)::int", 'month')
      .addSelect('COALESCE(SUM(inv.montoTotal), 0)::numeric', 'invoiced')
      .addSelect('COUNT(*)::int', 'invoiceCount')
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere("inv.status NOT IN ('void', 'cancelled', 'draft')")
      .andWhere("EXTRACT(YEAR FROM inv.issueDate::date) = :year", { year })
      .groupBy("EXTRACT(MONTH FROM inv.issueDate::date)")
      .getRawMany();

    // Collected per month
    const collectedRaw = await this.paymentRepo
      .createQueryBuilder('p')
      .select("EXTRACT(MONTH FROM p.paymentDate::date)::int", 'month')
      .addSelect('COALESCE(SUM(p.amount), 0)::numeric', 'collected')
      .addSelect('COUNT(*)::int', 'paymentCount')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere("p.status NOT IN ('VOIDED')")
      .andWhere("EXTRACT(YEAR FROM p.paymentDate::date) = :year", { year })
      .groupBy("EXTRACT(MONTH FROM p.paymentDate::date)")
      .getRawMany();

    // Build monthly map
    const invoicedMap: Record<number, { invoiced: number; invoiceCount: number }> = {};
    for (const r of invoicedRaw) {
      invoicedMap[r.month] = {
        invoiced: parseFloat(r.invoiced),
        invoiceCount: r.invoiceCount,
      };
    }

    const collectedMap: Record<number, { collected: number; paymentCount: number }> = {};
    for (const r of collectedRaw) {
      collectedMap[r.month] = {
        collected: parseFloat(r.collected),
        paymentCount: r.paymentCount,
      };
    }

    let yearTotalInvoiced = 0;
    let yearTotalCollected = 0;

    const months = [];
    for (let m = 1; m <= 12; m++) {
      const inv = invoicedMap[m] || { invoiced: 0, invoiceCount: 0 };
      const col = collectedMap[m] || { collected: 0, paymentCount: 0 };

      yearTotalInvoiced += inv.invoiced;
      yearTotalCollected += col.collected;

      months.push({
        month: m,
        monthName: monthNames[m - 1],
        invoiced: inv.invoiced,
        collected: col.collected,
        invoiceCount: inv.invoiceCount,
        paymentCount: col.paymentCount,
      });
    }

    return {
      months,
      yearTotalInvoiced: Math.round(yearTotalInvoiced * 100) / 100,
      yearTotalCollected: Math.round(yearTotalCollected * 100) / 100,
    };
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================

  /**
   * Generate sequential payment number: COB-YYYYMM-NNNN
   */
  private async generatePaymentNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `COB-${yearMonth}-`;

    // Find the last payment number with this prefix for this tenant
    const lastPayment = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.paymentNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('p.paymentNumber', 'DESC')
      .getOne();

    let nextSeq = 1;
    if (lastPayment) {
      const lastNum = lastPayment.paymentNumber.replace(prefix, '');
      const parsed = parseInt(lastNum, 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
}

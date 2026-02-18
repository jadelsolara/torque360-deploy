import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, DataSource } from 'typeorm';
import { SupplierInvoice } from '../../database/entities/supplier-invoice.entity';
import { SupplierInvoiceItem } from '../../database/entities/supplier-invoice-item.entity';
import { SupplierPayment } from '../../database/entities/supplier-payment.entity';
import { Supplier } from '../../database/entities/supplier.entity';
import {
  CreateSupplierInvoiceDto,
  UpdateSupplierInvoiceDto,
  CreateSupplierPaymentDto,
  InvoiceFiltersDto,
  PaymentFiltersDto,
  PaymentConditionEnum,
} from './supplier-accounts.dto';

@Injectable()
export class SupplierAccountsService {
  constructor(
    @InjectRepository(SupplierInvoice)
    private invoiceRepo: Repository<SupplierInvoice>,
    @InjectRepository(SupplierInvoiceItem)
    private invoiceItemRepo: Repository<SupplierInvoiceItem>,
    @InjectRepository(SupplierPayment)
    private paymentRepo: Repository<SupplierPayment>,
    @InjectRepository(Supplier)
    private supplierRepo: Repository<Supplier>,
    private dataSource: DataSource,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // SUPPLIER INVOICES
  // ═══════════════════════════════════════════════════════════════════════

  async createInvoice(
    tenantId: string,
    dto: CreateSupplierInvoiceDto,
  ): Promise<SupplierInvoice> {
    // Validate supplier exists
    const supplier = await this.supplierRepo.findOne({
      where: { id: dto.supplierId, tenantId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    // Calculate due date from payment condition if not provided
    let dueDate = dto.dueDate;
    if (!dueDate) {
      dueDate = this.calculateDueDate(dto.issueDate, dto.paymentCondition);
    }

    // Calculate montoTotalClp if foreign currency
    let montoTotalClp: number | undefined = undefined;
    if (dto.currency && dto.currency !== 'CLP' && dto.exchangeRate) {
      montoTotalClp = Math.round(dto.montoTotal * dto.exchangeRate);
    }

    // Determine DTE type if not provided
    let dteType = dto.dteType;
    if (!dteType) {
      dteType = this.inferDteType(dto.invoiceType) ?? undefined;
    }

    const invoice = this.invoiceRepo.create({
      tenantId,
      supplierId: dto.supplierId,
      invoiceNumber: dto.invoiceNumber,
      invoiceType: dto.invoiceType,
      dteType,
      issueDate: dto.issueDate,
      receptionDate: dto.receptionDate || dto.issueDate,
      dueDate,
      montoNeto: dto.montoNeto,
      montoExento: dto.montoExento || 0,
      iva: dto.iva,
      montoTotal: dto.montoTotal,
      currency: dto.currency || 'CLP',
      exchangeRate: dto.exchangeRate,
      montoTotalClp,
      paymentCondition: dto.paymentCondition,
      status: 'RECEIVED',
      paidAmount: 0,
      pendingAmount: dto.montoTotal,
      relatedImportOrderId: dto.relatedImportOrderId,
      relatedPurchaseOrderId: dto.relatedPurchaseOrderId,
      siiTrackId: dto.siiTrackId,
      notes: dto.notes,
      documentUrl: dto.documentUrl,
    });

    const savedInvoice = await this.invoiceRepo.save(invoice) as SupplierInvoice;

    // Create invoice items
    if (dto.items && dto.items.length > 0) {
      const items = dto.items.map((itemDto) =>
        this.invoiceItemRepo.create({
          tenantId,
          supplierInvoiceId: savedInvoice.id,
          inventoryItemId: itemDto.inventoryItemId,
          description: itemDto.description,
          quantity: itemDto.quantity,
          unitPrice: itemDto.unitPrice,
          totalLine: itemDto.totalLine,
          isExempt: itemDto.isExempt || false,
        }),
      );
      await this.invoiceItemRepo.save(items);
    }

    return this.findOneInvoice(tenantId, savedInvoice.id);
  }

  async updateInvoice(
    tenantId: string,
    id: string,
    dto: UpdateSupplierInvoiceDto,
  ): Promise<SupplierInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, tenantId },
    });
    if (!invoice) {
      throw new NotFoundException('Supplier invoice not found');
    }

    if (invoice.status !== 'RECEIVED') {
      throw new BadRequestException(
        'Invoice can only be updated while in RECEIVED status',
      );
    }

    // Update basic fields
    if (dto.invoiceNumber !== undefined) invoice.invoiceNumber = dto.invoiceNumber;
    if (dto.invoiceType !== undefined) invoice.invoiceType = dto.invoiceType;
    if (dto.dteType !== undefined) invoice.dteType = dto.dteType;
    if (dto.issueDate !== undefined) invoice.issueDate = dto.issueDate;
    if (dto.receptionDate !== undefined) invoice.receptionDate = dto.receptionDate;
    if (dto.dueDate !== undefined) invoice.dueDate = dto.dueDate;
    if (dto.montoNeto !== undefined) invoice.montoNeto = dto.montoNeto;
    if (dto.montoExento !== undefined) invoice.montoExento = dto.montoExento;
    if (dto.iva !== undefined) invoice.iva = dto.iva;
    if (dto.montoTotal !== undefined) {
      invoice.montoTotal = dto.montoTotal;
      invoice.pendingAmount = dto.montoTotal;
    }
    if (dto.currency !== undefined) invoice.currency = dto.currency;
    if (dto.exchangeRate !== undefined) invoice.exchangeRate = dto.exchangeRate;
    if (dto.paymentCondition !== undefined) invoice.paymentCondition = dto.paymentCondition;
    if (dto.relatedImportOrderId !== undefined) invoice.relatedImportOrderId = dto.relatedImportOrderId;
    if (dto.relatedPurchaseOrderId !== undefined) invoice.relatedPurchaseOrderId = dto.relatedPurchaseOrderId;
    if (dto.siiTrackId !== undefined) invoice.siiTrackId = dto.siiTrackId;
    if (dto.notes !== undefined) invoice.notes = dto.notes;
    if (dto.documentUrl !== undefined) invoice.documentUrl = dto.documentUrl;

    // Recalculate montoTotalClp if applicable
    if (invoice.currency !== 'CLP' && invoice.exchangeRate) {
      invoice.montoTotalClp = Math.round(
        Number(invoice.montoTotal) * Number(invoice.exchangeRate),
      );
    }

    await this.invoiceRepo.save(invoice);

    // Replace items if provided
    if (dto.items !== undefined) {
      await this.invoiceItemRepo.delete({ supplierInvoiceId: id, tenantId });
      if (dto.items.length > 0) {
        const items = dto.items.map((itemDto) =>
          this.invoiceItemRepo.create({
            tenantId,
            supplierInvoiceId: id,
            inventoryItemId: itemDto.inventoryItemId,
            description: itemDto.description,
            quantity: itemDto.quantity,
            unitPrice: itemDto.unitPrice,
            totalLine: itemDto.totalLine,
            isExempt: itemDto.isExempt || false,
          }),
        );
        await this.invoiceItemRepo.save(items);
      }
    }

    return this.findOneInvoice(tenantId, id);
  }

  async approveInvoice(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<SupplierInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, tenantId },
    });
    if (!invoice) {
      throw new NotFoundException('Supplier invoice not found');
    }

    if (invoice.status !== 'RECEIVED') {
      throw new BadRequestException(
        'Only invoices with RECEIVED status can be approved',
      );
    }

    invoice.status = 'APPROVED';
    invoice.approvedBy = userId;
    invoice.approvedAt = new Date();

    await this.invoiceRepo.save(invoice);
    return this.findOneInvoice(tenantId, id);
  }

  async findAllInvoices(
    tenantId: string,
    filters: InvoiceFiltersDto,
  ): Promise<SupplierInvoice[]> {
    const qb = this.invoiceRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.supplier', 'supplier')
      .where('si.tenant_id = :tenantId', { tenantId })
      .orderBy('si.issue_date', 'DESC');

    if (filters.supplierId) {
      qb.andWhere('si.supplier_id = :supplierId', {
        supplierId: filters.supplierId,
      });
    }

    if (filters.status) {
      qb.andWhere('si.status = :status', { status: filters.status });
    }

    if (filters.invoiceType) {
      qb.andWhere('si.invoice_type = :invoiceType', {
        invoiceType: filters.invoiceType,
      });
    }

    if (filters.dateFrom) {
      qb.andWhere('si.issue_date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('si.issue_date <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.dueFrom) {
      qb.andWhere('si.due_date >= :dueFrom', { dueFrom: filters.dueFrom });
    }

    if (filters.dueTo) {
      qb.andWhere('si.due_date <= :dueTo', { dueTo: filters.dueTo });
    }

    if (filters.overdue) {
      const today = new Date().toISOString().split('T')[0];
      qb.andWhere('si.due_date < :today', { today });
      qb.andWhere('si.status NOT IN (:...paidStatuses)', {
        paidStatuses: ['PAID', 'VOIDED'],
      });
    }

    if (filters.search) {
      qb.andWhere(
        '(si.invoice_number ILIKE :search OR supplier.name ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return qb.getMany();
  }

  async findOneInvoice(
    tenantId: string,
    id: string,
  ): Promise<SupplierInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, tenantId },
      relations: ['supplier', 'items', 'payments'],
    });
    if (!invoice) {
      throw new NotFoundException('Supplier invoice not found');
    }
    return invoice;
  }

  async voidInvoice(tenantId: string, id: string): Promise<SupplierInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, tenantId },
    });
    if (!invoice) {
      throw new NotFoundException('Supplier invoice not found');
    }

    if (Number(invoice.paidAmount) > 0) {
      throw new BadRequestException(
        'Cannot void an invoice that has payments. Void the payments first.',
      );
    }

    invoice.status = 'VOIDED';
    invoice.pendingAmount = 0;

    await this.invoiceRepo.save(invoice);
    return this.findOneInvoice(tenantId, id);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAYMENTS
  // ═══════════════════════════════════════════════════════════════════════

  async createPayment(
    tenantId: string,
    dto: CreateSupplierPaymentDto,
    userId: string,
  ): Promise<SupplierPayment> {
    // Validate supplier exists
    const supplier = await this.supplierRepo.findOne({
      where: { id: dto.supplierId, tenantId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    let invoice: SupplierInvoice | null = null;

    if (dto.supplierInvoiceId) {
      // Validate invoice exists, is approved, and has sufficient pending amount
      invoice = await this.invoiceRepo.findOne({
        where: { id: dto.supplierInvoiceId, tenantId },
      });
      if (!invoice) {
        throw new NotFoundException('Supplier invoice not found');
      }

      if (invoice.status === 'RECEIVED') {
        throw new BadRequestException(
          'Invoice must be approved before payment can be recorded',
        );
      }

      if (invoice.status === 'PAID') {
        throw new BadRequestException('Invoice is already fully paid');
      }

      if (invoice.status === 'VOIDED') {
        throw new BadRequestException('Cannot pay a voided invoice');
      }

      const pendingAmount = Number(invoice.pendingAmount);
      if (dto.amount > pendingAmount) {
        throw new BadRequestException(
          `Payment amount ($${dto.amount}) exceeds pending amount ($${pendingAmount})`,
        );
      }
    }

    // Generate payment number: PAG-YYYYMM-NNNN
    const paymentNumber = await this.generatePaymentNumber(tenantId);

    // Calculate amount in CLP if foreign currency
    let amountClp: number | undefined = undefined;
    const currency = dto.currency || 'CLP';
    if (currency !== 'CLP' && dto.exchangeRate) {
      amountClp = Math.round(dto.amount * dto.exchangeRate);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = queryRunner.manager.create(SupplierPayment, {
        tenantId,
        supplierId: dto.supplierId,
        supplierInvoiceId: dto.supplierInvoiceId,
        paymentNumber,
        paymentDate: dto.paymentDate,
        amount: dto.amount,
        currency,
        exchangeRate: dto.exchangeRate,
        amountClp,
        paymentMethod: dto.paymentMethod,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        transactionRef: dto.transactionRef,
        chequeNumber: dto.chequeNumber,
        chequeDate: dto.chequeDate,
        chequeBankName: dto.chequeBankName,
        status: 'PENDING',
        notes: dto.notes,
        receiptUrl: dto.receiptUrl,
        createdBy: userId,
      });

      const savedPayment = await queryRunner.manager.save(SupplierPayment, payment);

      // Update invoice balances if payment is against an invoice
      if (invoice) {
        await this.updateInvoiceBalance(invoice, dto.amount, 'add');
      }

      await queryRunner.commitTransaction();
      return this.findOnePayment(tenantId, savedPayment.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async confirmPayment(
    tenantId: string,
    id: string,
    userId: string,
  ): Promise<SupplierPayment> {
    const payment = await this.paymentRepo.findOne({
      where: { id, tenantId },
    });
    if (!payment) {
      throw new NotFoundException('Supplier payment not found');
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending payments can be confirmed',
      );
    }

    payment.status = 'CONFIRMED';
    payment.confirmedBy = userId;
    payment.confirmedAt = new Date();

    await this.paymentRepo.save(payment);
    return this.findOnePayment(tenantId, id);
  }

  async voidPayment(tenantId: string, id: string): Promise<SupplierPayment> {
    const payment = await this.paymentRepo.findOne({
      where: { id, tenantId },
    });
    if (!payment) {
      throw new NotFoundException('Supplier payment not found');
    }

    if (payment.status === 'VOIDED') {
      throw new BadRequestException('Payment is already voided');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Restore invoice balance if payment was against an invoice
      if (payment.supplierInvoiceId) {
        const invoice = await queryRunner.manager.findOne(SupplierInvoice, {
          where: { id: payment.supplierInvoiceId, tenantId },
        });
        if (invoice) {
          await this.updateInvoiceBalance(invoice, Number(payment.amount), 'subtract');
        }
      }

      payment.status = 'VOIDED';
      await queryRunner.manager.save(SupplierPayment, payment);

      await queryRunner.commitTransaction();
      return this.findOnePayment(tenantId, id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAllPayments(
    tenantId: string,
    filters: PaymentFiltersDto,
  ): Promise<SupplierPayment[]> {
    const qb = this.paymentRepo
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.supplier', 'supplier')
      .leftJoinAndSelect('sp.supplierInvoice', 'invoice')
      .where('sp.tenant_id = :tenantId', { tenantId })
      .orderBy('sp.payment_date', 'DESC');

    if (filters.supplierId) {
      qb.andWhere('sp.supplier_id = :supplierId', {
        supplierId: filters.supplierId,
      });
    }

    if (filters.status) {
      qb.andWhere('sp.status = :status', { status: filters.status });
    }

    if (filters.paymentMethod) {
      qb.andWhere('sp.payment_method = :paymentMethod', {
        paymentMethod: filters.paymentMethod,
      });
    }

    if (filters.dateFrom) {
      qb.andWhere('sp.payment_date >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      qb.andWhere('sp.payment_date <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.search) {
      qb.andWhere(
        '(sp.payment_number ILIKE :search OR sp.transaction_ref ILIKE :search OR supplier.name ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return qb.getMany();
  }

  async findOnePayment(
    tenantId: string,
    id: string,
  ): Promise<SupplierPayment> {
    const payment = await this.paymentRepo.findOne({
      where: { id, tenantId },
      relations: ['supplier', 'supplierInvoice'],
    });
    if (!payment) {
      throw new NotFoundException('Supplier payment not found');
    }
    return payment;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ACCOUNTS PAYABLE REPORTS
  // ═══════════════════════════════════════════════════════════════════════

  async getAccountsPayableSummary(tenantId: string) {
    const today = new Date().toISOString().split('T')[0];
    const in7Days = this.addDays(today, 7);
    const in14Days = this.addDays(today, 14);
    const in30Days = this.addDays(today, 30);

    // Total pending & overdue
    const totals = await this.invoiceRepo
      .createQueryBuilder('si')
      .select('SUM(si.pending_amount)', 'totalPending')
      .addSelect(
        `SUM(CASE WHEN si.due_date < '${today}' AND si.status NOT IN ('PAID','VOIDED') THEN si.pending_amount ELSE 0 END)`,
        'totalOverdue',
      )
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.status NOT IN (:...excluded)', {
        excluded: ['PAID', 'VOIDED'],
      })
      .getRawOne();

    // By supplier
    const bySupplier = await this.invoiceRepo
      .createQueryBuilder('si')
      .leftJoin('si.supplier', 'supplier')
      .select('si.supplier_id', 'supplierId')
      .addSelect('supplier.name', 'supplierName')
      .addSelect('SUM(si.pending_amount)', 'pending')
      .addSelect(
        `SUM(CASE WHEN si.due_date < '${today}' THEN si.pending_amount ELSE 0 END)`,
        'overdue',
      )
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.status NOT IN (:...excluded)', {
        excluded: ['PAID', 'VOIDED'],
      })
      .andWhere('si.pending_amount > 0')
      .groupBy('si.supplier_id')
      .addGroupBy('supplier.name')
      .orderBy('SUM(si.pending_amount)', 'DESC')
      .getRawMany();

    // By due date buckets
    const byDueDate = await this.invoiceRepo
      .createQueryBuilder('si')
      .select(
        `SUM(CASE WHEN si.due_date <= '${in7Days}' THEN si.pending_amount ELSE 0 END)`,
        'thisWeek',
      )
      .addSelect(
        `SUM(CASE WHEN si.due_date > '${in7Days}' AND si.due_date <= '${in14Days}' THEN si.pending_amount ELSE 0 END)`,
        'next2Weeks',
      )
      .addSelect(
        `SUM(CASE WHEN si.due_date > '${in14Days}' AND si.due_date <= '${in30Days}' THEN si.pending_amount ELSE 0 END)`,
        'next30Days',
      )
      .addSelect(
        `SUM(CASE WHEN si.due_date > '${in30Days}' THEN si.pending_amount ELSE 0 END)`,
        'over30Days',
      )
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.status NOT IN (:...excluded)', {
        excluded: ['PAID', 'VOIDED'],
      })
      .andWhere('si.pending_amount > 0')
      .getRawOne();

    // Upcoming payments (next 7 days)
    const upcomingPayments = await this.invoiceRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.supplier', 'supplier')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.status NOT IN (:...excluded)', {
        excluded: ['PAID', 'VOIDED'],
      })
      .andWhere('si.pending_amount > 0')
      .andWhere('si.due_date >= :today', { today })
      .andWhere('si.due_date <= :in7Days', { in7Days })
      .orderBy('si.due_date', 'ASC')
      .getMany();

    return {
      totalPending: Number(totals?.totalPending || 0),
      totalOverdue: Number(totals?.totalOverdue || 0),
      bySupplier: bySupplier.map((s) => ({
        supplierId: s.supplierId,
        supplierName: s.supplierName,
        pending: Number(s.pending || 0),
        overdue: Number(s.overdue || 0),
      })),
      byDueDate: {
        thisWeek: Number(byDueDate?.thisWeek || 0),
        next2Weeks: Number(byDueDate?.next2Weeks || 0),
        next30Days: Number(byDueDate?.next30Days || 0),
        over30Days: Number(byDueDate?.over30Days || 0),
      },
      upcomingPayments,
    };
  }

  async getSupplierBalance(tenantId: string, supplierId: string) {
    const supplier = await this.supplierRepo.findOne({
      where: { id: supplierId, tenantId },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const today = new Date().toISOString().split('T')[0];

    const invoices = await this.invoiceRepo.find({
      where: { tenantId, supplierId },
      order: { issueDate: 'DESC' },
    });

    const activeInvoices = invoices.filter((i) => i.status !== 'VOIDED');

    const totalInvoiced = activeInvoices.reduce(
      (sum, i) => sum + Number(i.montoTotal),
      0,
    );
    const totalPaid = activeInvoices.reduce(
      (sum, i) => sum + Number(i.paidAmount),
      0,
    );
    const totalPending = activeInvoices.reduce(
      (sum, i) => sum + Number(i.pendingAmount),
      0,
    );
    const totalOverdue = activeInvoices
      .filter((i) => i.dueDate && i.dueDate < today && Number(i.pendingAmount) > 0)
      .reduce((sum, i) => sum + Number(i.pendingAmount), 0);

    return {
      supplierId,
      supplierName: supplier.name,
      totalInvoiced,
      totalPaid,
      totalPending,
      totalOverdue,
      invoices: activeInvoices.map((i) => {
        const daysOverdue =
          i.dueDate && i.dueDate < today && Number(i.pendingAmount) > 0
            ? this.daysBetween(i.dueDate, today)
            : 0;
        return {
          id: i.id,
          number: i.invoiceNumber,
          total: Number(i.montoTotal),
          paid: Number(i.paidAmount),
          pending: Number(i.pendingAmount),
          dueDate: i.dueDate,
          status: i.status,
          daysOverdue,
        };
      }),
    };
  }

  async getPaymentCalendar(tenantId: string, month: number, year: number) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = this.lastDayOfMonth(year, month);

    const invoices = await this.invoiceRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.supplier', 'supplier')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.status NOT IN (:...excluded)', {
        excluded: ['PAID', 'VOIDED'],
      })
      .andWhere('si.pending_amount > 0')
      .andWhere('si.due_date >= :startDate', { startDate })
      .andWhere('si.due_date <= :endDate', { endDate })
      .orderBy('si.due_date', 'ASC')
      .getMany();

    // Group by day
    const byDay: Record<
      string,
      { date: string; totalDue: number; invoices: { id: string; supplierName: string; amount: number; invoiceNumber: string }[] }
    > = {};

    for (const inv of invoices) {
      const day = inv.dueDate;
      if (!byDay[day]) {
        byDay[day] = { date: day, totalDue: 0, invoices: [] };
      }
      byDay[day].totalDue += Number(inv.pendingAmount);
      byDay[day].invoices.push({
        id: inv.id,
        supplierName: inv.supplier?.name || '',
        amount: Number(inv.pendingAmount),
        invoiceNumber: inv.invoiceNumber,
      });
    }

    return {
      month,
      year,
      days: Object.values(byDay),
      totalMonth: invoices.reduce(
        (sum, i) => sum + Number(i.pendingAmount),
        0,
      ),
    };
  }

  async getMonthlyPurchases(tenantId: string, year: number) {
    const result = await this.invoiceRepo
      .createQueryBuilder('si')
      .select("EXTRACT(MONTH FROM si.issue_date)", 'month')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(si.monto_neto)', 'montoNeto')
      .addSelect('SUM(si.iva)', 'iva')
      .addSelect('SUM(si.monto_total)', 'montoTotal')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere("EXTRACT(YEAR FROM si.issue_date) = :year", { year })
      .andWhere('si.status != :voided', { voided: 'VOIDED' })
      .groupBy("EXTRACT(MONTH FROM si.issue_date)")
      .orderBy("EXTRACT(MONTH FROM si.issue_date)", 'ASC')
      .getRawMany();

    // Fill all 12 months
    const months = Array.from({ length: 12 }, (_, i) => {
      const found = result.find((r) => Number(r.month) === i + 1);
      return {
        month: i + 1,
        count: found ? Number(found.count) : 0,
        montoNeto: found ? Number(found.montoNeto) : 0,
        iva: found ? Number(found.iva) : 0,
        montoTotal: found ? Number(found.montoTotal) : 0,
      };
    });

    return { year, months };
  }

  async getCashFlowProjection(tenantId: string, days: number) {
    const today = new Date().toISOString().split('T')[0];
    const endDate = this.addDays(today, days);

    const invoices = await this.invoiceRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.supplier', 'supplier')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.status NOT IN (:...excluded)', {
        excluded: ['PAID', 'VOIDED'],
      })
      .andWhere('si.pending_amount > 0')
      .andWhere('si.due_date >= :today', { today })
      .andWhere('si.due_date <= :endDate', { endDate })
      .orderBy('si.due_date', 'ASC')
      .getMany();

    // Group by week
    const byWeek: {
      weekStart: string;
      weekEnd: string;
      totalDue: number;
      supplierCount: number;
      suppliers: Set<string>;
    }[] = [];

    let weekStart = new Date(today);
    // Align to Monday
    const dayOfWeek = weekStart.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + diff);

    const finalDate = new Date(endDate);

    while (weekStart <= finalDate) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      byWeek.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        totalDue: 0,
        supplierCount: 0,
        suppliers: new Set<string>(),
      });
      weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() + 1);
    }

    for (const inv of invoices) {
      const dueDate = inv.dueDate;
      for (const week of byWeek) {
        if (dueDate >= week.weekStart && dueDate <= week.weekEnd) {
          week.totalDue += Number(inv.pendingAmount);
          week.suppliers.add(inv.supplierId);
          break;
        }
      }
    }

    // Aggregate by supplier
    const supplierTotals: Record<string, { name: string; total: number }> = {};
    for (const inv of invoices) {
      const sid = inv.supplierId;
      if (!supplierTotals[sid]) {
        supplierTotals[sid] = {
          name: inv.supplier?.name || '',
          total: 0,
        };
      }
      supplierTotals[sid].total += Number(inv.pendingAmount);
    }

    return {
      days,
      byWeek: byWeek.map((w) => ({
        weekStart: w.weekStart,
        weekEnd: w.weekEnd,
        totalDue: w.totalDue,
        supplierCount: w.suppliers.size,
      })),
      total: invoices.reduce(
        (sum, i) => sum + Number(i.pendingAmount),
        0,
      ),
      suppliers: Object.values(supplierTotals).sort(
        (a, b) => b.total - a.total,
      ),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  private calculateDueDate(
    issueDate: string,
    condition: PaymentConditionEnum,
  ): string {
    const date = new Date(issueDate);
    switch (condition) {
      case PaymentConditionEnum.CONTADO:
        // Due same day
        return issueDate;
      case PaymentConditionEnum['30_DIAS']:
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
      case PaymentConditionEnum['60_DIAS']:
        date.setDate(date.getDate() + 60);
        return date.toISOString().split('T')[0];
      case PaymentConditionEnum['90_DIAS']:
        date.setDate(date.getDate() + 90);
        return date.toISOString().split('T')[0];
      case PaymentConditionEnum.CUSTOM:
        // If CUSTOM, dueDate must be provided externally; fallback to +30
        date.setDate(date.getDate() + 30);
        return date.toISOString().split('T')[0];
      default:
        return issueDate;
    }
  }

  private inferDteType(
    invoiceType: string,
  ): number | null {
    switch (invoiceType) {
      case 'FACTURA_COMPRA':
        return 46;
      case 'NOTA_CREDITO_COMPRA':
        return 61;
      case 'NOTA_DEBITO_COMPRA':
        return 56;
      case 'BOLETA_COMPRA':
        return null;
      case 'FACTURA_IMPORTACION':
        return 46;
      default:
        return null;
    }
  }

  private async updateInvoiceBalance(
    invoice: SupplierInvoice,
    amount: number,
    operation: 'add' | 'subtract',
  ): Promise<void> {
    if (operation === 'add') {
      invoice.paidAmount = Number(invoice.paidAmount) + amount;
      invoice.pendingAmount = Number(invoice.pendingAmount) - amount;
    } else {
      invoice.paidAmount = Number(invoice.paidAmount) - amount;
      invoice.pendingAmount = Number(invoice.pendingAmount) + amount;
    }

    // Ensure no negative values
    if (invoice.paidAmount < 0) invoice.paidAmount = 0;
    if (invoice.pendingAmount < 0) invoice.pendingAmount = 0;

    // Update status based on balance
    if (Number(invoice.pendingAmount) === 0 && Number(invoice.paidAmount) > 0) {
      invoice.status = 'PAID';
    } else if (Number(invoice.paidAmount) > 0 && Number(invoice.pendingAmount) > 0) {
      invoice.status = 'PARTIALLY_PAID';
    } else if (Number(invoice.paidAmount) === 0) {
      invoice.status = 'APPROVED';
    }

    await this.invoiceRepo.save(invoice);
  }

  private async generatePaymentNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const prefix = `PAG-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const lastPayment = await this.paymentRepo
      .createQueryBuilder('sp')
      .where('sp.tenant_id = :tenantId', { tenantId })
      .andWhere('sp.payment_number LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('sp.payment_number', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastPayment) {
      const lastSeq = parseInt(
        lastPayment.paymentNumber.split('-').pop() || '0',
        10,
      );
      sequence = lastSeq + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  private daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private lastDayOfMonth(year: number, month: number): string {
    const d = new Date(year, month, 0);
    return d.toISOString().split('T')[0];
  }
}

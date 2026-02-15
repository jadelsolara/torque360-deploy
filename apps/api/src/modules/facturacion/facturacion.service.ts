import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../database/entities/invoice.entity';
import { InvoiceItem } from '../../database/entities/invoice-item.entity';
import { CafFolio } from '../../database/entities/caf.entity';
import { Client } from '../../database/entities/client.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { Quotation } from '../../database/entities/quotation.entity';
import { WorkOrderPart } from '../../database/entities/work-order-part.entity';
import { SiiService } from './sii.service';
import {
  CreateInvoiceDto,
  CreateInvoiceItemDto,
  CreateCreditNoteDto,
  UploadCafDto,
  InvoiceFiltersDto,
  MarkPaidDto,
} from './facturacion.dto';

// Default emisor data — should be replaced by tenant settings in production
const DEFAULT_EMISOR = {
  rut: '76000000-0',
  razonSocial: 'Empresa Demo SpA',
  giro: 'Taller Automotriz',
  direccion: 'Av. Principal 123',
  comuna: 'Santiago',
  ciudad: 'Santiago',
  actividadEconomica: 502200, // Mantenimiento y reparación de vehículos automotores
};

@Injectable()
export class FacturacionService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepo: Repository<InvoiceItem>,
    @InjectRepository(CafFolio)
    private cafRepo: Repository<CafFolio>,
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    @InjectRepository(WorkOrder)
    private workOrderRepo: Repository<WorkOrder>,
    @InjectRepository(Quotation)
    private quotationRepo: Repository<Quotation>,
    @InjectRepository(WorkOrderPart)
    private workOrderPartRepo: Repository<WorkOrderPart>,
    private siiService: SiiService,
  ) {}

  /**
   * Create a new invoice (DTE) with automatic folio assignment from CAF.
   */
  async createInvoice(
    tenantId: string,
    dto: CreateInvoiceDto,
    userId: string,
  ): Promise<Invoice> {
    // Validate receptor RUT
    if (!this.siiService.validateRut(dto.receptorRut)) {
      throw new BadRequestException(
        `RUT receptor inválido: ${dto.receptorRut}`,
      );
    }

    // Get next folio from CAF
    const folio = await this.getNextFolio(tenantId, dto.dteType);

    // If clientId provided, try to enrich receptor data from client
    let receptorData = {
      receptorRut: dto.receptorRut,
      receptorRazonSocial: dto.receptorRazonSocial,
      receptorGiro: dto.receptorGiro || undefined,
      receptorDireccion: dto.receptorDireccion || undefined,
      receptorComuna: dto.receptorComuna || undefined,
      receptorCiudad: dto.receptorCiudad || undefined,
    };

    if (dto.clientId) {
      const client = await this.clientRepo.findOne({
        where: { id: dto.clientId, tenantId },
      });
      if (client) {
        receptorData = {
          receptorRut: dto.receptorRut,
          receptorRazonSocial: dto.receptorRazonSocial,
          receptorGiro: dto.receptorGiro || undefined,
          receptorDireccion:
            dto.receptorDireccion || client.address || undefined,
          receptorComuna: dto.receptorComuna || client.city || undefined,
          receptorCiudad: dto.receptorCiudad || client.region || undefined,
        };
      }
    }

    // Build invoice items with calculated amounts
    const IVA_RATE = 19;
    const builtItems: Partial<InvoiceItem>[] = [];
    let montoNeto = 0;
    let montoExento = 0;

    for (let i = 0; i < dto.items.length; i++) {
      const itemDto = dto.items[i];
      const lineNumber = i + 1;

      const subtotal = itemDto.quantity * itemDto.unitPrice;
      const discountPct = itemDto.discountPct || 0;
      const discountAmount = Math.round((subtotal * discountPct) / 100 * 100) / 100;
      const totalLine = Math.round((subtotal - discountAmount) * 100) / 100;

      if (itemDto.isExempt) {
        montoExento += totalLine;
      } else {
        montoNeto += totalLine;
      }

      builtItems.push({
        tenantId,
        lineNumber,
        itemCode: itemDto.itemCode || undefined,
        itemName: itemDto.itemName,
        itemDescription: itemDto.itemDescription || undefined,
        quantity: itemDto.quantity,
        unitMeasure: itemDto.unitMeasure || 'UN',
        unitPrice: itemDto.unitPrice,
        discountPct,
        discountAmount,
        surchargePct: 0,
        surchargeAmount: 0,
        isExempt: itemDto.isExempt || false,
        totalLine,
        inventoryItemId: itemDto.inventoryItemId || undefined,
        workOrderPartId: itemDto.workOrderPartId || undefined,
      });
    }

    // Round montos
    montoNeto = Math.round(montoNeto * 100) / 100;
    montoExento = Math.round(montoExento * 100) / 100;

    // IVA calculation (Chile: 19%)
    const iva = Math.round(montoNeto * IVA_RATE) / 100;
    const montoTotal = montoNeto + iva + montoExento;

    // Calculate due date based on payment condition
    const issueDate = dto.issueDate || new Date().toISOString().split('T')[0];
    let dueDate: string | undefined = undefined;
    if (dto.paymentCondition) {
      dueDate = this.calculateDueDate(issueDate, dto.paymentCondition);
    }

    // Create invoice entity
    const invoice = this.invoiceRepo.create({
      tenantId,
      dteType: dto.dteType,
      folio,
      issueDate,
      status: 'draft',

      // Emisor (from tenant settings — using defaults for now)
      emisorRut: DEFAULT_EMISOR.rut,
      emisorRazonSocial: DEFAULT_EMISOR.razonSocial,
      emisorGiro: DEFAULT_EMISOR.giro,
      emisorDireccion: DEFAULT_EMISOR.direccion,
      emisorComuna: DEFAULT_EMISOR.comuna,
      emisorCiudad: DEFAULT_EMISOR.ciudad,
      emisorActividadEconomica: DEFAULT_EMISOR.actividadEconomica,

      // Receptor
      ...receptorData,

      // Montos
      montoNeto,
      montoExento,
      tasaIva: IVA_RATE,
      iva,
      montoTotal,

      // Internal references
      clientId: dto.clientId || undefined,
      workOrderId: dto.workOrderId || undefined,
      quotationId: dto.quotationId || undefined,

      // Payment
      paymentMethod: dto.paymentMethod || undefined,
      paymentCondition: dto.paymentCondition || undefined,
      dueDate: dueDate || undefined,

      // Metadata
      createdBy: userId,
      notes: dto.notes || undefined,

      // Items (cascade save)
      items: builtItems as InvoiceItem[],
    });

    const savedInvoice = await this.invoiceRepo.save(invoice) as Invoice;

    // Build DTE XML
    const fullInvoice = await this.findOne(tenantId, savedInvoice.id);
    const xml = this.siiService.buildDteXml(fullInvoice, fullInvoice.items);
    fullInvoice.xmlDte = xml;
    fullInvoice.status = 'issued';
    await this.invoiceRepo.save(fullInvoice);

    return this.findOne(tenantId, savedInvoice.id);
  }

  /**
   * Create invoice from an existing Work Order.
   * Auto-builds items from WorkOrderParts + labor cost.
   */
  async createFromWorkOrder(
    tenantId: string,
    workOrderId: string,
    dteType: number,
    userId: string,
  ): Promise<Invoice> {
    const workOrder = await this.workOrderRepo.findOne({
      where: { id: workOrderId, tenantId },
    });

    if (!workOrder) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    // Load parts
    const parts = await this.workOrderPartRepo.find({
      where: { workOrderId, tenantId },
    });

    // Load client for receptor data
    const client = await this.clientRepo.findOne({
      where: { id: workOrder.clientId, tenantId },
    });

    if (!client) {
      throw new BadRequestException(
        'La orden de trabajo no tiene un cliente asociado o el cliente no existe',
      );
    }

    if (!client.rut) {
      throw new BadRequestException(
        'El cliente no tiene RUT registrado. Requerido para facturación.',
      );
    }

    // Build items from parts
    const items: CreateInvoiceItemDto[] = parts.map((part) => ({
      itemName: part.name,
      itemDescription: part.partNumber
        ? `N/P: ${part.partNumber}`
        : undefined,
      quantity: Number(part.quantity),
      unitMeasure: 'UN',
      unitPrice: Number(part.unitPrice),
      discountPct: 0,
      isExempt: false,
      workOrderPartId: part.id,
    }));

    // Add labor as a line item if laborCost > 0
    if (Number(workOrder.laborCost) > 0) {
      items.push({
        itemName: 'Mano de obra',
        itemDescription: workOrder.description
          ? `Servicio: ${workOrder.description.substring(0, 200)}`
          : 'Servicio de mano de obra',
        quantity: 1,
        unitMeasure: 'GL',
        unitPrice: Number(workOrder.laborCost),
        discountPct: 0,
        isExempt: false,
      });
    }

    if (items.length === 0) {
      throw new BadRequestException(
        'La orden de trabajo no tiene repuestos ni mano de obra para facturar',
      );
    }

    const receptorName =
      client.companyName ||
      `${client.firstName || ''} ${client.lastName || ''}`.trim();

    const dto: CreateInvoiceDto = {
      dteType,
      receptorRut: client.rut,
      receptorRazonSocial: receptorName,
      receptorDireccion: client.address || undefined,
      receptorComuna: client.city || undefined,
      receptorCiudad: client.region || undefined,
      clientId: client.id,
      workOrderId,
      items,
    };

    return this.createInvoice(tenantId, dto, userId);
  }

  /**
   * Create invoice from an existing Quotation.
   */
  async createFromQuotation(
    tenantId: string,
    quotationId: string,
    dteType: number,
    userId: string,
  ): Promise<Invoice> {
    const quotation = await this.quotationRepo.findOne({
      where: { id: quotationId, tenantId },
    });

    if (!quotation) {
      throw new NotFoundException('Cotización no encontrada');
    }

    // Load client
    const client = await this.clientRepo.findOne({
      where: { id: quotation.clientId, tenantId },
    });

    if (!client) {
      throw new BadRequestException(
        'La cotización no tiene un cliente asociado o el cliente no existe',
      );
    }

    if (!client.rut) {
      throw new BadRequestException(
        'El cliente no tiene RUT registrado. Requerido para facturación.',
      );
    }

    // Convert quotation items (JSONB) to invoice items
    const quotationItems = quotation.items || [];
    if (quotationItems.length === 0) {
      throw new BadRequestException(
        'La cotización no tiene ítems para facturar',
      );
    }

    const items: CreateInvoiceItemDto[] = quotationItems.map((qi) => ({
      itemName: qi.description,
      quantity: qi.quantity,
      unitMeasure: 'UN',
      unitPrice: qi.unitPrice,
      discountPct: 0,
      isExempt: false,
    }));

    const receptorName =
      client.companyName ||
      `${client.firstName || ''} ${client.lastName || ''}`.trim();

    const dto: CreateInvoiceDto = {
      dteType,
      receptorRut: client.rut,
      receptorRazonSocial: receptorName,
      receptorDireccion: client.address || undefined,
      receptorComuna: client.city || undefined,
      receptorCiudad: client.region || undefined,
      clientId: client.id,
      quotationId,
      items,
    };

    return this.createInvoice(tenantId, dto, userId);
  }

  /**
   * Create a Nota de Crédito (DTE type 61).
   * References an existing invoice and may copy or override items.
   */
  async createCreditNote(
    tenantId: string,
    dto: CreateCreditNoteDto,
    userId: string,
  ): Promise<Invoice> {
    // Find the referenced original invoice
    const originalInvoice = await this.invoiceRepo.findOne({
      where: {
        tenantId,
        dteType: dto.refDteType,
        folio: dto.refFolio,
      },
      relations: ['items'],
    });

    if (!originalInvoice) {
      throw new NotFoundException(
        `Documento referenciado no encontrado: Tipo ${dto.refDteType}, Folio ${dto.refFolio}`,
      );
    }

    // Determine items based on refCodigo
    let items: CreateInvoiceItemDto[];

    if (dto.refCodigo === 1) {
      // Anulación: copy all items from original
      items = originalInvoice.items.map((item) => ({
        itemName: item.itemName,
        itemDescription: item.itemDescription || undefined,
        quantity: Number(item.quantity),
        unitMeasure: item.unitMeasure || 'UN',
        unitPrice: Number(item.unitPrice),
        discountPct: Number(item.discountPct) || 0,
        isExempt: item.isExempt,
        itemCode: item.itemCode || undefined,
      }));
    } else if (dto.refCodigo === 3 && dto.items && dto.items.length > 0) {
      // Corrección de monto: use provided items
      items = dto.items;
    } else if (dto.refCodigo === 2) {
      // Corrección de texto: use provided items or original
      items =
        dto.items && dto.items.length > 0
          ? dto.items
          : originalInvoice.items.map((item) => ({
              itemName: item.itemName,
              itemDescription: item.itemDescription || undefined,
              quantity: Number(item.quantity),
              unitMeasure: item.unitMeasure || 'UN',
              unitPrice: Number(item.unitPrice),
              discountPct: Number(item.discountPct) || 0,
              isExempt: item.isExempt,
              itemCode: item.itemCode || undefined,
            }));
    } else {
      throw new BadRequestException(
        'Para código de referencia 3 (corrección de monto), se requieren ítems',
      );
    }

    // Build the CreateInvoiceDto for the credit note
    const invoiceDto: CreateInvoiceDto = {
      dteType: 61, // Nota de Crédito Electrónica
      issueDate: dto.issueDate,
      receptorRut: dto.receptorRut,
      receptorRazonSocial: dto.receptorRazonSocial,
      receptorGiro: dto.receptorGiro,
      receptorDireccion: dto.receptorDireccion,
      receptorComuna: dto.receptorComuna,
      receptorCiudad: dto.receptorCiudad,
      clientId: dto.clientId || originalInvoice.clientId || undefined,
      paymentMethod: dto.paymentMethod,
      paymentCondition: dto.paymentCondition,
      notes: dto.notes,
      items,
    };

    // Create the invoice first
    const creditNote = await this.createInvoice(tenantId, invoiceDto, userId);

    // Update reference fields
    await this.invoiceRepo.update(
      { id: creditNote.id, tenantId },
      {
        refDteType: dto.refDteType,
        refFolio: dto.refFolio,
        refFecha: dto.refFecha,
        refRazon: dto.refRazon,
        refCodigo: dto.refCodigo,
      },
    );

    // If anulación, mark original as cancelled
    if (dto.refCodigo === 1) {
      await this.invoiceRepo.update(
        { id: originalInvoice.id, tenantId },
        { status: 'cancelled' },
      );
    }

    return this.findOne(tenantId, creditNote.id);
  }

  /**
   * Paginated, filtered list of invoices.
   */
  async findAll(
    tenantId: string,
    filters: InvoiceFiltersDto,
  ): Promise<{ data: Invoice[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const offset = (page - 1) * limit;

    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.items', 'items')
      .where('inv.tenantId = :tenantId', { tenantId });

    if (filters.dteType) {
      qb.andWhere('inv.dteType = :dteType', { dteType: filters.dteType });
    }

    if (filters.status) {
      qb.andWhere('inv.status = :status', { status: filters.status });
    }

    if (filters.clientId) {
      qb.andWhere('inv.clientId = :clientId', { clientId: filters.clientId });
    }

    if (filters.dateFrom) {
      qb.andWhere('inv.issueDate >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      qb.andWhere('inv.issueDate <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.folioFrom) {
      qb.andWhere('inv.folio >= :folioFrom', {
        folioFrom: filters.folioFrom,
      });
    }

    if (filters.folioTo) {
      qb.andWhere('inv.folio <= :folioTo', { folioTo: filters.folioTo });
    }

    qb.orderBy('inv.createdAt', 'DESC');
    qb.skip(offset).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Get a single invoice by ID with items.
   */
  async findOne(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id, tenantId },
      relations: ['items'],
    });

    if (!invoice) {
      throw new NotFoundException('Documento tributario no encontrado');
    }

    return invoice;
  }

  /**
   * Mark an invoice as paid.
   */
  async markPaid(
    tenantId: string,
    id: string,
    dto: MarkPaidDto,
  ): Promise<Invoice> {
    const invoice = await this.findOne(tenantId, id);

    if (invoice.status === 'void' || invoice.status === 'cancelled') {
      throw new BadRequestException(
        'No se puede marcar como pagado un documento anulado o cancelado',
      );
    }

    invoice.isPaid = true;
    invoice.paidAt = new Date();
    invoice.paidAmount = dto.paidAmount;
    if (dto.paymentMethod) {
      invoice.paymentMethod = dto.paymentMethod;
    }
    if (dto.notes) {
      invoice.notes = invoice.notes
        ? `${invoice.notes}\n[Pago] ${dto.notes}`
        : `[Pago] ${dto.notes}`;
    }

    return this.invoiceRepo.save(invoice) as Promise<Invoice>;
  }

  /**
   * Void an invoice. Only allowed if not yet sent to SII.
   */
  async voidInvoice(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(tenantId, id);

    if (
      invoice.status === 'sent_to_sii' ||
      invoice.status === 'accepted'
    ) {
      throw new BadRequestException(
        'No se puede anular un documento ya enviado al SII. Emita una Nota de Crédito en su lugar.',
      );
    }

    if (invoice.status === 'void') {
      throw new BadRequestException('El documento ya está anulado');
    }

    invoice.status = 'void';
    return this.invoiceRepo.save(invoice) as Promise<Invoice>;
  }

  /**
   * Submit invoice to SII.
   */
  async sendToSii(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(tenantId, id);

    if (invoice.status === 'void' || invoice.status === 'cancelled') {
      throw new BadRequestException(
        'No se puede enviar al SII un documento anulado o cancelado',
      );
    }

    if (invoice.status === 'sent_to_sii' || invoice.status === 'accepted') {
      throw new BadRequestException(
        'El documento ya fue enviado al SII',
      );
    }

    if (!invoice.xmlDte) {
      throw new BadRequestException(
        'El documento no tiene XML DTE generado',
      );
    }

    // Sign the DTE XML
    // TODO: Get private key from CAF or tenant certificate
    const signedXml = this.siiService.signDte(invoice.xmlDte, '');

    // Submit to SII
    const result = await this.siiService.submitToSii(
      signedXml,
      invoice.emisorRut,
    );

    invoice.siiTrackId = result.trackId;
    invoice.siiStatus = 'enviado';
    invoice.status = 'sent_to_sii';

    return this.invoiceRepo.save(invoice) as Promise<Invoice>;
  }

  /**
   * Check the status of an invoice submission to SII.
   */
  async checkSiiStatus(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.findOne(tenantId, id);

    if (!invoice.siiTrackId) {
      throw new BadRequestException(
        'El documento no ha sido enviado al SII',
      );
    }

    const result = await this.siiService.checkStatus(
      invoice.siiTrackId,
      invoice.emisorRut,
    );

    invoice.siiStatus = result.status;
    invoice.siiResponse = {
      status: result.status,
      detail: result.detail,
      glosa: result.glosa,
      checkedAt: new Date().toISOString(),
    };

    // Update invoice status based on SII response
    if (result.status === 'DOK' || result.status === 'SOK') {
      invoice.status = 'accepted';
    } else if (result.status === 'RCH' || result.status === 'RFR') {
      invoice.status = 'rejected';
    }

    return this.invoiceRepo.save(invoice) as Promise<Invoice>;
  }

  /**
   * Get the next available folio for a given DTE type from the CAF table.
   * Atomically increments the current_folio and marks as exhausted if needed.
   */
  async getNextFolio(tenantId: string, dteType: number): Promise<number> {
    const caf = await this.cafRepo.findOne({
      where: {
        tenantId,
        dteType,
        isActive: true,
        isExhausted: false,
      },
      order: { folioFrom: 'ASC' },
    });

    if (!caf) {
      throw new BadRequestException(
        `No hay folios CAF disponibles para ${this.getDteTypeName(dteType)} (tipo ${dteType}). ` +
          'Suba un archivo CAF desde el SII.',
      );
    }

    const folio = caf.currentFolio;

    // Check if this is the last folio
    if (caf.currentFolio >= caf.folioTo) {
      caf.isExhausted = true;
      caf.isActive = false;
    } else {
      caf.currentFolio = caf.currentFolio + 1;
    }

    await this.cafRepo.save(caf);

    return folio;
  }

  /**
   * Upload a new CAF (Código de Autorización de Folios) from SII.
   * Parses the XML to extract folio range and private key.
   */
  async uploadCaf(
    tenantId: string,
    dto: UploadCafDto,
  ): Promise<CafFolio> {
    const cafXml = dto.cafXml;

    // Parse folio range from CAF XML
    const folioFromMatch = cafXml.match(/<D>(\d+)<\/D>/);
    const folioToMatch = cafXml.match(/<H>(\d+)<\/H>/);
    const privateKeyMatch = cafXml.match(
      /<RSASK>([\s\S]*?)<\/RSASK>/,
    );
    const expirationMatch = cafXml.match(/<FA>([\d-]+)<\/FA>/);

    if (!folioFromMatch || !folioToMatch) {
      throw new BadRequestException(
        'XML CAF inválido: no se pudo extraer el rango de folios (tags <D> y <H>)',
      );
    }

    const folioFrom = parseInt(folioFromMatch[1], 10);
    const folioTo = parseInt(folioToMatch[1], 10);

    if (folioFrom > folioTo) {
      throw new BadRequestException(
        `Rango de folios inválido: ${folioFrom} > ${folioTo}`,
      );
    }

    // Check for duplicate/overlapping CAF
    const existing = await this.cafRepo.findOne({
      where: {
        tenantId,
        dteType: dto.dteType,
        folioFrom,
        folioTo,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un CAF para tipo ${dto.dteType} con rango ${folioFrom}-${folioTo}`,
      );
    }

    const caf = this.cafRepo.create({
      tenantId,
      dteType: dto.dteType,
      folioFrom,
      folioTo,
      currentFolio: folioFrom,
      cafXml,
      privateKey: privateKeyMatch ? privateKeyMatch[1].trim() : undefined,
      expirationDate: expirationMatch ? expirationMatch[1] : undefined,
      isActive: true,
      isExhausted: false,
    });

    return this.cafRepo.save(caf) as Promise<CafFolio>;
  }

  /**
   * Get status of all active CAFs for the tenant.
   */
  async getCafStatus(
    tenantId: string,
  ): Promise<
    Array<{
      id: string;
      dteType: number;
      dteTypeName: string;
      folioFrom: number;
      folioTo: number;
      currentFolio: number;
      remaining: number;
      total: number;
      percentUsed: number;
      isExhausted: boolean;
      expirationDate: string;
    }>
  > {
    const cafs = await this.cafRepo.find({
      where: { tenantId, isActive: true },
      order: { dteType: 'ASC', folioFrom: 'ASC' },
    });

    return cafs.map((caf) => {
      const total = caf.folioTo - caf.folioFrom + 1;
      const used = caf.currentFolio - caf.folioFrom;
      const remaining = caf.isExhausted ? 0 : total - used;

      return {
        id: caf.id,
        dteType: caf.dteType,
        dteTypeName: this.getDteTypeName(caf.dteType),
        folioFrom: caf.folioFrom,
        folioTo: caf.folioTo,
        currentFolio: caf.currentFolio,
        remaining,
        total,
        percentUsed: Math.round((used / total) * 100),
        isExhausted: caf.isExhausted,
        expirationDate: caf.expirationDate,
      };
    });
  }

  /**
   * Get aggregated monthly totals by DTE type.
   */
  async getMonthlyTotals(
    tenantId: string,
    year: number,
    month: number,
  ): Promise<
    Array<{
      dteType: number;
      dteTypeName: string;
      count: number;
      montoNeto: number;
      iva: number;
      montoExento: number;
      montoTotal: number;
    }>
  > {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const results = await this.invoiceRepo
      .createQueryBuilder('inv')
      .select('inv.dteType', 'dteType')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect('COALESCE(SUM(inv.montoNeto), 0)::numeric', 'montoNeto')
      .addSelect('COALESCE(SUM(inv.iva), 0)::numeric', 'iva')
      .addSelect('COALESCE(SUM(inv.montoExento), 0)::numeric', 'montoExento')
      .addSelect('COALESCE(SUM(inv.montoTotal), 0)::numeric', 'montoTotal')
      .where('inv.tenantId = :tenantId', { tenantId })
      .andWhere('inv.issueDate >= :startDate', { startDate })
      .andWhere('inv.issueDate < :endDate', { endDate })
      .andWhere("inv.status NOT IN ('void', 'draft')")
      .groupBy('inv.dteType')
      .orderBy('inv.dteType', 'ASC')
      .getRawMany();

    return results.map((r) => ({
      dteType: r.dteType,
      dteTypeName: this.getDteTypeName(r.dteType),
      count: r.count,
      montoNeto: parseFloat(r.montoNeto),
      iva: parseFloat(r.iva),
      montoExento: parseFloat(r.montoExento),
      montoTotal: parseFloat(r.montoTotal),
    }));
  }

  /**
   * Get human-readable DTE type name in Spanish.
   */
  getDteTypeName(dteType: number): string {
    return this.siiService.getDteTypeName(dteType);
  }

  /**
   * Calculate due date based on payment condition.
   */
  private calculateDueDate(
    issueDate: string,
    paymentCondition: string,
  ): string {
    const date = new Date(issueDate);

    switch (paymentCondition) {
      case 'contado':
        // Due same day
        break;
      case '30dias':
        date.setDate(date.getDate() + 30);
        break;
      case '60dias':
        date.setDate(date.getDate() + 60);
        break;
      case '90dias':
        date.setDate(date.getDate() + 90);
        break;
    }

    return date.toISOString().split('T')[0];
  }
}

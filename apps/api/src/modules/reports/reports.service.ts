import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportRequest, ReportType } from '../../database/entities/report-request.entity';
import { DataExport } from '../../database/entities/data-export.entity';
import {
  RequestReportDto,
  ReportFiltersDto,
  MarkReportPaidDto,
  RequestExportDto,
} from './reports.dto';

// ── Pricing Configuration ──

const REPORT_PRICING: Record<
  string,
  { price: number; name: string; description: string; deliveryDays: number }
> = {
  GESTION: {
    price: 25000,
    name: 'Informe de Gestion',
    description:
      'Analisis general de operaciones, KPIs y tendencias del periodo',
    deliveryDays: 3,
  },
  RECLAMO_FALENCIA: {
    price: 45000,
    name: 'Informe por Reclamo/Falencia',
    description:
      'Investigacion detallada de reclamos de clientes con analisis de causa raiz y recomendaciones correctivas',
    deliveryDays: 5,
  },
  INCUMPLIMIENTO_MERCADO: {
    price: 65000,
    name: 'Informe de Incumplimiento de Mercado',
    description:
      'Auditoria de cumplimiento normativo y de mercado con benchmarking contra estandares de la industria',
    deliveryDays: 7,
  },
  CUSTOM: {
    price: 0,
    name: 'Informe Personalizado',
    description: 'Informe a medida segun requerimientos especificos',
    deliveryDays: 10,
  },
};

const AVAILABLE_EXPORT_MODULES = [
  'work-orders',
  'clients',
  'vehicles',
  'inventory',
  'invoices',
  'payments',
  'suppliers',
  'employees',
];

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(ReportRequest)
    private reportRepo: Repository<ReportRequest>,
    @InjectRepository(DataExport)
    private exportRepo: Repository<DataExport>,
  ) {}

  // =========================================================================
  // REPORT METHODS
  // =========================================================================

  /**
   * Returns the pricing configuration for all report types.
   */
  getReportPricing() {
    return Object.entries(REPORT_PRICING).map(([key, value]) => ({
      type: key,
      ...value,
    }));
  }

  /**
   * Creates a new report request with the correct price based on type.
   */
  async requestReport(
    tenantId: string,
    dto: RequestReportDto,
    userId: string,
  ): Promise<ReportRequest> {
    const pricing = REPORT_PRICING[dto.reportType];
    if (!pricing) {
      throw new BadRequestException(
        `Tipo de informe invalido: ${dto.reportType}`,
      );
    }

    // For CUSTOM, use the amount from the DTO; otherwise use pricing table
    let amount = pricing.price;
    if (dto.reportType === 'CUSTOM') {
      if (!dto.amount || dto.amount <= 0) {
        throw new BadRequestException(
          'Para informes personalizados se requiere especificar el monto',
        );
      }
      amount = dto.amount;
    }

    const report = this.reportRepo.create({
      tenantId,
      requestedBy: userId,
      reportType: dto.reportType as ReportType,
      title: dto.title,
      description: dto.description || undefined,
      scope: {
        module: dto.scope.module,
        dateFrom: dto.scope.dateFrom,
        dateTo: dto.scope.dateTo,
        filters: dto.scope.filters || {},
      },
      status: 'PENDING',
      amount,
      isPaid: false,
    });

    return this.reportRepo.save(report) as Promise<ReportRequest>;
  }

  /**
   * Lists reports for a tenant with pagination and optional filters.
   */
  async getReports(
    tenantId: string,
    filters: ReportFiltersDto,
  ): Promise<{ data: ReportRequest[]; total: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const qb = this.reportRepo
      .createQueryBuilder('report')
      .where('report.tenantId = :tenantId', { tenantId });

    if (filters.status) {
      qb.andWhere('report.status = :status', { status: filters.status });
    }

    if (filters.reportType) {
      qb.andWhere('report.reportType = :reportType', {
        reportType: filters.reportType,
      });
    }

    if (filters.dateFrom) {
      qb.andWhere('report.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      qb.andWhere('report.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    qb.orderBy('report.createdAt', 'DESC');
    qb.skip(offset).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Gets a single report by ID, scoped to tenant.
   */
  async getReportById(
    tenantId: string,
    id: string,
  ): Promise<ReportRequest> {
    const report = await this.reportRepo.findOne({
      where: { id, tenantId },
    });

    if (!report) {
      throw new NotFoundException('Informe no encontrado');
    }

    return report;
  }

  /**
   * Marks a report as paid and triggers processing.
   */
  async markAsPaid(
    tenantId: string,
    id: string,
    dto: MarkReportPaidDto,
  ): Promise<ReportRequest> {
    const report = await this.getReportById(tenantId, id);

    if (report.isPaid) {
      throw new BadRequestException('Este informe ya esta pagado');
    }

    if (report.status === 'CANCELLED') {
      throw new BadRequestException(
        'No se puede pagar un informe cancelado',
      );
    }

    report.isPaid = true;
    report.paidAt = new Date();
    report.paymentReference = dto.paymentReference;
    report.status = 'PROCESSING';

    const savedReport = await this.reportRepo.save(report) as ReportRequest;

    // Trigger async report processing
    this.processReport(savedReport.id).catch((err) => {
      console.error(
        `Error procesando informe ${savedReport.id}:`,
        err.message,
      );
    });

    return savedReport;
  }

  /**
   * Cancels an unpaid report.
   */
  async cancelReport(
    tenantId: string,
    id: string,
  ): Promise<ReportRequest> {
    const report = await this.getReportById(tenantId, id);

    if (report.isPaid) {
      throw new BadRequestException(
        'No se puede cancelar un informe ya pagado. Contacte soporte para reembolsos.',
      );
    }

    if (report.status === 'CANCELLED') {
      throw new BadRequestException('Este informe ya esta cancelado');
    }

    report.status = 'CANCELLED';
    return this.reportRepo.save(report) as Promise<ReportRequest>;
  }

  /**
   * Processes a report: generates AI analysis content.
   * In production this would call the Claude API with the tenant's data.
   * For now, generates a structured analysis template.
   */
  async processReport(reportId: string): Promise<ReportRequest> {
    const report = await this.reportRepo.findOne({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Informe no encontrado para procesar');
    }

    try {
      report.status = 'PROCESSING';
      await this.reportRepo.save(report);

      // Generate AI analysis based on report type
      const analysis = this.generateAnalysisTemplate(report);

      // Set 30-day expiry for the download link
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      report.aiAnalysis = analysis;
      report.status = 'COMPLETED';
      report.generatedAt = new Date();
      report.expiresAt = expiresAt;
      report.reportUrl = `/reports/${report.id}/download`;

      return this.reportRepo.save(report) as Promise<ReportRequest>;
    } catch (error) {
      report.status = 'FAILED';
      await this.reportRepo.save(report);
      throw error;
    }
  }

  /**
   * Generates a structured analysis template based on report type.
   * This is a stub — in production, this would use Claude API with actual data.
   */
  private generateAnalysisTemplate(report: ReportRequest): string {
    const { reportType, scope, title } = report;
    const period = `${scope.dateFrom} al ${scope.dateTo}`;
    const module = scope.module;

    switch (reportType) {
      case 'GESTION':
        return [
          `# INFORME DE GESTION`,
          `## ${title}`,
          `**Periodo:** ${period}`,
          `**Modulo:** ${module}`,
          `**Fecha de generacion:** ${new Date().toISOString().split('T')[0]}`,
          ``,
          `---`,
          ``,
          `## 1. Resumen Ejecutivo`,
          `Este informe presenta un analisis integral de las operaciones del taller durante el periodo indicado. Se evaluaron los principales KPIs operativos, financieros y de satisfaccion del cliente.`,
          ``,
          `## 2. KPIs del Periodo`,
          `| Indicador | Valor | Meta | Estado |`,
          `|-----------|-------|------|--------|`,
          `| Ordenes completadas | — | — | Pendiente datos |`,
          `| Tiempo promedio de entrega | — | — | Pendiente datos |`,
          `| Tasa de retrabajos | — | — | Pendiente datos |`,
          `| Ingreso total del periodo | — | — | Pendiente datos |`,
          `| Margen operacional | — | — | Pendiente datos |`,
          ``,
          `## 3. Analisis de Tendencias`,
          `[Analisis de tendencias del periodo basado en datos historicos del taller]`,
          ``,
          `## 4. Oportunidades de Mejora`,
          `- Optimizacion de tiempos de entrega`,
          `- Reduccion de costos de repuestos`,
          `- Mejora en la comunicacion con el cliente`,
          ``,
          `## 5. Recomendaciones`,
          `[Recomendaciones estrategicas basadas en el analisis de datos]`,
          ``,
          `---`,
          `*Informe generado por TORQUE 360 AI Analytics*`,
        ].join('\n');

      case 'RECLAMO_FALENCIA':
        return [
          `# INFORME POR RECLAMO / FALENCIA`,
          `## ${title}`,
          `**Periodo:** ${period}`,
          `**Modulo:** ${module}`,
          `**Fecha de generacion:** ${new Date().toISOString().split('T')[0]}`,
          ``,
          `---`,
          ``,
          `## 1. Descripcion del Reclamo`,
          `[Detalle del reclamo o falencia reportada]`,
          ``,
          `## 2. Analisis de Causa Raiz`,
          `### 2.1 Diagrama de Ishikawa`,
          `- **Mano de obra:** [Factores humanos identificados]`,
          `- **Metodos:** [Procedimientos involucrados]`,
          `- **Maquinaria:** [Equipos o herramientas relacionadas]`,
          `- **Materiales:** [Repuestos o insumos involucrados]`,
          `- **Medio ambiente:** [Condiciones del entorno]`,
          `- **Medicion:** [Sistemas de control afectados]`,
          ``,
          `### 2.2 Analisis de los 5 Por Que`,
          `1. Por que ocurrio? — [Causa inmediata]`,
          `2. Por que? — [Causa subyacente]`,
          `3. Por que? — [Causa mas profunda]`,
          `4. Por que? — [Causa sistemica]`,
          `5. Por que? — [Causa raiz]`,
          ``,
          `## 3. Impacto`,
          `| Dimension | Impacto | Severidad |`,
          `|-----------|---------|-----------|`,
          `| Financiero | — | — |`,
          `| Reputacional | — | — |`,
          `| Operacional | — | — |`,
          `| Legal | — | — |`,
          ``,
          `## 4. Plan de Accion Correctivo`,
          `| # | Accion | Responsable | Plazo | Estado |`,
          `|---|--------|-------------|-------|--------|`,
          `| 1 | [Accion correctiva inmediata] | — | — | Pendiente |`,
          `| 2 | [Accion preventiva] | — | — | Pendiente |`,
          `| 3 | [Mejora de proceso] | — | — | Pendiente |`,
          ``,
          `## 5. Seguimiento`,
          `[Plan de seguimiento y verificacion de la efectividad de las acciones]`,
          ``,
          `---`,
          `*Informe generado por TORQUE 360 AI Analytics*`,
        ].join('\n');

      case 'INCUMPLIMIENTO_MERCADO':
        return [
          `# INFORME DE INCUMPLIMIENTO DE MERCADO`,
          `## ${title}`,
          `**Periodo:** ${period}`,
          `**Modulo:** ${module}`,
          `**Fecha de generacion:** ${new Date().toISOString().split('T')[0]}`,
          ``,
          `---`,
          ``,
          `## 1. Resumen de Cumplimiento`,
          `Este informe evalua el nivel de cumplimiento normativo y de estandares de mercado del taller durante el periodo indicado.`,
          ``,
          `## 2. Marco Normativo Aplicable`,
          `| Normativa | Ambito | Estado |`,
          `|-----------|--------|--------|`,
          `| Ley del Consumidor (19.496) | Derechos del consumidor | — |`,
          `| Normativa SEC | Seguridad electrica | — |`,
          `| Normas ambientales (residuos) | Medio ambiente | — |`,
          `| Legislacion laboral | RRHH | — |`,
          `| Normativa tributaria SII | Facturacion | — |`,
          ``,
          `## 3. Benchmarking Industria`,
          `| Indicador | Taller | Promedio Industria | Top 25% |`,
          `|-----------|--------|--------------------|---------|`,
          `| Tasa de reclamos | — | — | — |`,
          `| Cumplimiento plazos | — | — | — |`,
          `| Garantias honradas | — | — | — |`,
          `| Certificaciones vigentes | — | — | — |`,
          ``,
          `## 4. Brechas Identificadas`,
          `| # | Brecha | Riesgo | Prioridad |`,
          `|---|--------|--------|-----------|`,
          `| 1 | [Brecha normativa identificada] | — | Alta |`,
          `| 2 | [Brecha de mercado identificada] | — | Media |`,
          ``,
          `## 5. Plan de Remediacion`,
          `| Brecha | Accion | Inversion Est. | Plazo |`,
          `|--------|--------|----------------|-------|`,
          `| [Brecha 1] | [Accion correctiva] | — | — |`,
          `| [Brecha 2] | [Accion correctiva] | — | — |`,
          ``,
          `## 6. Riesgo Legal`,
          `[Evaluacion del riesgo legal asociado a los incumplimientos identificados]`,
          ``,
          `---`,
          `*Informe generado por TORQUE 360 AI Analytics*`,
        ].join('\n');

      case 'CUSTOM':
      default:
        return [
          `# INFORME PERSONALIZADO`,
          `## ${title}`,
          `**Periodo:** ${period}`,
          `**Modulo:** ${module}`,
          `**Fecha de generacion:** ${new Date().toISOString().split('T')[0]}`,
          ``,
          `---`,
          ``,
          `## 1. Alcance`,
          `${report.description || 'Informe personalizado segun requerimientos del cliente.'}`,
          ``,
          `## 2. Analisis`,
          `[Analisis personalizado basado en los datos del periodo y modulo seleccionado]`,
          ``,
          `## 3. Hallazgos`,
          `[Principales hallazgos del analisis]`,
          ``,
          `## 4. Recomendaciones`,
          `[Recomendaciones basadas en los hallazgos]`,
          ``,
          `## 5. Conclusion`,
          `[Conclusion y proximos pasos recomendados]`,
          ``,
          `---`,
          `*Informe generado por TORQUE 360 AI Analytics*`,
        ].join('\n');
    }
  }

  // =========================================================================
  // DATA EXPORT METHODS
  // =========================================================================

  /**
   * Creates a free data export request.
   */
  async requestExport(
    tenantId: string,
    dto: RequestExportDto,
    userId: string,
  ): Promise<DataExport> {
    if (!AVAILABLE_EXPORT_MODULES.includes(dto.module)) {
      throw new BadRequestException(
        `Modulo de exportacion invalido: ${dto.module}. Modulos disponibles: ${AVAILABLE_EXPORT_MODULES.join(', ')}`,
      );
    }

    const dataExport = this.exportRepo.create({
      tenantId,
      requestedBy: userId,
      exportType: dto.exportType as DataExport['exportType'],
      module: dto.module,
      filters: dto.filters || undefined,
      status: 'PENDING',
    });

    const savedExport = await this.exportRepo.save(dataExport) as DataExport;

    // Trigger async export processing
    this.processExport(savedExport.id).catch((err) => {
      console.error(
        `Error procesando exportacion ${savedExport.id}:`,
        err.message,
      );
    });

    return savedExport;
  }

  /**
   * Lists exports for a tenant/user.
   */
  async getExports(
    tenantId: string,
    userId: string,
  ): Promise<DataExport[]> {
    return this.exportRepo.find({
      where: { tenantId, requestedBy: userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /**
   * Processes a data export: generates file metadata.
   * In production this would query the DB, generate CSV/Excel/PDF, and upload to storage.
   */
  async processExport(exportId: string): Promise<DataExport> {
    const dataExport = await this.exportRepo.findOne({
      where: { id: exportId },
    });

    if (!dataExport) {
      throw new NotFoundException('Exportacion no encontrada');
    }

    try {
      dataExport.status = 'PROCESSING';
      await this.exportRepo.save(dataExport);

      // Set 24h expiry for free exports
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Stub: in production, this would generate actual files
      const extensionMap: Record<string, string> = {
        CSV: 'csv',
        EXCEL: 'xlsx',
        PDF: 'pdf',
      };
      const ext = extensionMap[dataExport.exportType] || 'csv';
      const filename = `${dataExport.module}_${dataExport.tenantId}_${Date.now()}.${ext}`;

      dataExport.status = 'COMPLETED';
      dataExport.fileUrl = `/exports/${filename}`;
      dataExport.fileSizeBytes = 0; // Stub — would be actual file size
      dataExport.rowCount = 0; // Stub — would be actual row count
      dataExport.expiresAt = expiresAt;

      return this.exportRepo.save(dataExport) as Promise<DataExport>;
    } catch (error) {
      dataExport.status = 'FAILED';
      await this.exportRepo.save(dataExport);
      throw error;
    }
  }

  /**
   * Returns the download URL for an export if not expired.
   */
  async getExportDownloadUrl(
    tenantId: string,
    id: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    const dataExport = await this.exportRepo.findOne({
      where: { id, tenantId },
    });

    if (!dataExport) {
      throw new NotFoundException('Exportacion no encontrada');
    }

    if (dataExport.status !== 'COMPLETED') {
      throw new BadRequestException(
        'La exportacion aun no esta lista para descargar',
      );
    }

    if (dataExport.expiresAt && new Date() > dataExport.expiresAt) {
      throw new BadRequestException(
        'El enlace de descarga ha expirado. Solicite una nueva exportacion.',
      );
    }

    return {
      url: dataExport.fileUrl,
      expiresAt: dataExport.expiresAt,
    };
  }
}

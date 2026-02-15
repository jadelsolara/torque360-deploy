import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../database/entities/invoice.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { Quotation } from '../../database/entities/quotation.entity';
import { InventoryItem } from '../../database/entities/inventory-item.entity';
import { StockMovement } from '../../database/entities/stock-movement.entity';
import { Employee } from '../../database/entities/employee.entity';
import { Payroll } from '../../database/entities/payroll.entity';
import { PayrollDetail } from '../../database/entities/payroll-detail.entity';
import { Client } from '../../database/entities/client.entity';
import { Supplier } from '../../database/entities/supplier.entity';
import { SupplierInvoice } from '../../database/entities/supplier-invoice.entity';
import { SupplierPayment } from '../../database/entities/supplier-payment.entity';
import { ImportOrder } from '../../database/entities/import-order.entity';
import { Attendance } from '../../database/entities/attendance.entity';
import { ExchangeRate } from '../../database/entities/exchange-rate.entity';

// ── Type definitions ───────────────────────────────────────────────────

interface TrabajosPorTecnico {
  tecnico: string;
  activas: number;
  completadas: number;
}

interface TopProducto {
  nombre: string;
  stock: number;
  valor: number;
}

interface DepartamentoInfo {
  depto: string;
  cantidad: number;
  costo: number;
}

interface TopCliente {
  nombre: string;
  facturado: number;
  pendiente: number;
}

interface TopProveedor {
  nombre: string;
  compras: number;
  pendiente: number;
}

export interface Alerta {
  type: 'URGENTE' | 'ADVERTENCIA' | 'INFO';
  message: string;
  module: string;
  link: string;
}

interface FinancieroOverview {
  ingresosMes: number;
  ingresosAnoAcumulado: number;
  gastosMes: number;
  gastosAnoAcumulado: number;
  margenBruto: number;
  margenPorcentaje: number;
  cuentasPorCobrar: number;
  cuentasPorCobrarVencidas: number;
  cuentasPorPagar: number;
  cuentasPorPagarVencidas: number;
  flujoNetoMes: number;
  ivaDebito: number;
  ivaCredito: number;
  ivaAPagar: number;
}

interface OperacionesOverview {
  ordenesAbiertas: number;
  ordenesCompletadasMes: number;
  ordenesVencidas: number;
  promedioDiasCierre: number;
  cotizacionesPendientes: number;
  tasaConversion: number;
  vehiculosEnTaller: number;
  trabajosPorTecnico: TrabajosPorTecnico[];
}

interface InventarioOverview {
  valorTotalStock: number;
  itemsBajoMinimo: number;
  itemsSinMovimiento30d: number;
  rotacionPromedio: number;
  importacionesEnTransito: number;
  valorImportacionesEnTransito: number;
  topProductos: TopProducto[];
}

interface PersonasOverview {
  totalEmpleados: number;
  empleadosActivos: number;
  costoNominaMes: number;
  costoEmpresaMes: number;
  porDepartamento: DepartamentoInfo[];
  contratosVencenProximo: number;
  licenciasMedicas: number;
}

interface ClientesOverview {
  totalClientes: number;
  clientesNuevosMes: number;
  clientesActivos30d: number;
  topClientes: TopCliente[];
  satisfaccion: number;
}

interface ProveedoresOverview {
  totalProveedores: number;
  proveedoresActivos: number;
  comprasMes: number;
  topProveedores: TopProveedor[];
}

interface KpisOverview {
  ticketPromedio: number;
  productividadTecnicos: number;
  diasPromedioCobro: number;
  diasPromedioPago: number;
  eficienciaTaller: number;
  margenOperacional: number;
}

interface PeriodoOverview {
  mes: string;
  ano: number;
  generadoAt: Date;
}

export interface Company360Overview {
  financiero: FinancieroOverview;
  operaciones: OperacionesOverview;
  inventario: InventarioOverview;
  personas: PersonasOverview;
  clientes: ClientesOverview;
  proveedores: ProveedoresOverview;
  kpis: KpisOverview;
  alertas: Alerta[];
  periodo: PeriodoOverview;
}

export interface MonthlyFinancial {
  month: number;
  ingresos: number;
  gastos: number;
  margen: number;
  cobros: number;
  pagos: number;
}

export interface TrendPoint {
  month: string;
  ingresos: number;
  margen: number;
  ordenes: number;
  valorInventario: number;
}

// ── Helper: safe number from raw query ────────────────────────────────

function safeNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function safeInt(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 0 : n;
}

// ── Service ───────────────────────────────────────────────────────────

@Injectable()
export class Company360Service {
  constructor(
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(WorkOrder) private woRepo: Repository<WorkOrder>,
    @InjectRepository(Quotation) private quoteRepo: Repository<Quotation>,
    @InjectRepository(InventoryItem) private invItemRepo: Repository<InventoryItem>,
    @InjectRepository(StockMovement) private stockMoveRepo: Repository<StockMovement>,
    @InjectRepository(Employee) private employeeRepo: Repository<Employee>,
    @InjectRepository(Payroll) private payrollRepo: Repository<Payroll>,
    @InjectRepository(PayrollDetail) private payrollDetailRepo: Repository<PayrollDetail>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(Supplier) private supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierInvoice) private supplierInvRepo: Repository<SupplierInvoice>,
    @InjectRepository(SupplierPayment) private supplierPayRepo: Repository<SupplierPayment>,
    @InjectRepository(ImportOrder) private importRepo: Repository<ImportOrder>,
    @InjectRepository(Attendance) private attendanceRepo: Repository<Attendance>,
    @InjectRepository(ExchangeRate) private exchangeRateRepo: Repository<ExchangeRate>,
  ) {}

  // ====================================================================
  // MAIN: getCompany360 — Full 360-degree overview
  // ====================================================================

  async getCompany360(tenantId: string): Promise<Company360Overview> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const startOfYear = `${currentYear}-01-01`;
    const today = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fifteenDaysFromNow = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentPeriod = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    const [
      financiero,
      operaciones,
      inventario,
      personas,
      clientes,
      proveedores,
      kpis,
    ] = await Promise.all([
      this.buildFinanciero(tenantId, startOfMonth, startOfYear, today),
      this.buildOperaciones(tenantId, startOfMonth, today),
      this.buildInventario(tenantId, thirtyDaysAgo),
      this.buildPersonas(tenantId, currentPeriod, fifteenDaysFromNow),
      this.buildClientes(tenantId, startOfMonth, thirtyDaysAgo),
      this.buildProveedores(tenantId, startOfMonth),
      this.buildKpis(tenantId, startOfMonth, startOfYear, today),
    ]);

    const alertas = this.generateAlertas(
      financiero, operaciones, inventario, personas, proveedores,
    );

    return {
      financiero,
      operaciones,
      inventario,
      personas,
      clientes,
      proveedores,
      kpis,
      alertas,
      periodo: {
        mes: now.toLocaleString('es-CL', { month: 'long' }),
        ano: currentYear,
        generadoAt: now,
      },
    };
  }

  // ====================================================================
  // FINANCIERO
  // ====================================================================

  private async buildFinanciero(
    tenantId: string,
    startOfMonth: string,
    startOfYear: string,
    today: string,
  ): Promise<FinancieroOverview> {
    // Sales invoices (DTE types 33, 34, 39 — facturas and boletas)
    const salesDteTypes = [33, 34, 39];
    const activeStatuses = ['issued', 'sent_to_sii', 'accepted'];

    // Revenue this month
    const ingresosMesRaw = await this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.monto_neto), 0)', 'neto')
      .addSelect('COALESCE(SUM(i.iva), 0)', 'iva')
      .addSelect('COALESCE(SUM(i.monto_total), 0)', 'total')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.dte_type IN (:...dteTypes)', { dteTypes: salesDteTypes })
      .andWhere('i.status IN (:...statuses)', { statuses: activeStatuses })
      .andWhere('i.issue_date >= :startOfMonth', { startOfMonth })
      .getRawOne();

    // Revenue year-to-date
    const ingresosYtdRaw = await this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.monto_total), 0)', 'total')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.dte_type IN (:...dteTypes)', { dteTypes: salesDteTypes })
      .andWhere('i.status IN (:...statuses)', { statuses: activeStatuses })
      .andWhere('i.issue_date >= :startOfYear', { startOfYear })
      .getRawOne();

    // Expenses this month (supplier invoices)
    const gastosMesRaw = await this.supplierInvRepo
      .createQueryBuilder('si')
      .select('COALESCE(SUM(si.monto_neto), 0)', 'neto')
      .addSelect('COALESCE(SUM(si.iva), 0)', 'iva')
      .addSelect('COALESCE(SUM(si.monto_total), 0)', 'total')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.invoice_type = :tipo', { tipo: 'FACTURA_COMPRA' })
      .andWhere('si.status NOT IN (:...excl)', { excl: ['VOIDED'] })
      .andWhere('si.issue_date >= :startOfMonth', { startOfMonth })
      .getRawOne();

    // Expenses year-to-date
    const gastosYtdRaw = await this.supplierInvRepo
      .createQueryBuilder('si')
      .select('COALESCE(SUM(si.monto_total), 0)', 'total')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.invoice_type = :tipo', { tipo: 'FACTURA_COMPRA' })
      .andWhere('si.status NOT IN (:...excl)', { excl: ['VOIDED'] })
      .andWhere('si.issue_date >= :startOfYear', { startOfYear })
      .getRawOne();

    // Accounts receivable (unpaid client invoices)
    const cxcRaw = await this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.monto_total - i.paid_amount), 0)', 'pendiente')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.dte_type IN (:...dteTypes)', { dteTypes: salesDteTypes })
      .andWhere('i.status IN (:...statuses)', { statuses: activeStatuses })
      .andWhere('i.is_paid = false')
      .getRawOne();

    // Accounts receivable overdue
    const cxcVencidasRaw = await this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.monto_total - i.paid_amount), 0)', 'pendiente')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.dte_type IN (:...dteTypes)', { dteTypes: salesDteTypes })
      .andWhere('i.status IN (:...statuses)', { statuses: activeStatuses })
      .andWhere('i.is_paid = false')
      .andWhere('i.due_date < :today', { today })
      .getRawOne();

    // Accounts payable (pending supplier invoices)
    const cxpRaw = await this.supplierInvRepo
      .createQueryBuilder('si')
      .select('COALESCE(SUM(si.pending_amount), 0)', 'pendiente')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.status NOT IN (:...excl)', { excl: ['PAID', 'VOIDED'] })
      .getRawOne();

    // Accounts payable overdue
    const cxpVencidasRaw = await this.supplierInvRepo
      .createQueryBuilder('si')
      .select('COALESCE(SUM(si.pending_amount), 0)', 'pendiente')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.status NOT IN (:...excl)', { excl: ['PAID', 'VOIDED'] })
      .andWhere('si.due_date < :today', { today })
      .getRawOne();

    // Cash flow: collections this month (paid_at in this month)
    const cobrosRaw = await this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.paid_amount), 0)', 'cobrado')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.paid_at >= :startOfMonth', { startOfMonth })
      .getRawOne();

    // Cash flow: payments this month
    const pagosRaw = await this.supplierPayRepo
      .createQueryBuilder('sp')
      .select('COALESCE(SUM(sp.amount), 0)', 'pagado')
      .where('sp.tenant_id = :tenantId', { tenantId })
      .andWhere('sp.status = :status', { status: 'CONFIRMED' })
      .andWhere('sp.payment_date >= :startOfMonth', { startOfMonth })
      .getRawOne();

    const ingresosMes = safeNum(ingresosMesRaw?.total);
    const gastosMes = safeNum(gastosMesRaw?.total);
    const margenBruto = ingresosMes - gastosMes;
    const margenPorcentaje = ingresosMes > 0 ? Math.round((margenBruto / ingresosMes) * 10000) / 100 : 0;
    const ivaDebito = safeNum(ingresosMesRaw?.iva);
    const ivaCredito = safeNum(gastosMesRaw?.iva);
    const cobros = safeNum(cobrosRaw?.cobrado);
    const pagos = safeNum(pagosRaw?.pagado);

    return {
      ingresosMes,
      ingresosAnoAcumulado: safeNum(ingresosYtdRaw?.total),
      gastosMes,
      gastosAnoAcumulado: safeNum(gastosYtdRaw?.total),
      margenBruto,
      margenPorcentaje,
      cuentasPorCobrar: safeNum(cxcRaw?.pendiente),
      cuentasPorCobrarVencidas: safeNum(cxcVencidasRaw?.pendiente),
      cuentasPorPagar: safeNum(cxpRaw?.pendiente),
      cuentasPorPagarVencidas: safeNum(cxpVencidasRaw?.pendiente),
      flujoNetoMes: cobros - pagos,
      ivaDebito,
      ivaCredito,
      ivaAPagar: ivaDebito - ivaCredito,
    };
  }

  // ====================================================================
  // OPERACIONES
  // ====================================================================

  private async buildOperaciones(
    tenantId: string,
    startOfMonth: string,
    today: string,
  ): Promise<OperacionesOverview> {
    const openStatuses = ['pending', 'in_progress'];

    // Open orders
    const ordenesAbiertas = await this.woRepo.count({
      where: [
        { tenantId, status: 'pending' },
        { tenantId, status: 'in_progress' },
      ],
    });

    // Completed this month
    const ordenesCompletadasMes = await this.woRepo
      .createQueryBuilder('wo')
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.status = :status', { status: 'completed' })
      .andWhere('wo.completed_at >= :startOfMonth', { startOfMonth })
      .getCount();

    // Overdue orders - due_date column not in work_orders table, always 0
    const ordenesVencidas = 0;








    // Average days to close (completed this month)
    const avgDaysRaw = await this.woRepo
      .createQueryBuilder('wo')
      .select(
        "COALESCE(AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at)) / 86400), 0)",
        'avgDias',
      )
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.status = :status', { status: 'completed' })
      .andWhere('wo.completed_at >= :startOfMonth', { startOfMonth })
      .andWhere('wo.completed_at IS NOT NULL')
      .getRawOne();

    // Pending quotations
    const cotizacionesPendientes = await this.quoteRepo.count({
      where: [
        { tenantId, status: 'draft' },
        { tenantId, status: 'sent' },
      ],
    });

    // Conversion rate: quotations converted to work orders
    const totalCotizacionesRaw = await this.quoteRepo
      .createQueryBuilder('q')
      .select('COUNT(*)', 'total')
      .addSelect(
        "COUNT(*) FILTER (WHERE q.status IN ('approved','converted'))",
        'convertidas',
      )
      .where('q.tenant_id = :tenantId', { tenantId })
      .andWhere('q.created_at >= :startOfMonth', { startOfMonth })
      .getRawOne();

    const totalCotizaciones = safeInt(totalCotizacionesRaw?.total);
    const convertidas = safeInt(totalCotizacionesRaw?.convertidas);
    const tasaConversion = totalCotizaciones > 0
      ? Math.round((convertidas / totalCotizaciones) * 10000) / 100
      : 0;

    // Vehicles currently in workshop (distinct vehicles from open orders)
    const vehiculosEnTallerRaw = await this.woRepo
      .createQueryBuilder('wo')
      .select('COUNT(DISTINCT wo.vehicle_id)', 'count')
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.status IN (:...statuses)', { statuses: openStatuses })
      .getRawOne();

    // Work per technician
    const trabajosRaw = await this.woRepo
      .createQueryBuilder('wo')
      .select('wo.assigned_to', 'tecnico')
      .addSelect(
        "COUNT(*) FILTER (WHERE wo.status IN ('pending','in_progress'))",
        'activas',
      )
      .addSelect(
        "COUNT(*) FILTER (WHERE wo.status = 'completed' AND wo.completed_at >= :startOfMonth)",
        'completadas',
      )
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.assigned_to IS NOT NULL')
      .groupBy('wo.assigned_to')
      .setParameter('startOfMonth', startOfMonth)
      .getRawMany();

    const trabajosPorTecnico: TrabajosPorTecnico[] = (trabajosRaw || []).map((r) => ({
      tecnico: r.tecnico || 'Sin asignar',
      activas: safeInt(r.activas),
      completadas: safeInt(r.completadas),
    }));

    return {
      ordenesAbiertas,
      ordenesCompletadasMes,
      ordenesVencidas,
      promedioDiasCierre: Math.round(safeNum(avgDaysRaw?.avgDias) * 10) / 10,
      cotizacionesPendientes,
      tasaConversion,
      vehiculosEnTaller: safeInt(vehiculosEnTallerRaw?.count),
      trabajosPorTecnico,
    };
  }

  // ====================================================================
  // INVENTARIO
  // ====================================================================

  private async buildInventario(
    tenantId: string,
    thirtyDaysAgo: string,
  ): Promise<InventarioOverview> {
    // Total stock value
    const valorRaw = await this.invItemRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.cost_price * i.stock_quantity), 0)', 'valor')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.is_active = true')
      .getRawOne();

    // Items below minimum stock
    const itemsBajoMinimo = await this.invItemRepo
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.is_active = true')
      .andWhere('i.stock_quantity <= i.min_stock')
      .andWhere('i.min_stock > 0')
      .getCount();

    // Items without movement in 30 days
    const itemsConMovimiento = await this.stockMoveRepo
      .createQueryBuilder('sm')
      .select('DISTINCT sm.item_id')
      .where('sm.tenant_id = :tenantId', { tenantId })
      .andWhere('sm.created_at >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getRawMany();
    const idsConMovimiento = (itemsConMovimiento || []).map((r) => r.item_id);

    let itemsSinMovimiento30d = 0;
    if (idsConMovimiento.length > 0) {
      itemsSinMovimiento30d = await this.invItemRepo
        .createQueryBuilder('i')
        .where('i.tenant_id = :tenantId', { tenantId })
        .andWhere('i.is_active = true')
        .andWhere('i.stock_quantity > 0')
        .andWhere('i.id NOT IN (:...ids)', { ids: idsConMovimiento })
        .getCount();
    } else {
      // If no movements at all, all items with stock are stale
      itemsSinMovimiento30d = await this.invItemRepo
        .createQueryBuilder('i')
        .where('i.tenant_id = :tenantId', { tenantId })
        .andWhere('i.is_active = true')
        .andWhere('i.stock_quantity > 0')
        .getCount();
    }

    // Average turnover: total movements last 30d / total active items
    const movCountRaw = await this.stockMoveRepo
      .createQueryBuilder('sm')
      .select('COUNT(*)', 'total')
      .where('sm.tenant_id = :tenantId', { tenantId })
      .andWhere('sm.created_at >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getRawOne();
    const totalActiveItems = await this.invItemRepo.count({
      where: { tenantId, isActive: true },
    });
    const rotacionPromedio = totalActiveItems > 0
      ? Math.round((safeInt(movCountRaw?.total) / totalActiveItems) * 100) / 100
      : 0;

    // Import orders in transit
    const transitStatuses = ['shipped', 'in_transit', 'at_port', 'customs'];
    const importTransitRaw = await this.importRepo
      .createQueryBuilder('io')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(io.cif_total), 0)', 'valor')
      .where('io.tenant_id = :tenantId', { tenantId })
      .andWhere('io.status IN (:...statuses)', { statuses: transitStatuses })
      .getRawOne();

    // Top 5 products by stock value
    const topProductosRaw = await this.invItemRepo
      .createQueryBuilder('i')
      .select('i.name', 'nombre')
      .addSelect('i.stock_quantity', 'stock')
      .addSelect('(i.cost_price * i.stock_quantity)', 'valor')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.is_active = true')
      .andWhere('(i.cost_price * i.stock_quantity) > 0')
      .orderBy('(i.cost_price * i.stock_quantity)', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      valorTotalStock: safeNum(valorRaw?.valor),
      itemsBajoMinimo,
      itemsSinMovimiento30d,
      rotacionPromedio,
      importacionesEnTransito: safeInt(importTransitRaw?.count),
      valorImportacionesEnTransito: safeNum(importTransitRaw?.valor),
      topProductos: (topProductosRaw || []).map((r) => ({
        nombre: r.nombre || '',
        stock: safeNum(r.stock),
        valor: safeNum(r.valor),
      })),
    };
  }

  // ====================================================================
  // PERSONAS (RRHH)
  // ====================================================================

  private async buildPersonas(
    tenantId: string,
    currentPeriod: string,
    fifteenDaysFromNow: string,
  ): Promise<PersonasOverview> {
    // Total and active employees
    const totalEmpleados = await this.employeeRepo.count({ where: { tenantId } });
    const empleadosActivos = await this.employeeRepo.count({
      where: { tenantId, isActive: true },
    });

    // Current period payroll
    const payrollRaw = await this.payrollRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.total_liquido), 0)', 'nomina')
      .addSelect('COALESCE(SUM(p.total_costo_empresa), 0)', 'costoEmpresa')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.period = :period', { period: currentPeriod })
      .andWhere('p.status NOT IN (:...excl)', { excl: ['VOIDED'] })
      .getRawOne();

    // By department
    const deptRaw = await this.employeeRepo
      .createQueryBuilder('e')
      .select("COALESCE(e.department, 'Sin departamento')", 'depto')
      .addSelect('COUNT(*)', 'cantidad')
      .addSelect('COALESCE(SUM(e.base_salary), 0)', 'costo')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.is_active = true')
      .groupBy('e.department')
      .orderBy('cantidad', 'DESC')
      .getRawMany();

    // Fixed-term contracts expiring in 15 days
    const contratosVencenProximo = await this.employeeRepo
      .createQueryBuilder('e')
      .where('e.tenant_id = :tenantId', { tenantId })
      .andWhere('e.is_active = true')
      .andWhere('e.contract_type = :type', { type: 'PLAZO_FIJO' })
      .andWhere('e.termination_date IS NOT NULL')
      .andWhere('e.termination_date <= :limit', { limit: fifteenDaysFromNow })
      .getCount();

    // Current medical leaves
    const today = new Date().toISOString().split('T')[0];
    const licenciasMedicas = await this.attendanceRepo
      .createQueryBuilder('a')
      .where('a.tenant_id = :tenantId', { tenantId })
      .andWhere('a.type = :type', { type: 'LICENCIA_MEDICA' })
      .andWhere('a.date = :today', { today })
      .getCount();

    return {
      totalEmpleados,
      empleadosActivos,
      costoNominaMes: safeNum(payrollRaw?.nomina),
      costoEmpresaMes: safeNum(payrollRaw?.costoEmpresa),
      porDepartamento: (deptRaw || []).map((r) => ({
        depto: r.depto || 'Sin departamento',
        cantidad: safeInt(r.cantidad),
        costo: safeNum(r.costo),
      })),
      contratosVencenProximo,
      licenciasMedicas,
    };
  }

  // ====================================================================
  // CLIENTES
  // ====================================================================

  private async buildClientes(
    tenantId: string,
    startOfMonth: string,
    thirtyDaysAgo: string,
  ): Promise<ClientesOverview> {
    const totalClientes = await this.clientRepo.count({ where: { tenantId } });

    // New clients this month
    const clientesNuevosMes = await this.clientRepo
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.created_at >= :startOfMonth', { startOfMonth })
      .getCount();

    // Active clients (with a work order or invoice in last 30 days)
    const activos30dRaw = await this.woRepo
      .createQueryBuilder('wo')
      .select('COUNT(DISTINCT wo.client_id)', 'count')
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.created_at >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getRawOne();

    // Top clients by invoiced amount
    const topClientesRaw = await this.invoiceRepo
      .createQueryBuilder('i')
      .select('i.receptor_razon_social', 'nombre')
      .addSelect('COALESCE(SUM(i.monto_total), 0)', 'facturado')
      .addSelect('COALESCE(SUM(CASE WHEN i.is_paid = false THEN i.monto_total - i.paid_amount ELSE 0 END), 0)', 'pendiente')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.dte_type IN (:...dteTypes)', { dteTypes: [33, 34, 39] })
      .andWhere('i.status IN (:...statuses)', { statuses: ['issued', 'sent_to_sii', 'accepted'] })
      .groupBy('i.receptor_razon_social')
      .orderBy('facturado', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalClientes,
      clientesNuevosMes,
      clientesActivos30d: safeInt(activos30dRaw?.count),
      topClientes: (topClientesRaw || []).map((r) => ({
        nombre: r.nombre || 'Sin nombre',
        facturado: safeNum(r.facturado),
        pendiente: safeNum(r.pendiente),
      })),
      satisfaccion: 0, // Not yet tracked
    };
  }

  // ====================================================================
  // PROVEEDORES
  // ====================================================================

  private async buildProveedores(
    tenantId: string,
    startOfMonth: string,
  ): Promise<ProveedoresOverview> {
    const totalProveedores = await this.supplierRepo.count({ where: { tenantId } });
    const proveedoresActivos = await this.supplierRepo.count({
      where: { tenantId, isActive: true },
    });

    // Purchases this month
    const comprasMesRaw = await this.supplierInvRepo
      .createQueryBuilder('si')
      .select('COALESCE(SUM(si.monto_total), 0)', 'total')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.invoice_type = :tipo', { tipo: 'FACTURA_COMPRA' })
      .andWhere('si.status NOT IN (:...excl)', { excl: ['VOIDED'] })
      .andWhere('si.issue_date >= :startOfMonth', { startOfMonth })
      .getRawOne();

    // Top suppliers
    const topProvRaw = await this.supplierInvRepo
      .createQueryBuilder('si')
      .leftJoin('si.supplier', 's')
      .select('s.name', 'nombre')
      .addSelect('COALESCE(SUM(si.monto_total), 0)', 'compras')
      .addSelect('COALESCE(SUM(si.pending_amount), 0)', 'pendiente')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.status NOT IN (:...excl)', { excl: ['VOIDED'] })
      .groupBy('s.name')
      .orderBy('compras', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalProveedores,
      proveedoresActivos,
      comprasMes: safeNum(comprasMesRaw?.total),
      topProveedores: (topProvRaw || []).map((r) => ({
        nombre: r.nombre || 'Sin nombre',
        compras: safeNum(r.compras),
        pendiente: safeNum(r.pendiente),
      })),
    };
  }

  // ====================================================================
  // KPIs
  // ====================================================================

  private async buildKpis(
    tenantId: string,
    startOfMonth: string,
    startOfYear: string,
    today: string,
  ): Promise<KpisOverview> {
    // Average ticket (work order total cost for completed orders this year)
    const ticketRaw = await this.woRepo
      .createQueryBuilder('wo')
      .select('COALESCE(AVG(wo.total_cost), 0)', 'promedio')
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.status = :status', { status: 'completed' })
      .andWhere('wo.completed_at >= :startOfYear', { startOfYear })
      .getRawOne();

    // Technician productivity: completed orders per technician this month
    const techCountRaw = await this.woRepo
      .createQueryBuilder('wo')
      .select('COUNT(DISTINCT wo.assigned_to)', 'tecnicos')
      .addSelect('COUNT(*)', 'ordenes')
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.status = :status', { status: 'completed' })
      .andWhere('wo.completed_at >= :startOfMonth', { startOfMonth })
      .andWhere('wo.assigned_to IS NOT NULL')
      .getRawOne();
    const numTecnicos = safeInt(techCountRaw?.tecnicos);
    const numOrdenes = safeInt(techCountRaw?.ordenes);
    const productividadTecnicos = numTecnicos > 0
      ? Math.round((numOrdenes / numTecnicos) * 10) / 10
      : 0;

    // Average collection days (from issue to paid)
    const diasCobroRaw = await this.invoiceRepo
      .createQueryBuilder('i')
      .select(
        "COALESCE(AVG(EXTRACT(EPOCH FROM (i.paid_at - i.created_at)) / 86400), 0)",
        'dias',
      )
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.is_paid = true')
      .andWhere('i.paid_at IS NOT NULL')
      .andWhere('i.paid_at >= :startOfYear', { startOfYear })
      .getRawOne();

    // Average payment days to suppliers
    const diasPagoRaw = await this.supplierPayRepo
      .createQueryBuilder('sp')
      .leftJoin('sp.supplierInvoice', 'si')
      .select(
        "COALESCE(AVG(EXTRACT(EPOCH FROM (sp.created_at - si.created_at)) / 86400), 0)",
        'dias',
      )
      .where('sp.tenant_id = :tenantId', { tenantId })
      .andWhere('sp.status = :status', { status: 'CONFIRMED' })
      .andWhere('sp.created_at >= :startOfYear', { startOfYear })
      .getRawOne();

    // Workshop efficiency: due_date column not in work_orders table, cannot calculate
    const eficienciaRaw = { total: 0, ontime: 0 };
    const efTotal = safeInt(eficienciaRaw?.total);
    const efOntime = safeInt(eficienciaRaw?.ontime);
    const eficienciaTaller = efTotal > 0
      ? Math.round((efOntime / efTotal) * 10000) / 100
      : 0;

    // Operational margin: (revenue - expenses) / revenue * 100 for the year
    const revenueYtdRaw = await this.invoiceRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.monto_neto), 0)', 'total')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.dte_type IN (:...dteTypes)', { dteTypes: [33, 34, 39] })
      .andWhere('i.status IN (:...statuses)', { statuses: ['issued', 'sent_to_sii', 'accepted'] })
      .andWhere('i.issue_date >= :startOfYear', { startOfYear })
      .getRawOne();
    const expenseYtdRaw = await this.supplierInvRepo
      .createQueryBuilder('si')
      .select('COALESCE(SUM(si.monto_neto), 0)', 'total')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.invoice_type = :tipo', { tipo: 'FACTURA_COMPRA' })
      .andWhere('si.status NOT IN (:...excl)', { excl: ['VOIDED'] })
      .andWhere('si.issue_date >= :startOfYear', { startOfYear })
      .getRawOne();
    const revYtd = safeNum(revenueYtdRaw?.total);
    const expYtd = safeNum(expenseYtdRaw?.total);
    const margenOperacional = revYtd > 0
      ? Math.round(((revYtd - expYtd) / revYtd) * 10000) / 100
      : 0;

    return {
      ticketPromedio: safeNum(ticketRaw?.promedio),
      productividadTecnicos,
      diasPromedioCobro: Math.round(safeNum(diasCobroRaw?.dias) * 10) / 10,
      diasPromedioPago: Math.round(safeNum(diasPagoRaw?.dias) * 10) / 10,
      eficienciaTaller,
      margenOperacional,
    };
  }

  // ====================================================================
  // ALERTAS
  // ====================================================================

  private generateAlertas(
    financiero: FinancieroOverview,
    operaciones: OperacionesOverview,
    inventario: InventarioOverview,
    personas: PersonasOverview,
    proveedores: ProveedoresOverview,
  ): Alerta[] {
    const alertas: Alerta[] = [];

    // URGENTE alerts
    if (operaciones.ordenesVencidas > 0) {
      alertas.push({
        type: 'URGENTE',
        message: `${operaciones.ordenesVencidas} orden${operaciones.ordenesVencidas > 1 ? 'es' : ''} vencida${operaciones.ordenesVencidas > 1 ? 's' : ''} sin cerrar`,
        module: 'Operaciones',
        link: '/ordenes?status=overdue',
      });
    }

    if (financiero.cuentasPorCobrarVencidas > 0) {
      alertas.push({
        type: 'URGENTE',
        message: `Cuentas por cobrar vencidas: $${Math.round(financiero.cuentasPorCobrarVencidas).toLocaleString('es-CL')}`,
        module: 'Finanzas',
        link: '/ordenes?facturacion=vencida',
      });
    }

    if (financiero.cuentasPorPagarVencidas > 0) {
      alertas.push({
        type: 'URGENTE',
        message: `Cuentas por pagar vencidas: $${Math.round(financiero.cuentasPorPagarVencidas).toLocaleString('es-CL')}`,
        module: 'Proveedores',
        link: '/importaciones?tab=facturas&status=vencida',
      });
    }

    // ADVERTENCIA alerts
    if (inventario.itemsBajoMinimo > 0) {
      alertas.push({
        type: 'ADVERTENCIA',
        message: `Stock bajo minimo: ${inventario.itemsBajoMinimo} producto${inventario.itemsBajoMinimo > 1 ? 's' : ''}`,
        module: 'Inventario',
        link: '/inventario?filter=low_stock',
      });
    }

    if (personas.contratosVencenProximo > 0) {
      alertas.push({
        type: 'ADVERTENCIA',
        message: `${personas.contratosVencenProximo} contrato${personas.contratosVencenProximo > 1 ? 's' : ''} plazo fijo vence${personas.contratosVencenProximo > 1 ? 'n' : ''} en 15 dias`,
        module: 'RRHH',
        link: '/rrhh?tab=contratos',
      });
    }

    if (operaciones.cotizacionesPendientes > 5) {
      alertas.push({
        type: 'ADVERTENCIA',
        message: `${operaciones.cotizacionesPendientes} cotizaciones pendientes de respuesta`,
        module: 'Ventas',
        link: '/cotizaciones?status=pending',
      });
    }

    if (inventario.itemsSinMovimiento30d > 10) {
      alertas.push({
        type: 'ADVERTENCIA',
        message: `${inventario.itemsSinMovimiento30d} items sin movimiento en 30 dias`,
        module: 'Inventario',
        link: '/inventario?filter=stale',
      });
    }

    // INFO alerts
    if (financiero.ivaAPagar > 0) {
      alertas.push({
        type: 'INFO',
        message: `IVA del mes: $${Math.round(financiero.ivaAPagar).toLocaleString('es-CL')} a pagar`,
        module: 'Finanzas',
        link: '/ordenes?tab=facturacion',
      });
    }

    if (inventario.importacionesEnTransito > 0) {
      alertas.push({
        type: 'INFO',
        message: `${inventario.importacionesEnTransito} importacion${inventario.importacionesEnTransito > 1 ? 'es' : ''} en transito (USD $${Math.round(inventario.valorImportacionesEnTransito).toLocaleString('es-CL')})`,
        module: 'Importaciones',
        link: '/importaciones?status=in_transit',
      });
    }

    if (personas.licenciasMedicas > 0) {
      alertas.push({
        type: 'INFO',
        message: `${personas.licenciasMedicas} empleado${personas.licenciasMedicas > 1 ? 's' : ''} con licencia medica hoy`,
        module: 'RRHH',
        link: '/rrhh?tab=asistencia',
      });
    }

    if (financiero.flujoNetoMes < 0) {
      alertas.push({
        type: 'ADVERTENCIA',
        message: `Flujo neto negativo este mes: $${Math.round(financiero.flujoNetoMes).toLocaleString('es-CL')}`,
        module: 'Finanzas',
        link: '/empresa360',
      });
    }

    return alertas;
  }

  // ====================================================================
  // getFinancialSummary — Monthly breakdown for a year
  // ====================================================================

  async getFinancialSummary(tenantId: string, year: number): Promise<MonthlyFinancial[]> {
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;
    const salesDteTypes = [33, 34, 39];
    const activeStatuses = ['issued', 'sent_to_sii', 'accepted'];

    // Monthly revenue
    const revenueRaw = await this.invoiceRepo
      .createQueryBuilder('i')
      .select("EXTRACT(MONTH FROM i.issue_date::date)", 'month')
      .addSelect('COALESCE(SUM(i.monto_total), 0)', 'total')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.dte_type IN (:...dteTypes)', { dteTypes: salesDteTypes })
      .andWhere('i.status IN (:...statuses)', { statuses: activeStatuses })
      .andWhere('i.issue_date >= :startOfYear', { startOfYear })
      .andWhere('i.issue_date <= :endOfYear', { endOfYear })
      .groupBy("EXTRACT(MONTH FROM i.issue_date::date)")
      .getRawMany();

    // Monthly expenses
    const expenseRaw = await this.supplierInvRepo
      .createQueryBuilder('si')
      .select("EXTRACT(MONTH FROM si.issue_date::date)", 'month')
      .addSelect('COALESCE(SUM(si.monto_total), 0)', 'total')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.invoice_type = :tipo', { tipo: 'FACTURA_COMPRA' })
      .andWhere('si.status NOT IN (:...excl)', { excl: ['VOIDED'] })
      .andWhere('si.issue_date >= :startOfYear', { startOfYear })
      .andWhere('si.issue_date <= :endOfYear', { endOfYear })
      .groupBy("EXTRACT(MONTH FROM si.issue_date::date)")
      .getRawMany();

    // Monthly collections
    const cobrosRaw = await this.invoiceRepo
      .createQueryBuilder('i')
      .select("EXTRACT(MONTH FROM i.paid_at)", 'month')
      .addSelect('COALESCE(SUM(i.paid_amount), 0)', 'total')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.paid_at >= :startOfYear', { startOfYear })
      .andWhere('i.paid_at <= :endOfYear', { endOfYear })
      .groupBy("EXTRACT(MONTH FROM i.paid_at)")
      .getRawMany();

    // Monthly payments to suppliers
    const pagosRaw = await this.supplierPayRepo
      .createQueryBuilder('sp')
      .select("EXTRACT(MONTH FROM sp.payment_date::date)", 'month')
      .addSelect('COALESCE(SUM(sp.amount), 0)', 'total')
      .where('sp.tenant_id = :tenantId', { tenantId })
      .andWhere('sp.status = :status', { status: 'CONFIRMED' })
      .andWhere('sp.payment_date >= :startOfYear', { startOfYear })
      .andWhere('sp.payment_date <= :endOfYear', { endOfYear })
      .groupBy("EXTRACT(MONTH FROM sp.payment_date::date)")
      .getRawMany();

    const revenueMap = new Map<number, number>();
    const expenseMap = new Map<number, number>();
    const cobrosMap = new Map<number, number>();
    const pagosMap = new Map<number, number>();

    (revenueRaw || []).forEach((r) => revenueMap.set(safeInt(r.month), safeNum(r.total)));
    (expenseRaw || []).forEach((r) => expenseMap.set(safeInt(r.month), safeNum(r.total)));
    (cobrosRaw || []).forEach((r) => cobrosMap.set(safeInt(r.month), safeNum(r.total)));
    (pagosRaw || []).forEach((r) => pagosMap.set(safeInt(r.month), safeNum(r.total)));

    const result: MonthlyFinancial[] = [];
    for (let m = 1; m <= 12; m++) {
      const ingresos = revenueMap.get(m) || 0;
      const gastos = expenseMap.get(m) || 0;
      result.push({
        month: m,
        ingresos,
        gastos,
        margen: ingresos - gastos,
        cobros: cobrosMap.get(m) || 0,
        pagos: pagosMap.get(m) || 0,
      });
    }

    return result;
  }

  // ====================================================================
  // getOperationalKPIs — For a date range
  // ====================================================================

  async getOperationalKPIs(tenantId: string, dateFrom: string, dateTo: string) {
    const openStatuses = ['pending', 'in_progress'];

    // Orders created in range
    const ordersCreated = await this.woRepo
      .createQueryBuilder('wo')
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.created_at >= :dateFrom', { dateFrom })
      .andWhere('wo.created_at <= :dateTo', { dateTo })
      .getCount();

    // Orders completed in range
    const ordersCompleted = await this.woRepo
      .createQueryBuilder('wo')
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.status = :status', { status: 'completed' })
      .andWhere('wo.completed_at >= :dateFrom', { dateFrom })
      .andWhere('wo.completed_at <= :dateTo', { dateTo })
      .getCount();

    // Average total cost
    const avgCostRaw = await this.woRepo
      .createQueryBuilder('wo')
      .select('COALESCE(AVG(wo.total_cost), 0)', 'avg')
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.status = :status', { status: 'completed' })
      .andWhere('wo.completed_at >= :dateFrom', { dateFrom })
      .andWhere('wo.completed_at <= :dateTo', { dateTo })
      .getRawOne();

    // Average completion time
    const avgTimeRaw = await this.woRepo
      .createQueryBuilder('wo')
      .select(
        "COALESCE(AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at)) / 86400), 0)",
        'dias',
      )
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.status = :status', { status: 'completed' })
      .andWhere('wo.completed_at >= :dateFrom', { dateFrom })
      .andWhere('wo.completed_at <= :dateTo', { dateTo })
      .andWhere('wo.completed_at IS NOT NULL')
      .getRawOne();

    // Revenue from completed orders
    const revenueRaw = await this.woRepo
      .createQueryBuilder('wo')
      .select('COALESCE(SUM(wo.total_cost), 0)', 'total')
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.status = :status', { status: 'completed' })
      .andWhere('wo.completed_at >= :dateFrom', { dateFrom })
      .andWhere('wo.completed_at <= :dateTo', { dateTo })
      .getRawOne();

    // Quotations in range
    const quotesRaw = await this.quoteRepo
      .createQueryBuilder('q')
      .select('COUNT(*)', 'total')
      .addSelect("COUNT(*) FILTER (WHERE q.status IN ('approved','converted'))", 'convertidas')
      .where('q.tenant_id = :tenantId', { tenantId })
      .andWhere('q.created_at >= :dateFrom', { dateFrom })
      .andWhere('q.created_at <= :dateTo', { dateTo })
      .getRawOne();

    const totalQuotes = safeInt(quotesRaw?.total);
    const convertedQuotes = safeInt(quotesRaw?.convertidas);
    // Efficiency: due_date column not in work_orders table
    const efRaw = { total: 0, ontime: 0 };

    const efTotal = safeInt(efRaw?.total);
    const efOntime = safeInt(efRaw?.ontime);

    return {
      ordersCreated,
      ordersCompleted,
      averageTicket: safeNum(avgCostRaw?.avg),
      averageCompletionDays: Math.round(safeNum(avgTimeRaw?.dias) * 10) / 10,
      totalRevenue: safeNum(revenueRaw?.total),
      quotationsTotal: totalQuotes,
      quotationsConverted: convertedQuotes,
      conversionRate: totalQuotes > 0 ? Math.round((convertedQuotes / totalQuotes) * 10000) / 100 : 0,
      efficiency: efTotal > 0 ? Math.round((efOntime / efTotal) * 10000) / 100 : 0,
    };
  }

  // ====================================================================
  // getAlerts — Active alerts across all modules
  // ====================================================================

  async getAlerts(tenantId: string): Promise<Alerta[]> {
    const overview = await this.getCompany360(tenantId);
    return overview.alertas;
  }

  // ====================================================================
  // getTrends — Monthly trends for key metrics
  // ====================================================================

  async getTrends(tenantId: string, months: 6 | 12): Promise<TrendPoint[]> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];
    const salesDteTypes = [33, 34, 39];
    const activeStatuses = ['issued', 'sent_to_sii', 'accepted'];

    // Monthly revenue
    const revenueRaw = await this.invoiceRepo
      .createQueryBuilder('i')
      .select("TO_CHAR(i.issue_date::date, 'YYYY-MM')", 'month')
      .addSelect('COALESCE(SUM(i.monto_neto), 0)', 'ingresos')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.dte_type IN (:...dteTypes)', { dteTypes: salesDteTypes })
      .andWhere('i.status IN (:...statuses)', { statuses: activeStatuses })
      .andWhere('i.issue_date >= :startStr', { startStr })
      .andWhere('i.issue_date <= :endStr', { endStr })
      .groupBy("TO_CHAR(i.issue_date::date, 'YYYY-MM')")
      .orderBy('month')
      .getRawMany();

    // Monthly expenses
    const expenseRaw = await this.supplierInvRepo
      .createQueryBuilder('si')
      .select("TO_CHAR(si.issue_date::date, 'YYYY-MM')", 'month')
      .addSelect('COALESCE(SUM(si.monto_neto), 0)', 'gastos')
      .where('si.tenant_id = :tenantId', { tenantId })
      .andWhere('si.invoice_type = :tipo', { tipo: 'FACTURA_COMPRA' })
      .andWhere('si.status NOT IN (:...excl)', { excl: ['VOIDED'] })
      .andWhere('si.issue_date >= :startStr', { startStr })
      .andWhere('si.issue_date <= :endStr', { endStr })
      .groupBy("TO_CHAR(si.issue_date::date, 'YYYY-MM')")
      .getRawMany();

    // Monthly completed orders count
    const ordersRaw = await this.woRepo
      .createQueryBuilder('wo')
      .select("TO_CHAR(wo.completed_at, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'ordenes')
      .where('wo.tenant_id = :tenantId', { tenantId })
      .andWhere('wo.status = :status', { status: 'completed' })
      .andWhere('wo.completed_at >= :startStr', { startStr })
      .andWhere('wo.completed_at <= :endStr', { endStr })
      .andWhere('wo.completed_at IS NOT NULL')
      .groupBy("TO_CHAR(wo.completed_at, 'YYYY-MM')")
      .getRawMany();

    // Current inventory value (snapshot — same for all months, but we provide it)
    const invValueRaw = await this.invItemRepo
      .createQueryBuilder('i')
      .select('COALESCE(SUM(i.cost_price * i.stock_quantity), 0)', 'valor')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.is_active = true')
      .getRawOne();
    const currentInvValue = safeNum(invValueRaw?.valor);

    // Build maps
    const revenueMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();
    const ordersMap = new Map<string, number>();

    (revenueRaw || []).forEach((r) => revenueMap.set(r.month, safeNum(r.ingresos)));
    (expenseRaw || []).forEach((r) => expenseMap.set(r.month, safeNum(r.gastos)));
    (ordersRaw || []).forEach((r) => ordersMap.set(r.month, safeInt(r.ordenes)));

    // Generate all months
    const result: TrendPoint[] = [];
    const cursor = new Date(startDate);
    while (cursor <= now) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const ingresos = revenueMap.get(key) || 0;
      const gastos = expenseMap.get(key) || 0;
      result.push({
        month: key,
        ingresos,
        margen: ingresos - gastos,
        ordenes: ordersMap.get(key) || 0,
        valorInventario: currentInvValue,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return result;
  }
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Types ──

interface OrderStats {
  totalOpen: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdue: number;
  avgDaysOpen: number;
  oldestOpenDays: number;
  closedThisWeek: number;
  closedThisMonth: number;
  avgClosureTime: number;
}

interface QuotationStats {
  totalOpen: number;
  draft: number;
  sent: number;
  awaitingApproval: number;
  approved: number;
  expiringSoon: number;
  expired: number;
  conversionRate: number;
}

interface WorkOrder {
  id: string;
  orderNumber: number;
  vehicleId: string;
  clientId: string;
  assignedTo: string | null;
  status: string;
  type: string;
  priority: string;
  description: string | null;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  pipelineStage: string;
  createdAt: string;
  vehicle?: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
  };
  parts?: Array<{
    id: string;
    name: string;
    quantity: number;
    totalPrice: number;
    isDispatched: boolean;
  }>;
}

interface Quotation {
  id: string;
  quoteNumber: number;
  clientId: string;
  vehicleId: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
}

interface AgingReport {
  within7Days: WorkOrder[];
  within14Days: WorkOrder[];
  within30Days: WorkOrder[];
  over30Days: WorkOrder[];
  over60Days: WorkOrder[];
  over90Days: WorkOrder[];
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: OrderStats | QuotationStats;
}

// ── Constants ──

type QuickFilter = 'abiertas' | 'vencidas' | 'urgentes' | 'esta_semana' | 'todas';

const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
  { key: 'abiertas', label: 'Abiertas' },
  { key: 'vencidas', label: 'Vencidas' },
  { key: 'urgentes', label: 'Urgentes' },
  { key: 'esta_semana', label: 'Esta Semana' },
  { key: 'todas', label: 'Todas' },
];

const ORDER_STATUSES = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'waiting_parts', label: 'Esperando Repuestos' },
  { value: 'waiting_approval', label: 'Esperando Aprobacion' },
  { value: 'completed', label: 'Completada' },
  { value: 'invoiced', label: 'Facturada' },
  { value: 'cancelled', label: 'Cancelada' },
];

const STATUS_BADGE: Record<string, 'warning' | 'primary' | 'success' | 'error' | 'default' | 'info'> = {
  pending: 'warning',
  in_progress: 'primary',
  waiting_parts: 'info',
  waiting_approval: 'warning',
  completed: 'success',
  invoiced: 'success',
  cancelled: 'error',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  waiting_parts: 'Esp. Repuestos',
  waiting_approval: 'Esp. Aprobacion',
  completed: 'Completada',
  invoiced: 'Facturada',
  cancelled: 'Cancelada',
};

const PRIORITY_BADGE: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  urgent: 'error',
  high: 'error',
  normal: 'info',
  low: 'default',
};

const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja',
};

const QUOTATION_STATUS_BADGE: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  draft: 'default',
  sent: 'primary',
  approved: 'success',
  rejected: 'error',
  converted: 'success',
  expired: 'warning',
};

const QUOTATION_STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  converted: 'Convertida',
  expired: 'Vencida',
};

const PIPELINE_LABEL: Record<string, string> = {
  work_order: 'Orden de Trabajo',
  dispatched: 'Despachada',
  invoiced: 'Facturada',
  quotation: 'Cotizacion',
};

// ── Helpers ──

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));

function daysBetween(dateStr: string, now: Date): number {
  const d = new Date(dateStr);
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function isOverdue(order: WorkOrder): boolean {
  if (!order.dueDate) return false;
  const openStatuses = ['pending', 'in_progress', 'waiting_parts', 'waiting_approval'];
  return new Date(order.dueDate) < new Date() && openStatuses.includes(order.status);
}

function getRowColorClass(order: WorkOrder, now: Date): string {
  if (isOverdue(order)) return 'bg-red-50';
  const daysOpen = daysBetween(order.createdAt, now);
  if (daysOpen > 14) return 'bg-amber-50';
  if (daysOpen <= 7) return 'bg-emerald-50/50';
  return '';
}

// ── Tab type ──
type TabView = 'ordenes' | 'cotizaciones';

// ═══════════════════════════════════════════════════════════════════
//  COMPONENT: Stat Card
// ═══════════════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  subValue,
  color = 'slate',
  alert = false,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'slate' | 'red' | 'green' | 'blue' | 'amber';
  alert?: boolean;
}) {
  const colorMap: Record<string, string> = {
    slate: 'border-slate-200',
    red: 'border-red-300 bg-red-50',
    green: 'border-emerald-300 bg-emerald-50',
    blue: 'border-blue-300 bg-blue-50',
    amber: 'border-amber-300 bg-amber-50',
  };

  const textColorMap: Record<string, string> = {
    slate: 'text-slate-800',
    red: 'text-red-700',
    green: 'text-emerald-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
  };

  return (
    <div
      className={`rounded-xl border p-4 ${colorMap[color]} ${alert ? 'ring-2 ring-red-400/50' : ''}`}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-2xl font-bold mt-1 ${textColorMap[color]}`}>{value}</p>
      {subValue && (
        <p className="text-xs text-slate-400 mt-0.5">{subValue}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  COMPONENT: Aging Bar Chart
// ═══════════════════════════════════════════════════════════════════

function AgingChart({ aging }: { aging: AgingReport | null }) {
  if (!aging) return null;

  const buckets = [
    { label: '< 7 dias', count: aging.within7Days.length, color: 'bg-emerald-500' },
    { label: '7-14 dias', count: aging.within14Days.length, color: 'bg-yellow-400' },
    { label: '14-30 dias', count: aging.within30Days.length, color: 'bg-orange-400' },
    { label: '30-60 dias', count: aging.over30Days.length, color: 'bg-red-400' },
    { label: '60-90 dias', count: aging.over60Days.length, color: 'bg-red-600' },
    { label: '> 90 dias', count: aging.over90Days.length, color: 'bg-red-900' },
  ];

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">
        Envejecimiento de Ordenes Abiertas
      </h3>
      <div className="space-y-3">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-20 flex-shrink-0 text-right">
              {bucket.label}
            </span>
            <div className="flex-1 h-7 bg-slate-100 rounded-full overflow-hidden relative">
              <div
                className={`h-full ${bucket.color} rounded-full transition-all duration-500`}
                style={{
                  width: `${Math.max((bucket.count / maxCount) * 100, bucket.count > 0 ? 8 : 0)}%`,
                }}
              />
              {bucket.count > 0 && (
                <span className="absolute inset-0 flex items-center pl-3 text-xs font-bold text-white drop-shadow-sm">
                  {bucket.count}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-slate-700 w-8 text-right">
              {bucket.count}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  COMPONENT: Expanded Row Detail
// ═══════════════════════════════════════════════════════════════════

function OrderDetail({ order }: { order: WorkOrder }) {
  const partsTotal = order.parts?.reduce((s, p) => s + Number(p.totalPrice), 0) || 0;
  const allDispatched = order.parts?.length
    ? order.parts.every((p) => p.isDispatched)
    : false;

  return (
    <tr>
      <td colSpan={11} className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Parts status */}
          <div>
            <p className="font-semibold text-slate-600 mb-1">Repuestos</p>
            {order.parts && order.parts.length > 0 ? (
              <ul className="space-y-1">
                {order.parts.map((p) => (
                  <li key={p.id} className="flex justify-between text-xs">
                    <span className="text-slate-600">
                      {p.name} x{p.quantity}
                    </span>
                    <span className="flex items-center gap-1">
                      {formatCurrency(p.totalPrice)}
                      {p.isDispatched ? (
                        <span className="text-emerald-600 font-medium">Despachado</span>
                      ) : (
                        <span className="text-amber-600 font-medium">Pendiente</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Sin repuestos registrados</p>
            )}
          </div>

          {/* Labor status */}
          <div>
            <p className="font-semibold text-slate-600 mb-1">Mano de Obra</p>
            <p className="text-xs text-slate-500">
              Costo: <span className="font-medium">{formatCurrency(Number(order.laborCost))}</span>
            </p>
            <p className="text-xs text-slate-500">
              Repuestos: <span className="font-medium">{formatCurrency(partsTotal)}</span>
            </p>
            <p className="text-xs text-slate-700 font-semibold mt-1">
              Total: {formatCurrency(Number(order.totalCost))}
            </p>
          </div>

          {/* Pipeline status */}
          <div>
            <p className="font-semibold text-slate-600 mb-1">Pipeline</p>
            <div className="flex items-center gap-1 text-xs">
              {['work_order', 'dispatched', 'invoiced'].map((stage, idx) => {
                const isActive = order.pipelineStage === stage;
                const isPast =
                  (stage === 'work_order') ||
                  (stage === 'dispatched' && ['dispatched', 'invoiced'].includes(order.pipelineStage)) ||
                  (stage === 'invoiced' && order.pipelineStage === 'invoiced');
                return (
                  <div key={stage} className="flex items-center gap-1">
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        isActive
                          ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-300'
                          : isPast
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {PIPELINE_LABEL[stage] || stage}
                    </div>
                    {idx < 2 && (
                      <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Despacho: {allDispatched ? 'Completo' : order.parts?.length ? 'Pendiente' : 'N/A'}
            </p>
            {order.description && (
              <p className="text-xs text-slate-400 mt-1 truncate max-w-xs" title={order.description}>
                {order.description}
              </p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function SeguimientoPage() {
  const [activeTab, setActiveTab] = useState<TabView>('ordenes');

  // ── Orders state ──
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [agingReport, setAgingReport] = useState<AgingReport | null>(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [orderLoading, setOrderLoading] = useState(true);

  // ── Quotations state ──
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [quotationStats, setQuotationStats] = useState<QuotationStats | null>(null);
  const [quotationTotal, setQuotationTotal] = useState(0);
  const [quotationPage, setQuotationPage] = useState(1);
  const [quotationTotalPages, setQuotationTotalPages] = useState(1);
  const [quotationLoading, setQuotationLoading] = useState(true);

  // ── Shared state ──
  const [error, setError] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // ── Order filters ──
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('abiertas');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Quotation filters ──
  const [qSearch, setQSearch] = useState('');
  const [qStatusFilter, setQStatusFilter] = useState<string[]>([]);

  const now = new Date();

  // ═══════════════════════════════════════════════════════════════════
  //  FETCH ORDERS
  // ═══════════════════════════════════════════════════════════════════

  const fetchOrders = useCallback(async () => {
    setOrderLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      params.set('page', String(orderPage));
      params.set('limit', '25');

      // Quick filter logic
      if (quickFilter === 'abiertas') {
        params.set('isOpen', 'true');
      } else if (quickFilter === 'vencidas') {
        params.set('isOverdue', 'true');
      } else if (quickFilter === 'urgentes') {
        params.set('isOpen', 'true');
        params.set('priority', 'urgent');
      } else if (quickFilter === 'esta_semana') {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        params.set('dateFrom', weekStart.toISOString());
      }
      // 'todas' = no filter

      // Override with explicit status filter
      if (selectedStatuses.length > 0) {
        params.set('status', selectedStatuses.join(','));
        // Remove isOpen if user explicitly selected statuses
        params.delete('isOpen');
      }

      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      if (priorityFilter) {
        params.set('priority', priorityFilter);
      }

      if (dateFrom) {
        params.set('dateFrom', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        params.set('dateTo', new Date(dateTo).toISOString());
      }

      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const result = await api.get<PaginatedResponse<WorkOrder>>(
        `/work-orders/filtered?${params.toString()}`,
      );

      setOrders(result.data);
      setOrderTotal(result.total);
      setOrderTotalPages(result.totalPages);
      setOrderStats(result.stats as OrderStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ordenes');
    } finally {
      setOrderLoading(false);
    }
  }, [orderPage, quickFilter, selectedStatuses, searchTerm, priorityFilter, sortBy, sortOrder, dateFrom, dateTo]);

  // ═══════════════════════════════════════════════════════════════════
  //  FETCH AGING REPORT
  // ═══════════════════════════════════════════════════════════════════

  const fetchAging = useCallback(async () => {
    try {
      const data = await api.get<AgingReport>('/work-orders/aging');
      setAgingReport(data);
    } catch {
      // Non-blocking: aging chart just won't render
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  //  FETCH QUOTATIONS
  // ═══════════════════════════════════════════════════════════════════

  const fetchQuotations = useCallback(async () => {
    setQuotationLoading(true);

    try {
      const params = new URLSearchParams();
      params.set('page', String(quotationPage));
      params.set('limit', '25');
      params.set('isOpen', 'true');
      params.set('sortOrder', 'DESC');

      if (qSearch.trim()) {
        params.set('search', qSearch.trim());
      }

      if (qStatusFilter.length > 0) {
        params.set('status', qStatusFilter.join(','));
        params.delete('isOpen');
      }

      const result = await api.get<PaginatedResponse<Quotation>>(
        `/quotations/filtered?${params.toString()}`,
      );

      setQuotations(result.data);
      setQuotationTotal(result.total);
      setQuotationTotalPages(result.totalPages);
      setQuotationStats(result.stats as QuotationStats);
    } catch (err) {
      if (!error) {
        setError(err instanceof Error ? err.message : 'Error al cargar cotizaciones');
      }
    } finally {
      setQuotationLoading(false);
    }
  }, [quotationPage, qSearch, qStatusFilter, error]);

  // ═══════════════════════════════════════════════════════════════════
  //  EFFECTS
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    fetchOrders();
    fetchAging();
  }, [fetchOrders, fetchAging]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setOrderPage(1);
  }, [quickFilter, selectedStatuses, searchTerm, priorityFilter, sortBy, sortOrder, dateFrom, dateTo]);

  useEffect(() => {
    setQuotationPage(1);
  }, [qSearch, qStatusFilter]);

  // ═══════════════════════════════════════════════════════════════════
  //  STATUS CHECKBOX HANDLER
  // ═══════════════════════════════════════════════════════════════════

  function toggleStatus(status: string) {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  }

  function toggleQStatus(status: string) {
    setQStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Seguimiento de Ordenes
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Control y seguimiento de cierre de ordenes abiertas y cotizaciones
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'ordenes' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('ordenes')}
          >
            Ordenes de Trabajo
          </Button>
          <Button
            variant={activeTab === 'cotizaciones' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('cotizaciones')}
          >
            Cotizaciones
          </Button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
          <button
            onClick={() => setError('')}
            className="ml-2 underline text-red-600"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  ORDENES TAB                                                */}
      {/* ════════════════════════════════════════════════════════════ */}

      {activeTab === 'ordenes' && (
        <>
          {/* ── Stats Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Ordenes Abiertas"
              value={orderStats?.totalOpen ?? '-'}
              color="blue"
            />
            <StatCard
              label="Vencidas"
              value={orderStats?.overdue ?? '-'}
              color={orderStats && orderStats.overdue > 0 ? 'red' : 'slate'}
              alert={!!orderStats && orderStats.overdue > 0}
            />
            <StatCard
              label="Prom. Dias Abierta"
              value={orderStats?.avgDaysOpen ?? '-'}
              subValue={orderStats ? `Max: ${orderStats.oldestOpenDays}d` : undefined}
              color="amber"
            />
            <StatCard
              label="Cerradas Este Mes"
              value={orderStats?.closedThisMonth ?? '-'}
              subValue={orderStats ? `Semana: ${orderStats.closedThisWeek}` : undefined}
              color="green"
            />
            <StatCard
              label="Cotiz. Pendientes"
              value={quotationStats?.totalOpen ?? '-'}
              subValue={
                quotationStats && quotationStats.expiringSoon > 0
                  ? `${quotationStats.expiringSoon} por vencer`
                  : undefined
              }
              color={quotationStats && quotationStats.expiringSoon > 0 ? 'amber' : 'slate'}
            />
            <StatCard
              label="Tasa Conversion"
              value={quotationStats ? `${quotationStats.conversionRate}%` : '-'}
              subValue={
                orderStats
                  ? `Cierre prom: ${orderStats.avgClosureTime}d`
                  : undefined
              }
              color="green"
            />
          </div>

          {/* ── Aging Chart ── */}
          <AgingChart aging={agingReport} />

          {/* ── Filter Bar ── */}
          <Card className="p-4">
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setQuickFilter(f.key);
                    setSelectedStatuses([]);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    quickFilter === f.key && selectedStatuses.length === 0
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Status Checkboxes */}
            <div className="flex flex-wrap gap-3 mb-4">
              {ORDER_STATUSES.map((s) => (
                <label key={s.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(s.value)}
                    onChange={() => toggleStatus(s.value)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-600">{s.label}</span>
                </label>
              ))}
            </div>

            {/* Search + Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Input
                placeholder="Buscar por #, vehiculo, descripcion..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Prioridad: Todas</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="normal">Normal</option>
                <option value="low">Baja</option>
              </select>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Desde"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Hasta"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="createdAt">Ordenar: Fecha Creacion</option>
                <option value="dueDate">Fecha Vencimiento</option>
                <option value="priority">Prioridad</option>
                <option value="status">Estado</option>
                <option value="orderNumber"># Orden</option>
                <option value="totalCost">Costo Total</option>
              </select>
              <button
                onClick={() => setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'))}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
              >
                {sortOrder === 'DESC' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    DESC
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    ASC
                  </>
                )}
              </button>
            </div>
          </Card>

          {/* ── Orders Table ── */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {[
                      '# Orden',
                      'Cliente',
                      'Vehiculo',
                      'Tipo',
                      'Prioridad',
                      'Estado',
                      'Tecnico',
                      'Fecha Apertura',
                      'Dias Abierta',
                      'Vencimiento',
                      'Pipeline',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-3 text-left font-semibold text-slate-600 bg-slate-50 text-xs whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderLoading ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <svg
                            className="animate-spin h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Cargando...
                        </div>
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-slate-400">
                        No se encontraron ordenes con los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const daysOpen = daysBetween(order.createdAt, now);
                      const overdue = isOverdue(order);
                      const expanded = expandedOrderId === order.id;

                      return (
                        <React.Fragment key={order.id}>
                          <tr
                            className={`border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-100 ${getRowColorClass(order, now)}`}
                            onClick={() =>
                              setExpandedOrderId(expanded ? null : order.id)
                            }
                          >
                            <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                <svg
                                  className={`w-3 h-3 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                #{order.orderNumber}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-600 truncate max-w-[120px]">
                              {order.clientId ? order.clientId.substring(0, 8) + '...' : '-'}
                            </td>
                            <td className="px-3 py-2.5 text-xs">
                              {order.vehicle ? (
                                <span className="font-medium text-slate-700">
                                  {order.vehicle.plate || `${order.vehicle.brand} ${order.vehicle.model}`}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-500 capitalize">
                              {order.type}
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge variant={PRIORITY_BADGE[order.priority] || 'default'}>
                                {PRIORITY_LABEL[order.priority] || order.priority}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge variant={STATUS_BADGE[order.status] || 'default'}>
                                {STATUS_LABEL[order.status] || order.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-500 truncate max-w-[100px]">
                              {order.assignedTo ? order.assignedTo.substring(0, 8) + '...' : '-'}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                              {formatDate(order.createdAt)}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span
                                className={`text-xs font-semibold ${
                                  overdue
                                    ? 'text-red-700'
                                    : daysOpen > 14
                                      ? 'text-amber-700'
                                      : daysOpen <= 7
                                        ? 'text-emerald-700'
                                        : 'text-slate-600'
                                }`}
                              >
                                {daysOpen}d
                                {overdue && (
                                  <span className="ml-1 text-[10px] uppercase tracking-wide text-red-600 font-bold">
                                    VENCIDA
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                              {order.dueDate ? (
                                <span className={overdue ? 'text-red-600 font-semibold' : 'text-slate-500'}>
                                  {formatDate(order.dueDate)}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-500">
                              {PIPELINE_LABEL[order.pipelineStage] || order.pipelineStage}
                            </td>
                          </tr>
                          {expanded && <OrderDetail order={order} />}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {orderTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Mostrando pagina {orderPage} de {orderTotalPages} ({orderTotal} ordenes)
                </p>
                <div className="flex gap-1">
                  <button
                    disabled={orderPage <= 1}
                    onClick={() => setOrderPage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={orderPage >= orderTotalPages}
                    onClick={() => setOrderPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/*  COTIZACIONES TAB                                           */}
      {/* ════════════════════════════════════════════════════════════ */}

      {activeTab === 'cotizaciones' && (
        <>
          {/* ── Quotation Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Cotiz. Abiertas"
              value={quotationStats?.totalOpen ?? '-'}
              color="blue"
            />
            <StatCard
              label="Borradores"
              value={quotationStats?.draft ?? '-'}
              color="slate"
            />
            <StatCard
              label="Enviadas"
              value={quotationStats?.sent ?? '-'}
              color="blue"
            />
            <StatCard
              label="Aprobadas"
              value={quotationStats?.approved ?? '-'}
              subValue="Sin convertir"
              color="green"
            />
            <StatCard
              label="Por Vencer"
              value={quotationStats?.expiringSoon ?? '-'}
              subValue="Proximos 7 dias"
              color={quotationStats && quotationStats.expiringSoon > 0 ? 'amber' : 'slate'}
              alert={!!quotationStats && quotationStats.expiringSoon > 0}
            />
            <StatCard
              label="Vencidas"
              value={quotationStats?.expired ?? '-'}
              color={quotationStats && quotationStats.expired > 0 ? 'red' : 'slate'}
              alert={!!quotationStats && quotationStats.expired > 0}
            />
          </div>

          {/* ── Quotation Filters ── */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-3 mb-3">
              {['draft', 'sent', 'approved', 'rejected', 'expired'].map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={qStatusFilter.includes(s)}
                    onChange={() => toggleQStatus(s)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-slate-600">{QUOTATION_STATUS_LABEL[s] || s}</span>
                </label>
              ))}
            </div>
            <Input
              placeholder="Buscar por #, notas..."
              value={qSearch}
              onChange={(e) => setQSearch(e.target.value)}
            />
          </Card>

          {/* ── Quotations Table ── */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    {[
                      '# Cotizacion',
                      'Cliente',
                      'Vehiculo',
                      'Estado',
                      'Subtotal',
                      'IVA',
                      'Total',
                      'Valida Hasta',
                      'Dias Desde Envio',
                      'Creada',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-3 text-left font-semibold text-slate-600 bg-slate-50 text-xs whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quotationLoading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <svg
                            className="animate-spin h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Cargando...
                        </div>
                      </td>
                    </tr>
                  ) : quotations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                        No se encontraron cotizaciones con los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    quotations.map((q) => {
                      const isExpired =
                        q.validUntil &&
                        new Date(q.validUntil) < now &&
                        ['draft', 'sent'].includes(q.status);
                      const daysSinceSent = daysBetween(q.createdAt, now);
                      const expiringSoon =
                        q.validUntil &&
                        !isExpired &&
                        new Date(q.validUntil).getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;

                      return (
                        <tr
                          key={q.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                            isExpired ? 'bg-red-50' : expiringSoon ? 'bg-amber-50' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5 font-medium text-slate-800">
                            #{q.quoteNumber}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-600 truncate max-w-[120px]">
                            {q.clientId ? q.clientId.substring(0, 8) + '...' : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-500 truncate max-w-[100px]">
                            {q.vehicleId ? q.vehicleId.substring(0, 8) + '...' : '-'}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant={
                                isExpired
                                  ? QUOTATION_STATUS_BADGE.expired
                                  : QUOTATION_STATUS_BADGE[q.status] || 'default'
                              }
                            >
                              {isExpired
                                ? QUOTATION_STATUS_LABEL.expired
                                : QUOTATION_STATUS_LABEL[q.status] || q.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-600">
                            {formatCurrency(q.subtotal)}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-600">
                            {formatCurrency(q.tax)}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-slate-700">
                            {formatCurrency(q.total)}
                          </td>
                          <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                            {q.validUntil ? (
                              <span
                                className={
                                  isExpired
                                    ? 'text-red-600 font-semibold'
                                    : expiringSoon
                                      ? 'text-amber-600 font-semibold'
                                      : 'text-slate-500'
                                }
                              >
                                {formatDate(q.validUntil)}
                                {isExpired && (
                                  <span className="ml-1 text-[10px] uppercase tracking-wide text-red-600 font-bold">
                                    VENCIDA
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-500">
                            {daysSinceSent}d
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(q.createdAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {quotationTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Mostrando pagina {quotationPage} de {quotationTotalPages} ({quotationTotal} cotizaciones)
                </p>
                <div className="flex gap-1">
                  <button
                    disabled={quotationPage <= 1}
                    onClick={() => setQuotationPage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={quotationPage >= quotationTotalPages}
                    onClick={() => setQuotationPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// React import needed for React.Fragment in JSX
import React from 'react';

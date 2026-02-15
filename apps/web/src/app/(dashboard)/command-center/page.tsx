'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

interface GlobalOverview {
  totalTenants: number;
  totalActiveUsers: number;
  totalWorkOrdersMonth: number;
  estimatedRevenueMonth: number;
}

interface TenantRow {
  id: string;
  name: string;
  rut: string;
  plan: 'starter' | 'professional' | 'enterprise';
  activeUsers: number;
  workOrdersThisMonth: number;
  lastAccess: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
}

interface BrandStat {
  brand: string;
  count: number;
}

interface MonthlyTrend {
  month: string;
  workOrders: number;
  revenue: number;
}

interface MarketIntelligence {
  topBrands: BrandStat[];
  avgWorkOrderValue: number;
  monthlyTrend: MonthlyTrend[];
}

interface AlertItem {
  id: string;
  tenantName: string;
  message: string;
  type: 'overdue_wo' | 'low_stock' | 'pending_approval';
  severity: 'critical' | 'warning' | 'info';
  createdAt: string;
}

interface GlobalAlerts {
  overdueWorkOrders: AlertItem[];
  lowStockItems: AlertItem[];
  pendingApprovals: AlertItem[];
}

/* ─────────────────────────────────────────────
   Formatters
   ───────────────────────────────────────────── */

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-CL').format(value);

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));

const formatDateShort = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

/* ─────────────────────────────────────────────
   Badge Mappings
   ───────────────────────────────────────────── */

const planBadgeVariant: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  starter: 'default',
  professional: 'primary',
  enterprise: 'success',
};

const planLabel: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const statusBadgeVariant: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  trial: 'info',
  suspended: 'warning',
  cancelled: 'error',
};

const statusLabel: Record<string, string> = {
  active: 'Activo',
  trial: 'Trial',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
};

const alertSeverityVariant: Record<string, 'error' | 'warning' | 'info'> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
};

const alertTypeIcon: Record<string, string> = {
  overdue_wo: 'OT Vencida',
  low_stock: 'Stock Bajo',
  pending_approval: 'Aprobacion',
};

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export default function CommandCenterPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<GlobalOverview | null>(null);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [market, setMarket] = useState<MarketIntelligence | null>(null);
  const [alerts, setAlerts] = useState<GlobalAlerts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeAlertTab, setActiveAlertTab] = useState<'overdue_wo' | 'low_stock' | 'pending_approval'>('overdue_wo');

  const fetchData = useCallback(async () => {
    try {
      const [overviewRes, tenantsRes, marketRes, alertsRes] = await Promise.all([
        api.get<GlobalOverview>('/command-center/overview'),
        api.get<TenantRow[]>('/command-center/tenants'),
        api.get<MarketIntelligence>('/command-center/market-intelligence'),
        api.get<GlobalAlerts>('/command-center/alerts'),
      ]);
      setOverview(overviewRes);
      setTenants(tenantsRes);
      setMarket(marketRes);
      setAlerts(alertsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar Command Center');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // SUPER_ADMIN gate
    const user = getUser();
    if (!user || user.role?.toUpperCase() !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
      return;
    }
    fetchData();
  }, [fetchData, router]);

  /* ── Tenant table columns ── */
  const tenantColumns: Column<TenantRow>[] = [
    {
      key: 'name',
      header: 'Empresa',
      render: (item) => (
        <span className="font-semibold text-slate-800">{item.name}</span>
      ),
    },
    { key: 'rut', header: 'RUT' },
    {
      key: 'plan',
      header: 'Plan',
      render: (item) => (
        <Badge variant={planBadgeVariant[item.plan] || 'default'}>
          {planLabel[item.plan] || item.plan}
        </Badge>
      ),
    },
    {
      key: 'activeUsers',
      header: 'Usuarios',
      render: (item) => (
        <span className="font-medium">{item.activeUsers}</span>
      ),
    },
    {
      key: 'workOrdersThisMonth',
      header: 'OTs Mes',
      render: (item) => (
        <span className="font-medium">{item.workOrdersThisMonth}</span>
      ),
    },
    {
      key: 'lastAccess',
      header: 'Ultimo Acceso',
      render: (item) => (
        <span className="text-slate-500" title={formatDate(item.lastAccess)}>
          {timeAgo(item.lastAccess)} atras
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (item) => (
        <Badge variant={statusBadgeVariant[item.status] || 'default'}>
          {statusLabel[item.status] || item.status}
        </Badge>
      ),
    },
  ];

  /* ── Max value for brand bars ── */
  const maxBrandCount = market?.topBrands.length
    ? Math.max(...market.topBrands.map((b) => b.count))
    : 1;

  /* ── Active alerts list ── */
  const activeAlerts: AlertItem[] = alerts
    ? activeAlertTab === 'overdue_wo'
      ? alerts.overdueWorkOrders
      : activeAlertTab === 'low_stock'
        ? alerts.lowStockItems
        : alerts.pendingApprovals
    : [];

  const alertTabCounts = alerts
    ? {
        overdue_wo: alerts.overdueWorkOrders.length,
        low_stock: alerts.lowStockItems.length,
        pending_approval: alerts.pendingApprovals.length,
      }
    : { overdue_wo: 0, low_stock: 0, pending_approval: 0 };

  const totalAlerts = alertTabCounts.overdue_wo + alertTabCounts.low_stock + alertTabCounts.pending_approval;

  /* ─────────────────────────────────────────────
     Render: Loading
     ───────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-500">Cargando Command Center...</span>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     Render: Error
     ───────────────────────────────────────────── */
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        {error}
      </div>
    );
  }

  /* ─────────────────────────────────────────────
     Render: Page
     ───────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ═══════ Header ═══════ */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center">
              {commandCenterIcon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Command Center</h1>
              <p className="text-sm text-slate-500">Vista Global del Mercado</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary" className="bg-indigo-100 text-indigo-800">
            SUPER_ADMIN
          </Badge>
          <button
            onClick={() => { setLoading(true); setError(''); fetchData(); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {refreshIcon}
            Actualizar
          </button>
        </div>
      </div>

      {/* ═══════ Global KPI Cards ═══════ */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-indigo-500">
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="text-indigo-500 mt-0.5">{buildingIcon}</div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{formatNumber(overview.totalTenants)}</p>
                  <p className="text-xs text-slate-500 mt-1">Empresas Activas</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="text-purple-500 mt-0.5">{usersIcon}</div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{formatNumber(overview.totalActiveUsers)}</p>
                  <p className="text-xs text-slate-500 mt-1">Usuarios Activos</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-indigo-500">
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="text-indigo-500 mt-0.5">{clipboardIcon}</div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{formatNumber(overview.totalWorkOrdersMonth)}</p>
                  <p className="text-xs text-slate-500 mt-1">OTs del Mes</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="text-purple-500 mt-0.5">{currencyIcon}</div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(overview.estimatedRevenueMonth)}</p>
                  <p className="text-xs text-slate-500 mt-1">Revenue Estimado Mes</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ═══════ Tenant Overview Table ═══════ */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-800">Tenants Registrados</h3>
            <Badge variant="default">{tenants.length} empresas</Badge>
          </div>
        </CardHeader>
        <Table
          columns={tenantColumns}
          data={tenants}
          keyExtractor={(item) => item.id}
          emptyMessage="No hay tenants registrados"
        />
      </Card>

      {/* ═══════ Market Intelligence + Global Alerts ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Market Intelligence ── */}
        <div className="space-y-4">
          {/* Top 5 Marcas */}
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                {chartIcon}
                <h3 className="text-lg font-semibold text-slate-800">Top 5 Marcas Mas Reparadas</h3>
              </div>
            </CardHeader>
            <CardBody>
              {market && market.topBrands.length > 0 ? (
                <div className="space-y-3">
                  {market.topBrands.map((brand, idx) => {
                    const pct = Math.round((brand.count / maxBrandCount) * 100);
                    const colors = [
                      'bg-indigo-500',
                      'bg-purple-500',
                      'bg-indigo-400',
                      'bg-purple-400',
                      'bg-indigo-300',
                    ];
                    return (
                      <div key={brand.brand} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 w-5 text-right">{idx + 1}</span>
                        <span className="text-sm font-medium text-slate-700 w-24 truncate">{brand.brand}</span>
                        <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colors[idx] || 'bg-indigo-300'} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-600 w-12 text-right">{formatNumber(brand.count)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sin datos de marcas disponibles</p>
              )}
            </CardBody>
          </Card>

          {/* Promedio OT + Benchmark */}
          <Card className="border-l-4 border-l-purple-500">
            <CardBody>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  {benchmarkIcon}
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Valor Promedio por OT</p>
                  <p className="text-2xl font-bold text-purple-700 mt-0.5">
                    {market ? formatCurrency(market.avgWorkOrderValue) : '--'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Benchmark global cross-tenant</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Tendencia Mensual */}
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                {trendIcon}
                <h3 className="text-lg font-semibold text-slate-800">Tendencia Ultimos 6 Meses</h3>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {market && market.monthlyTrend.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        <th className="px-4 py-2.5 text-left font-semibold text-slate-600 bg-slate-50">Mes</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 bg-slate-50">OTs</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 bg-slate-50">Revenue</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-slate-600 bg-slate-50">Var.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {market.monthlyTrend.map((row, idx) => {
                        const prev = idx > 0 ? market.monthlyTrend[idx - 1] : null;
                        const variation = prev
                          ? ((row.revenue - prev.revenue) / (prev.revenue || 1)) * 100
                          : 0;
                        const variationStr = idx === 0 ? '--' : `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`;
                        const variationColor = idx === 0
                          ? 'text-slate-400'
                          : variation >= 0
                            ? 'text-emerald-600'
                            : 'text-red-600';
                        return (
                          <tr key={row.month} className="border-b border-[var(--color-border)] hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-slate-700">{row.month}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-slate-600">{formatNumber(row.workOrders)}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-slate-800">{formatCurrency(row.revenue)}</td>
                            <td className={`px-4 py-2.5 text-right font-bold ${variationColor}`}>{variationStr}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-8 text-center text-slate-400 text-sm">Sin datos de tendencia</div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ── Global Alerts Panel ── */}
        <div className="space-y-4">
          <Card className="border-l-4 border-l-red-400">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {alertIcon}
                  <h3 className="text-lg font-semibold text-slate-800">Alertas Globales</h3>
                  {totalAlerts > 0 && (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">
                      {totalAlerts}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {/* Tab Navigation */}
              <div className="flex border-b border-[var(--color-border)]">
                <AlertTab
                  label="OTs Vencidas"
                  count={alertTabCounts.overdue_wo}
                  active={activeAlertTab === 'overdue_wo'}
                  onClick={() => setActiveAlertTab('overdue_wo')}
                  accentColor="text-red-600"
                />
                <AlertTab
                  label="Stock Bajo"
                  count={alertTabCounts.low_stock}
                  active={activeAlertTab === 'low_stock'}
                  onClick={() => setActiveAlertTab('low_stock')}
                  accentColor="text-amber-600"
                />
                <AlertTab
                  label="Aprobaciones"
                  count={alertTabCounts.pending_approval}
                  active={activeAlertTab === 'pending_approval'}
                  onClick={() => setActiveAlertTab('pending_approval')}
                  accentColor="text-indigo-600"
                />
              </div>

              {/* Alert Items */}
              <div className="divide-y divide-[var(--color-border)] max-h-[480px] overflow-y-auto">
                {activeAlerts.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <div className="text-slate-300 mb-2">{checkCircleIcon}</div>
                    <p className="text-sm text-slate-400">Sin alertas en esta categoria</p>
                  </div>
                ) : (
                  activeAlerts.map((alert) => (
                    <div key={alert.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <Badge variant={alertSeverityVariant[alert.severity] || 'info'}>
                            {alertTypeIcon[alert.type] || alert.type}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{alert.tenantName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{alert.message}</p>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(alert.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>

          {/* ── Quick Stats Panel ── */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                {pulseIcon}
                <h3 className="text-lg font-semibold text-slate-800">Resumen Rapido</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <QuickStat
                  label="Tenants Activos"
                  value={tenants.filter((t) => t.status === 'active').length}
                  total={tenants.length}
                  color="text-emerald-600"
                />
                <QuickStat
                  label="En Trial"
                  value={tenants.filter((t) => t.status === 'trial').length}
                  total={tenants.length}
                  color="text-sky-600"
                />
                <QuickStat
                  label="Plan Enterprise"
                  value={tenants.filter((t) => t.plan === 'enterprise').length}
                  total={tenants.length}
                  color="text-indigo-600"
                />
                <QuickStat
                  label="Suspendidos"
                  value={tenants.filter((t) => t.status === 'suspended').length}
                  total={tenants.length}
                  color="text-amber-600"
                />
              </div>
            </CardBody>
          </Card>

          {/* ── Platform Health ── */}
          <Card className="border-l-4 border-l-indigo-500">
            <CardBody>
              <div className="flex items-center gap-3 mb-4">
                {shieldIcon}
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Salud de la Plataforma</h3>
              </div>
              <div className="space-y-3">
                <HealthRow
                  label="Alertas Criticas"
                  value={alerts?.overdueWorkOrders.filter((a) => a.severity === 'critical').length ?? 0}
                  status={
                    (alerts?.overdueWorkOrders.filter((a) => a.severity === 'critical').length ?? 0) === 0
                      ? 'good'
                      : 'bad'
                  }
                />
                <HealthRow
                  label="Tenants Suspendidos"
                  value={tenants.filter((t) => t.status === 'suspended').length}
                  status={tenants.filter((t) => t.status === 'suspended').length === 0 ? 'good' : 'warn'}
                />
                <HealthRow
                  label="Stock Critico Cross-Tenant"
                  value={alertTabCounts.low_stock}
                  status={alertTabCounts.low_stock === 0 ? 'good' : alertTabCounts.low_stock > 5 ? 'bad' : 'warn'}
                />
                <HealthRow
                  label="Aprobaciones Pendientes"
                  value={alertTabCounts.pending_approval}
                  status={alertTabCounts.pending_approval === 0 ? 'good' : 'warn'}
                />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sub-Components
   ───────────────────────────────────────────── */

function AlertTab({
  label,
  count,
  active,
  onClick,
  accentColor,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  accentColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 px-3 py-2.5 text-xs font-medium text-center transition-colors relative
        ${active ? `${accentColor} bg-white` : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}
      `}
    >
      {label}
      {count > 0 && (
        <span className={`ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-slate-100 text-slate-700' : 'bg-slate-100 text-slate-400'}`}>
          {count}
        </span>
      )}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-current" />}
    </button>
  );
}

function QuickStat({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="text-center p-3 rounded-lg bg-slate-50">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
      <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-current ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">{pct}% del total</p>
    </div>
  );
}

function HealthRow({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: 'good' | 'warn' | 'bad';
}) {
  const dotColor = status === 'good' ? 'bg-emerald-500' : status === 'warn' ? 'bg-amber-500' : 'bg-red-500';
  const valueColor = status === 'good' ? 'text-emerald-600' : status === 'warn' ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <span className={`text-sm font-bold ${valueColor}`}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SVG Icons
   ───────────────────────────────────────────── */

const commandCenterIcon = (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

const refreshIcon = (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.183" />
  </svg>
);

const buildingIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);

const usersIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const clipboardIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
  </svg>
);

const currencyIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const chartIcon = (
  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const benchmarkIcon = (
  <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const trendIcon = (
  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
  </svg>
);

const alertIcon = (
  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const checkCircleIcon = (
  <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const pulseIcon = (
  <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V19.5m0 2.25l-2.25-1.313m0-16.875L12 2.25l2.25 1.313M21 14.25v2.25l-2.25 1.313m-13.5 0L3 16.5v-2.25" />
  </svg>
);

const shieldIcon = (
  <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

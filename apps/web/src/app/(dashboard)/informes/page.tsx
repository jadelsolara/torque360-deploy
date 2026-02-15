'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportPricing {
  type: string;
  price: number;
  name: string;
  description: string;
  deliveryDays: number;
}

interface ReportRequest {
  id: string;
  reportType: string;
  title: string;
  description: string | null;
  scope: { module: string; dateFrom: string; dateTo: string; filters?: Record<string, unknown> };
  status: string;
  amount: number;
  isPaid: boolean;
  paidAt: string | null;
  paymentReference: string | null;
  reportUrl: string | null;
  aiAnalysis: string | null;
  generatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface DataExport {
  id: string;
  exportType: string;
  module: string;
  filters: Record<string, unknown> | null;
  status: string;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  rowCount: number | null;
  expiresAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'informes', label: 'Informes Inteligentes' },
  { key: 'exportar', label: 'Exportar Datos' },
  { key: 'historial', label: 'Historial' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const REPORT_TYPE_LABEL: Record<string, string> = {
  GESTION: 'Gestion',
  RECLAMO_FALENCIA: 'Reclamo/Falencia',
  INCUMPLIMIENTO_MERCADO: 'Incumplimiento Mercado',
  CUSTOM: 'Personalizado',
};

const REPORT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
  CANCELLED: 'Cancelado',
};

const REPORT_STATUS_BADGE: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'default',
};

const EXPORT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  COMPLETED: 'Listo',
  FAILED: 'Fallido',
};

const EXPORT_STATUS_BADGE: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
};

const EXPORT_MODULES = [
  { value: 'work-orders', label: 'Ordenes de Trabajo' },
  { value: 'clients', label: 'Clientes' },
  { value: 'vehicles', label: 'Vehiculos' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'invoices', label: 'Facturas' },
  { value: 'payments', label: 'Pagos' },
  { value: 'suppliers', label: 'Proveedores' },
  { value: 'employees', label: 'Empleados' },
];

const EXPORT_FORMATS = [
  { value: 'CSV', label: 'CSV' },
  { value: 'EXCEL', label: 'Excel (.xlsx)' },
  { value: 'PDF', label: 'PDF' },
];

const SCOPE_MODULES = [
  { value: 'work-orders', label: 'Ordenes de Trabajo' },
  { value: 'clients', label: 'Clientes' },
  { value: 'vehicles', label: 'Vehiculos' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'invoices', label: 'Facturacion' },
  { value: 'payments', label: 'Cobranza' },
  { value: 'suppliers', label: 'Proveedores' },
  { value: 'employees', label: 'Recursos Humanos' },
];

const PRICING_COLORS: Record<string, { border: string; bg: string; icon: string }> = {
  GESTION: { border: 'border-blue-500', bg: 'bg-blue-50', icon: 'text-blue-600' },
  RECLAMO_FALENCIA: { border: 'border-amber-500', bg: 'bg-amber-50', icon: 'text-amber-600' },
  INCUMPLIMIENTO_MERCADO: { border: 'border-red-500', bg: 'bg-red-50', icon: 'text-red-600' },
  CUSTOM: { border: 'border-purple-500', bg: 'bg-purple-50', icon: 'text-purple-600' },
};

const formatCLP = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
};

function timeUntilExpiry(expiresAt: string | null): string {
  if (!expiresAt) return '—';
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  if (diff <= 0) return 'Expirado';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

// ---------------------------------------------------------------------------
// Select Component (inline, matches project style)
// ---------------------------------------------------------------------------

function Select({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function InformesPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('informes');

  // Data state
  const [pricing, setPricing] = useState<ReportPricing[]>([]);
  const [reports, setReports] = useState<ReportRequest[]>([]);
  const [exports, setExports] = useState<DataExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Report request modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [modalReportType, setModalReportType] = useState('GESTION');
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalModule, setModalModule] = useState('work-orders');
  const [modalDateFrom, setModalDateFrom] = useState('');
  const [modalDateTo, setModalDateTo] = useState('');
  const [modalCustomAmount, setModalCustomAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Export form
  const [exportModule, setExportModule] = useState('work-orders');
  const [exportFormat, setExportFormat] = useState('CSV');
  const [exportSubmitting, setExportSubmitting] = useState(false);

  // Pay modal
  const [payReportId, setPayReportId] = useState<string | null>(null);
  const [payReference, setPayReference] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  const fetchPricing = useCallback(async () => {
    try {
      const data = await api.get<ReportPricing[]>('/reports/pricing');
      setPricing(data);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await api.get<{ data: ReportRequest[] }>('/reports');
      setReports(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar informes');
    }
  }, []);

  const fetchExports = useCallback(async () => {
    try {
      const data = await api.get<DataExport[]>('/reports/exports');
      setExports(data);
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError('');
      await Promise.all([fetchPricing(), fetchReports(), fetchExports()]);
      setLoading(false);
    }
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Actions — Reports
  // -------------------------------------------------------------------------

  const handleRequestReport = async () => {
    if (!modalTitle.trim()) {
      setError('Ingrese un titulo para el informe');
      return;
    }
    if (!modalDateFrom || !modalDateTo) {
      setError('Seleccione el rango de fechas para el informe');
      return;
    }
    if (modalReportType === 'CUSTOM' && (!modalCustomAmount || Number(modalCustomAmount) <= 0)) {
      setError('Para informes personalizados debe especificar el monto');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/reports', {
        reportType: modalReportType,
        title: modalTitle,
        description: modalDescription || undefined,
        scope: {
          module: modalModule,
          dateFrom: modalDateFrom,
          dateTo: modalDateTo,
        },
        ...(modalReportType === 'CUSTOM' && { amount: Number(modalCustomAmount) }),
      });
      setShowReportModal(false);
      resetReportModal();
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al solicitar informe');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayReport = async () => {
    if (!payReportId || !payReference.trim()) {
      setError('Ingrese la referencia de pago');
      return;
    }

    setPaySubmitting(true);
    setError('');
    try {
      await api.patch(`/reports/${payReportId}/pay`, {
        paymentReference: payReference,
      });
      setPayReportId(null);
      setPayReference('');
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleCancelReport = async (id: string) => {
    if (!confirm('Seguro que desea cancelar esta solicitud de informe?')) return;
    try {
      await api.patch(`/reports/${id}/cancel`);
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar informe');
    }
  };

  const resetReportModal = () => {
    setModalReportType('GESTION');
    setModalTitle('');
    setModalDescription('');
    setModalModule('work-orders');
    setModalDateFrom('');
    setModalDateTo('');
    setModalCustomAmount('');
  };

  // -------------------------------------------------------------------------
  // Actions — Exports
  // -------------------------------------------------------------------------

  const handleRequestExport = async () => {
    setExportSubmitting(true);
    setError('');
    try {
      await api.post('/reports/exports', {
        exportType: exportFormat,
        module: exportModule,
      });
      await fetchExports();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al solicitar exportacion');
    } finally {
      setExportSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Table columns — Reports
  // -------------------------------------------------------------------------

  const reportColumns: Column<ReportRequest>[] = [
    {
      key: 'reportType',
      header: 'Tipo',
      render: (r) => (
        <Badge variant={r.reportType === 'GESTION' ? 'primary' : r.reportType === 'RECLAMO_FALENCIA' ? 'warning' : r.reportType === 'INCUMPLIMIENTO_MERCADO' ? 'error' : 'info'}>
          {REPORT_TYPE_LABEL[r.reportType] || r.reportType}
        </Badge>
      ),
    },
    {
      key: 'title',
      header: 'Titulo',
      render: (r) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{r.title}</p>
          {r.description && <p className="text-xs text-slate-400 truncate max-w-xs">{r.description}</p>}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Precio',
      render: (r) => <span className="font-semibold text-slate-800">{formatCLP(r.amount)}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => (
        <Badge variant={REPORT_STATUS_BADGE[r.status] || 'default'}>
          {REPORT_STATUS_LABEL[r.status] || r.status}
        </Badge>
      ),
    },
    {
      key: 'isPaid',
      header: 'Pago',
      render: (r) => (
        <Badge variant={r.isPaid ? 'success' : 'warning'}>
          {r.isPaid ? 'Pagado' : 'Pendiente'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      className: 'hidden sm:table-cell',
      render: (r) => formatDate(r.createdAt),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (r) => (
        <div className="flex items-center gap-1">
          {r.status === 'COMPLETED' && r.isPaid && (
            <Button size="sm" variant="primary">
              Descargar
            </Button>
          )}
          {r.status === 'PENDING' && !r.isPaid && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPayReportId(r.id);
                  setPayReference('');
                }}
              >
                Pagar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleCancelReport(r.id)}>
                Cancelar
              </Button>
            </>
          )}
          {r.status === 'PROCESSING' && (
            <span className="text-xs text-slate-400">Procesando...</span>
          )}
        </div>
      ),
    },
  ];

  // -------------------------------------------------------------------------
  // Table columns — Exports
  // -------------------------------------------------------------------------

  const exportColumns: Column<DataExport>[] = [
    {
      key: 'module',
      header: 'Modulo',
      render: (e) => {
        const mod = EXPORT_MODULES.find((m) => m.value === e.module);
        return <span className="font-medium text-slate-800">{mod?.label || e.module}</span>;
      },
    },
    {
      key: 'exportType',
      header: 'Formato',
      render: (e) => (
        <Badge variant={e.exportType === 'CSV' ? 'default' : e.exportType === 'EXCEL' ? 'primary' : 'info'}>
          {e.exportType}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (e) => (
        <Badge variant={EXPORT_STATUS_BADGE[e.status] || 'default'}>
          {EXPORT_STATUS_LABEL[e.status] || e.status}
        </Badge>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Expira en',
      render: (e) => {
        if (e.status !== 'COMPLETED') return '—';
        const remaining = timeUntilExpiry(e.expiresAt);
        const isExpired = remaining === 'Expirado';
        return (
          <span className={isExpired ? 'text-red-500 font-medium' : 'text-slate-600'}>
            {remaining}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      className: 'hidden sm:table-cell',
      render: (e) => formatDateTime(e.createdAt),
    },
    {
      key: 'acciones',
      header: '',
      render: (e) => {
        if (e.status === 'COMPLETED' && e.expiresAt && new Date(e.expiresAt) > new Date()) {
          return (
            <Button size="sm" variant="primary">
              Descargar
            </Button>
          );
        }
        if (e.status === 'PROCESSING') {
          return <span className="text-xs text-slate-400">Procesando...</span>;
        }
        return null;
      },
    },
  ];

  // -------------------------------------------------------------------------
  // Historial — combined timeline
  // -------------------------------------------------------------------------

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalSpentMonth = reports
    .filter((r) => {
      if (!r.isPaid || !r.paidAt) return false;
      const d = new Date(r.paidAt);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalSpentYear = reports
    .filter((r) => {
      if (!r.isPaid || !r.paidAt) return false;
      const d = new Date(r.paidAt);
      return d.getFullYear() === currentYear;
    })
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const historyItems = [
    ...reports.map((r) => ({
      id: r.id,
      type: 'report' as const,
      date: r.createdAt,
      label: r.title,
      detail: REPORT_TYPE_LABEL[r.reportType] || r.reportType,
      status: r.status,
      amount: Number(r.amount),
      isPaid: r.isPaid,
    })),
    ...exports.map((e) => ({
      id: e.id,
      type: 'export' as const,
      date: e.createdAt,
      label: `Exportacion ${e.exportType}`,
      detail: EXPORT_MODULES.find((m) => m.value === e.module)?.label || e.module,
      status: e.status,
      amount: 0,
      isPaid: true, // Free
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading && reports.length === 0 && exports.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <svg
            className="animate-spin h-6 w-6 text-[var(--color-primary)]"
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
          <span className="text-slate-500">Cargando centro de informes...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* HEADER                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100">
            <svg className="w-6 h-6 text-indigo-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Informes y Exportaciones</h1>
            <p className="text-sm text-slate-500">Informes inteligentes con IA y exportacion de datos gratuita</p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 ml-4">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TABS                                                              */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex border-b border-[var(--color-border)]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* TAB: INFORMES INTELIGENTES                                        */}
      {/* ================================================================= */}
      {activeTab === 'informes' && (
        <div className="space-y-6">
          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricing.map((p) => {
              const colors = PRICING_COLORS[p.type] || PRICING_COLORS.CUSTOM;
              return (
                <Card key={p.type} className={`border-l-4 ${colors.border}`}>
                  <CardBody>
                    <div className="space-y-3">
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${colors.bg}`}>
                        <svg className={`w-5 h-5 ${colors.icon}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{p.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-bold text-slate-900">
                            {p.type === 'CUSTOM' ? 'A convenir' : formatCLP(p.price)}
                          </p>
                          <p className="text-xs text-slate-400">Entrega en {p.deliveryDays} dias habiles</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setModalReportType(p.type);
                          setShowReportModal(true);
                        }}
                      >
                        Solicitar Informe
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>

          {/* Reports Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Mis Informes Solicitados</h3>
                <span className="text-sm text-slate-500">{reports.length} informe{reports.length !== 1 ? 's' : ''}</span>
              </div>
            </CardHeader>
            <Table
              columns={reportColumns}
              data={reports}
              keyExtractor={(r) => r.id}
              loading={loading}
              emptyMessage="No ha solicitado informes aun"
            />
          </Card>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB: EXPORTAR DATOS                                               */}
      {/* ================================================================= */}
      {activeTab === 'exportar' && (
        <div className="space-y-6">
          {/* Export Form */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-800">Exportar Datos</h3>
                <Badge variant="success">GRATIS</Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  Descargue los datos de cualquier modulo en formato CSV, Excel o PDF. Las exportaciones son gratuitas y estan disponibles por 24 horas.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <Select
                    label="Modulo"
                    value={exportModule}
                    onChange={setExportModule}
                    options={EXPORT_MODULES}
                  />
                  <Select
                    label="Formato"
                    value={exportFormat}
                    onChange={setExportFormat}
                    options={EXPORT_FORMATS}
                  />
                  <Button
                    loading={exportSubmitting}
                    onClick={handleRequestExport}
                    className="whitespace-nowrap"
                  >
                    Exportar Datos
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Exports Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Exportaciones Recientes</h3>
                <span className="text-sm text-slate-500">{exports.length} exportacion{exports.length !== 1 ? 'es' : ''}</span>
              </div>
            </CardHeader>
            <Table
              columns={exportColumns}
              data={exports}
              keyExtractor={(e) => e.id}
              loading={loading}
              emptyMessage="No hay exportaciones recientes"
            />
          </Card>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB: HISTORIAL                                                    */}
      {/* ================================================================= */}
      {activeTab === 'historial' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardBody>
                <p className="text-xs text-slate-500">Total Gastado Este Mes</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{formatCLP(totalSpentMonth)}</p>
              </CardBody>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
              <CardBody>
                <p className="text-xs text-slate-500">Total Gastado Este Ano</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{formatCLP(totalSpentYear)}</p>
              </CardBody>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardBody>
                <p className="text-xs text-slate-500">Exportaciones Gratuitas</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{exports.length}</p>
              </CardBody>
            </Card>
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-slate-800">Historial Completo</h3>
            </CardHeader>
            <CardBody>
              {historyItems.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No hay actividad registrada</p>
              ) : (
                <div className="space-y-3">
                  {historyItems.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-[var(--color-border)]"
                    >
                      {/* Icon */}
                      <div
                        className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ${
                          item.type === 'report' ? 'bg-indigo-100' : 'bg-emerald-100'
                        }`}
                      >
                        {item.type === 'report' ? (
                          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.label}</p>
                          <Badge variant={item.type === 'report' ? 'info' : 'success'}>
                            {item.type === 'report' ? 'Informe' : 'Exportacion'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400">{item.detail}</p>
                      </div>

                      {/* Status */}
                      <Badge
                        variant={
                          item.type === 'report'
                            ? REPORT_STATUS_BADGE[item.status] || 'default'
                            : EXPORT_STATUS_BADGE[item.status] || 'default'
                        }
                      >
                        {item.type === 'report'
                          ? REPORT_STATUS_LABEL[item.status] || item.status
                          : EXPORT_STATUS_LABEL[item.status] || item.status}
                      </Badge>

                      {/* Amount */}
                      <div className="text-right hidden sm:block">
                        {item.amount > 0 ? (
                          <p className="text-sm font-semibold text-slate-800">{formatCLP(item.amount)}</p>
                        ) : (
                          <p className="text-xs text-emerald-600 font-medium">Gratis</p>
                        )}
                      </div>

                      {/* Date */}
                      <p className="text-xs text-slate-400 whitespace-nowrap hidden md:block">{formatDate(item.date)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: REQUEST REPORT                                             */}
      {/* ================================================================= */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { setShowReportModal(false); resetReportModal(); }}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Solicitar Informe</h3>
                <button
                  onClick={() => { setShowReportModal(false); resetReportModal(); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Report Type */}
              <Select
                label="Tipo de Informe"
                value={modalReportType}
                onChange={setModalReportType}
                options={[
                  { value: 'GESTION', label: 'Informe de Gestion — $25.000' },
                  { value: 'RECLAMO_FALENCIA', label: 'Reclamo/Falencia — $45.000' },
                  { value: 'INCUMPLIMIENTO_MERCADO', label: 'Incumplimiento Mercado — $65.000' },
                  { value: 'CUSTOM', label: 'Personalizado — A convenir' },
                ]}
              />

              {/* Title */}
              <Input
                label="Titulo del Informe"
                placeholder="Ej: Informe de gestion Q1 2026"
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
              />

              {/* Description */}
              <div className="w-full">
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripcion (opcional)</label>
                <textarea
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  placeholder="Detalle lo que necesita analizar..."
                />
              </div>

              {/* Scope Module */}
              <Select
                label="Modulo a Analizar"
                value={modalModule}
                onChange={setModalModule}
                options={SCOPE_MODULES}
              />

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Desde"
                  type="date"
                  value={modalDateFrom}
                  onChange={(e) => setModalDateFrom(e.target.value)}
                />
                <Input
                  label="Hasta"
                  type="date"
                  value={modalDateTo}
                  onChange={(e) => setModalDateTo(e.target.value)}
                />
              </div>

              {/* Custom Amount */}
              {modalReportType === 'CUSTOM' && (
                <Input
                  label="Monto (CLP)"
                  type="number"
                  min={1}
                  placeholder="Ingrese el monto acordado"
                  value={modalCustomAmount}
                  onChange={(e) => setModalCustomAmount(e.target.value)}
                />
              )}

              {/* Pricing info */}
              {modalReportType !== 'CUSTOM' && (
                <div className="p-3 bg-slate-50 rounded-lg border border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Precio del informe</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCLP(
                        pricing.find((p) => p.type === modalReportType)?.price || 0
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    El informe sera generado una vez confirmado el pago. Entrega estimada:{' '}
                    {pricing.find((p) => p.type === modalReportType)?.deliveryDays || '—'} dias habiles.
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => { setShowReportModal(false); resetReportModal(); }}>
                Cancelar
              </Button>
              <Button loading={submitting} onClick={handleRequestReport}>
                Solicitar Informe
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: PAY REPORT                                                 */}
      {/* ================================================================= */}
      {payReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { setPayReportId(null); setPayReference(''); }}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Registrar Pago</h3>
                <button
                  onClick={() => { setPayReportId(null); setPayReference(''); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              {(() => {
                const r = reports.find((rep) => rep.id === payReportId);
                if (!r) return null;
                return (
                  <div className="p-3 bg-slate-50 rounded-lg border border-[var(--color-border)]">
                    <p className="text-sm font-medium text-slate-800">{r.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{REPORT_TYPE_LABEL[r.reportType]}</p>
                    <p className="text-lg font-bold text-slate-900 mt-2">{formatCLP(r.amount)}</p>
                  </div>
                );
              })()}
              <Input
                label="Referencia de Pago"
                placeholder="Ej: Transferencia #12345, Comprobante N. 567"
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
              />
              <p className="text-xs text-slate-400">
                Ingrese el numero de transferencia, comprobante o referencia de pago. El informe comenzara a procesarse una vez confirmado.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => { setPayReportId(null); setPayReference(''); }}>
                Cancelar
              </Button>
              <Button loading={paySubmitting} onClick={handlePayReport}>
                Confirmar Pago
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

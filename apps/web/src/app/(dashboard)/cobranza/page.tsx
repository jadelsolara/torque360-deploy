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

interface ReceivablesSummary {
  totalPending: number;
  totalOverdue: number;
  totalCollectedThisMonth: number;
  averageDaysToCollect: number;
  byClient: { clientId: string; clientName: string; totalPending: number; totalOverdue: number }[];
  byAge: {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    over90: number;
  };
  overdueInvoices: {
    id: string;
    invoiceNumber: string;
    clientName: string;
    amount: number;
    dueDate: string;
    daysOverdue: number;
  }[];
}

interface Payment {
  id: string;
  clientId: string;
  clientName?: string;
  invoiceId: string;
  invoiceNumber?: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  status: string;
  bankName?: string;
  transactionRef?: string;
  chequeNumber?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
}

interface OverdueClient {
  clientId: string;
  clientName: string;
  rut?: string;
  totalOverdue: number;
  invoiceCount: number;
  maxDaysOverdue: number;
  oldestDueDate: string;
}

interface CalendarDay {
  date: string;
  invoices: {
    id: string;
    invoiceNumber: string;
    clientName: string;
    amount: number;
    daysOverdue?: number;
  }[];
  totalAmount: number;
}

interface MonthlyData {
  month: number;
  monthName: string;
  invoiced: number;
  collected: number;
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

type TabKey = 'resumen' | 'pagos' | 'morosos' | 'calendario' | 'mensual';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'morosos', label: 'Clientes Morosos' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'mensual', label: 'Mensual' },
];

const PAYMENT_METHODS = [
  { value: '', label: 'Todos' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta Credito' },
  { value: 'TARJETA_DEBITO', label: 'Tarjeta Debito' },
  { value: 'WEBPAY', label: 'Webpay' },
  { value: 'FLOW', label: 'Flow' },
  { value: 'COMPENSACION', label: 'Compensacion' },
];

const PAYMENT_METHODS_FORM = [
  { value: '', label: 'Seleccionar...' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta Credito' },
  { value: 'TARJETA_DEBITO', label: 'Tarjeta Debito' },
  { value: 'WEBPAY', label: 'Webpay' },
  { value: 'FLOW', label: 'Flow' },
  { value: 'COMPENSACION', label: 'Compensacion' },
];

const PAYMENT_STATUSES = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'BOUNCED', label: 'Rebotado' },
  { value: 'VOIDED', label: 'Anulado' },
];

const METHOD_LABEL: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
  TARJETA_CREDITO: 'T. Credito',
  TARJETA_DEBITO: 'T. Debito',
  WEBPAY: 'Webpay',
  FLOW: 'Flow',
  COMPENSACION: 'Compensacion',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  BOUNCED: 'Rebotado',
  VOIDED: 'Anulado',
};

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  BOUNCED: 'error',
  VOIDED: 'error',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '\u2014';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

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
// Spinner Component
// ---------------------------------------------------------------------------

function Spinner({ text = 'Cargando...' }: { text?: string }) {
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
        <span className="text-slate-500">{text}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CobranzaPage() {
  const [tab, setTab] = useState<TabKey>('resumen');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- Resumen state ---
  const [summary, setSummary] = useState<ReceivablesSummary | null>(null);

  // --- Pagos state ---
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // --- Registrar Pago modal ---
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formClientId, setFormClientId] = useState('');
  const [formInvoiceId, setFormInvoiceId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formBankName, setFormBankName] = useState('');
  const [formTransactionRef, setFormTransactionRef] = useState('');
  const [formChequeNumber, setFormChequeNumber] = useState('');
  const [formReceiptUrl, setFormReceiptUrl] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // --- Morosos state ---
  const [overdueClients, setOverdueClients] = useState<OverdueClient[]>([]);
  const [overdueLoading, setOverdueLoading] = useState(false);

  // --- Calendario state ---
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // --- Mensual state ---
  const [monthlyYear, setMonthlyYear] = useState(now.getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.get<ReceivablesSummary>('/clients/receivables/summary');
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar resumen de cobranza');
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClient) params.set('clientId', filterClient);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);
      if (filterMethod) params.set('method', filterMethod);
      if (filterStatus) params.set('status', filterStatus);
      const qs = params.toString();
      const data = await api.get<Payment[]>(`/clients/payments${qs ? `?${qs}` : ''}`);
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
      setPaymentsLoading(false);
    }
  }, [filterClient, filterDateFrom, filterDateTo, filterMethod, filterStatus]);

  const fetchOverdueClients = useCallback(async () => {
    setOverdueLoading(true);
    try {
      const data = await api.get<OverdueClient[]>('/clients/receivables/overdue-clients');
      setOverdueClients(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clientes morosos');
    } finally {
      setOverdueLoading(false);
    }
  }, []);

  const fetchCalendar = useCallback(async () => {
    setCalendarLoading(true);
    try {
      const data = await api.get<CalendarDay[]>(`/clients/receivables/calendar?month=${calMonth}&year=${calYear}`);
      setCalendarData(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar calendario');
    } finally {
      setCalendarLoading(false);
    }
  }, [calMonth, calYear]);

  const fetchMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const data = await api.get<MonthlyData[]>(`/clients/receivables/monthly?year=${monthlyYear}`);
      setMonthlyData(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos mensuales');
    } finally {
      setMonthlyLoading(false);
    }
  }, [monthlyYear]);

  // Initial load
  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      await fetchSummary();
      setLoading(false);
    }
    loadInitial();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load tab-specific data
  useEffect(() => {
    if (tab === 'pagos') fetchPayments();
    if (tab === 'morosos') fetchOverdueClients();
    if (tab === 'calendario') fetchCalendar();
    if (tab === 'mensual') fetchMonthly();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload calendar when month/year changes
  useEffect(() => {
    if (tab === 'calendario') fetchCalendar();
  }, [calMonth, calYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload monthly when year changes
  useEffect(() => {
    if (tab === 'mensual') fetchMonthly();
  }, [monthlyYear]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleSearchPayments = async () => {
    await fetchPayments();
  };

  const handleConfirmPayment = async (id: string) => {
    try {
      await api.patch(`/clients/payments/${id}/confirm`);
      await fetchPayments();
      await fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar pago');
    }
  };

  const handleVoidPayment = async (id: string) => {
    if (!confirm('Seguro que desea anular este pago?')) return;
    try {
      await api.patch(`/clients/payments/${id}/void`);
      await fetchPayments();
      await fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al anular pago');
    }
  };

  const resetPaymentForm = () => {
    setFormClientId('');
    setFormInvoiceId('');
    setFormAmount('');
    setFormMethod('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormBankName('');
    setFormTransactionRef('');
    setFormChequeNumber('');
    setFormReceiptUrl('');
    setFormNotes('');
    setShowPaymentModal(false);
  };

  const handleSubmitPayment = async () => {
    if (!formClientId || !formInvoiceId || !formAmount || !formMethod || !formDate) {
      setError('Complete los campos obligatorios: Cliente, Factura, Monto, Metodo y Fecha');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        clientId: formClientId,
        invoiceId: formInvoiceId,
        amount: Number(formAmount),
        paymentMethod: formMethod,
        paymentDate: formDate,
      };
      if (formBankName) payload.bankName = formBankName;
      if (formTransactionRef) payload.transactionRef = formTransactionRef;
      if (formChequeNumber) payload.chequeNumber = formChequeNumber;
      if (formReceiptUrl) payload.receiptUrl = formReceiptUrl;
      if (formNotes) payload.notes = formNotes;

      await api.post('/clients/payments', payload);
      resetPaymentForm();
      await fetchPayments();
      await fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Table Columns — Pagos
  // -------------------------------------------------------------------------

  const paymentColumns: Column<Payment>[] = [
    {
      key: 'paymentDate',
      header: 'Fecha',
      render: (p) => formatDate(p.paymentDate),
    },
    {
      key: 'clientName',
      header: 'Cliente',
      render: (p) => <span className="font-medium text-slate-800">{p.clientName || p.clientId}</span>,
    },
    {
      key: 'invoiceNumber',
      header: 'Factura',
      className: 'hidden sm:table-cell',
      render: (p) => p.invoiceNumber || p.invoiceId,
    },
    {
      key: 'amount',
      header: 'Monto',
      render: (p) => <span className="font-semibold text-slate-800">{formatCurrency(p.amount)}</span>,
    },
    {
      key: 'paymentMethod',
      header: 'Metodo',
      className: 'hidden md:table-cell',
      render: (p) => (
        <Badge variant="info">{METHOD_LABEL[p.paymentMethod] || p.paymentMethod}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (p) => (
        <Badge variant={STATUS_BADGE[p.status] || 'default'}>
          {STATUS_LABEL[p.status] || p.status}
        </Badge>
      ),
    },
    {
      key: 'transactionRef',
      header: 'Referencia',
      className: 'hidden lg:table-cell',
      render: (p) => (
        <span className="text-xs text-slate-500">{p.transactionRef || p.chequeNumber || '\u2014'}</span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (p) => (
        <div className="flex items-center gap-1">
          {p.status === 'PENDING' && (
            <Button size="sm" variant="secondary" onClick={() => handleConfirmPayment(p.id)}>
              Confirmar
            </Button>
          )}
          {(p.status === 'PENDING' || p.status === 'CONFIRMED') && (
            <Button size="sm" variant="danger" onClick={() => handleVoidPayment(p.id)}>
              Anular
            </Button>
          )}
        </div>
      ),
    },
  ];

  // -------------------------------------------------------------------------
  // Table Columns — Morosos
  // -------------------------------------------------------------------------

  const overdueColumns: Column<OverdueClient>[] = [
    {
      key: 'clientName',
      header: 'Cliente',
      render: (c) => (
        <div>
          <p className="font-medium text-slate-800">{c.clientName}</p>
          {c.rut && <p className="text-xs text-slate-400">{c.rut}</p>}
        </div>
      ),
    },
    {
      key: 'totalOverdue',
      header: 'Total Vencido',
      render: (c) => <span className="font-bold text-red-600">{formatCurrency(c.totalOverdue)}</span>,
    },
    {
      key: 'invoiceCount',
      header: 'Facturas',
      render: (c) => (
        <Badge variant="error">{c.invoiceCount}</Badge>
      ),
    },
    {
      key: 'maxDaysOverdue',
      header: 'Max. Dias Vencido',
      render: (c) => {
        const color = c.maxDaysOverdue > 90
          ? 'text-red-700 font-bold'
          : c.maxDaysOverdue > 60
          ? 'text-red-600 font-semibold'
          : c.maxDaysOverdue > 30
          ? 'text-amber-600 font-medium'
          : 'text-slate-700';
        return <span className={color}>{c.maxDaysOverdue} dias</span>;
      },
    },
    {
      key: 'oldestDueDate',
      header: 'Vencimiento Mas Antiguo',
      className: 'hidden md:table-cell',
      render: (c) => formatDate(c.oldestDueDate),
    },
  ];

  // -------------------------------------------------------------------------
  // Aging Chart (CSS bars)
  // -------------------------------------------------------------------------

  function AgingChart({ byAge }: { byAge: ReceivablesSummary['byAge'] }) {
    const segments = [
      { label: 'Al dia', value: byAge.current, color: 'bg-emerald-500' },
      { label: '1-30 dias', value: byAge.days1_30, color: 'bg-blue-500' },
      { label: '31-60 dias', value: byAge.days31_60, color: 'bg-amber-500' },
      { label: '61-90 dias', value: byAge.days61_90, color: 'bg-orange-500' },
      { label: '>90 dias', value: byAge.over90, color: 'bg-red-500' },
    ];

    const maxValue = Math.max(...segments.map((s) => s.value), 1);

    return (
      <div className="space-y-3">
        {segments.map((seg) => {
          const pct = Math.round((seg.value / maxValue) * 100);
          return (
            <div key={seg.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">{seg.label}</span>
                <span className="font-semibold text-slate-800">{formatCurrency(seg.value)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${seg.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Monthly Chart (CSS bars)
  // -------------------------------------------------------------------------

  function MonthlyChart({ data }: { data: MonthlyData[] }) {
    const maxVal = Math.max(...data.map((d) => Math.max(d.invoiced, d.collected)), 1);

    return (
      <div className="space-y-4">
        {data.map((d) => {
          const invoicedPct = Math.round((d.invoiced / maxVal) * 100);
          const collectedPct = Math.round((d.collected / maxVal) * 100);
          return (
            <div key={d.month}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-700 font-medium w-24">{d.monthName || MONTH_NAMES[d.month - 1]}</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-blue-600">Facturado: {formatCurrency(d.invoiced)}</span>
                  <span className="text-emerald-600">Cobrado: {formatCurrency(d.collected)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-400 transition-all duration-500"
                    style={{ width: `${invoicedPct}%` }}
                  />
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${collectedPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {/* Legend */}
        <div className="flex items-center gap-6 pt-2 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <span className="text-xs text-slate-600">Facturado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-600">Cobrado</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Calendar Grid
  // -------------------------------------------------------------------------

  function CalendarGrid({ data, month, year }: { data: CalendarDay[]; month: number; year: number }) {
    // Build a map of date -> CalendarDay
    const dayMap = new Map<string, CalendarDay>();
    data.forEach((d) => dayMap.set(d.date, d));

    // Get first day of month (0=Sun, convert to Mon-based)
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon=0

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return (
      <div>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map((dn) => (
            <div key={dn} className="text-center text-xs font-semibold text-slate-500 py-1">
              {dn}
            </div>
          ))}
        </div>
        {/* Calendar cells */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-20 bg-slate-50 rounded-lg" />;
            }
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entry = dayMap.get(dateStr);
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                className={`h-20 rounded-lg border p-1 overflow-hidden ${
                  isToday
                    ? 'border-blue-400 bg-blue-50'
                    : entry && entry.totalAmount > 0
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-[var(--color-border)] bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-slate-600'}`}>
                    {day}
                  </span>
                  {entry && entry.invoices.length > 0 && (
                    <span className="text-[10px] text-amber-700 font-semibold">
                      {entry.invoices.length}
                    </span>
                  )}
                </div>
                {entry && entry.totalAmount > 0 && (
                  <div className="mt-0.5">
                    <p className="text-[10px] font-bold text-slate-800 truncate">
                      {formatCurrency(entry.totalAmount)}
                    </p>
                    {entry.invoices.slice(0, 2).map((inv) => (
                      <p key={inv.id} className="text-[9px] text-slate-500 truncate">
                        {inv.clientName}
                      </p>
                    ))}
                    {entry.invoices.length > 2 && (
                      <p className="text-[9px] text-slate-400">+{entry.invoices.length - 2} mas</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return <Spinner text="Cargando cobranza..." />;
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
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100">
            <svg className="w-6 h-6 text-emerald-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cuentas por Cobrar</h1>
            <p className="text-sm text-slate-500">Gestion de cobranza, pagos y morosidad</p>
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
      {/* TAB BAR                                                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="border-b border-[var(--color-border)]">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ================================================================= */}
      {/* TAB: RESUMEN                                                      */}
      {/* ================================================================= */}
      {tab === 'resumen' && summary && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardBody>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(summary.totalPending)}</p>
                <p className="text-xs text-slate-500 mt-1">Pendiente Total</p>
              </CardBody>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardBody>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOverdue)}</p>
                <p className="text-xs text-slate-500 mt-1">Vencido</p>
              </CardBody>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardBody>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalCollectedThisMonth)}</p>
                <p className="text-xs text-slate-500 mt-1">Cobrado Este Mes</p>
              </CardBody>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardBody>
                <p className="text-2xl font-bold text-slate-800">{summary.averageDaysToCollect}</p>
                <p className="text-xs text-slate-500 mt-1">Dias Promedio de Cobro</p>
              </CardBody>
            </Card>
          </div>

          {/* Aging Chart */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-slate-800">Antiguedad de Deuda</h3>
            </CardHeader>
            <CardBody>
              <AgingChart byAge={summary.byAge} />
            </CardBody>
          </Card>

          {/* Top Deudores */}
          {summary.byClient && summary.byClient.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Top Deudores</h3>
                  <span className="text-sm text-slate-500">{summary.byClient.length} clientes</span>
                </div>
              </CardHeader>
              <Table
                columns={[
                  {
                    key: 'clientName',
                    header: 'Cliente',
                    render: (c: ReceivablesSummary['byClient'][number]) => (
                      <span className="font-medium text-slate-800">{c.clientName}</span>
                    ),
                  },
                  {
                    key: 'totalPending',
                    header: 'Pendiente',
                    render: (c: ReceivablesSummary['byClient'][number]) => (
                      <span className="font-semibold text-blue-700">{formatCurrency(c.totalPending)}</span>
                    ),
                  },
                  {
                    key: 'totalOverdue',
                    header: 'Vencido',
                    render: (c: ReceivablesSummary['byClient'][number]) => (
                      <span className={c.totalOverdue > 0 ? 'font-semibold text-red-600' : 'text-slate-400'}>
                        {formatCurrency(c.totalOverdue)}
                      </span>
                    ),
                  },
                ]}
                data={summary.byClient}
                keyExtractor={(c) => c.clientId}
                emptyMessage="Sin deudores"
              />
            </Card>
          )}

          {/* Facturas Vencidas */}
          {summary.overdueInvoices && summary.overdueInvoices.length > 0 && (
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-red-800">Facturas Vencidas</h3>
                </div>
              </CardHeader>
              <Table
                columns={[
                  {
                    key: 'invoiceNumber',
                    header: 'Factura',
                    render: (inv: ReceivablesSummary['overdueInvoices'][number]) => (
                      <span className="font-medium text-slate-800">{inv.invoiceNumber}</span>
                    ),
                  },
                  {
                    key: 'clientName',
                    header: 'Cliente',
                  },
                  {
                    key: 'amount',
                    header: 'Monto',
                    render: (inv: ReceivablesSummary['overdueInvoices'][number]) => (
                      <span className="font-semibold">{formatCurrency(inv.amount)}</span>
                    ),
                  },
                  {
                    key: 'dueDate',
                    header: 'Vencimiento',
                    className: 'hidden sm:table-cell',
                    render: (inv: ReceivablesSummary['overdueInvoices'][number]) => formatDate(inv.dueDate),
                  },
                  {
                    key: 'daysOverdue',
                    header: 'Dias Vencido',
                    render: (inv: ReceivablesSummary['overdueInvoices'][number]) => (
                      <Badge variant={inv.daysOverdue > 60 ? 'error' : inv.daysOverdue > 30 ? 'warning' : 'info'}>
                        {inv.daysOverdue} dias
                      </Badge>
                    ),
                  },
                ]}
                data={summary.overdueInvoices}
                keyExtractor={(inv) => inv.id}
                emptyMessage="No hay facturas vencidas"
              />
            </Card>
          )}
        </>
      )}

      {/* ================================================================= */}
      {/* TAB: PAGOS                                                        */}
      {/* ================================================================= */}
      {tab === 'pagos' && (
        <>
          {/* Filter bar + action */}
          <Card>
            <CardBody>
              <div className="flex flex-col lg:flex-row gap-3 items-end">
                <Input
                  label="ID Cliente"
                  placeholder="ID del cliente..."
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                />
                <Input
                  label="Desde"
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
                <Input
                  label="Hasta"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
                <Select
                  label="Metodo"
                  value={filterMethod}
                  onChange={setFilterMethod}
                  options={PAYMENT_METHODS}
                />
                <Select
                  label="Estado"
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={PAYMENT_STATUSES}
                />
                <Button onClick={handleSearchPayments} className="whitespace-nowrap">
                  Buscar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowPaymentModal(true)}
                  className="whitespace-nowrap"
                >
                  + Registrar Pago
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Registrar Pago Modal */}
          {showPaymentModal && (
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Registrar Pago</h3>
                  <Button size="sm" variant="ghost" onClick={resetPaymentForm}>
                    Cancelar
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {/* Required fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input
                      label="ID Cliente *"
                      placeholder="ID del cliente"
                      value={formClientId}
                      onChange={(e) => setFormClientId(e.target.value)}
                    />
                    <Input
                      label="ID Factura *"
                      placeholder="ID de la factura"
                      value={formInvoiceId}
                      onChange={(e) => setFormInvoiceId(e.target.value)}
                    />
                    <Input
                      label="Monto *"
                      type="number"
                      min={1}
                      placeholder="0"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                    />
                    <Select
                      label="Metodo de Pago *"
                      value={formMethod}
                      onChange={setFormMethod}
                      options={PAYMENT_METHODS_FORM}
                    />
                    <Input
                      label="Fecha de Pago *"
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>

                  {/* Optional fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input
                      label="Banco"
                      placeholder="Nombre del banco"
                      value={formBankName}
                      onChange={(e) => setFormBankName(e.target.value)}
                    />
                    <Input
                      label="Ref. Transaccion"
                      placeholder="Numero de referencia"
                      value={formTransactionRef}
                      onChange={(e) => setFormTransactionRef(e.target.value)}
                    />
                    <Input
                      label="N. Cheque"
                      placeholder="Numero de cheque"
                      value={formChequeNumber}
                      onChange={(e) => setFormChequeNumber(e.target.value)}
                    />
                    <Input
                      label="URL Comprobante"
                      placeholder="https://..."
                      value={formReceiptUrl}
                      onChange={(e) => setFormReceiptUrl(e.target.value)}
                    />
                  </div>

                  {/* Notes */}
                  <div className="w-full">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
                    <textarea
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Observaciones adicionales..."
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
                    <Button variant="ghost" onClick={resetPaymentForm}>
                      Cancelar
                    </Button>
                    <Button loading={submitting} onClick={handleSubmitPayment}>
                      Registrar Pago
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Historial de Pagos</h3>
                <span className="text-sm text-slate-500">{payments.length} pago{payments.length !== 1 ? 's' : ''}</span>
              </div>
            </CardHeader>
            <Table
              columns={paymentColumns}
              data={payments}
              keyExtractor={(p) => p.id}
              loading={paymentsLoading}
              emptyMessage="No se encontraron pagos"
            />
          </Card>
        </>
      )}

      {/* ================================================================= */}
      {/* TAB: CLIENTES MOROSOS                                             */}
      {/* ================================================================= */}
      {tab === 'morosos' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-800">Clientes Morosos</h3>
              </div>
              <span className="text-sm text-slate-500">
                {overdueClients.length} cliente{overdueClients.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardHeader>
          <Table
            columns={overdueColumns}
            data={overdueClients}
            keyExtractor={(c) => c.clientId}
            loading={overdueLoading}
            emptyMessage="No hay clientes morosos"
          />
          {/* Summary footer */}
          {overdueClients.length > 0 && (
            <div className="px-4 py-3 bg-red-50 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-red-800">TOTAL DEUDA VENCIDA</span>
                <span className="font-extrabold text-base text-red-700">
                  {formatCurrency(overdueClients.reduce((sum, c) => sum + c.totalOverdue, 0))}
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ================================================================= */}
      {/* TAB: CALENDARIO                                                   */}
      {/* ================================================================= */}
      {tab === 'calendario' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                Calendario de Cobranza
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const prev = calMonth === 1 ? 12 : calMonth - 1;
                    const prevYear = calMonth === 1 ? calYear - 1 : calYear;
                    setCalMonth(prev);
                    setCalYear(prevYear);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </Button>
                <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">
                  {MONTH_NAMES[calMonth - 1]} {calYear}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const next = calMonth === 12 ? 1 : calMonth + 1;
                    const nextYear = calMonth === 12 ? calYear + 1 : calYear;
                    setCalMonth(next);
                    setCalYear(nextYear);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {calendarLoading ? (
              <Spinner text="Cargando calendario..." />
            ) : (
              <CalendarGrid data={calendarData} month={calMonth} year={calYear} />
            )}
          </CardBody>
        </Card>
      )}

      {/* ================================================================= */}
      {/* TAB: MENSUAL                                                      */}
      {/* ================================================================= */}
      {tab === 'mensual' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                Facturado vs Cobrado
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMonthlyYear((y) => y - 1);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                  </svg>
                </Button>
                <span className="text-sm font-medium text-slate-700 min-w-[60px] text-center">
                  {monthlyYear}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMonthlyYear((y) => y + 1);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {monthlyLoading ? (
              <Spinner text="Cargando datos mensuales..." />
            ) : monthlyData.length > 0 ? (
              <>
                <MonthlyChart data={monthlyData} />

                {/* Summary totals */}
                <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Total Facturado</span>
                      <p className="text-lg font-semibold text-blue-700">
                        {formatCurrency(monthlyData.reduce((sum, d) => sum + d.invoiced, 0))}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Cobrado</span>
                      <p className="text-lg font-semibold text-emerald-600">
                        {formatCurrency(monthlyData.reduce((sum, d) => sum + d.collected, 0))}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Diferencia</span>
                      <p className="text-lg font-semibold text-red-600">
                        {formatCurrency(
                          monthlyData.reduce((sum, d) => sum + d.invoiced, 0) -
                          monthlyData.reduce((sum, d) => sum + d.collected, 0)
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Tasa de Cobro</span>
                      <p className="text-lg font-semibold text-slate-800">
                        {(() => {
                          const totalInv = monthlyData.reduce((sum, d) => sum + d.invoiced, 0);
                          const totalCol = monthlyData.reduce((sum, d) => sum + d.collected, 0);
                          return totalInv > 0 ? `${Math.round((totalCol / totalInv) * 100)}%` : '0%';
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-slate-400 py-8">No hay datos disponibles para {monthlyYear}</p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

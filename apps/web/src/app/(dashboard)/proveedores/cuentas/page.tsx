'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Supplier {
  id: string;
  name: string;
  rut?: string;
}

interface SupplierInvoice {
  id: string;
  supplierId: string;
  supplier?: Supplier;
  invoiceNumber: string;
  invoiceType: string;
  dteType?: number;
  issueDate: string;
  receptionDate?: string;
  dueDate?: string;
  montoNeto: number;
  montoExento: number;
  iva: number;
  montoTotal: number;
  currency: string;
  exchangeRate?: number;
  montoTotalClp?: number;
  paymentCondition: string;
  status: string;
  paidAmount: number;
  pendingAmount: number;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  documentUrl?: string;
  items?: SupplierInvoiceItem[];
  payments?: SupplierPayment[];
}

interface SupplierInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalLine: number;
  isExempt: boolean;
  inventoryItemId?: string;
}

interface SupplierPayment {
  id: string;
  supplierId: string;
  supplier?: Supplier;
  supplierInvoiceId?: string;
  supplierInvoice?: SupplierInvoice;
  paymentNumber: string;
  paymentDate: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  amountClp?: number;
  paymentMethod: string;
  bankName?: string;
  accountNumber?: string;
  transactionRef?: string;
  chequeNumber?: string;
  chequeDate?: string;
  chequeBankName?: string;
  status: string;
  notes?: string;
  receiptUrl?: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

interface AccountsPayableSummary {
  totalPending: number;
  totalOverdue: number;
  bySupplier: { supplierId: string; supplierName: string; pending: number; overdue: number }[];
  byDueDate: { thisWeek: number; next2Weeks: number; next30Days: number; over30Days: number };
  upcomingPayments: SupplierInvoice[];
}

interface CalendarDay {
  date: string;
  totalDue: number;
  invoices: { id: string; supplierName: string; amount: number; invoiceNumber: string }[];
}

interface CalendarData {
  month: number;
  year: number;
  days: CalendarDay[];
  totalMonth: number;
}

interface MonthlyMonth {
  month: number;
  count: number;
  montoNeto: number;
  iva: number;
  montoTotal: number;
}

interface MonthlyData {
  year: number;
  months: MonthlyMonth[];
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const INVOICE_TYPE_LABEL: Record<string, string> = {
  FACTURA_COMPRA: 'Factura Compra',
  NOTA_CREDITO_COMPRA: 'N. Credito Compra',
  NOTA_DEBITO_COMPRA: 'N. Debito Compra',
  BOLETA_COMPRA: 'Boleta Compra',
  FACTURA_IMPORTACION: 'Factura Importacion',
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  RECEIVED: 'Recibida',
  APPROVED: 'Aprobada',
  PARTIALLY_PAID: 'Pago Parcial',
  PAID: 'Pagada',
  DISPUTED: 'Disputada',
  VOIDED: 'Anulada',
};

const INVOICE_STATUS_BADGE: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  RECEIVED: 'default',
  APPROVED: 'primary',
  PARTIALLY_PAID: 'info',
  PAID: 'success',
  DISPUTED: 'warning',
  VOIDED: 'error',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  CHEQUE: 'Cheque',
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TARJETA_CREDITO: 'Tarjeta Credito',
  TARJETA_DEBITO: 'Tarjeta Debito',
  COMPENSACION: 'Compensacion',
  LETRA: 'Letra',
  VALE_VISTA: 'Vale Vista',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  BOUNCED: 'Rebotado',
  VOIDED: 'Anulado',
};

const PAYMENT_STATUS_BADGE: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  BOUNCED: 'error',
  VOIDED: 'error',
};

const PAYMENT_CONDITION_LABEL: Record<string, string> = {
  CONTADO: 'Contado',
  '30_DIAS': '30 Dias',
  '60_DIAS': '60 Dias',
  '90_DIAS': '90 Dias',
  CUSTOM: 'Personalizado',
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '--';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
};

const isOverdue = (dueDate?: string, status?: string) => {
  if (!dueDate || status === 'PAID' || status === 'VOIDED') return false;
  return new Date(dueDate) < new Date(new Date().toISOString().split('T')[0]);
};

// ---------------------------------------------------------------------------
// Inline Select
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
// Modal Component
// ---------------------------------------------------------------------------

function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className={`bg-white rounded-xl shadow-2xl border border-[var(--color-border)] max-h-[90vh] overflow-y-auto ${wide ? 'w-full max-w-3xl' : 'w-full max-w-xl'} mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type TabKey = 'resumen' | 'facturas' | 'pagos' | 'calendario' | 'mensual';

// =========================================================================
// MAIN PAGE
// =========================================================================

export default function ProveedoresCuentasPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Suppliers list for dropdowns
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Resumen
  const [summary, setSummary] = useState<AccountsPayableSummary | null>(null);

  // Facturas
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [invFilterStatus, setInvFilterStatus] = useState('');
  const [invFilterType, setInvFilterType] = useState('');
  const [invFilterSupplier, setInvFilterSupplier] = useState('');
  const [invFilterDateFrom, setInvFilterDateFrom] = useState('');
  const [invFilterDateTo, setInvFilterDateTo] = useState('');
  const [invFilterSearch, setInvFilterSearch] = useState('');
  const [invFilterOverdue, setInvFilterOverdue] = useState(false);
  const [invLoading, setInvLoading] = useState(false);

  // Pagos
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [payFilterStatus, setPayFilterStatus] = useState('');
  const [payFilterMethod, setPayFilterMethod] = useState('');
  const [payFilterSupplier, setPayFilterSupplier] = useState('');
  const [payFilterDateFrom, setPayFilterDateFrom] = useState('');
  const [payFilterDateTo, setPayFilterDateTo] = useState('');
  const [payFilterSearch, setPayFilterSearch] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // Calendario
  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calData, setCalData] = useState<CalendarData | null>(null);
  const [calLoading, setCalLoading] = useState(false);

  // Mensual
  const [monthlyYear, setMonthlyYear] = useState(now.getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Invoice form state
  const [invFormSupplierId, setInvFormSupplierId] = useState('');
  const [invFormNumber, setInvFormNumber] = useState('');
  const [invFormType, setInvFormType] = useState('FACTURA_COMPRA');
  const [invFormIssueDate, setInvFormIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [invFormDueDate, setInvFormDueDate] = useState('');
  const [invFormPaymentCondition, setInvFormPaymentCondition] = useState('CONTADO');
  const [invFormNeto, setInvFormNeto] = useState(0);
  const [invFormExento, setInvFormExento] = useState(0);
  const [invFormIva, setInvFormIva] = useState(0);
  const [invFormTotal, setInvFormTotal] = useState(0);
  const [invFormNotes, setInvFormNotes] = useState('');
  const [invFormItems, setInvFormItems] = useState<{ description: string; quantity: number; unitPrice: number; totalLine: number; isExempt: boolean }[]>([
    { description: '', quantity: 1, unitPrice: 0, totalLine: 0, isExempt: false },
  ]);

  // Payment form state
  const [payFormSupplierId, setPayFormSupplierId] = useState('');
  const [payFormInvoiceId, setPayFormInvoiceId] = useState('');
  const [payFormAmount, setPayFormAmount] = useState(0);
  const [payFormMethod, setPayFormMethod] = useState('TRANSFERENCIA');
  const [payFormDate, setPayFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [payFormBankName, setPayFormBankName] = useState('');
  const [payFormAccountNumber, setPayFormAccountNumber] = useState('');
  const [payFormTransactionRef, setPayFormTransactionRef] = useState('');
  const [payFormChequeNumber, setPayFormChequeNumber] = useState('');
  const [payFormChequeDate, setPayFormChequeDate] = useState('');
  const [payFormChequeBankName, setPayFormChequeBankName] = useState('');
  const [payFormNotes, setPayFormNotes] = useState('');

  // -------------------------------------------------------------------------
  // Auto-calc invoice totals
  // -------------------------------------------------------------------------
  useEffect(() => {
    let neto = 0;
    let exento = 0;
    invFormItems.forEach((item) => {
      const line = Math.round(item.quantity * item.unitPrice);
      if (item.isExempt) exento += line;
      else neto += line;
    });
    const iva = Math.round(neto * 0.19);
    setInvFormNeto(neto);
    setInvFormExento(exento);
    setInvFormIva(iva);
    setInvFormTotal(neto + exento + iva);
  }, [invFormItems]);

  // -------------------------------------------------------------------------
  // Fetchers
  // -------------------------------------------------------------------------

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await api.get<Supplier[]>('/suppliers');
      setSuppliers(Array.isArray(data) ? data : []);
    } catch {
      // non-critical
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.get<AccountsPayableSummary>('/suppliers/accounts-payable');
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar resumen');
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setInvLoading(true);
    try {
      const params = new URLSearchParams();
      if (invFilterStatus) params.set('status', invFilterStatus);
      if (invFilterType) params.set('invoiceType', invFilterType);
      if (invFilterSupplier) params.set('supplierId', invFilterSupplier);
      if (invFilterDateFrom) params.set('dateFrom', invFilterDateFrom);
      if (invFilterDateTo) params.set('dateTo', invFilterDateTo);
      if (invFilterSearch) params.set('search', invFilterSearch);
      if (invFilterOverdue) params.set('overdue', 'true');
      const qs = params.toString();
      const data = await api.get<SupplierInvoice[]>(`/suppliers/invoices${qs ? `?${qs}` : ''}`);
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar facturas');
    } finally {
      setInvLoading(false);
    }
  }, [invFilterStatus, invFilterType, invFilterSupplier, invFilterDateFrom, invFilterDateTo, invFilterSearch, invFilterOverdue]);

  const fetchPayments = useCallback(async () => {
    setPayLoading(true);
    try {
      const params = new URLSearchParams();
      if (payFilterStatus) params.set('status', payFilterStatus);
      if (payFilterMethod) params.set('paymentMethod', payFilterMethod);
      if (payFilterSupplier) params.set('supplierId', payFilterSupplier);
      if (payFilterDateFrom) params.set('dateFrom', payFilterDateFrom);
      if (payFilterDateTo) params.set('dateTo', payFilterDateTo);
      if (payFilterSearch) params.set('search', payFilterSearch);
      const qs = params.toString();
      const data = await api.get<SupplierPayment[]>(`/suppliers/payments${qs ? `?${qs}` : ''}`);
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pagos');
    } finally {
      setPayLoading(false);
    }
  }, [payFilterStatus, payFilterMethod, payFilterSupplier, payFilterDateFrom, payFilterDateTo, payFilterSearch]);

  const fetchCalendar = useCallback(async () => {
    setCalLoading(true);
    try {
      const data = await api.get<CalendarData>(`/suppliers/payment-calendar?month=${calMonth}&year=${calYear}`);
      setCalData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar calendario');
    } finally {
      setCalLoading(false);
    }
  }, [calMonth, calYear]);

  const fetchMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const data = await api.get<MonthlyData>(`/suppliers/monthly-purchases?year=${monthlyYear}`);
      setMonthlyData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos mensuales');
    } finally {
      setMonthlyLoading(false);
    }
  }, [monthlyYear]);

  // -------------------------------------------------------------------------
  // Initial load
  // -------------------------------------------------------------------------

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchSuppliers(), fetchSummary()]);
      setLoading(false);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Tab-switch data loading
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (activeTab === 'facturas') fetchInvoices();
    else if (activeTab === 'pagos') fetchPayments();
    else if (activeTab === 'calendario') fetchCalendar();
    else if (activeTab === 'mensual') fetchMonthly();
    else if (activeTab === 'resumen') fetchSummary();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleApproveInvoice = async (id: string) => {
    if (!confirm('Aprobar esta factura?')) return;
    try {
      await api.patch(`/suppliers/invoices/${id}/approve`);
      await fetchInvoices();
      await fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar factura');
    }
  };

  const handleVoidInvoice = async (id: string) => {
    if (!confirm('Anular esta factura? Esta accion no se puede deshacer.')) return;
    try {
      await api.patch(`/suppliers/invoices/${id}/void`);
      await fetchInvoices();
      await fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al anular factura');
    }
  };

  const handleConfirmPayment = async (id: string) => {
    if (!confirm('Confirmar este pago?')) return;
    try {
      await api.patch(`/suppliers/payments/${id}/confirm`);
      await fetchPayments();
      await fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar pago');
    }
  };

  const handleVoidPayment = async (id: string) => {
    if (!confirm('Anular este pago? Se restaurara el saldo de la factura asociada.')) return;
    try {
      await api.patch(`/suppliers/payments/${id}/void`);
      await fetchPayments();
      await fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al anular pago');
    }
  };

  // -------------------------------------------------------------------------
  // Submit Invoice
  // -------------------------------------------------------------------------

  const resetInvoiceForm = () => {
    setInvFormSupplierId('');
    setInvFormNumber('');
    setInvFormType('FACTURA_COMPRA');
    setInvFormIssueDate(new Date().toISOString().split('T')[0]);
    setInvFormDueDate('');
    setInvFormPaymentCondition('CONTADO');
    setInvFormNeto(0);
    setInvFormExento(0);
    setInvFormIva(0);
    setInvFormTotal(0);
    setInvFormNotes('');
    setInvFormItems([{ description: '', quantity: 1, unitPrice: 0, totalLine: 0, isExempt: false }]);
  };

  const handleCreateInvoice = async () => {
    if (!invFormSupplierId) { setError('Seleccione un proveedor'); return; }
    if (!invFormNumber) { setError('Ingrese numero de factura'); return; }
    setSubmitting(true);
    setError('');
    try {
      const items = invFormItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalLine: Math.round(item.quantity * item.unitPrice),
        isExempt: item.isExempt,
      }));

      await api.post('/suppliers/invoices', {
        supplierId: invFormSupplierId,
        invoiceNumber: invFormNumber,
        invoiceType: invFormType,
        issueDate: invFormIssueDate,
        dueDate: invFormDueDate || undefined,
        paymentCondition: invFormPaymentCondition,
        montoNeto: invFormNeto,
        montoExento: invFormExento,
        iva: invFormIva,
        montoTotal: invFormTotal,
        notes: invFormNotes || undefined,
        items,
      });
      resetInvoiceForm();
      setShowInvoiceModal(false);
      await fetchInvoices();
      await fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar factura');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Submit Payment
  // -------------------------------------------------------------------------

  const resetPaymentForm = () => {
    setPayFormSupplierId('');
    setPayFormInvoiceId('');
    setPayFormAmount(0);
    setPayFormMethod('TRANSFERENCIA');
    setPayFormDate(new Date().toISOString().split('T')[0]);
    setPayFormBankName('');
    setPayFormAccountNumber('');
    setPayFormTransactionRef('');
    setPayFormChequeNumber('');
    setPayFormChequeDate('');
    setPayFormChequeBankName('');
    setPayFormNotes('');
  };

  const handleCreatePayment = async () => {
    if (!payFormSupplierId) { setError('Seleccione un proveedor'); return; }
    if (!payFormAmount || payFormAmount <= 0) { setError('Ingrese un monto valido'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/suppliers/payments', {
        supplierId: payFormSupplierId,
        supplierInvoiceId: payFormInvoiceId || undefined,
        amount: payFormAmount,
        paymentMethod: payFormMethod,
        paymentDate: payFormDate,
        bankName: payFormBankName || undefined,
        accountNumber: payFormAccountNumber || undefined,
        transactionRef: payFormTransactionRef || undefined,
        chequeNumber: payFormChequeNumber || undefined,
        chequeDate: payFormChequeDate || undefined,
        chequeBankName: payFormChequeBankName || undefined,
        notes: payFormNotes || undefined,
      });
      resetPaymentForm();
      setShowPaymentModal(false);
      await fetchPayments();
      await fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Invoice Item helpers
  // -------------------------------------------------------------------------

  const updateInvItem = (idx: number, field: string, value: string | number | boolean) => {
    setInvFormItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      next[idx].totalLine = Math.round(next[idx].quantity * next[idx].unitPrice);
      return next;
    });
  };

  const addInvItem = () => {
    setInvFormItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0, totalLine: 0, isExempt: false }]);
  };

  const removeInvItem = (idx: number) => {
    setInvFormItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  // -------------------------------------------------------------------------
  // Available invoices for payment dropdown
  // -------------------------------------------------------------------------

  const payableInvoices = useMemo(() => {
    if (!payFormSupplierId) return [];
    return invoices.filter(
      (inv) =>
        inv.supplierId === payFormSupplierId &&
        inv.status !== 'PAID' &&
        inv.status !== 'VOIDED' &&
        inv.status !== 'RECEIVED' &&
        Number(inv.pendingAmount) > 0
    );
  }, [payFormSupplierId, invoices]);

  // -------------------------------------------------------------------------
  // Calendar helpers
  // -------------------------------------------------------------------------

  const calendarGrid = useMemo(() => {
    if (!calData) return [];
    const firstDay = new Date(calYear, calMonth - 1, 1);
    const lastDay = new Date(calYear, calMonth, 0);
    const daysInMonth = lastDay.getDate();

    // Monday=0 ... Sunday=6
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const dayMap: Record<string, CalendarDay> = {};
    calData.days.forEach((d) => {
      dayMap[d.date] = d;
    });

    const cells: { day: number; date: string; data?: CalendarDay; currentMonth: boolean }[] = [];

    // Fill leading blanks
    for (let i = 0; i < startDow; i++) {
      cells.push({ day: 0, date: '', currentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, date: dateStr, data: dayMap[dateStr], currentMonth: true });
    }

    // Fill trailing blanks to complete the grid
    while (cells.length % 7 !== 0) {
      cells.push({ day: 0, date: '', currentMonth: false });
    }

    return cells;
  }, [calData, calMonth, calYear]);

  // -------------------------------------------------------------------------
  // Monthly totals
  // -------------------------------------------------------------------------

  const monthlyTotals = useMemo(() => {
    if (!monthlyData) return { count: 0, neto: 0, iva: 0, total: 0 };
    return monthlyData.months.reduce(
      (acc, m) => ({
        count: acc.count + m.count,
        neto: acc.neto + m.montoNeto,
        iva: acc.iva + m.iva,
        total: acc.total + m.montoTotal,
      }),
      { count: 0, neto: 0, iva: 0, total: 0 }
    );
  }, [monthlyData]);

  // -------------------------------------------------------------------------
  // Invoice Table Columns
  // -------------------------------------------------------------------------

  const invoiceColumns: Column<SupplierInvoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'N. Factura',
      render: (inv) => <span className="font-bold text-slate-800">{inv.invoiceNumber}</span>,
    },
    {
      key: 'invoiceType',
      header: 'Tipo',
      className: 'hidden md:table-cell',
      render: (inv) => (
        <Badge variant="info">{INVOICE_TYPE_LABEL[inv.invoiceType] || inv.invoiceType}</Badge>
      ),
    },
    {
      key: 'supplier',
      header: 'Proveedor',
      render: (inv) => (
        <span className="text-sm text-slate-700">{inv.supplier?.name || '--'}</span>
      ),
    },
    {
      key: 'issueDate',
      header: 'Emision',
      className: 'hidden sm:table-cell',
      render: (inv) => formatDate(inv.issueDate),
    },
    {
      key: 'dueDate',
      header: 'Vencimiento',
      className: 'hidden lg:table-cell',
      render: (inv) => (
        <span className={isOverdue(inv.dueDate, inv.status) ? 'text-red-600 font-semibold' : ''}>
          {inv.dueDate ? formatDate(inv.dueDate) : '--'}
        </span>
      ),
    },
    {
      key: 'montoTotal',
      header: 'Total',
      render: (inv) => <span className="font-semibold">{fmt(inv.montoTotal)}</span>,
    },
    {
      key: 'pendingAmount',
      header: 'Pendiente',
      className: 'hidden md:table-cell',
      render: (inv) => (
        <span className={Number(inv.pendingAmount) > 0 ? 'text-orange-600 font-semibold' : 'text-emerald-600'}>
          {fmt(inv.pendingAmount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (inv) => {
        const overdueFlag = isOverdue(inv.dueDate, inv.status);
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={INVOICE_STATUS_BADGE[inv.status] || 'default'}>
              {INVOICE_STATUS_LABEL[inv.status] || inv.status}
            </Badge>
            {overdueFlag && (
              <Badge variant="error">Vencida</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (inv) => (
        <div className="flex items-center gap-1">
          {inv.status === 'RECEIVED' && (
            <Button size="sm" variant="secondary" onClick={() => handleApproveInvoice(inv.id)}>
              Aprobar
            </Button>
          )}
          {(inv.status === 'RECEIVED' || inv.status === 'APPROVED') && (
            <Button size="sm" variant="danger" onClick={() => handleVoidInvoice(inv.id)}>
              Anular
            </Button>
          )}
        </div>
      ),
    },
  ];

  // -------------------------------------------------------------------------
  // Payment Table Columns
  // -------------------------------------------------------------------------

  const paymentColumns: Column<SupplierPayment>[] = [
    {
      key: 'paymentNumber',
      header: 'N. Pago',
      render: (p) => <span className="font-bold text-slate-800">{p.paymentNumber}</span>,
    },
    {
      key: 'supplier',
      header: 'Proveedor',
      render: (p) => <span className="text-sm text-slate-700">{p.supplier?.name || '--'}</span>,
    },
    {
      key: 'paymentDate',
      header: 'Fecha',
      className: 'hidden sm:table-cell',
      render: (p) => formatDate(p.paymentDate),
    },
    {
      key: 'amount',
      header: 'Monto',
      render: (p) => <span className="font-semibold">{fmt(p.amount)}</span>,
    },
    {
      key: 'paymentMethod',
      header: 'Metodo',
      className: 'hidden md:table-cell',
      render: (p) => PAYMENT_METHOD_LABEL[p.paymentMethod] || p.paymentMethod,
    },
    {
      key: 'invoice',
      header: 'Factura',
      className: 'hidden lg:table-cell',
      render: (p) => (
        <span className="text-sm text-slate-500">
          {p.supplierInvoice?.invoiceNumber || '--'}
        </span>
      ),
    },
    {
      key: 'transactionRef',
      header: 'Ref.',
      className: 'hidden xl:table-cell',
      render: (p) => <span className="text-sm text-slate-500">{p.transactionRef || '--'}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (p) => (
        <Badge variant={PAYMENT_STATUS_BADGE[p.status] || 'default'}>
          {PAYMENT_STATUS_LABEL[p.status] || p.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (p) => (
        <div className="flex items-center gap-1">
          {p.status === 'PENDING' && (
            <Button size="sm" variant="secondary" onClick={() => handleConfirmPayment(p.id)}>
              Confirmar
            </Button>
          )}
          {p.status !== 'VOIDED' && (
            <Button size="sm" variant="danger" onClick={() => handleVoidPayment(p.id)}>
              Anular
            </Button>
          )}
        </div>
      ),
    },
  ];

  // -------------------------------------------------------------------------
  // Loading screen
  // -------------------------------------------------------------------------

  if (loading) {
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
          <span className="text-slate-500">Cargando cuentas por pagar...</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TABS CONFIG
  // =========================================================================

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'facturas', label: 'Facturas' },
    { key: 'pagos', label: 'Pagos' },
    { key: 'calendario', label: 'Calendario' },
    { key: 'mensual', label: 'Mensual' },
  ];

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------------- */}
      {/* HEADER                                                          */}
      {/* --------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100">
            <svg className="w-6 h-6 text-orange-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Cuentas por Pagar</h1>
            <p className="text-sm text-slate-500">Gestion de facturas y pagos a proveedores</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { resetInvoiceForm(); setShowInvoiceModal(true); }}>
            + Registrar Factura
          </Button>
          <Button variant="secondary" onClick={() => { resetPaymentForm(); setShowPaymentModal(true); }}>
            + Registrar Pago
          </Button>
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

      {/* --------------------------------------------------------------- */}
      {/* TABS                                                            */}
      {/* --------------------------------------------------------------- */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =============================================================== */}
      {/* TAB: RESUMEN                                                    */}
      {/* =============================================================== */}
      {activeTab === 'resumen' && summary && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-orange-500">
              <CardBody>
                <p className="text-2xl font-bold text-slate-800">{fmt(summary.totalPending)}</p>
                <p className="text-xs text-slate-500 mt-1">Total Pendiente</p>
              </CardBody>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardBody>
                <p className="text-2xl font-bold text-red-600">{fmt(summary.totalOverdue)}</p>
                <p className="text-xs text-slate-500 mt-1">Total Vencido</p>
              </CardBody>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardBody>
                <p className="text-2xl font-bold text-slate-800">{fmt(summary.byDueDate.thisWeek)}</p>
                <p className="text-xs text-slate-500 mt-1">Vence Esta Semana</p>
              </CardBody>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardBody>
                <p className="text-2xl font-bold text-slate-800">{fmt(summary.byDueDate.next30Days + summary.byDueDate.next2Weeks)}</p>
                <p className="text-xs text-slate-500 mt-1">Prox. 30 Dias</p>
              </CardBody>
            </Card>
          </div>

          {/* Due Date Breakdown */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-slate-800">Distribucion por Vencimiento</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Esta Semana', value: summary.byDueDate.thisWeek, color: 'bg-red-500' },
                  { label: 'Proximas 2 Semanas', value: summary.byDueDate.next2Weeks, color: 'bg-orange-500' },
                  { label: 'Proximos 30 Dias', value: summary.byDueDate.next30Days, color: 'bg-amber-500' },
                  { label: 'Mas de 30 Dias', value: summary.byDueDate.over30Days, color: 'bg-blue-500' },
                ].map((bucket) => {
                  const total = summary.byDueDate.thisWeek + summary.byDueDate.next2Weeks + summary.byDueDate.next30Days + summary.byDueDate.over30Days;
                  const pct = total > 0 ? Math.round((bucket.value / total) * 100) : 0;
                  return (
                    <div key={bucket.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{bucket.label}</span>
                        <span className="font-semibold text-slate-800">{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className={`${bucket.color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">{fmt(bucket.value)}</p>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          {/* By Supplier */}
          {summary.bySupplier.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-slate-800">Deuda por Proveedor</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {summary.bySupplier.map((s) => {
                    const maxPending = Math.max(...summary.bySupplier.map((x) => x.pending));
                    const pct = maxPending > 0 ? Math.round((s.pending / maxPending) * 100) : 0;
                    return (
                      <div key={s.supplierId} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{s.supplierName}</span>
                          <div className="flex items-center gap-3">
                            {s.overdue > 0 && (
                              <span className="text-xs text-red-600 font-medium">
                                Vencido: {fmt(s.overdue)}
                              </span>
                            )}
                            <span className="font-semibold text-slate-800">{fmt(s.pending)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${s.overdue > 0 ? 'bg-red-500' : 'bg-orange-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Upcoming Payments */}
          {summary.upcomingPayments.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-slate-800">Pagos Proximos (7 dias)</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {summary.upcomingPayments.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-[var(--color-border)]"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {inv.supplier?.name || 'Proveedor'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {inv.invoiceNumber} - Vence: {inv.dueDate ? formatDate(inv.dueDate) : '--'}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-orange-600">{fmt(inv.pendingAmount)}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* =============================================================== */}
      {/* TAB: FACTURAS                                                   */}
      {/* =============================================================== */}
      {activeTab === 'facturas' && (
        <>
          {/* Filters */}
          <Card>
            <CardBody>
              <div className="flex flex-col lg:flex-row gap-3 items-end">
                <Select
                  label="Proveedor"
                  value={invFilterSupplier}
                  onChange={setInvFilterSupplier}
                  options={[
                    { value: '', label: 'Todos' },
                    ...suppliers.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
                <Select
                  label="Estado"
                  value={invFilterStatus}
                  onChange={setInvFilterStatus}
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'RECEIVED', label: 'Recibida' },
                    { value: 'APPROVED', label: 'Aprobada' },
                    { value: 'PARTIALLY_PAID', label: 'Pago Parcial' },
                    { value: 'PAID', label: 'Pagada' },
                    { value: 'DISPUTED', label: 'Disputada' },
                    { value: 'VOIDED', label: 'Anulada' },
                  ]}
                />
                <Select
                  label="Tipo"
                  value={invFilterType}
                  onChange={setInvFilterType}
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'FACTURA_COMPRA', label: 'Factura Compra' },
                    { value: 'NOTA_CREDITO_COMPRA', label: 'N. Credito' },
                    { value: 'NOTA_DEBITO_COMPRA', label: 'N. Debito' },
                    { value: 'BOLETA_COMPRA', label: 'Boleta' },
                    { value: 'FACTURA_IMPORTACION', label: 'Importacion' },
                  ]}
                />
                <Input
                  label="Desde"
                  type="date"
                  value={invFilterDateFrom}
                  onChange={(e) => setInvFilterDateFrom(e.target.value)}
                />
                <Input
                  label="Hasta"
                  type="date"
                  value={invFilterDateTo}
                  onChange={(e) => setInvFilterDateTo(e.target.value)}
                />
                <Input
                  label="Buscar"
                  placeholder="N. factura o proveedor"
                  value={invFilterSearch}
                  onChange={(e) => setInvFilterSearch(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={invFilterOverdue}
                      onChange={(e) => setInvFilterOverdue(e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                    />
                    Vencidas
                  </label>
                </div>
                <Button onClick={fetchInvoices} className="whitespace-nowrap">
                  Buscar
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Facturas de Proveedores</h3>
                <span className="text-sm text-slate-500">
                  {invoices.length} factura{invoices.length !== 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>
            <Table
              columns={invoiceColumns}
              data={invoices}
              keyExtractor={(inv) => inv.id}
              loading={invLoading}
              emptyMessage="No se encontraron facturas de proveedores"
            />
          </Card>
        </>
      )}

      {/* =============================================================== */}
      {/* TAB: PAGOS                                                      */}
      {/* =============================================================== */}
      {activeTab === 'pagos' && (
        <>
          {/* Filters */}
          <Card>
            <CardBody>
              <div className="flex flex-col lg:flex-row gap-3 items-end">
                <Select
                  label="Proveedor"
                  value={payFilterSupplier}
                  onChange={setPayFilterSupplier}
                  options={[
                    { value: '', label: 'Todos' },
                    ...suppliers.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
                <Select
                  label="Estado"
                  value={payFilterStatus}
                  onChange={setPayFilterStatus}
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'PENDING', label: 'Pendiente' },
                    { value: 'CONFIRMED', label: 'Confirmado' },
                    { value: 'VOIDED', label: 'Anulado' },
                  ]}
                />
                <Select
                  label="Metodo"
                  value={payFilterMethod}
                  onChange={setPayFilterMethod}
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'TRANSFERENCIA', label: 'Transferencia' },
                    { value: 'CHEQUE', label: 'Cheque' },
                    { value: 'EFECTIVO', label: 'Efectivo' },
                    { value: 'TARJETA', label: 'Tarjeta' },
                    { value: 'COMPENSACION', label: 'Compensacion' },
                    { value: 'LETRA', label: 'Letra' },
                  ]}
                />
                <Input
                  label="Desde"
                  type="date"
                  value={payFilterDateFrom}
                  onChange={(e) => setPayFilterDateFrom(e.target.value)}
                />
                <Input
                  label="Hasta"
                  type="date"
                  value={payFilterDateTo}
                  onChange={(e) => setPayFilterDateTo(e.target.value)}
                />
                <Input
                  label="Buscar"
                  placeholder="N. pago, ref. o proveedor"
                  value={payFilterSearch}
                  onChange={(e) => setPayFilterSearch(e.target.value)}
                />
                <Button onClick={fetchPayments} className="whitespace-nowrap">
                  Buscar
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Pagos a Proveedores</h3>
                <span className="text-sm text-slate-500">
                  {payments.length} pago{payments.length !== 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>
            <Table
              columns={paymentColumns}
              data={payments}
              keyExtractor={(p) => p.id}
              loading={payLoading}
              emptyMessage="No se encontraron pagos a proveedores"
            />
          </Card>
        </>
      )}

      {/* =============================================================== */}
      {/* TAB: CALENDARIO                                                 */}
      {/* =============================================================== */}
      {activeTab === 'calendario' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1); }
                    else setCalMonth(calMonth - 1);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <h3 className="text-lg font-semibold text-slate-800">
                  {MONTH_NAMES[calMonth - 1]} {calYear}
                </h3>
                <button
                  onClick={() => {
                    if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1); }
                    else setCalMonth(calMonth + 1);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
              {calData && (
                <span className="text-sm font-semibold text-orange-600">
                  Total Mes: {fmt(calData.totalMonth)}
                </span>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {calLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-[var(--color-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-slate-500">Cargando calendario...</span>
                </div>
              </div>
            ) : (
              <>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarGrid.map((cell, idx) => {
                    const today = new Date().toISOString().split('T')[0];
                    const isToday = cell.date === today;
                    const hasPayments = cell.data && cell.data.totalDue > 0;
                    const isPast = cell.date && cell.date < today;

                    return (
                      <div
                        key={idx}
                        className={`min-h-[80px] sm:min-h-[100px] p-1.5 rounded-lg border text-xs transition-colors ${
                          !cell.currentMonth
                            ? 'bg-slate-50 border-transparent'
                            : isToday
                            ? 'bg-blue-50 border-blue-300'
                            : hasPayments && isPast
                            ? 'bg-red-50 border-red-200'
                            : hasPayments
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-white border-[var(--color-border)]'
                        }`}
                      >
                        {cell.currentMonth && (
                          <>
                            <span
                              className={`inline-block w-6 h-6 text-center leading-6 rounded-full text-xs font-medium ${
                                isToday
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-700'
                              }`}
                            >
                              {cell.day}
                            </span>
                            {cell.data && cell.data.invoices.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {cell.data.invoices.slice(0, 3).map((inv, i) => (
                                  <div
                                    key={i}
                                    className={`px-1 py-0.5 rounded text-[10px] leading-tight truncate ${
                                      isPast
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-orange-100 text-orange-700'
                                    }`}
                                    title={`${inv.supplierName}: ${fmt(inv.amount)}`}
                                  >
                                    {fmt(inv.amount)}
                                  </div>
                                ))}
                                {cell.data.invoices.length > 3 && (
                                  <p className="text-[10px] text-slate-400 pl-1">
                                    +{cell.data.invoices.length - 3} mas
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* =============================================================== */}
      {/* TAB: MENSUAL                                                    */}
      {/* =============================================================== */}
      {activeTab === 'mensual' && (
        <>
          {/* Year selector */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMonthlyYear(monthlyYear - 1)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <h3 className="text-lg font-semibold text-slate-800">Compras {monthlyYear}</h3>
                <button
                  onClick={() => setMonthlyYear(monthlyYear + 1)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
                <Button size="sm" variant="ghost" onClick={fetchMonthly} className="ml-auto">
                  Actualizar
                </Button>
              </div>
            </CardBody>
          </Card>

          {monthlyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-[var(--color-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-slate-500">Cargando datos mensuales...</span>
              </div>
            </div>
          ) : monthlyData && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-slate-800">
                  Resumen de Compras Mensuales - {monthlyYear}
                </h3>
              </CardHeader>
              <Table
                columns={[
                  {
                    key: 'month',
                    header: 'Mes',
                    render: (m: MonthlyMonth) => (
                      <span className="font-medium text-slate-700">{MONTH_NAMES[m.month - 1]}</span>
                    ),
                  },
                  {
                    key: 'count',
                    header: 'Facturas',
                    render: (m: MonthlyMonth) => (
                      <span className={`font-medium ${m.count > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                        {m.count}
                      </span>
                    ),
                  },
                  {
                    key: 'montoNeto',
                    header: 'Neto',
                    className: 'hidden sm:table-cell',
                    render: (m: MonthlyMonth) => fmt(m.montoNeto),
                  },
                  {
                    key: 'iva',
                    header: 'IVA',
                    className: 'hidden md:table-cell',
                    render: (m: MonthlyMonth) => fmt(m.iva),
                  },
                  {
                    key: 'montoTotal',
                    header: 'Total',
                    render: (m: MonthlyMonth) => (
                      <span className="font-semibold text-slate-800">{fmt(m.montoTotal)}</span>
                    ),
                  },
                ]}
                data={monthlyData.months}
                keyExtractor={(m: MonthlyMonth) => String(m.month)}
                emptyMessage="Sin datos para el periodo seleccionado"
              />
              {/* Totals footer */}
              <div className="px-4 py-3 bg-slate-50 border-t border-[var(--color-border)]">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-800">TOTAL ANUAL</span>
                  <div className="flex items-center gap-6">
                    <span className="text-slate-600">
                      <span className="text-slate-400 mr-1">Facturas:</span>
                      <span className="font-bold">{monthlyTotals.count}</span>
                    </span>
                    <span className="text-slate-600 hidden sm:inline">
                      <span className="text-slate-400 mr-1">Neto:</span>
                      <span className="font-bold">{fmt(monthlyTotals.neto)}</span>
                    </span>
                    <span className="text-slate-600 hidden sm:inline">
                      <span className="text-slate-400 mr-1">IVA:</span>
                      <span className="font-bold">{fmt(monthlyTotals.iva)}</span>
                    </span>
                    <span className="text-slate-800">
                      <span className="text-slate-400 mr-1">Total:</span>
                      <span className="font-extrabold text-base">{fmt(monthlyTotals.total)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Visual bar chart */}
          {monthlyData && monthlyTotals.total > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-slate-800">Compras por Mes</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {monthlyData.months.map((m) => {
                    const maxTotal = Math.max(...monthlyData.months.map((x) => x.montoTotal));
                    const pct = maxTotal > 0 ? Math.round((m.montoTotal / maxTotal) * 100) : 0;
                    return (
                      <div key={m.month} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-12 text-right">
                          {MONTH_NAMES[m.month - 1].substring(0, 3)}
                        </span>
                        <div className="flex-1 bg-slate-200 rounded-full h-5 relative">
                          <div
                            className="bg-orange-500 h-5 rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          >
                            {m.montoTotal > 0 && (
                              <span className="text-[10px] font-medium text-white whitespace-nowrap">
                                {fmt(m.montoTotal)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* =============================================================== */}
      {/* MODAL: REGISTRAR FACTURA                                        */}
      {/* =============================================================== */}
      <Modal
        open={showInvoiceModal}
        onClose={() => { resetInvoiceForm(); setShowInvoiceModal(false); }}
        title="Registrar Factura de Proveedor"
        wide
      >
        <div className="space-y-5">
          {/* Supplier & Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Proveedor *"
              value={invFormSupplierId}
              onChange={setInvFormSupplierId}
              options={[
                { value: '', label: 'Seleccionar proveedor...' },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            <Input
              label="N. Factura *"
              value={invFormNumber}
              onChange={(e) => setInvFormNumber(e.target.value)}
              placeholder="Ej: FAC-001234"
            />
          </div>

          {/* Type & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Tipo Documento"
              value={invFormType}
              onChange={setInvFormType}
              options={[
                { value: 'FACTURA_COMPRA', label: 'Factura Compra' },
                { value: 'NOTA_CREDITO_COMPRA', label: 'N. Credito Compra' },
                { value: 'NOTA_DEBITO_COMPRA', label: 'N. Debito Compra' },
                { value: 'BOLETA_COMPRA', label: 'Boleta Compra' },
                { value: 'FACTURA_IMPORTACION', label: 'Factura Importacion' },
              ]}
            />
            <Input
              label="Fecha Emision"
              type="date"
              value={invFormIssueDate}
              onChange={(e) => setInvFormIssueDate(e.target.value)}
            />
            <Input
              label="Fecha Vencimiento"
              type="date"
              value={invFormDueDate}
              onChange={(e) => setInvFormDueDate(e.target.value)}
            />
            <Select
              label="Condicion Pago"
              value={invFormPaymentCondition}
              onChange={setInvFormPaymentCondition}
              options={[
                { value: 'CONTADO', label: 'Contado' },
                { value: '30_DIAS', label: '30 Dias' },
                { value: '60_DIAS', label: '60 Dias' },
                { value: '90_DIAS', label: '90 Dias' },
                { value: 'CUSTOM', label: 'Personalizado' },
              ]}
            />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700">Items del Documento</h4>
              <Button size="sm" variant="ghost" onClick={addInvItem}>
                + Agregar Item
              </Button>
            </div>
            <div className="space-y-3">
              {invFormItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-[var(--color-border)]">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                    <Input
                      label="Descripcion"
                      value={item.description}
                      onChange={(e) => updateInvItem(idx, 'description', e.target.value)}
                      className="col-span-2"
                    />
                    <Input
                      label="Cantidad"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={item.quantity}
                      onChange={(e) => updateInvItem(idx, 'quantity', Number(e.target.value))}
                    />
                    <Input
                      label="Precio Unit."
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => updateInvItem(idx, 'unitPrice', Number(e.target.value))}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                        {fmt(Math.round(item.quantity * item.unitPrice))}
                      </span>
                      {invFormItems.length > 1 && (
                        <Button size="sm" variant="danger" onClick={() => removeInvItem(idx)}>
                          X
                        </Button>
                      )}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={item.isExempt}
                      onChange={(e) => updateInvItem(idx, 'isExempt', e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Exento de IVA
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-lg border border-[var(--color-border)] p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Neto</span>
                <p className="text-lg font-semibold text-slate-800">{fmt(invFormNeto)}</p>
              </div>
              <div>
                <span className="text-slate-500">Exento</span>
                <p className="text-lg font-semibold text-slate-800">{fmt(invFormExento)}</p>
              </div>
              <div>
                <span className="text-slate-500">IVA (19%)</span>
                <p className="text-lg font-semibold text-slate-800">{fmt(invFormIva)}</p>
              </div>
              <div>
                <span className="text-slate-500">Total</span>
                <p className="text-2xl font-bold text-slate-900">{fmt(invFormTotal)}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
            <textarea
              value={invFormNotes}
              onChange={(e) => setInvFormNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="Observaciones..."
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => { resetInvoiceForm(); setShowInvoiceModal(false); }}>
              Cancelar
            </Button>
            <Button loading={submitting} onClick={handleCreateInvoice}>
              Registrar Factura
            </Button>
          </div>
        </div>
      </Modal>

      {/* =============================================================== */}
      {/* MODAL: REGISTRAR PAGO                                           */}
      {/* =============================================================== */}
      <Modal
        open={showPaymentModal}
        onClose={() => { resetPaymentForm(); setShowPaymentModal(false); }}
        title="Registrar Pago a Proveedor"
      >
        <div className="space-y-5">
          {/* Supplier */}
          <Select
            label="Proveedor *"
            value={payFormSupplierId}
            onChange={(v) => { setPayFormSupplierId(v); setPayFormInvoiceId(''); }}
            options={[
              { value: '', label: 'Seleccionar proveedor...' },
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />

          {/* Invoice (optional) */}
          {payFormSupplierId && (
            <Select
              label="Factura Asociada (opcional)"
              value={payFormInvoiceId}
              onChange={setPayFormInvoiceId}
              options={[
                { value: '', label: 'Pago sin factura asociada' },
                ...payableInvoices.map((inv) => ({
                  value: inv.id,
                  label: `${inv.invoiceNumber} - Pendiente: ${fmt(inv.pendingAmount)}`,
                })),
              ]}
            />
          )}

          {/* Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monto *"
              type="number"
              min={1}
              value={payFormAmount}
              onChange={(e) => setPayFormAmount(Number(e.target.value))}
            />
            <Select
              label="Metodo de Pago"
              value={payFormMethod}
              onChange={setPayFormMethod}
              options={[
                { value: 'TRANSFERENCIA', label: 'Transferencia' },
                { value: 'CHEQUE', label: 'Cheque' },
                { value: 'EFECTIVO', label: 'Efectivo' },
                { value: 'TARJETA', label: 'Tarjeta' },
                { value: 'COMPENSACION', label: 'Compensacion' },
                { value: 'LETRA', label: 'Letra' },
              ]}
            />
          </div>

          {/* Date */}
          <Input
            label="Fecha de Pago"
            type="date"
            value={payFormDate}
            onChange={(e) => setPayFormDate(e.target.value)}
          />

          {/* Bank details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Banco"
              value={payFormBankName}
              onChange={(e) => setPayFormBankName(e.target.value)}
              placeholder="Nombre del banco"
            />
            <Input
              label="N. Cuenta"
              value={payFormAccountNumber}
              onChange={(e) => setPayFormAccountNumber(e.target.value)}
              placeholder="Numero de cuenta"
            />
          </div>

          {/* Transaction ref */}
          <Input
            label="Referencia Transaccion"
            value={payFormTransactionRef}
            onChange={(e) => setPayFormTransactionRef(e.target.value)}
            placeholder="N. comprobante o ref."
          />

          {/* Cheque fields (conditional) */}
          {payFormMethod === 'CHEQUE' && (
            <div className="p-4 bg-slate-50 rounded-lg border border-[var(--color-border)] space-y-4">
              <h4 className="text-sm font-semibold text-slate-700">Datos del Cheque</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="N. Cheque"
                  value={payFormChequeNumber}
                  onChange={(e) => setPayFormChequeNumber(e.target.value)}
                />
                <Input
                  label="Fecha Cheque"
                  type="date"
                  value={payFormChequeDate}
                  onChange={(e) => setPayFormChequeDate(e.target.value)}
                />
                <Input
                  label="Banco Cheque"
                  value={payFormChequeBankName}
                  onChange={(e) => setPayFormChequeBankName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
            <textarea
              value={payFormNotes}
              onChange={(e) => setPayFormNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="Notas adicionales..."
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
            <Button variant="ghost" onClick={() => { resetPaymentForm(); setShowPaymentModal(false); }}>
              Cancelar
            </Button>
            <Button loading={submitting} onClick={handleCreatePayment}>
              Registrar Pago
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

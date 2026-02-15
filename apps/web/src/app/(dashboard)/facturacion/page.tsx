'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InvoiceItem {
  codigo: string;
  nombreItem: string;
  descripcion: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  descuentoPct: number;
  exento: boolean;
}

interface Invoice {
  id: string;
  tipoDte: number;
  folio: number;
  fechaEmision: string;
  receptorRut: string;
  receptorRazonSocial: string;
  receptorGiro: string;
  receptorDireccion: string;
  receptorComuna: string;
  receptorCiudad: string;
  montoNeto: number;
  montoExento: number;
  iva: number;
  montoTotal: number;
  estado: string;
  estadoSii: string;
  pagado: string;
  items: InvoiceItem[];
  metodoPago: string;
  condicionPago: string;
  observaciones: string;
  refTipoDte?: number;
  refFolio?: number;
  refFecha?: string;
  refRazon?: string;
  refCodigo?: number;
}

interface MonthlyTotals {
  facturasCount: number;
  boletasCount: number;
  notasCreditoCount: number;
  montoNetoMes: number;
  ivaMes: number;
  byType: { tipoDte: number; cantidad: number; montoNeto: number; iva: number; total: number }[];
}

interface CafStatus {
  items: { tipoDte: number; foliosDisponibles: number; folioDesde: number; folioHasta: number }[];
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const DTE_TYPES: Record<number, string> = {
  33: 'Factura',
  34: 'Factura Exenta',
  39: 'Boleta',
  52: 'Guia Despacho',
  56: 'N. Debito',
  61: 'N. Credito',
};

const DTE_SHORT: Record<number, string> = {
  33: 'Factura',
  34: 'F. Exenta',
  39: 'Boleta',
  52: 'Guia',
  56: 'N/D',
  61: 'N/C',
};

const DTE_BADGE_VARIANT: Record<number, 'primary' | 'info' | 'success' | 'warning' | 'error'> = {
  33: 'primary',
  34: 'info',
  39: 'success',
  52: 'warning',
  56: 'error',
  61: 'error',
};

const ESTADO_LABEL: Record<string, string> = {
  draft: 'Borrador',
  issued: 'Emitida',
  sent_to_sii: 'Enviada SII',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  void: 'Anulada',
};

const ESTADO_BADGE: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  issued: 'info',
  sent_to_sii: 'warning',
  accepted: 'success',
  rejected: 'error',
  void: 'error',
};

const SII_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  sent: 'Enviado',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
};

const SII_BADGE: Record<string, 'default' | 'info' | 'success' | 'error'> = {
  pending: 'default',
  sent: 'info',
  accepted: 'success',
  rejected: 'error',
};

const PAGADO_BADGE: Record<string, 'success' | 'warning' | 'info'> = {
  si: 'success',
  no: 'warning',
  parcial: 'info',
};

const PAGADO_LABEL: Record<string, string> = {
  si: 'Si',
  no: 'No',
  parcial: 'Parcial',
};

const UNIDADES = ['UN', 'KG', 'LT', 'HR', 'MT', 'M2', 'M3'];

const METODOS_PAGO = [
  { value: '', label: 'Seleccionar...' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta_debito', label: 'Tarjeta Debito' },
  { value: 'tarjeta_credito', label: 'Tarjeta Credito' },
  { value: 'cheque', label: 'Cheque' },
];

const CONDICIONES_PAGO = [
  { value: '', label: 'Seleccionar...' },
  { value: 'contado', label: 'Contado' },
  { value: '30_dias', label: '30 dias' },
  { value: '60_dias', label: '60 dias' },
  { value: '90_dias', label: '90 dias' },
];

const REF_CODIGOS = [
  { value: 1, label: '1 — Anula documento' },
  { value: 2, label: '2 — Corrige texto' },
  { value: 3, label: '3 — Corrige montos' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
};

function formatRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '');
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${dv}`;
}

function emptyItem(): InvoiceItem {
  return {
    codigo: '',
    nombreItem: '',
    descripcion: '',
    cantidad: 1,
    unidad: 'UN',
    precioUnitario: 0,
    descuentoPct: 0,
    exento: false,
  };
}

function calcLineTotal(item: InvoiceItem): number {
  return Math.round(item.cantidad * item.precioUnitario * (1 - item.descuentoPct / 100));
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

export default function FacturacionPage() {
  // Data state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotals | null>(null);
  const [cafStatus, setCafStatus] = useState<CafStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');
  const [filterFolio, setFilterFolio] = useState('');

  // Create mode
  const [createMode, setCreateMode] = useState<'none' | 'factura' | 'nota_credito'>('none');
  const [submitting, setSubmitting] = useState(false);

  // Form — factura
  const [formTipoDte, setFormTipoDte] = useState(33);
  const [formRut, setFormRut] = useState('');
  const [formRazonSocial, setFormRazonSocial] = useState('');
  const [formGiro, setFormGiro] = useState('');
  const [formDireccion, setFormDireccion] = useState('');
  const [formComuna, setFormComuna] = useState('');
  const [formCiudad, setFormCiudad] = useState('');
  const [formItems, setFormItems] = useState<InvoiceItem[]>([emptyItem()]);
  const [formMetodoPago, setFormMetodoPago] = useState('');
  const [formCondicionPago, setFormCondicionPago] = useState('');
  const [formObservaciones, setFormObservaciones] = useState('');

  // Form — nota credito
  const [ncRefTipo, setNcRefTipo] = useState(33);
  const [ncRefFolio, setNcRefFolio] = useState('');
  const [ncRefFecha, setNcRefFecha] = useState('');
  const [ncRefRazon, setNcRefRazon] = useState('');
  const [ncRefCodigo, setNcRefCodigo] = useState(1);

  // Current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filterTipo) params.set('tipoDte', filterTipo);
    if (filterEstado) params.set('estado', filterEstado);
    if (filterDesde) params.set('desde', filterDesde);
    if (filterHasta) params.set('hasta', filterHasta);
    if (filterFolio) params.set('folio', filterFolio);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [filterTipo, filterEstado, filterDesde, filterHasta, filterFolio]);

  const fetchInvoices = useCallback(async () => {
    try {
      const data = await api.get<Invoice[]>(`/facturacion${buildQueryParams()}`);
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar documentos tributarios');
    }
  }, [buildQueryParams]);

  const fetchMonthlyTotals = useCallback(async () => {
    try {
      const data = await api.get<MonthlyTotals>(
        `/facturacion/monthly-totals?year=${currentYear}&month=${currentMonth}`
      );
      setMonthlyTotals(data);
    } catch {
      // Non-critical — silently ignore
    }
  }, [currentYear, currentMonth]);

  const fetchCafStatus = useCallback(async () => {
    try {
      const data = await api.get<CafStatus>('/facturacion/caf-status');
      setCafStatus(data);
    } catch {
      // Non-critical — silently ignore
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError('');
      await Promise.all([fetchInvoices(), fetchMonthlyTotals(), fetchCafStatus()]);
      setLoading(false);
    }
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Filter search
  // -------------------------------------------------------------------------

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    await fetchInvoices();
    setLoading(false);
  };

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleSendToSii = async (id: string) => {
    try {
      await api.post(`/facturacion/${id}/send-sii`);
      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar al SII');
    }
  };

  const handleVoid = async (id: string) => {
    if (!confirm('Seguro que desea anular este documento?')) return;
    try {
      await api.post(`/facturacion/${id}/void`);
      await fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al anular documento');
    }
  };

  // -------------------------------------------------------------------------
  // Form calculations
  // -------------------------------------------------------------------------

  const formTotals = useMemo(() => {
    let neto = 0;
    let exento = 0;
    formItems.forEach((item) => {
      const lineTotal = calcLineTotal(item);
      if (item.exento) {
        exento += lineTotal;
      } else {
        neto += lineTotal;
      }
    });
    const iva = Math.round(neto * 0.19);
    const total = neto + exento + iva;
    return { neto, exento, iva, total };
  }, [formItems]);

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number | boolean) => {
    setFormItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addItem = () => setFormItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    setFormItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  // -------------------------------------------------------------------------
  // Submit — Create Draft
  // -------------------------------------------------------------------------

  const resetForm = () => {
    setFormTipoDte(33);
    setFormRut('');
    setFormRazonSocial('');
    setFormGiro('');
    setFormDireccion('');
    setFormComuna('');
    setFormCiudad('');
    setFormItems([emptyItem()]);
    setFormMetodoPago('');
    setFormCondicionPago('');
    setFormObservaciones('');
    setNcRefTipo(33);
    setNcRefFolio('');
    setNcRefFecha('');
    setNcRefRazon('');
    setNcRefCodigo(1);
    setCreateMode('none');
  };

  const handleCreateDraft = async () => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        tipoDte: createMode === 'nota_credito' ? 61 : formTipoDte,
        receptorRut: formRut.replace(/[^0-9kK]/g, ''),
        receptorRazonSocial: formRazonSocial,
        receptorGiro: formGiro,
        receptorDireccion: formDireccion,
        receptorComuna: formComuna,
        receptorCiudad: formCiudad,
        items: createMode === 'nota_credito' && ncRefCodigo === 1 ? [] : formItems,
        metodoPago: formMetodoPago,
        condicionPago: formCondicionPago,
        observaciones: formObservaciones,
        ...(createMode === 'nota_credito' && {
          refTipoDte: ncRefTipo,
          refFolio: Number(ncRefFolio),
          refFecha: ncRefFecha,
          refRazon: ncRefRazon,
          refCodigo: ncRefCodigo,
        }),
      };
      await api.post('/facturacion', payload);
      resetForm();
      await Promise.all([fetchInvoices(), fetchMonthlyTotals()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear borrador');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Summary cards data
  // -------------------------------------------------------------------------

  const summaryCards = monthlyTotals
    ? [
        {
          label: 'Facturas Emitidas',
          value: monthlyTotals.facturasCount,
          format: 'number' as const,
          border: 'border-l-blue-500',
        },
        {
          label: 'Boletas',
          value: monthlyTotals.boletasCount,
          format: 'number' as const,
          border: 'border-l-blue-500',
        },
        {
          label: 'Notas de Credito',
          value: monthlyTotals.notasCreditoCount,
          format: 'number' as const,
          border: 'border-l-amber-500',
        },
        {
          label: 'Monto Neto Mes',
          value: monthlyTotals.montoNetoMes,
          format: 'currency' as const,
          border: 'border-l-emerald-500',
        },
        {
          label: 'IVA Mes',
          value: monthlyTotals.ivaMes,
          format: 'currency' as const,
          border: 'border-l-red-500',
        },
      ]
    : [];

  // -------------------------------------------------------------------------
  // Table columns
  // -------------------------------------------------------------------------

  const columns: Column<Invoice>[] = [
    {
      key: 'tipoDte',
      header: 'Tipo',
      render: (inv) => (
        <Badge variant={DTE_BADGE_VARIANT[inv.tipoDte] || 'default'}>
          {DTE_SHORT[inv.tipoDte] || `DTE ${inv.tipoDte}`}
        </Badge>
      ),
    },
    {
      key: 'folio',
      header: 'Folio',
      render: (inv) => <span className="font-bold text-slate-800">{inv.folio}</span>,
    },
    {
      key: 'fechaEmision',
      header: 'Fecha',
      className: 'hidden sm:table-cell',
      render: (inv) => formatDate(inv.fechaEmision),
    },
    {
      key: 'receptor',
      header: 'Receptor',
      render: (inv) => (
        <div>
          <p className="text-sm text-slate-800">{inv.receptorRazonSocial}</p>
          <p className="text-xs text-slate-400">{formatRut(inv.receptorRut)}</p>
        </div>
      ),
    },
    {
      key: 'montoNeto',
      header: 'Neto',
      className: 'hidden lg:table-cell',
      render: (inv) => formatCurrency(inv.montoNeto),
    },
    {
      key: 'iva',
      header: 'IVA',
      className: 'hidden xl:table-cell',
      render: (inv) => formatCurrency(inv.iva),
    },
    {
      key: 'montoTotal',
      header: 'Total',
      render: (inv) => <span className="font-semibold">{formatCurrency(inv.montoTotal)}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (inv) => (
        <Badge variant={ESTADO_BADGE[inv.estado] || 'default'}>
          {ESTADO_LABEL[inv.estado] || inv.estado}
        </Badge>
      ),
    },
    {
      key: 'estadoSii',
      header: 'SII',
      className: 'hidden md:table-cell',
      render: (inv) => (
        <Badge variant={SII_BADGE[inv.estadoSii] || 'default'}>
          {SII_LABEL[inv.estadoSii] || inv.estadoSii}
        </Badge>
      ),
    },
    {
      key: 'pagado',
      header: 'Pagado',
      className: 'hidden md:table-cell',
      render: (inv) => (
        <Badge variant={PAGADO_BADGE[inv.pagado] || 'default'}>
          {PAGADO_LABEL[inv.pagado] || inv.pagado}
        </Badge>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (inv) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost">
            Ver
          </Button>
          {inv.estado === 'issued' && (
            <Button size="sm" variant="secondary" onClick={() => handleSendToSii(inv.id)}>
              Enviar SII
            </Button>
          )}
          {inv.estado === 'draft' && (
            <Button size="sm" variant="danger" onClick={() => handleVoid(inv.id)}>
              Anular
            </Button>
          )}
        </div>
      ),
    },
  ];

  // -------------------------------------------------------------------------
  // Monthly totals by type rows
  // -------------------------------------------------------------------------

  const monthlyByTypeColumns: Column<{
    tipoDte: number;
    cantidad: number;
    montoNeto: number;
    iva: number;
    total: number;
  }>[] = [
    {
      key: 'tipoDte',
      header: 'Tipo DTE',
      render: (r) => (
        <Badge variant={DTE_BADGE_VARIANT[r.tipoDte] || 'default'}>
          {DTE_TYPES[r.tipoDte] || `DTE ${r.tipoDte}`}
        </Badge>
      ),
    },
    { key: 'cantidad', header: 'Cantidad', render: (r) => <span className="font-medium">{r.cantidad}</span> },
    { key: 'montoNeto', header: 'Monto Neto', render: (r) => formatCurrency(r.montoNeto) },
    { key: 'iva', header: 'IVA', render: (r) => formatCurrency(r.iva) },
    { key: 'total', header: 'Total', render: (r) => <span className="font-semibold">{formatCurrency(r.total)}</span> },
  ];

  // -------------------------------------------------------------------------
  // Grand totals
  // -------------------------------------------------------------------------

  const grandTotals = useMemo(() => {
    if (!monthlyTotals?.byType) return null;
    return monthlyTotals.byType.reduce(
      (acc, r) => ({
        cantidad: acc.cantidad + r.cantidad,
        montoNeto: acc.montoNeto + r.montoNeto,
        iva: acc.iva + r.iva,
        total: acc.total + r.total,
      }),
      { cantidad: 0, montoNeto: 0, iva: 0, total: 0 }
    );
  }, [monthlyTotals]);

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading && invoices.length === 0) {
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
          <span className="text-slate-500">Cargando facturacion electronica...</span>
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
          {/* SII Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
            <svg className="w-6 h-6 text-blue-700" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Facturacion Electronica</h1>
            <p className="text-sm text-slate-500">Documentos Tributarios Electronicos — SII Chile</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { resetForm(); setCreateMode('factura'); }}>
            + Nueva Factura
          </Button>
          <Button variant="secondary" onClick={() => { resetForm(); setCreateMode('nota_credito'); }}>
            + Nota de Credito
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

      {/* ----------------------------------------------------------------- */}
      {/* SUMMARY CARDS                                                     */}
      {/* ----------------------------------------------------------------- */}
      {summaryCards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.label} className={`border-l-4 ${card.border}`}>
              <CardBody>
                <p className="text-2xl font-bold text-slate-800">
                  {card.format === 'currency' ? formatCurrency(card.value) : card.value}
                </p>
                <p className="text-xs text-slate-500 mt-1">{card.label}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* CAF STATUS                                                        */}
      {/* ----------------------------------------------------------------- */}
      {cafStatus && cafStatus.items.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
              </svg>
              <h3 className="text-sm font-semibold text-slate-700">Folios Disponibles (CAF)</h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              {cafStatus.items.map((caf) => {
                const colorClass =
                  caf.foliosDisponibles > 100
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : caf.foliosDisponibles >= 10
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-red-50 border-red-200 text-red-800';
                return (
                  <div
                    key={caf.tipoDte}
                    className={`px-3 py-2 rounded-lg border text-sm ${colorClass}`}
                  >
                    <span className="font-medium">{DTE_TYPES[caf.tipoDte] || `DTE ${caf.tipoDte}`}</span>
                    <span className="ml-2 font-bold">{caf.foliosDisponibles}</span>
                    <span className="text-xs ml-1">folios</span>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* CREATE INVOICE FORM                                               */}
      {/* ----------------------------------------------------------------- */}
      {createMode === 'factura' && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Nueva Factura — Borrador</h3>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {/* DTE Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Documento</label>
                <div className="flex gap-2">
                  {[33, 34, 39, 52].map((tipo) => (
                    <button
                      key={tipo}
                      onClick={() => setFormTipoDte(tipo)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        formTipoDte === tipo
                          ? 'bg-blue-50 border-blue-300 text-blue-800'
                          : 'bg-white border-[var(--color-border)] text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {DTE_TYPES[tipo]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Receptor */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  Receptor
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    label="RUT"
                    placeholder="12.345.678-9"
                    value={formatRut(formRut)}
                    onChange={(e) => setFormRut(e.target.value.replace(/[^0-9kK]/g, ''))}
                  />
                  <Input
                    label="Razon Social"
                    value={formRazonSocial}
                    onChange={(e) => setFormRazonSocial(e.target.value)}
                  />
                  <Input
                    label="Giro"
                    value={formGiro}
                    onChange={(e) => setFormGiro(e.target.value)}
                  />
                  <Input
                    label="Direccion"
                    value={formDireccion}
                    onChange={(e) => setFormDireccion(e.target.value)}
                  />
                  <Input
                    label="Comuna"
                    value={formComuna}
                    onChange={(e) => setFormComuna(e.target.value)}
                  />
                  <Input
                    label="Ciudad"
                    value={formCiudad}
                    onChange={(e) => setFormCiudad(e.target.value)}
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    Items del Documento
                  </h4>
                  <Button size="sm" variant="ghost" onClick={addItem}>
                    + Agregar Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-[var(--color-border)]">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
                        <Input
                          label="Codigo"
                          value={item.codigo}
                          onChange={(e) => updateItem(idx, 'codigo', e.target.value)}
                        />
                        <Input
                          label="Nombre Item"
                          value={item.nombreItem}
                          onChange={(e) => updateItem(idx, 'nombreItem', e.target.value)}
                        />
                        <Input
                          label="Descripcion"
                          value={item.descripcion}
                          onChange={(e) => updateItem(idx, 'descripcion', e.target.value)}
                          className="hidden sm:block"
                        />
                        <Input
                          label="Cantidad"
                          type="number"
                          min={1}
                          value={item.cantidad}
                          onChange={(e) => updateItem(idx, 'cantidad', Number(e.target.value))}
                        />
                        <Select
                          label="Unidad"
                          value={item.unidad}
                          onChange={(v) => updateItem(idx, 'unidad', v)}
                          options={UNIDADES.map((u) => ({ value: u, label: u }))}
                        />
                        <Input
                          label="Precio Unit."
                          type="number"
                          min={0}
                          value={item.precioUnitario}
                          onChange={(e) => updateItem(idx, 'precioUnitario', Number(e.target.value))}
                        />
                        <Input
                          label="Dto %"
                          type="number"
                          min={0}
                          max={100}
                          value={item.descuentoPct}
                          onChange={(e) => updateItem(idx, 'descuentoPct', Number(e.target.value))}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={item.exento}
                            onChange={(e) => updateItem(idx, 'exento', e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Exento de IVA
                        </label>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-slate-700">
                            Linea: {formatCurrency(calcLineTotal(item))}
                          </span>
                          {formItems.length > 1 && (
                            <Button size="sm" variant="danger" onClick={() => removeItem(idx)}>
                              Quitar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-slate-50 rounded-lg border border-[var(--color-border)] p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Neto</span>
                    <p className="text-lg font-semibold text-slate-800">{formatCurrency(formTotals.neto)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Exento</span>
                    <p className="text-lg font-semibold text-slate-800">{formatCurrency(formTotals.exento)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">IVA (19%)</span>
                    <p className="text-lg font-semibold text-slate-800">{formatCurrency(formTotals.iva)}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Total</span>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(formTotals.total)}</p>
                  </div>
                </div>
              </div>

              {/* Payment & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Metodo de Pago"
                  value={formMetodoPago}
                  onChange={setFormMetodoPago}
                  options={METODOS_PAGO}
                />
                <Select
                  label="Condicion de Pago"
                  value={formCondicionPago}
                  onChange={setFormCondicionPago}
                  options={CONDICIONES_PAGO}
                />
                <div className="w-full">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
                  <textarea
                    value={formObservaciones}
                    onChange={(e) => setFormObservaciones(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
                <Button variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button loading={submitting} onClick={handleCreateDraft}>
                  Crear Borrador
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* CREATE CREDIT NOTE FORM                                           */}
      {/* ----------------------------------------------------------------- */}
      {createMode === 'nota_credito' && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Nota de Credito — Borrador</h3>
              <Button size="sm" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {/* Reference */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                  Documento de Referencia
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select
                    label="Tipo Doc. Original"
                    value={String(ncRefTipo)}
                    onChange={(v) => setNcRefTipo(Number(v))}
                    options={[
                      { value: '33', label: 'Factura (33)' },
                      { value: '34', label: 'Factura Exenta (34)' },
                      { value: '39', label: 'Boleta (39)' },
                      { value: '56', label: 'N. Debito (56)' },
                    ]}
                  />
                  <Input
                    label="Folio Original"
                    type="number"
                    value={ncRefFolio}
                    onChange={(e) => setNcRefFolio(e.target.value)}
                  />
                  <Input
                    label="Fecha Original"
                    type="date"
                    value={ncRefFecha}
                    onChange={(e) => setNcRefFecha(e.target.value)}
                  />
                  <Select
                    label="Codigo Referencia"
                    value={String(ncRefCodigo)}
                    onChange={(v) => setNcRefCodigo(Number(v))}
                    options={REF_CODIGOS.map((r) => ({ value: String(r.value), label: r.label }))}
                  />
                </div>
                <div className="mt-3">
                  <Input
                    label="Razon de la Referencia"
                    value={ncRefRazon}
                    onChange={(e) => setNcRefRazon(e.target.value)}
                    placeholder="Motivo de la nota de credito..."
                  />
                </div>
              </div>

              {/* Receptor */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Receptor</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    label="RUT"
                    placeholder="12.345.678-9"
                    value={formatRut(formRut)}
                    onChange={(e) => setFormRut(e.target.value.replace(/[^0-9kK]/g, ''))}
                  />
                  <Input
                    label="Razon Social"
                    value={formRazonSocial}
                    onChange={(e) => setFormRazonSocial(e.target.value)}
                  />
                  <Input
                    label="Giro"
                    value={formGiro}
                    onChange={(e) => setFormGiro(e.target.value)}
                  />
                  <Input
                    label="Direccion"
                    value={formDireccion}
                    onChange={(e) => setFormDireccion(e.target.value)}
                  />
                  <Input
                    label="Comuna"
                    value={formComuna}
                    onChange={(e) => setFormComuna(e.target.value)}
                  />
                  <Input
                    label="Ciudad"
                    value={formCiudad}
                    onChange={(e) => setFormCiudad(e.target.value)}
                  />
                </div>
              </div>

              {/* Items — only for code 3 (corrige montos) */}
              {ncRefCodigo === 3 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700">Items Corregidos</h4>
                    <Button size="sm" variant="ghost" onClick={addItem}>
                      + Agregar Item
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formItems.map((item, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-[var(--color-border)]">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
                          <Input
                            label="Codigo"
                            value={item.codigo}
                            onChange={(e) => updateItem(idx, 'codigo', e.target.value)}
                          />
                          <Input
                            label="Nombre Item"
                            value={item.nombreItem}
                            onChange={(e) => updateItem(idx, 'nombreItem', e.target.value)}
                          />
                          <Input
                            label="Descripcion"
                            value={item.descripcion}
                            onChange={(e) => updateItem(idx, 'descripcion', e.target.value)}
                            className="hidden sm:block"
                          />
                          <Input
                            label="Cantidad"
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) => updateItem(idx, 'cantidad', Number(e.target.value))}
                          />
                          <Select
                            label="Unidad"
                            value={item.unidad}
                            onChange={(v) => updateItem(idx, 'unidad', v)}
                            options={UNIDADES.map((u) => ({ value: u, label: u }))}
                          />
                          <Input
                            label="Precio Unit."
                            type="number"
                            min={0}
                            value={item.precioUnitario}
                            onChange={(e) => updateItem(idx, 'precioUnitario', Number(e.target.value))}
                          />
                          <Input
                            label="Dto %"
                            type="number"
                            min={0}
                            max={100}
                            value={item.descuentoPct}
                            onChange={(e) => updateItem(idx, 'descuentoPct', Number(e.target.value))}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={item.exento}
                              onChange={(e) => updateItem(idx, 'exento', e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Exento de IVA
                          </label>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-slate-700">
                              Linea: {formatCurrency(calcLineTotal(item))}
                            </span>
                            {formItems.length > 1 && (
                              <Button size="sm" variant="danger" onClick={() => removeItem(idx)}>
                                Quitar
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals for NC */}
                  <div className="mt-4 bg-slate-50 rounded-lg border border-[var(--color-border)] p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Neto</span>
                        <p className="text-lg font-semibold text-slate-800">{formatCurrency(formTotals.neto)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Exento</span>
                        <p className="text-lg font-semibold text-slate-800">{formatCurrency(formTotals.exento)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">IVA (19%)</span>
                        <p className="text-lg font-semibold text-slate-800">{formatCurrency(formTotals.iva)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Total</span>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(formTotals.total)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info for code 1 (anula) */}
              {ncRefCodigo === 1 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    Anulacion completa — no se requieren items. La nota de credito anulara el monto total del documento original.
                  </div>
                </div>
              )}

              {/* Code 2 info */}
              {ncRefCodigo === 2 && (
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg text-sm text-sky-800">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                    </svg>
                    Correccion de texto — especifique la razon de la correccion en el campo correspondiente.
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
                <Button variant="ghost" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button loading={submitting} onClick={handleCreateDraft}>
                  Crear Borrador N/C
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* FILTER BAR                                                        */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardBody>
          <div className="flex flex-col lg:flex-row gap-3 items-end">
            <Select
              label="Tipo DTE"
              value={filterTipo}
              onChange={setFilterTipo}
              options={[
                { value: '', label: 'Todos' },
                { value: '33', label: 'Factura (33)' },
                { value: '34', label: 'Factura Exenta (34)' },
                { value: '39', label: 'Boleta (39)' },
                { value: '52', label: 'Guia Despacho (52)' },
                { value: '56', label: 'N. Debito (56)' },
                { value: '61', label: 'N. Credito (61)' },
              ]}
            />
            <Select
              label="Estado"
              value={filterEstado}
              onChange={setFilterEstado}
              options={[
                { value: '', label: 'Todos' },
                { value: 'draft', label: 'Borrador' },
                { value: 'issued', label: 'Emitida' },
                { value: 'sent_to_sii', label: 'Enviada SII' },
                { value: 'accepted', label: 'Aceptada' },
                { value: 'rejected', label: 'Rechazada' },
                { value: 'void', label: 'Anulada' },
              ]}
            />
            <Input
              label="Desde"
              type="date"
              value={filterDesde}
              onChange={(e) => setFilterDesde(e.target.value)}
            />
            <Input
              label="Hasta"
              type="date"
              value={filterHasta}
              onChange={(e) => setFilterHasta(e.target.value)}
            />
            <Input
              label="Folio"
              placeholder="N. folio"
              value={filterFolio}
              onChange={(e) => setFilterFolio(e.target.value)}
            />
            <Button onClick={handleSearch} className="whitespace-nowrap">
              Buscar
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* INVOICES TABLE                                                    */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Documentos Tributarios</h3>
            <span className="text-sm text-slate-500">{invoices.length} documento{invoices.length !== 1 ? 's' : ''}</span>
          </div>
        </CardHeader>
        <Table
          columns={columns}
          data={invoices}
          keyExtractor={(inv) => inv.id}
          loading={loading}
          emptyMessage="No se encontraron documentos tributarios"
        />
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* MONTHLY TOTALS BY TYPE                                            */}
      {/* ----------------------------------------------------------------- */}
      {monthlyTotals && monthlyTotals.byType && monthlyTotals.byType.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-slate-800">
              Resumen Mensual — {new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(now)}
            </h3>
          </CardHeader>
          <Table
            columns={monthlyByTypeColumns}
            data={monthlyTotals.byType}
            keyExtractor={(r) => String(r.tipoDte)}
            emptyMessage="Sin datos para el mes actual"
          />
          {/* Grand totals footer */}
          {grandTotals && (
            <div className="px-4 py-3 bg-slate-50 border-t border-[var(--color-border)]">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-slate-800">TOTALES</span>
                <div className="flex items-center gap-8">
                  <span className="text-slate-600">
                    <span className="text-slate-400 mr-1">Cantidad:</span>
                    <span className="font-bold">{grandTotals.cantidad}</span>
                  </span>
                  <span className="text-slate-600 hidden sm:inline">
                    <span className="text-slate-400 mr-1">Neto:</span>
                    <span className="font-bold">{formatCurrency(grandTotals.montoNeto)}</span>
                  </span>
                  <span className="text-slate-600 hidden sm:inline">
                    <span className="text-slate-400 mr-1">IVA:</span>
                    <span className="font-bold">{formatCurrency(grandTotals.iva)}</span>
                  </span>
                  <span className="text-slate-800">
                    <span className="text-slate-400 mr-1">Total:</span>
                    <span className="font-extrabold text-base">{formatCurrency(grandTotals.total)}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

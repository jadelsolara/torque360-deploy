'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Types ──────────────────────────────────────────────────────────

interface ImportOrderItem {
  id: string;
  description: string;
  partNumber: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  totalFob: number;
  totalPrice: number;
  arancelRate: number;
  landedCostPerUnit: number;
  totalLandedCost: number;
  landedUnitCost: number;
  weightKg: number;
  volumeCbm: number;
}

interface ImportOrder {
  id: string;
  orderNumber: number;
  supplierId: string;
  supplierName: string;
  status: string;
  incoterm: string;
  originCountry: string;
  originPort: string;
  destinationPort: string;
  currency: string;
  exchangeRateAtOrder: number;
  exchangeRateAtCustoms: number;
  exchangeRateCurrent: number;
  exchangeRate: number;
  fobTotal: number;
  freightCost: number;
  insuranceCost: number;
  cifTotal: number;
  cifClp: number;
  arancelRate: number;
  arancelAmount: number;
  ivaImportacion: number;
  gastosPuerto: number;
  agenteAduana: number;
  transporteInterno: number;
  otrosGastos: number;
  totalLandedCostClp: number;
  totalLandedCostUsd: number;
  landedCostTotal: number;
  totalUnits: number;
  costPerUnitClp: number;
  costPerUnitUsd: number;
  blNumber: string;
  containerNumber: string;
  shippingLine: string;
  vesselName: string;
  etd: string;
  eta: string;
  actualArrival: string;
  customsClearanceDate: string;
  warehouseEntryDate: string;
  items: ImportOrderItem[];
  createdAt: string;
}

interface CostBreakdown {
  orderId: string;
  orderNumber: number;
  currency: string;
  exchangeRateUsed: number;
  exchangeRateSource: string;
  fobTotalUsd: number;
  freightCostUsd: number;
  insuranceCostUsd: number;
  cifTotalUsd: number;
  cifClp: number;
  arancelRate: number;
  arancelAmount: number;
  ivaImportacion: number;
  gastosPuerto: number;
  agenteAduana: number;
  transporteInterno: number;
  otrosGastos: number;
  totalLandedCostClp: number;
  totalLandedCostUsd: number;
  totalUnits: number;
  costPerUnitClp: number;
  costPerUnitUsd: number;
  percentages: {
    fob: number;
    freight: number;
    insurance: number;
    arancel: number;
    iva: number;
    puerto: number;
    aduana: number;
    transporte: number;
    otros: number;
  };
  items: Array<{
    itemId: string;
    description: string;
    partNumber: string;
    hsCode: string;
    quantity: number;
    unitPriceUsd: number;
    totalFobUsd: number;
    arancelRate: number;
    fobProportion: number;
    landedCostPerUnit: number;
    totalLandedCost: number;
  }>;
}

interface RateComparison {
  orderId: string;
  orderNumber: number;
  rateAtOrder: number;
  rateAtCustoms: number;
  rateCurrent: number;
  landedCostAtOrderRate: number;
  landedCostAtCustomsRate: number;
  landedCostAtCurrentRate: number;
  differenceOrderVsCurrent: number;
  differencePercentage: number;
  favorableDirection: string;
}

interface ExchangeRateEntry {
  id: string;
  currency: string;
  date: string;
  observedRate: number;
  source: string;
}

interface PipelineSummary {
  byStatus: Record<string, { count: number; totalValue: number }>;
  totalOrders: number;
  totalPipelineValue: number;
  currentExchangeRate: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; variant: 'default' | 'primary' | 'info' | 'warning' | 'success' | 'error' }> = {
  draft: { label: 'Borrador', variant: 'default' },
  confirmed: { label: 'Confirmada', variant: 'primary' },
  shipped: { label: 'Embarcada', variant: 'info' },
  in_transit: { label: 'En Transito', variant: 'info' },
  at_port: { label: 'En Puerto', variant: 'warning' },
  customs: { label: 'En Aduana', variant: 'warning' },
  cleared: { label: 'Despachada', variant: 'success' },
  received: { label: 'Recibida', variant: 'success' },
  closed: { label: 'Cerrada', variant: 'default' },
};

const fmtUsd = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);

const fmtClp = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v || 0);

const fmtRate = (v: number) =>
  v ? `$${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}` : '-';

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const fmtDate = (d: string) => {
  if (!d) return '-';
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d));
};

// ─── Tab: Orders List ───────────────────────────────────────────────

type Tab = 'orders' | 'calculator' | 'rates';

export default function ImportacionesPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<ImportOrder[]>([]);
  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ImportOrder | null>(null);
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null);
  const [comparison, setComparison] = useState<RateComparison | null>(null);
  const [rateHistory, setRateHistory] = useState<ExchangeRateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [calcLoading, setCalcLoading] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Exchange rate manual entry
  const [manualRate, setManualRate] = useState('');

  // Fetch main data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersRes, pipelineRes] = await Promise.all([
        api.get<ImportOrder[]>('/imports'),
        api.get<PipelineSummary>('/imports/pipeline'),
      ]);
      setOrders(ordersRes);
      setPipeline(pipelineRes);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar importaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch rate history
  const fetchRateHistory = useCallback(async () => {
    try {
      const history = await api.get<ExchangeRateEntry[]>('/imports/exchange-rate/history?days=30');
      setRateHistory(history);
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchRateHistory();
  }, [fetchData, fetchRateHistory]);

  // Select an order and load its breakdown
  const selectOrder = async (order: ImportOrder) => {
    setSelectedOrder(order);
    setTab('calculator');
    setCalcLoading(true);
    try {
      const [bd, cmp] = await Promise.all([
        api.get<CostBreakdown>(`/imports/${order.id}/cost-breakdown`),
        api.get<RateComparison>(`/imports/${order.id}/rate-comparison`),
      ]);
      setBreakdown(bd);
      setComparison(cmp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al calcular costos');
    } finally {
      setCalcLoading(false);
    }
  };

  // Recalculate with current rate
  const recalculateCurrentRate = async () => {
    if (!selectedOrder) return;
    setCalcLoading(true);
    try {
      const bd = await api.post<CostBreakdown>(
        `/imports/${selectedOrder.id}/recalculate-current-rate`,
      );
      setBreakdown(bd);
      const cmp = await api.get<RateComparison>(
        `/imports/${selectedOrder.id}/rate-comparison`,
      );
      setComparison(cmp);
      setSuccessMsg('Costos recalculados con tipo de cambio actual');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al recalcular');
    } finally {
      setCalcLoading(false);
    }
  };

  // Fetch rate from mindicador.cl
  const fetchLiveRate = async () => {
    setRateLoading(true);
    try {
      await api.post('/imports/exchange-rate/fetch');
      setSuccessMsg('Tipo de cambio actualizado desde mindicador.cl');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
      fetchRateHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener tipo de cambio');
    } finally {
      setRateLoading(false);
    }
  };

  // Manual rate entry
  const submitManualRate = async () => {
    if (!manualRate) return;
    setRateLoading(true);
    try {
      await api.post('/imports/exchange-rate/update', {
        currency: 'USD',
        observedRate: parseFloat(manualRate),
        source: 'MANUAL',
      });
      setManualRate('');
      setSuccessMsg('Tipo de cambio ingresado manualmente');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
      fetchRateHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar tipo de cambio');
    } finally {
      setRateLoading(false);
    }
  };

  // ─── Pipeline Cards ─────────────────────────────────────────────

  const pipelineCards = pipeline
    ? [
        { label: 'Borrador', key: 'draft', color: 'border-l-slate-400', bg: 'bg-slate-50' },
        { label: 'Confirmadas', key: 'confirmed', color: 'border-l-blue-500', bg: 'bg-blue-50' },
        { label: 'En Transito', key: 'in_transit', color: 'border-l-sky-500', bg: 'bg-sky-50' },
        { label: 'En Aduana', key: 'customs', color: 'border-l-amber-500', bg: 'bg-amber-50' },
        { label: 'Recibidas', key: 'received', color: 'border-l-emerald-500', bg: 'bg-emerald-50' },
      ].map((c) => ({
        ...c,
        count: pipeline.byStatus[c.key]?.count || 0,
        value: pipeline.byStatus[c.key]?.totalValue || 0,
      }))
    : [];

  // ─── Orders Table Columns ─────────────────────────────────────────

  const orderColumns: Column<ImportOrder>[] = [
    {
      key: 'orderNumber',
      header: '# Orden',
      render: (o) => (
        <button
          onClick={() => selectOrder(o)}
          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
        >
          IMP-{String(o.orderNumber).padStart(4, '0')}
        </button>
      ),
    },
    {
      key: 'supplierName',
      header: 'Proveedor',
      render: (o) => <span className="text-slate-700">{o.supplierName || '-'}</span>,
    },
    {
      key: 'incoterm',
      header: 'Incoterm',
      className: 'hidden md:table-cell',
    },
    {
      key: 'route',
      header: 'Ruta',
      className: 'hidden lg:table-cell',
      render: (o) => (
        <span className="text-xs text-slate-600">
          {o.originPort || o.originCountry || '?'} &rarr; {o.destinationPort || 'Valparaiso'}
        </span>
      ),
    },
    {
      key: 'fobTotal',
      header: 'FOB (USD)',
      className: 'hidden xl:table-cell',
      render: (o) => <span className="font-mono text-sm">{fmtUsd(o.fobTotal)}</span>,
    },
    {
      key: 'exchangeRate',
      header: 'TC USD/CLP',
      className: 'hidden xl:table-cell',
      render: (o) => (
        <span className="font-mono text-sm text-slate-600">
          {fmtRate(o.exchangeRateCurrent || o.exchangeRate)}
        </span>
      ),
    },
    {
      key: 'landedCost',
      header: 'Costo Puesto Bodega',
      render: (o) => (
        <span className="font-semibold text-emerald-700">
          {fmtClp(o.totalLandedCostClp || o.landedCostTotal)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (o) => {
        const cfg = statusConfig[o.status] || { label: o.status, variant: 'default' as const };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'dates',
      header: 'ETD / ETA',
      className: 'hidden sm:table-cell',
      render: (o) => (
        <div className="text-xs text-slate-500">
          {o.etd && <div>ETD: {fmtDate(o.etd)}</div>}
          {o.eta && <div>ETA: {fmtDate(o.eta)}</div>}
          {!o.etd && !o.eta && '-'}
        </div>
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-500">Cargando importaciones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Importaciones</h1>
          <p className="text-sm text-slate-500 mt-1">
            Calculadora de Costo Puesto en Bodega (Landed Cost)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Current exchange rate badge */}
          {pipeline?.currentExchangeRate && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-xs text-blue-600 font-medium">USD/CLP</span>
              <span className="text-lg font-bold text-blue-800">
                {fmtRate(pipeline.currentExchangeRate)}
              </span>
              <button
                onClick={fetchLiveRate}
                disabled={rateLoading}
                className="ml-1 p-1 rounded hover:bg-blue-100 transition-colors"
                title="Actualizar tipo de cambio"
              >
                <svg className={`w-4 h-4 text-blue-600 ${rateLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          )}
          <Button>+ Nueva Orden</Button>
        </div>
      </div>

      {/* ── Messages ── */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-3">&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        {([
          { key: 'orders' as Tab, label: 'Ordenes de Importacion' },
          { key: 'calculator' as Tab, label: 'Calculadora de Costos' },
          { key: 'rates' as Tab, label: 'Tipo de Cambio' },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
         TAB: ORDERS LIST
         ═══════════════════════════════════════════════════════════════ */}
      {tab === 'orders' && (
        <>
          {/* Pipeline Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {pipelineCards.map((card) => (
              <Card key={card.key} className={`border-l-4 ${card.color}`}>
                <CardBody>
                  <p className="text-2xl font-bold text-slate-800">{card.count}</p>
                  <p className="text-xs text-slate-500 mt-1">{card.label}</p>
                  {card.value > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5">{fmtClp(card.value)}</p>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800">Ordenes de Importacion</h3>
                <span className="text-sm text-slate-500">{orders.length} ordenes</span>
              </div>
            </CardHeader>
            <Table
              columns={orderColumns}
              data={orders}
              keyExtractor={(o) => o.id}
              emptyMessage="No se encontraron ordenes de importacion"
            />
          </Card>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         TAB: COST CALCULATOR
         ═══════════════════════════════════════════════════════════════ */}
      {tab === 'calculator' && (
        <>
          {!selectedOrder ? (
            <Card>
              <CardBody>
                <div className="text-center py-12 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg font-medium">Seleccione una orden de importacion</p>
                  <p className="text-sm mt-1">Haga clic en el numero de orden en la tabla para ver el desglose de costos</p>
                  <Button
                    variant="ghost"
                    className="mt-4"
                    onClick={() => setTab('orders')}
                  >
                    Ir a Ordenes
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Orden IMP-{String(selectedOrder.orderNumber).padStart(4, '0')}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedOrder.supplierName} | {selectedOrder.incoterm} | {selectedOrder.originPort || selectedOrder.originCountry || '?'} &rarr; {selectedOrder.destinationPort}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusConfig[selectedOrder.status]?.variant || 'default'}>
                    {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                  </Badge>
                  <Button
                    size="sm"
                    onClick={recalculateCurrentRate}
                    loading={calcLoading}
                  >
                    Recalcular con TC Actual
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedOrder(null); setBreakdown(null); setComparison(null); setTab('orders'); }}
                  >
                    Volver
                  </Button>
                </div>
              </div>

              {calcLoading ? (
                <Card>
                  <CardBody>
                    <div className="flex items-center justify-center py-12 text-slate-400">
                      <svg className="animate-spin h-6 w-6 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Calculando costos...
                    </div>
                  </CardBody>
                </Card>
              ) : breakdown ? (
                <>
                  {/* ── Cost Breakdown Waterfall ── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Waterfall Breakdown */}
                    <Card>
                      <CardHeader>
                        <h3 className="text-lg font-semibold text-slate-800">
                          Desglose FOB &rarr; Bodega
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          TC: {fmtRate(breakdown.exchangeRateUsed)} ({breakdown.exchangeRateSource})
                        </p>
                      </CardHeader>
                      <CardBody className="space-y-0">
                        {/* FOB */}
                        <CostRow
                          label="1. FOB (Precio Origen)"
                          usd={breakdown.fobTotalUsd}
                          clp={breakdown.fobTotalUsd * breakdown.exchangeRateUsed}
                          pct={breakdown.percentages.fob}
                          color="bg-blue-500"
                          bold
                        />
                        {/* Freight */}
                        <CostRow
                          label="2. + Flete Internacional"
                          usd={breakdown.freightCostUsd}
                          clp={breakdown.freightCostUsd * breakdown.exchangeRateUsed}
                          pct={breakdown.percentages.freight}
                          color="bg-sky-500"
                        />
                        {/* Insurance */}
                        <CostRow
                          label="3. + Seguro Internacional"
                          usd={breakdown.insuranceCostUsd}
                          clp={breakdown.insuranceCostUsd * breakdown.exchangeRateUsed}
                          pct={breakdown.percentages.insurance}
                          color="bg-cyan-500"
                        />

                        {/* CIF Divider */}
                        <div className="border-t-2 border-blue-300 my-3 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-blue-800 text-sm">= CIF (Valor en Puerto Chile)</span>
                            <div className="text-right">
                              <span className="font-bold text-blue-800">{fmtUsd(breakdown.cifTotalUsd)}</span>
                              <span className="text-xs text-slate-500 ml-2">= {fmtClp(breakdown.cifClp)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Exchange Rate Conversion Note */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 my-3">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-amber-700 font-medium">
                              Conversion USD &rarr; CLP: {fmtUsd(breakdown.cifTotalUsd)} x {fmtRate(breakdown.exchangeRateUsed)} = {fmtClp(breakdown.cifClp)}
                            </span>
                          </div>
                        </div>

                        {/* Arancel */}
                        <CostRow
                          label={`4. + Arancel Aduanero (${fmtPct(breakdown.arancelRate * 100)} del CIF)`}
                          clp={breakdown.arancelAmount}
                          pct={breakdown.percentages.arancel}
                          color="bg-orange-500"
                        />
                        {/* IVA */}
                        <CostRow
                          label="5. + IVA Importacion (19%)"
                          clp={breakdown.ivaImportacion}
                          pct={breakdown.percentages.iva}
                          color="bg-red-500"
                        />
                        {/* Port Charges */}
                        <CostRow
                          label="6. + Gastos de Puerto"
                          clp={breakdown.gastosPuerto}
                          pct={breakdown.percentages.puerto}
                          color="bg-violet-500"
                        />
                        {/* Customs Broker */}
                        <CostRow
                          label="7. + Agente de Aduana"
                          clp={breakdown.agenteAduana}
                          pct={breakdown.percentages.aduana}
                          color="bg-purple-500"
                        />
                        {/* Inland Transport */}
                        <CostRow
                          label="8. + Transporte Interno"
                          clp={breakdown.transporteInterno}
                          pct={breakdown.percentages.transporte}
                          color="bg-pink-500"
                        />
                        {/* Other */}
                        <CostRow
                          label="9. + Otros Gastos"
                          clp={breakdown.otrosGastos}
                          pct={breakdown.percentages.otros}
                          color="bg-slate-500"
                        />

                        {/* Total Landed */}
                        <div className="border-t-2 border-emerald-500 mt-4 pt-4">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-emerald-800 text-base">
                              = COSTO PUESTO EN BODEGA
                            </span>
                            <div className="text-right">
                              <div className="font-bold text-emerald-800 text-xl">{fmtClp(breakdown.totalLandedCostClp)}</div>
                              <div className="text-xs text-slate-500">{fmtUsd(breakdown.totalLandedCostUsd)}</div>
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    {/* Right: Summary Cards */}
                    <div className="space-y-4">
                      {/* Per Unit Cost */}
                      <Card className="border-l-4 border-l-emerald-500">
                        <CardBody>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Costo por Unidad</p>
                          <div className="mt-2 flex items-baseline gap-3">
                            <span className="text-3xl font-bold text-emerald-700">{fmtClp(breakdown.costPerUnitClp)}</span>
                            <span className="text-sm text-slate-400">{fmtUsd(breakdown.costPerUnitUsd)}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{breakdown.totalUnits} unidades totales</p>
                        </CardBody>
                      </Card>

                      {/* Rate Comparison */}
                      {comparison && (
                        <Card className={`border-l-4 ${comparison.differenceOrderVsCurrent > 0 ? 'border-l-red-500' : comparison.differenceOrderVsCurrent < 0 ? 'border-l-emerald-500' : 'border-l-slate-300'}`}>
                          <CardHeader>
                            <h4 className="text-sm font-semibold text-slate-700">Comparacion de Tipos de Cambio</h4>
                          </CardHeader>
                          <CardBody className="space-y-3">
                            {comparison.rateAtOrder > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">TC al pedir:</span>
                                <div className="text-right">
                                  <span className="font-mono">{fmtRate(comparison.rateAtOrder)}</span>
                                  <span className="text-xs text-slate-400 ml-2">{fmtClp(comparison.landedCostAtOrderRate)}</span>
                                </div>
                              </div>
                            )}
                            {comparison.rateAtCustoms > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">TC en aduana:</span>
                                <div className="text-right">
                                  <span className="font-mono">{fmtRate(comparison.rateAtCustoms)}</span>
                                  <span className="text-xs text-slate-400 ml-2">{fmtClp(comparison.landedCostAtCustomsRate)}</span>
                                </div>
                              </div>
                            )}
                            {comparison.rateCurrent > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">TC actual:</span>
                                <div className="text-right">
                                  <span className="font-mono font-bold">{fmtRate(comparison.rateCurrent)}</span>
                                  <span className="text-xs text-slate-400 ml-2">{fmtClp(comparison.landedCostAtCurrentRate)}</span>
                                </div>
                              </div>
                            )}

                            {comparison.differenceOrderVsCurrent !== 0 && (
                              <div className={`mt-2 p-2 rounded-lg text-sm ${comparison.differenceOrderVsCurrent > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                <div className="font-semibold">
                                  {comparison.differenceOrderVsCurrent > 0 ? 'Costo aumento: ' : 'Costo disminuyo: '}
                                  {fmtClp(Math.abs(comparison.differenceOrderVsCurrent))}
                                  {' '}({fmtPct(Math.abs(comparison.differencePercentage))})
                                </div>
                                <div className="text-xs mt-0.5">{comparison.favorableDirection}</div>
                              </div>
                            )}
                          </CardBody>
                        </Card>
                      )}

                      {/* Cost Distribution Percentages */}
                      <Card>
                        <CardHeader>
                          <h4 className="text-sm font-semibold text-slate-700">Distribucion del Costo</h4>
                        </CardHeader>
                        <CardBody className="space-y-2">
                          <PercentageBar label="FOB" pct={breakdown.percentages.fob} color="bg-blue-500" />
                          <PercentageBar label="Flete" pct={breakdown.percentages.freight} color="bg-sky-500" />
                          <PercentageBar label="Seguro" pct={breakdown.percentages.insurance} color="bg-cyan-500" />
                          <PercentageBar label="Arancel" pct={breakdown.percentages.arancel} color="bg-orange-500" />
                          <PercentageBar label="IVA" pct={breakdown.percentages.iva} color="bg-red-500" />
                          <PercentageBar label="Puerto" pct={breakdown.percentages.puerto} color="bg-violet-500" />
                          <PercentageBar label="Aduana" pct={breakdown.percentages.aduana} color="bg-purple-500" />
                          <PercentageBar label="Transporte" pct={breakdown.percentages.transporte} color="bg-pink-500" />
                          <PercentageBar label="Otros" pct={breakdown.percentages.otros} color="bg-slate-500" />
                        </CardBody>
                      </Card>
                    </div>
                  </div>

                  {/* ── Per-Item Breakdown Table ── */}
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-slate-800">Desglose por Item</h3>
                      <p className="text-xs text-slate-500 mt-1">Costo aterrizado distribuido proporcionalmente por valor FOB</p>
                    </CardHeader>
                    <Table
                      columns={[
                        {
                          key: 'description',
                          header: 'Descripcion',
                          render: (i) => (
                            <div>
                              <div className="font-medium text-slate-800">{i.description}</div>
                              {i.partNumber && <div className="text-xs text-slate-400">P/N: {i.partNumber}</div>}
                              {i.hsCode && <div className="text-xs text-slate-400">HS: {i.hsCode}</div>}
                            </div>
                          ),
                        },
                        { key: 'quantity', header: 'Cant.' },
                        {
                          key: 'unitPriceUsd',
                          header: 'Precio Unit. FOB',
                          render: (i) => <span className="font-mono">{fmtUsd(i.unitPriceUsd)}</span>,
                        },
                        {
                          key: 'totalFobUsd',
                          header: 'Total FOB',
                          render: (i) => <span className="font-mono">{fmtUsd(i.totalFobUsd)}</span>,
                        },
                        {
                          key: 'arancelRate',
                          header: 'Arancel',
                          className: 'hidden md:table-cell',
                          render: (i) => <span>{fmtPct(i.arancelRate * 100)}</span>,
                        },
                        {
                          key: 'fobProportion',
                          header: '% del Total',
                          className: 'hidden lg:table-cell',
                          render: (i) => <span>{fmtPct(i.fobProportion * 100)}</span>,
                        },
                        {
                          key: 'landedCostPerUnit',
                          header: 'Costo Unit. Bodega',
                          render: (i) => (
                            <span className="font-semibold text-emerald-700">{fmtClp(i.landedCostPerUnit)}</span>
                          ),
                        },
                        {
                          key: 'totalLandedCost',
                          header: 'Total Landed',
                          render: (i) => (
                            <span className="font-semibold">{fmtClp(i.totalLandedCost)}</span>
                          ),
                        },
                      ] as Column<CostBreakdown['items'][0]>[]}
                      data={breakdown.items}
                      keyExtractor={(i) => i.itemId}
                      emptyMessage="Sin items"
                    />
                  </Card>
                </>
              ) : null}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         TAB: EXCHANGE RATES
         ═══════════════════════════════════════════════════════════════ */}
      {tab === 'rates' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Rate */}
          <Card className="border-t-4 border-t-blue-500">
            <CardHeader>
              <h3 className="text-lg font-semibold text-slate-800">Dolar del Dia</h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="text-center py-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider">USD / CLP</p>
                <p className="text-4xl font-bold text-blue-800 mt-2">
                  {pipeline?.currentExchangeRate ? fmtRate(pipeline.currentExchangeRate) : 'Sin datos'}
                </p>
                {rateHistory.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Fecha: {fmtDate(rateHistory[0]?.date)} | Fuente: {rateHistory[0]?.source}
                  </p>
                )}
              </div>

              <Button
                onClick={fetchLiveRate}
                loading={rateLoading}
                className="w-full"
              >
                Obtener de mindicador.cl
              </Button>

              <div className="border-t border-[var(--color-border)] pt-4">
                <p className="text-xs text-slate-500 font-medium mb-2">Ingreso Manual</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 940.50"
                    value={manualRate}
                    onChange={(e) => setManualRate(e.target.value)}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={submitManualRate}
                    disabled={!manualRate || rateLoading}
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Rate History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Historial de Tipo de Cambio (30 dias)</h3>
                  <span className="text-sm text-slate-500">{rateHistory.length} registros</span>
                </div>
              </CardHeader>

              {/* Simple visual chart using bars */}
              {rateHistory.length > 0 && (
                <CardBody>
                  <div className="flex items-end gap-1 h-32 mb-4">
                    {rateHistory.slice(0, 30).reverse().map((r, i) => {
                      const min = Math.min(...rateHistory.map((h) => h.observedRate));
                      const max = Math.max(...rateHistory.map((h) => h.observedRate));
                      const range = max - min || 1;
                      const heightPct = ((r.observedRate - min) / range) * 80 + 20;
                      return (
                        <div
                          key={r.id || i}
                          className="flex-1 bg-blue-400 hover:bg-blue-600 rounded-t transition-colors cursor-default group relative"
                          style={{ height: `${heightPct}%` }}
                          title={`${fmtDate(r.date)}: ${fmtRate(r.observedRate)}`}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                            {fmtDate(r.date)}: {fmtRate(r.observedRate)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Hace 30 dias</span>
                    <span>Hoy</span>
                  </div>
                </CardBody>
              )}

              <Table
                columns={[
                  { key: 'date', header: 'Fecha', render: (r) => fmtDate(r.date) },
                  {
                    key: 'observedRate',
                    header: 'Valor (CLP)',
                    render: (r) => <span className="font-mono font-medium">{fmtRate(r.observedRate)}</span>,
                  },
                  {
                    key: 'source',
                    header: 'Fuente',
                    render: (r) => (
                      <Badge variant={r.source === 'MANUAL' ? 'warning' : 'info'}>
                        {r.source}
                      </Badge>
                    ),
                  },
                ] as Column<ExchangeRateEntry>[]}
                data={rateHistory}
                keyExtractor={(r) => r.id}
                emptyMessage="Sin datos de tipo de cambio. Use el boton para obtener el tipo de cambio actual."
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────

function CostRow({
  label,
  usd,
  clp,
  pct,
  color,
  bold = false,
}: {
  label: string;
  usd?: number;
  clp?: number;
  pct: number;
  color: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${bold ? 'font-semibold' : ''}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className={`w-2.5 h-2.5 rounded-sm ${color} flex-shrink-0`} />
        <span className="text-sm text-slate-700 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-3 text-right flex-shrink-0">
        {usd !== undefined && (
          <span className="text-xs text-slate-400 font-mono hidden lg:inline">{fmtUsd(usd)}</span>
        )}
        <span className={`font-mono text-sm ${bold ? 'text-slate-800' : 'text-slate-600'}`}>
          {clp !== undefined ? fmtClp(clp) : '-'}
        </span>
        <span className="text-xs text-slate-400 w-12 text-right">{fmtPct(pct)}</span>
      </div>
    </div>
  );
}

function PercentageBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-600 w-20 text-right">{label}</span>
      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-12 text-right font-mono">{fmtPct(pct)}</span>
    </div>
  );
}

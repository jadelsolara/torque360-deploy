'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  partNumber: string;
  stock: number;
  minStock: number;
  costPrice: number;
  salePrice: number;
  averageCost: number;
  lastPurchaseCost: number;
  totalStockValue: number;
  costCurrency: string;
  stockQuantity: number;
}

interface ItemValuation {
  itemId: string;
  name: string;
  sku: string;
  currentStock: number;
  averageCost: number;
  totalValue: number;
  lastPurchaseCost: number;
  costCurrency: string;
}

interface WarehouseValuationCategory {
  category: string;
  itemCount: number;
  totalValue: number;
}

interface WarehouseValuation {
  warehouseId: string | null;
  totalValue: number;
  itemCount: number;
  byCategory: WarehouseValuationCategory[];
}

interface CostHistoryEntry {
  id: string;
  createdAt: string;
  movementType: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  averageCostBefore: number;
  averageCostAfter: number;
  referenceType: string | null;
  reason: string | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

const formatCost = (value: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const movementTypeLabels: Record<string, string> = {
  purchase: 'Compra',
  import: 'Importacion',
  return: 'Devolucion',
  receive: 'Recepcion',
  dispatch: 'Despacho',
  sale: 'Venta',
  adjustment_in: 'Ajuste (+)',
  adjustment_out: 'Ajuste (-)',
  transfer: 'Transferencia',
};

type ActiveTab = 'inventario' | 'valorizacion';

export default function InventarioPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventario');

  // Valuation state
  const [warehouseValuation, setWarehouseValuation] = useState<WarehouseValuation | null>(null);
  const [valuationLoading, setValuationLoading] = useState(false);

  // Cost history state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string>('');
  const [costHistory, setCostHistory] = useState<CostHistoryEntry[]>([]);
  const [costHistoryLoading, setCostHistoryLoading] = useState(false);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const data = await api.get<InventoryItem[]>('/inventory');
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar inventario');
      } finally {
        setLoading(false);
      }
    }
    fetchInventory();
  }, []);

  const fetchWarehouseValuation = useCallback(async () => {
    setValuationLoading(true);
    try {
      const data = await api.get<WarehouseValuation>('/inventory/warehouse-valuation');
      setWarehouseValuation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar valorizacion');
    } finally {
      setValuationLoading(false);
    }
  }, []);

  const fetchCostHistory = useCallback(async (itemId: string, itemName: string) => {
    setSelectedItemId(itemId);
    setSelectedItemName(itemName);
    setCostHistoryLoading(true);
    try {
      const data = await api.get<{ data: CostHistoryEntry[]; total: number }>(
        `/inventory/${itemId}/cost-history`,
      );
      setCostHistory(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar historial de costos');
    } finally {
      setCostHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'valorizacion') {
      fetchWarehouseValuation();
    }
  }, [activeTab, fetchWarehouseValuation]);

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return Array.from(cats).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          (i.sku || '').toLowerCase().includes(q) ||
          (i.name || '').toLowerCase().includes(q) ||
          (i.brand || '').toLowerCase().includes(q) ||
          (i.partNumber || '').toLowerCase().includes(q)
      );
    }
    if (categoryFilter) {
      result = result.filter((i) => i.category === categoryFilter);
    }
    return result;
  }, [items, search, categoryFilter]);

  const columns: Column<InventoryItem>[] = [
    { key: 'sku', header: 'SKU', render: (i) => <span className="font-medium text-slate-800">{i.sku}</span> },
    { key: 'name', header: 'Nombre' },
    { key: 'category', header: 'Categoria', className: 'hidden md:table-cell' },
    { key: 'brand', header: 'Marca', className: 'hidden lg:table-cell' },
    { key: 'partNumber', header: '# Parte', className: 'hidden lg:table-cell' },
    {
      key: 'stock',
      header: 'Stock',
      render: (i) => {
        const stock = i.stockQuantity ?? i.stock;
        const min = i.minStock;
        return (
          <div className="flex items-center gap-2">
            <span className={stock <= min ? 'text-amber-700 font-semibold' : ''}>{stock}</span>
            {stock <= min && <Badge variant="warning">Bajo Stock</Badge>}
          </div>
        );
      },
    },
    {
      key: 'minStock',
      header: 'Min Stock',
      className: 'hidden sm:table-cell',
    },
    {
      key: 'costPrice',
      header: 'Precio Costo',
      className: 'hidden lg:table-cell',
      render: (i) => formatCurrency(i.costPrice),
    },
    {
      key: 'salePrice',
      header: 'Precio Venta',
      render: (i) => <span className="font-medium">{formatCurrency(i.salePrice)}</span>,
    },
  ];

  // Valuation columns for the per-item view
  const valuationColumns: Column<InventoryItem>[] = [
    { key: 'sku', header: 'SKU', render: (i) => <span className="font-medium text-slate-800">{i.sku}</span> },
    { key: 'name', header: 'Nombre' },
    { key: 'category', header: 'Categoria', className: 'hidden md:table-cell' },
    {
      key: 'stockQuantity',
      header: 'Stock',
      render: (i) => <span>{Number(i.stockQuantity ?? i.stock)}</span>,
    },
    {
      key: 'averageCost',
      header: 'Costo Promedio',
      render: (i) => <span className="font-medium text-blue-700">{formatCost(Number(i.averageCost) || 0)}</span>,
    },
    {
      key: 'totalStockValue',
      header: 'Valor Total',
      render: (i) => <span className="font-semibold text-slate-800">{formatCurrency(Number(i.totalStockValue) || 0)}</span>,
    },
    {
      key: 'lastPurchaseCost',
      header: 'Ult. Compra',
      className: 'hidden lg:table-cell',
      render: (i) => <span>{formatCost(Number(i.lastPurchaseCost) || 0)}</span>,
    },
    {
      key: 'id',
      header: 'Historial',
      render: (i) => (
        <Button
          onClick={() => fetchCostHistory(i.id, i.name)}
          className="text-xs px-2 py-1"
        >
          Ver Costos
        </Button>
      ),
    },
  ];

  const costHistoryColumns: Column<CostHistoryEntry>[] = [
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (entry) => <span className="text-xs">{formatDate(entry.createdAt)}</span>,
    },
    {
      key: 'movementType',
      header: 'Tipo',
      render: (entry) => (
        <Badge variant={
          ['purchase', 'import', 'return', 'receive', 'adjustment_in'].includes(entry.movementType)
            ? 'success'
            : 'default'
        }>
          {movementTypeLabels[entry.movementType] || entry.movementType}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      render: (entry) => <span>{entry.quantity}</span>,
    },
    {
      key: 'unitCost',
      header: 'Costo Unit.',
      render: (entry) => <span>{formatCost(entry.unitCost)}</span>,
    },
    {
      key: 'totalCost',
      header: 'Costo Total',
      render: (entry) => <span className="font-medium">{formatCurrency(entry.totalCost)}</span>,
    },
    {
      key: 'averageCostBefore',
      header: 'CPP Antes',
      render: (entry) => <span className="text-slate-500">{formatCost(entry.averageCostBefore)}</span>,
    },
    {
      key: 'averageCostAfter',
      header: 'CPP Despues',
      render: (entry) => <span className="font-semibold text-blue-700">{formatCost(entry.averageCostAfter)}</span>,
    },
    {
      key: 'reason',
      header: 'Referencia',
      className: 'hidden lg:table-cell',
      render: (entry) => <span className="text-xs text-slate-500">{entry.reason || entry.referenceType || '-'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
        <div className="flex items-center gap-2">
          <Button>+ Nuevo Item</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('inventario')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'inventario'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Inventario
        </button>
        <button
          onClick={() => setActiveTab('valorizacion')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'valorizacion'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Valorizacion
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="max-w-md flex-1">
          <Input
            placeholder="Buscar por SKU, nombre, marca o # parte..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
        >
          <option value="">Todas las categorias</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Inventario Tab */}
      {activeTab === 'inventario' && (
        <Card>
          <Table
            columns={columns}
            data={filtered}
            keyExtractor={(i) => i.id}
            loading={loading}
            emptyMessage="No se encontraron items en inventario"
          />
        </Card>
      )}

      {/* Valorizacion Tab */}
      {activeTab === 'valorizacion' && (
        <div className="space-y-6">
          {/* Warehouse Valuation Summary */}
          {warehouseValuation && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <div className="p-4">
                  <p className="text-sm text-slate-500">Valor Total Inventario</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {formatCurrency(warehouseValuation.totalValue)}
                  </p>
                </div>
              </Card>
              <Card>
                <div className="p-4">
                  <p className="text-sm text-slate-500">Items con Stock</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {warehouseValuation.itemCount}
                  </p>
                </div>
              </Card>
              <Card>
                <div className="p-4">
                  <p className="text-sm text-slate-500">Categorias</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {warehouseValuation.byCategory.length}
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Category Breakdown */}
          {warehouseValuation && warehouseValuation.byCategory.length > 0 && (
            <Card>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Valorizacion por Categoria</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 font-medium text-slate-600">Categoria</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-600">Items</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-600">Valor Total</th>
                        <th className="text-right py-2 px-3 font-medium text-slate-600">% del Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouseValuation.byCategory.map((cat) => (
                        <tr key={cat.category} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-3 font-medium text-slate-800">{cat.category}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{cat.itemCount}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-800">
                            {formatCurrency(cat.totalValue)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">
                            {warehouseValuation.totalValue > 0
                              ? ((cat.totalValue / warehouseValuation.totalValue) * 100).toFixed(1)
                              : '0.0'}
                            %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300">
                        <td className="py-2 px-3 font-bold text-slate-800">Total</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800">
                          {warehouseValuation.itemCount}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800">
                          {formatCurrency(warehouseValuation.totalValue)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {valuationLoading && (
            <div className="text-center py-8 text-slate-500">Cargando valorizacion...</div>
          )}

          {/* Per-Item Valuation Table */}
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Detalle por Item</h3>
            </div>
            <Table
              columns={valuationColumns}
              data={filtered}
              keyExtractor={(i) => i.id}
              loading={loading}
              emptyMessage="No se encontraron items"
            />
          </Card>

          {/* Cost History for Selected Item */}
          {selectedItemId && (
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">
                    Historial de Costos: {selectedItemName}
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedItemId(null);
                      setCostHistory([]);
                    }}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
              {costHistoryLoading ? (
                <div className="text-center py-8 text-slate-500">Cargando historial...</div>
              ) : costHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  Sin movimientos de costo registrados para este item
                </div>
              ) : (
                <Table
                  columns={costHistoryColumns}
                  data={costHistory}
                  keyExtractor={(entry) => entry.id}
                  loading={false}
                  emptyMessage="Sin historial de costos"
                />
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

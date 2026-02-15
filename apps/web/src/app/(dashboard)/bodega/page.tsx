'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  type: string;
  locationCount: number;
}

interface LowStockAlert {
  id: string;
  itemName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  warehouseName: string;
}

interface StockMovement {
  id: string;
  date: string;
  itemName: string;
  movementType: string;
  quantity: number;
  warehouseName: string;
  performedBy: string;
}

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));

const movementTypeLabel: Record<string, string> = {
  inbound: 'Entrada',
  outbound: 'Salida',
  transfer: 'Transferencia',
  adjustment: 'Ajuste',
  return: 'Devolucion',
};

const movementTypeBadge: Record<string, 'success' | 'error' | 'info' | 'warning' | 'primary'> = {
  inbound: 'success',
  outbound: 'error',
  transfer: 'info',
  adjustment: 'warning',
  return: 'primary',
};

const warehouseTypeLabel: Record<string, string> = {
  main: 'Principal',
  secondary: 'Secundaria',
  transit: 'En Transito',
  returns: 'Devoluciones',
};

export default function BodegaPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [warehousesRes, alertsRes, movementsRes] = await Promise.all([
          api.get<Warehouse[]>('/wms/warehouses'),
          api.get<LowStockAlert[]>('/wms/alerts/low-stock'),
          api.get<StockMovement[]>('/wms/movements'),
        ]);
        setWarehouses(warehousesRes);
        setAlerts(alertsRes);
        setMovements(movementsRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos de bodega');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const movementColumns: Column<StockMovement>[] = [
    {
      key: 'date',
      header: 'Fecha',
      render: (m) => formatDate(m.date),
    },
    { key: 'itemName', header: 'Item' },
    {
      key: 'movementType',
      header: 'Tipo Movimiento',
      render: (m) => (
        <Badge variant={movementTypeBadge[m.movementType] || 'default'}>
          {movementTypeLabel[m.movementType] || m.movementType}
        </Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      render: (m) => {
        const isNegative = ['outbound'].includes(m.movementType);
        return (
          <span className={isNegative ? 'text-red-600 font-medium' : 'text-emerald-600 font-medium'}>
            {isNegative ? '-' : '+'}{m.quantity}
          </span>
        );
      },
    },
    { key: 'warehouseName', header: 'Bodega', className: 'hidden md:table-cell' },
    { key: 'performedBy', header: 'Realizado por', className: 'hidden lg:table-cell' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-500">Cargando bodegas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-slate-800">Bodegas &amp; Inventario</h1>

      {/* Warehouse Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {warehouses.map((wh) => (
          <Card key={wh.id} className="border-l-4 border-l-blue-500">
            <CardBody>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{wh.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{wh.code}</p>
                </div>
                <Badge variant="info">
                  {warehouseTypeLabel[wh.type] || wh.type}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="text-sm text-slate-600">{wh.locationCount} ubicaciones</span>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Low Stock Alerts */}
      {alerts.length > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <h3 className="text-lg font-semibold text-amber-800">Alertas de Bajo Stock</h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                >
                  <div>
                    <span className="font-medium text-slate-800">{alert.itemName}</span>
                    <span className="text-xs text-slate-500 ml-2">({alert.sku})</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500 hidden sm:inline">{alert.warehouseName}</span>
                    <span className="text-amber-700 font-semibold">
                      {alert.currentStock} / {alert.minStock} min
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-800">Movimientos Recientes</h3>
        </CardHeader>
        <Table
          columns={movementColumns}
          data={movements}
          keyExtractor={(m) => m.id}
          emptyMessage="No hay movimientos recientes"
        />
      </Card>
    </div>
  );
}

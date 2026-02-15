'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface WorkOrder {
  id: string;
  orderNumber: string;
  vehiclePlate: string;
  clientName: string;
  technicianName: string;
  status: string;
  priority: string;
  totalCost: number;
  createdAt: string;
}

type TabKey = 'all' | 'in_progress' | 'pending' | 'completed';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'in_progress', label: 'En Progreso' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'completed', label: 'Completadas' },
];

const statusBadgeVariant: Record<string, 'warning' | 'primary' | 'success' | 'error' | 'default'> = {
  pending: 'warning',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'error',
};

const statusLabel: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const priorityBadgeVariant: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  urgent: 'error',
  high: 'error',
  medium: 'warning',
  low: 'info',
};

const priorityLabel: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));

export default function OrdenesPage() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError('');
      try {
        const endpoint = activeTab === 'all' ? '/work-orders' : `/work-orders?status=${activeTab}`;
        const data = await api.get<WorkOrder[]>(endpoint);
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar ordenes de trabajo');
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [activeTab]);

  const columns: Column<WorkOrder>[] = [
    { key: 'orderNumber', header: '# Orden', render: (o) => <span className="font-medium text-slate-800">{o.orderNumber}</span> },
    { key: 'vehiclePlate', header: 'Vehiculo' },
    { key: 'clientName', header: 'Cliente', className: 'hidden md:table-cell' },
    { key: 'technicianName', header: 'Tecnico', className: 'hidden lg:table-cell' },
    {
      key: 'status',
      header: 'Estado',
      render: (o) => (
        <Badge variant={statusBadgeVariant[o.status] || 'default'}>
          {statusLabel[o.status] || o.status}
        </Badge>
      ),
    },
    {
      key: 'priority',
      header: 'Prioridad',
      render: (o) => (
        <Badge variant={priorityBadgeVariant[o.priority] || 'default'}>
          {priorityLabel[o.priority] || o.priority}
        </Badge>
      ),
    },
    {
      key: 'totalCost',
      header: 'Costo Total',
      className: 'hidden sm:table-cell',
      render: (o) => <span className="font-medium">{formatCurrency(o.totalCost)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      className: 'hidden sm:table-cell',
      render: (o) => formatDate(o.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Ordenes de Trabajo</h1>
        <Button>+ Nueva OT</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={orders}
          keyExtractor={(o) => o.id}
          loading={loading}
          emptyMessage="No se encontraron ordenes de trabajo"
        />
      </Card>
    </div>
  );
}

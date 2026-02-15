'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';

interface DashboardStats {
  totalVehicles: number;
  totalClients: number;
  activeWorkOrders: number;
  pendingQuotations: number;
  lowStockItems: number;
  pendingApprovals: number;
}

interface RecentWorkOrder {
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

interface DashboardKpis {
  revenueThisMonth: number;
  avgRepairHours: number;
  completedOrders: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));

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

const priorityBadgeVariant: Record<string, 'error' | 'warning' | 'info'> = {
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentWorkOrder[]>([]);
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (user) {
      const managerRoles = ['OWNER', 'ADMIN', 'MANAGER'];
      setIsManager(managerRoles.includes(user.role?.toUpperCase() || ''));
    }

    async function fetchData() {
      try {
        const [statsRes, recentRes] = await Promise.all([
          api.get<DashboardStats>('/dashboard/stats'),
          api.get<RecentWorkOrder[]>('/dashboard/recent'),
        ]);
        setStats(statsRes);
        setRecentOrders(recentRes);

        const usr = getUser();
        if (usr && ['OWNER', 'ADMIN', 'MANAGER'].includes(usr.role?.toUpperCase() || '')) {
          const kpisRes = await api.get<DashboardKpis>('/dashboard/kpis');
          setKpis(kpisRes);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar el dashboard');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const statCards = stats
    ? [
        { label: 'Vehiculos Totales', value: stats.totalVehicles, color: 'border-l-blue-500', icon: vehicleIcon },
        { label: 'Clientes', value: stats.totalClients, color: 'border-l-emerald-500', icon: clientIcon },
        { label: 'OTs Activas', value: stats.activeWorkOrders, color: 'border-l-amber-500', icon: workOrderIcon },
        { label: 'Cotizaciones Pendientes', value: stats.pendingQuotations, color: 'border-l-purple-500', icon: quotationIcon },
        { label: 'Items Bajo Stock', value: stats.lowStockItems, color: 'border-l-red-500', icon: inventoryIcon },
        { label: 'Aprobaciones Pendientes', value: stats.pendingApprovals, color: 'border-l-sky-500', icon: approvalIcon },
      ]
    : [];

  const recentColumns: Column<RecentWorkOrder>[] = [
    { key: 'orderNumber', header: '# Orden' },
    { key: 'vehiclePlate', header: 'Vehiculo' },
    { key: 'clientName', header: 'Cliente' },
    { key: 'technicianName', header: 'Tecnico' },
    {
      key: 'status',
      header: 'Estado',
      render: (item) => (
        <Badge variant={statusBadgeVariant[item.status] || 'default'}>
          {statusLabel[item.status] || item.status}
        </Badge>
      ),
    },
    {
      key: 'priority',
      header: 'Prioridad',
      render: (item) => (
        <Badge variant={priorityBadgeVariant[item.priority] || 'default'}>
          {priorityLabel[item.priority] || item.priority}
        </Badge>
      ),
    },
    {
      key: 'totalCost',
      header: 'Costo Total',
      render: (item) => <span className="font-medium">{formatCurrency(item.totalCost)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      render: (item) => formatDate(item.createdAt),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-500">Cargando dashboard...</span>
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className={`border-l-4 ${card.color}`}>
            <CardBody>
              <div className="flex items-start gap-3">
                <div className="text-slate-400 mt-0.5">{card.icon}</div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{card.label}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* KPIs for Manager+ */}
      {isManager && kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardBody>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Revenue Mes Actual</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(kpis.revenueThisMonth)}</p>
            </CardBody>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardBody>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Promedio Horas Reparacion</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{kpis.avgRepairHours.toFixed(1)} hrs</p>
            </CardBody>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardBody>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Ordenes Completadas</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{kpis.completedOrders}</p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Recent Work Orders */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-800">Ordenes Recientes</h3>
        </CardHeader>
        <Table
          columns={recentColumns}
          data={recentOrders}
          keyExtractor={(item) => item.id}
          emptyMessage="No hay ordenes recientes"
        />
      </Card>
    </div>
  );
}

/* --- SVG Icons --- */
const vehicleIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);

const clientIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const workOrderIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
  </svg>
);

const quotationIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const inventoryIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

const approvalIcon = (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

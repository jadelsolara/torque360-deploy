'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface Approval {
  id: string;
  approvalType: string;
  description: string;
  requestedBy: string;
  createdAt: string;
  requiredRole: string;
  status: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

type TabKey = 'pending' | 'approved' | 'rejected';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'rejected', label: 'Rechazadas' },
];

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));

const approvalTypeLabel: Record<string, string> = {
  discount: 'Descuento',
  refund: 'Reembolso',
  price_override: 'Cambio de Precio',
  credit_note: 'Nota de Credito',
  work_order_cancel: 'Cancelar OT',
  inventory_adjustment: 'Ajuste Inventario',
};

export default function AprobacionesPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function fetchApprovals() {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<Approval[]>(`/approvals?status=${activeTab}`);
      setApprovals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar aprobaciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchApprovals();
  }, [activeTab]);

  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      await api.patch(`/approvals/${id}/approve`);
      await fetchApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id);
    try {
      await api.patch(`/approvals/${id}/reject`);
      await fetchApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al rechazar');
    } finally {
      setActionLoading(null);
    }
  }

  // Columns for approved/rejected tables
  const historyColumns: Column<Approval>[] = [
    {
      key: 'approvalType',
      header: 'Tipo',
      render: (a) => (
        <span className="font-medium text-slate-800">
          {approvalTypeLabel[a.approvalType] || a.approvalType}
        </span>
      ),
    },
    { key: 'description', header: 'Descripcion' },
    { key: 'requestedBy', header: 'Solicitado por', className: 'hidden md:table-cell' },
    {
      key: 'createdAt',
      header: 'Fecha Solicitud',
      className: 'hidden sm:table-cell',
      render: (a) => formatDate(a.createdAt),
    },
    {
      key: 'resolvedBy',
      header: 'Resuelto por',
      className: 'hidden lg:table-cell',
    },
    {
      key: 'resolvedAt',
      header: 'Fecha Resolucion',
      className: 'hidden lg:table-cell',
      render: (a) => (a.resolvedAt ? formatDate(a.resolvedAt) : '-'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-slate-800">Aprobaciones</h1>

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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-slate-500">Cargando aprobaciones...</span>
          </div>
        </div>
      )}

      {/* Pending: card layout */}
      {!loading && activeTab === 'pending' && (
        <>
          {approvals.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No hay aprobaciones pendientes
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvals.map((approval) => (
                <Card key={approval.id} className="border-l-4 border-l-amber-400">
                  <CardBody className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="warning">
                        {approvalTypeLabel[approval.approvalType] || approval.approvalType}
                      </Badge>
                      <Badge variant="info">{approval.requiredRole}</Badge>
                    </div>
                    <p className="text-sm text-slate-700">{approval.description}</p>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p>
                        <span className="font-medium">Solicitado por:</span> {approval.requestedBy}
                      </p>
                      <p>
                        <span className="font-medium">Fecha:</span> {formatDate(approval.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        loading={actionLoading === approval.id}
                        disabled={actionLoading !== null}
                        onClick={() => handleApprove(approval.id)}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={actionLoading === approval.id}
                        disabled={actionLoading !== null}
                        onClick={() => handleReject(approval.id)}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Approved/Rejected: table layout */}
      {!loading && activeTab !== 'pending' && (
        <Card>
          <Table
            columns={historyColumns}
            data={approvals}
            keyExtractor={(a) => a.id}
            emptyMessage={
              activeTab === 'approved'
                ? 'No hay aprobaciones registradas'
                : 'No hay rechazos registrados'
            }
          />
        </Card>
      )}
    </div>
  );
}

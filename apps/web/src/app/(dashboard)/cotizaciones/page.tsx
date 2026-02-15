'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface Quotation {
  id: string;
  quotationNumber: string;
  clientName: string;
  vehiclePlate: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  validUntil: string;
}

const statusBadgeVariant: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
  draft: 'default',
  sent: 'primary',
  approved: 'success',
  rejected: 'error',
  expired: 'warning',
};

const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  expired: 'Expirada',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));

export default function CotizacionesPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchQuotations() {
      try {
        const data = await api.get<Quotation[]>('/quotations');
        setQuotations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar cotizaciones');
      } finally {
        setLoading(false);
      }
    }
    fetchQuotations();
  }, []);

  const columns: Column<Quotation>[] = [
    {
      key: 'quotationNumber',
      header: '# Cotizacion',
      render: (q) => <span className="font-medium text-slate-800">{q.quotationNumber}</span>,
    },
    { key: 'clientName', header: 'Cliente' },
    { key: 'vehiclePlate', header: 'Vehiculo', className: 'hidden md:table-cell' },
    {
      key: 'status',
      header: 'Estado',
      render: (q) => (
        <Badge variant={statusBadgeVariant[q.status] || 'default'}>
          {statusLabel[q.status] || q.status}
        </Badge>
      ),
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      className: 'hidden lg:table-cell',
      render: (q) => formatCurrency(q.subtotal),
    },
    {
      key: 'tax',
      header: 'IVA',
      className: 'hidden lg:table-cell',
      render: (q) => formatCurrency(q.tax),
    },
    {
      key: 'total',
      header: 'Total',
      render: (q) => <span className="font-semibold">{formatCurrency(q.total)}</span>,
    },
    {
      key: 'validUntil',
      header: 'Valido hasta',
      className: 'hidden sm:table-cell',
      render: (q) => {
        const isExpired = new Date(q.validUntil) < new Date();
        return (
          <span className={isExpired ? 'text-red-600' : ''}>
            {formatDate(q.validUntil)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Cotizaciones</h1>
        <Button>+ Nueva Cotizacion</Button>
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
          data={quotations}
          keyExtractor={(q) => q.id}
          loading={loading}
          emptyMessage="No se encontraron cotizaciones"
        />
      </Card>
    </div>
  );
}

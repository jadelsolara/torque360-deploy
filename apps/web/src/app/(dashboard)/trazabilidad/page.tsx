'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, Column } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TraceabilityEvent {
  id: string;
  date: string;
  itemName: string;
  eventType: string;
  lotNumber: string;
  serialNumber: string;
  location: string;
  reference: string;
  performedBy: string;
}

interface ChainVerification {
  valid: boolean;
  itemId: string;
  totalEvents: number;
  firstEvent: string;
  lastEvent: string;
  gaps: number;
  message: string;
}

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));

const eventTypeLabel: Record<string, string> = {
  received: 'Recepcion',
  stored: 'Almacenado',
  picked: 'Picking',
  shipped: 'Despacho',
  installed: 'Instalado',
  returned: 'Devolucion',
  adjusted: 'Ajuste',
  transferred: 'Transferido',
};

const eventTypeBadge: Record<string, 'success' | 'info' | 'primary' | 'warning' | 'error' | 'default'> = {
  received: 'success',
  stored: 'info',
  picked: 'primary',
  shipped: 'info',
  installed: 'success',
  returned: 'warning',
  adjusted: 'warning',
  transferred: 'primary',
};

export default function TrazabilidadPage() {
  const [events, setEvents] = useState<TraceabilityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Chain verification
  const [verifyItemId, setVerifyItemId] = useState('');
  const [verification, setVerification] = useState<ChainVerification | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    async function fetchEvents() {
      try {
        const data = await api.get<TraceabilityEvent[]>('/traceability/recent');
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar trazabilidad');
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get<TraceabilityEvent[]>(
        `/traceability/items/${encodeURIComponent(searchQuery)}/chain`
      );
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en la busqueda');
    } finally {
      setLoading(false);
    }
  }

  async function handleClearSearch() {
    setSearchQuery('');
    setLoading(true);
    setError('');
    try {
      const data = await api.get<TraceabilityEvent[]>('/traceability/recent');
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar trazabilidad');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyChain() {
    if (!verifyItemId.trim()) return;
    setVerifying(true);
    setVerifyError('');
    setVerification(null);
    try {
      const result = await api.get<ChainVerification>(
        `/traceability/items/${encodeURIComponent(verifyItemId)}/verify`
      );
      setVerification(result);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Error al verificar cadena');
    } finally {
      setVerifying(false);
    }
  }

  const columns: Column<TraceabilityEvent>[] = [
    {
      key: 'date',
      header: 'Fecha',
      render: (e) => formatDate(e.date),
    },
    { key: 'itemName', header: 'Item' },
    {
      key: 'eventType',
      header: 'Tipo Evento',
      render: (e) => (
        <Badge variant={eventTypeBadge[e.eventType] || 'default'}>
          {eventTypeLabel[e.eventType] || e.eventType}
        </Badge>
      ),
    },
    { key: 'lotNumber', header: 'Lote', className: 'hidden md:table-cell' },
    { key: 'serialNumber', header: 'Serial', className: 'hidden md:table-cell' },
    { key: 'location', header: 'Ubicacion', className: 'hidden lg:table-cell' },
    { key: 'reference', header: 'Referencia', className: 'hidden lg:table-cell' },
    { key: 'performedBy', header: 'Realizado por', className: 'hidden xl:table-cell' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-slate-800">Trazabilidad</h1>

      {/* Search Section */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por ID de item, numero de lote o serial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={!searchQuery.trim()}>
                Buscar
              </Button>
              {searchQuery && (
                <Button variant="ghost" onClick={handleClearSearch}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Chain Verification */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-800">Verificacion de Cadena</h3>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="ID del item para verificar..."
                value={verifyItemId}
                onChange={(e) => setVerifyItemId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyChain()}
              />
            </div>
            <Button
              onClick={handleVerifyChain}
              loading={verifying}
              disabled={!verifyItemId.trim()}
              variant="secondary"
            >
              Verificar Cadena
            </Button>
          </div>

          {/* Verification Result */}
          {verifyError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {verifyError}
            </div>
          )}
          {verification && (
            <div
              className={`mt-3 p-4 rounded-lg border ${
                verification.valid
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {verification.valid ? (
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                )}
                <span className={`font-semibold ${verification.valid ? 'text-emerald-800' : 'text-red-800'}`}>
                  {verification.valid ? 'Cadena Valida' : 'Cadena Invalida'}
                </span>
              </div>
              <p className="text-sm text-slate-700">{verification.message}</p>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Total Eventos:</span>
                  <span className="ml-1 font-medium">{verification.totalEvents}</span>
                </div>
                <div>
                  <span className="text-slate-500">Primer Evento:</span>
                  <span className="ml-1 font-medium">{formatDate(verification.firstEvent)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Ultimo Evento:</span>
                  <span className="ml-1 font-medium">{formatDate(verification.lastEvent)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Brechas:</span>
                  <span className={`ml-1 font-medium ${verification.gaps > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {verification.gaps}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Events Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-800">Eventos Recientes</h3>
        </CardHeader>
        <Table
          columns={columns}
          data={events}
          keyExtractor={(e) => e.id}
          loading={loading}
          emptyMessage="No se encontraron eventos de trazabilidad"
        />
      </Card>
    </div>
  );
}

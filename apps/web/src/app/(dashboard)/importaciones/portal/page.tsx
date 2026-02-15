'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExternalAccessPermissions {
  canUpdateStatus: boolean;
  canUploadDocuments: boolean;
  canUpdateDates: boolean;
  canUpdateCosts: boolean;
  allowedStatusTransitions: string[];
  allowedFields: string[];
}

interface ExternalAccessRecord {
  id: string;
  importOrderId: string;
  agentType: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string | null;
  permissions: ExternalAccessPermissions;
  isActive: boolean;
  expiresAt: string;
  lastAccessAt: string | null;
  accessCount: number;
  createdAt: string;
}

interface UpdateLogEntry {
  id: string;
  source: 'INTERNAL' | 'EXTERNAL';
  agentType: string | null;
  agentName: string | null;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface ImportOrder {
  id: string;
  orderNumber: string;
  supplierName: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENT_TYPES = [
  { value: 'CUSTOMS_BROKER', label: 'Agente de Aduana' },
  { value: 'FREIGHT_FORWARDER', label: 'Freight Forwarder' },
  { value: 'SHIPPING_LINE', label: 'Naviera' },
  { value: 'INLAND_TRANSPORT', label: 'Transporte Interno' },
  { value: 'PORT_AGENT', label: 'Agente Portuario' },
  { value: 'INSPECTOR', label: 'Inspector' },
];

const AGENT_TYPE_LABELS: Record<string, string> = {
  CUSTOMS_BROKER: 'Agente de Aduana',
  FREIGHT_FORWARDER: 'Freight Forwarder',
  SHIPPING_LINE: 'Naviera',
  INLAND_TRANSPORT: 'Transporte Interno',
  PORT_AGENT: 'Agente Portuario',
  INSPECTOR: 'Inspector',
};

const AGENT_TYPE_COLORS: Record<string, string> = {
  CUSTOMS_BROKER: 'bg-amber-100 text-amber-800',
  FREIGHT_FORWARDER: 'bg-blue-100 text-blue-800',
  SHIPPING_LINE: 'bg-sky-100 text-sky-800',
  INLAND_TRANSPORT: 'bg-emerald-100 text-emerald-800',
  PORT_AGENT: 'bg-purple-100 text-purple-800',
  INSPECTOR: 'bg-rose-100 text-rose-800',
};

const STATUS_OPTIONS = [
  'draft', 'confirmed', 'shipped', 'in_transit', 'at_port',
  'customs', 'cleared', 'received', 'closed',
];

const FIELD_OPTIONS = [
  { value: 'blNumber', label: 'Numero BL' },
  { value: 'containerNumber', label: 'Numero Contenedor' },
  { value: 'vesselName', label: 'Nombre Buque' },
  { value: 'shippingLine', label: 'Naviera' },
  { value: 'trackingUrl', label: 'URL Tracking' },
  { value: 'originPort', label: 'Puerto Origen' },
  { value: 'destinationPort', label: 'Puerto Destino' },
];

const ACTION_LABELS: Record<string, string> = {
  STATUS_CHANGE: 'Cambio de Estado',
  FIELD_UPDATE: 'Actualizacion de Campo',
  DOCUMENT_UPLOAD: 'Subida de Documento',
  COST_UPDATE: 'Actualizacion de Costo',
  NOTE_ADDED: 'Nota Agregada',
};

const ACTION_COLORS: Record<string, string> = {
  STATUS_CHANGE: 'bg-blue-100 text-blue-800',
  FIELD_UPDATE: 'bg-slate-100 text-slate-800',
  DOCUMENT_UPLOAD: 'bg-emerald-100 text-emerald-800',
  COST_UPDATE: 'bg-amber-100 text-amber-800',
  NOTE_ADDED: 'bg-purple-100 text-purple-800',
};

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));

const formatShortDate = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PortalManagementPage() {
  // --- State ---
  const [orders, setOrders] = useState<ImportOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [accesses, setAccesses] = useState<ExternalAccessRecord[]>([]);
  const [logs, setLogs] = useState<UpdateLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAccesses, setLoadingAccesses] = useState(false);
  const [error, setError] = useState('');

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<{ rawToken: string; portalUrl: string } | null>(null);
  const [formData, setFormData] = useState({
    agentType: 'CUSTOMS_BROKER',
    agentName: '',
    agentEmail: '',
    agentPhone: '',
    expiresInDays: 30,
    canUpdateStatus: true,
    canUploadDocuments: true,
    canUpdateDates: true,
    canUpdateCosts: false,
    allowedStatusTransitions: [] as string[],
    allowedFields: [] as string[],
  });

  // Tab state
  const [activeTab, setActiveTab] = useState<'accesses' | 'timeline'>('accesses');

  // --- Fetch orders ---
  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await api.get<ImportOrder[]>('/imports');
        setOrders(data);
        if (data.length > 0) {
          setSelectedOrderId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar ordenes');
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  // --- Fetch accesses + logs when order changes ---
  const fetchAccessData = useCallback(async () => {
    if (!selectedOrderId) return;
    setLoadingAccesses(true);
    try {
      const [accessesRes, logsRes] = await Promise.all([
        api.get<ExternalAccessRecord[]>(`/external-portal/access/import/${selectedOrderId}`),
        api.get<UpdateLogEntry[]>(`/external-portal/access/log/${selectedOrderId}`),
      ]);
      setAccesses(accessesRes);
      setLogs(logsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos del portal');
    } finally {
      setLoadingAccesses(false);
    }
  }, [selectedOrderId]);

  useEffect(() => {
    fetchAccessData();
  }, [fetchAccessData]);

  // --- Handlers ---

  const handleCreateAccess = async () => {
    if (!selectedOrderId || !formData.agentName || !formData.agentEmail) return;
    setCreateLoading(true);
    setGeneratedToken(null);
    try {
      const result = await api.post<{
        access: ExternalAccessRecord;
        rawToken: string;
        portalUrl: string;
      }>('/external-portal/access', {
        importOrderId: selectedOrderId,
        agentType: formData.agentType,
        agentName: formData.agentName,
        agentEmail: formData.agentEmail,
        agentPhone: formData.agentPhone || undefined,
        expiresInDays: formData.expiresInDays,
        permissions: {
          canUpdateStatus: formData.canUpdateStatus,
          canUploadDocuments: formData.canUploadDocuments,
          canUpdateDates: formData.canUpdateDates,
          canUpdateCosts: formData.canUpdateCosts,
          allowedStatusTransitions: formData.allowedStatusTransitions,
          allowedFields: formData.allowedFields,
        },
      });
      setGeneratedToken({ rawToken: result.rawToken, portalUrl: result.portalUrl });
      fetchAccessData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear acceso');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleRevoke = async (accessId: string) => {
    if (!confirm('Estas seguro de revocar este acceso? El agente externo ya no podra acceder.')) return;
    try {
      await api.delete(`/external-portal/access/${accessId}`);
      fetchAccessData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al revocar acceso');
    }
  };

  const handleRegenerate = async (accessId: string) => {
    if (!confirm('Regenerar el token invalidara el anterior. Continuar?')) return;
    try {
      const result = await api.post<{ rawToken: string; portalUrl: string }>(
        `/external-portal/access/${accessId}/regenerate`,
      );
      setGeneratedToken(result);
      fetchAccessData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al regenerar token');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleStatusTransition = (status: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedStatusTransitions: prev.allowedStatusTransitions.includes(status)
        ? prev.allowedStatusTransitions.filter((s) => s !== status)
        : [...prev.allowedStatusTransitions, status],
    }));
  };

  const toggleAllowedField = (field: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedFields: prev.allowedFields.includes(field)
        ? prev.allowedFields.filter((f) => f !== field)
        : [...prev.allowedFields, field],
    }));
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-500">Cargando portal de agentes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        {error}
        <button onClick={() => setError('')} className="ml-4 underline">
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Portal de Agentes Externos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona el acceso de agentes de aduana, freight forwarders, navieras y transportistas
          </p>
        </div>
        <Button onClick={() => { setShowCreateForm(!showCreateForm); setGeneratedToken(null); }}>
          {showCreateForm ? 'Cancelar' : '+ Nuevo Acceso'}
        </Button>
      </div>

      {/* Order selector */}
      <Card>
        <CardBody>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Orden de Importacion
          </label>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          >
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                #{order.orderNumber} - {order.supplierName || 'Sin proveedor'} ({order.status})
              </option>
            ))}
          </select>
        </CardBody>
      </Card>

      {/* Generated Token Alert */}
      {generatedToken && (
        <Card className="border-amber-300 bg-amber-50">
          <CardBody>
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800 text-sm">Token Generado - Solo se muestra UNA VEZ</h3>
                <p className="text-xs text-amber-700 mt-1 mb-3">
                  Copia este enlace y envialo al agente externo. No se puede recuperar despues.
                </p>
                <div className="bg-white rounded-lg border border-amber-200 p-3 flex items-center gap-2">
                  <code className="text-xs text-slate-700 flex-1 break-all">
                    {typeof window !== 'undefined' ? window.location.origin : ''}{generatedToken.portalUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      copyToClipboard(
                        `${typeof window !== 'undefined' ? window.location.origin : ''}${generatedToken.portalUrl}`,
                      )
                    }
                  >
                    Copiar
                  </Button>
                </div>
                <div className="mt-2 bg-white rounded-lg border border-amber-200 p-3 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Token:</span>
                  <code className="text-xs text-slate-700 flex-1 break-all">{generatedToken.rawToken}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(generatedToken.rawToken)}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setGeneratedToken(null)}
                className="text-amber-500 hover:text-amber-700"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Create Access Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-slate-800">Crear Acceso Externo</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Agente</label>
                <select
                  value={formData.agentType}
                  onChange={(e) => setFormData({ ...formData, agentType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {AGENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Nombre / Empresa"
                value={formData.agentName}
                onChange={(e) => setFormData({ ...formData, agentName: e.target.value })}
                placeholder="Ej: Aduanas Chile SpA"
              />
              <Input
                label="Email"
                type="email"
                value={formData.agentEmail}
                onChange={(e) => setFormData({ ...formData, agentEmail: e.target.value })}
                placeholder="contacto@agente.cl"
              />
              <Input
                label="Telefono (opcional)"
                value={formData.agentPhone}
                onChange={(e) => setFormData({ ...formData, agentPhone: e.target.value })}
                placeholder="+56 9 1234 5678"
              />
              <Input
                label="Dias de vigencia"
                type="number"
                value={formData.expiresInDays}
                onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 30 })}
              />
            </div>

            {/* Permissions */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Permisos</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'canUpdateStatus', label: 'Actualizar Estado' },
                  { key: 'canUploadDocuments', label: 'Subir Documentos' },
                  { key: 'canUpdateDates', label: 'Actualizar Fechas' },
                  { key: 'canUpdateCosts', label: 'Actualizar Costos' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData as any)[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                      className="rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Allowed Status Transitions */}
            {formData.canUpdateStatus && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                  Transiciones de Estado Permitidas
                  <span className="font-normal text-slate-400 ml-1">(dejar vacio = todas permitidas)</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleStatusTransition(status)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        formData.allowedStatusTransitions.includes(status)
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Allowed Fields */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Campos Editables</h4>
              <div className="flex flex-wrap gap-2">
                {FIELD_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleAllowedField(value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      formData.allowedFields.includes(value)
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                loading={createLoading}
                onClick={handleCreateAccess}
                disabled={!formData.agentName || !formData.agentEmail}
              >
                Crear Acceso y Generar Token
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab('accesses')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'accesses'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Agentes ({accesses.length})
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'timeline'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Linea de Tiempo ({logs.length})
        </button>
      </div>

      {/* Accesses Tab */}
      {activeTab === 'accesses' && (
        <div className="space-y-4">
          {loadingAccesses ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-6 w-6 text-[var(--color-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : accesses.length === 0 ? (
            <Card>
              <CardBody>
                <div className="text-center py-8 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <p className="text-sm">No hay agentes externos configurados para esta orden</p>
                  <p className="text-xs mt-1">Crea un nuevo acceso para compartir con un agente externo</p>
                </div>
              </CardBody>
            </Card>
          ) : (
            accesses.map((access) => (
              <Card key={access.id} className={!access.isActive ? 'opacity-60' : ''}>
                <CardBody>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-800">{access.agentName}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${AGENT_TYPE_COLORS[access.agentType] || 'bg-slate-100 text-slate-700'}`}>
                          {AGENT_TYPE_LABELS[access.agentType] || access.agentType}
                        </span>
                        {access.isActive ? (
                          new Date(access.expiresAt) > new Date() ? (
                            <Badge variant="success">Activo</Badge>
                          ) : (
                            <Badge variant="error">Expirado</Badge>
                          )
                        ) : (
                          <Badge variant="error">Revocado</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{access.agentEmail}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                        <span>Expira: {formatShortDate(access.expiresAt)}</span>
                        <span>Accesos: {access.accessCount}</span>
                        {access.lastAccessAt && (
                          <span>Ultimo acceso: {formatDate(access.lastAccessAt)}</span>
                        )}
                        <span>Creado: {formatShortDate(access.createdAt)}</span>
                      </div>
                      {/* Permissions summary */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {access.permissions.canUpdateStatus && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200">Estado</span>
                        )}
                        {access.permissions.canUploadDocuments && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">Documentos</span>
                        )}
                        {access.permissions.canUpdateDates && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-600 border border-sky-200">Fechas</span>
                        )}
                        {access.permissions.canUpdateCosts && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">Costos</span>
                        )}
                        {access.permissions.allowedFields.map((f) => (
                          <span key={f} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200">{f}</span>
                        ))}
                      </div>
                    </div>
                    {access.isActive && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => handleRegenerate(access.id)}>
                          Regenerar
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => handleRevoke(access.id)}>
                          Revocar
                        </Button>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <Card>
          <CardBody>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No hay actividad registrada para esta orden
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />

                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="relative pl-10">
                      {/* Dot */}
                      <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                        log.source === 'EXTERNAL' ? 'bg-blue-500' : 'bg-slate-400'
                      }`} />

                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700'}`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                          {log.source === 'EXTERNAL' && log.agentType && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${AGENT_TYPE_COLORS[log.agentType] || 'bg-slate-100 text-slate-700'}`}>
                              {AGENT_TYPE_LABELS[log.agentType] || log.agentType}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">{formatDate(log.createdAt)}</span>
                        </div>

                        <div className="text-sm text-slate-700">
                          {log.source === 'EXTERNAL' && log.agentName && (
                            <span className="font-medium">{log.agentName}: </span>
                          )}
                          {log.source === 'INTERNAL' && (
                            <span className="font-medium text-slate-500">Sistema: </span>
                          )}

                          {log.action === 'STATUS_CHANGE' && (
                            <span>
                              Estado cambiado de <code className="bg-slate-200 px-1 rounded text-xs">{log.oldValue}</code>{' '}
                              a <code className="bg-blue-100 px-1 rounded text-xs text-blue-700">{log.newValue}</code>
                            </span>
                          )}

                          {log.action === 'FIELD_UPDATE' && (
                            <span>
                              Campo <code className="bg-slate-200 px-1 rounded text-xs">{log.fieldName}</code>{' '}
                              actualizado{log.oldValue ? ` de "${log.oldValue}"` : ''} a{' '}
                              <code className="bg-emerald-100 px-1 rounded text-xs text-emerald-700">{log.newValue}</code>
                            </span>
                          )}

                          {log.action === 'DOCUMENT_UPLOAD' && (
                            <span>Documento subido: {log.newValue}</span>
                          )}

                          {log.action === 'COST_UPDATE' && (
                            <span>
                              Costo <code className="bg-slate-200 px-1 rounded text-xs">{log.fieldName}</code>{' '}
                              actualizado{log.oldValue ? ` de $${log.oldValue}` : ''} a{' '}
                              <code className="bg-amber-100 px-1 rounded text-xs text-amber-700">${log.newValue}</code>
                            </span>
                          )}

                          {log.action === 'NOTE_ADDED' && log.note && (
                            <span>{log.note}</span>
                          )}
                        </div>

                        {log.ipAddress && (
                          <p className="text-[10px] text-slate-400 mt-1">IP: {log.ipAddress}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';

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

interface ImportOrderData {
  id: string;
  orderNumber: string;
  status: string;
  originCountry: string;
  originPort: string;
  destinationPort: string;
  incoterm: string;
  currency: string;
  blNumber: string | null;
  containerNumber: string | null;
  shippingLine: string | null;
  vesselName: string | null;
  trackingUrl: string | null;
  etd: string | null;
  eta: string | null;
  actualShipDate: string | null;
  actualArrival: string | null;
  customsClearanceDate: string | null;
  warehouseEntryDate: string | null;
  documents: Array<{ name: string; url: string; type: string; uploadedBy?: string; uploadedAt?: string; notes?: string }>;
  notes: string | null;
  fobTotal?: number;
  cifTotal?: number;
  freightCost?: number;
  insuranceCost?: number;
  gastosPuerto?: number;
  agenteAduana?: number;
  transporteInterno?: number;
  otrosGastos?: number;
  items?: Array<{ description: string; quantity: number; unitPrice: number }>;
  createdAt: string;
  updatedAt: string;
}

interface AgentInfo {
  id: string;
  agentType: string;
  agentName: string;
  agentEmail: string;
}

interface PortalData {
  order: ImportOrderData;
  agent: AgentInfo;
  permissions: ExternalAccessPermissions;
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
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

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

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  confirmed: 'Confirmada',
  shipped: 'Embarcada',
  in_transit: 'En Transito',
  at_port: 'En Puerto',
  customs: 'En Aduana',
  cleared: 'Liberada',
  received: 'Recibida',
  closed: 'Cerrada',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  shipped: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  in_transit: 'bg-sky-100 text-sky-800 border-sky-300',
  at_port: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  customs: 'bg-amber-100 text-amber-800 border-amber-300',
  cleared: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  received: 'bg-green-100 text-green-800 border-green-300',
  closed: 'bg-slate-200 text-slate-600 border-slate-400',
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['confirmed'],
  confirmed: ['shipped'],
  shipped: ['in_transit'],
  in_transit: ['at_port', 'customs'],
  at_port: ['customs'],
  customs: ['cleared'],
  cleared: ['received'],
  received: ['closed'],
};

const DOC_TYPE_LABELS: Record<string, string> = {
  BL: 'Bill of Lading',
  COMMERCIAL_INVOICE: 'Factura Comercial',
  PACKING_LIST: 'Packing List',
  CUSTOMS_DECLARATION: 'Declaracion de Aduana',
  CERTIFICATE: 'Certificado',
  INSURANCE: 'Seguro',
  FREIGHT_INVOICE: 'Factura de Flete',
  INSPECTION_REPORT: 'Informe de Inspeccion',
  OTHER: 'Otro',
};

const DOC_TYPES = [
  'BL', 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'CUSTOMS_DECLARATION',
  'CERTIFICATE', 'INSURANCE', 'FREIGHT_INVOICE', 'INSPECTION_REPORT', 'OTHER',
];

const ACTION_LABELS: Record<string, string> = {
  STATUS_CHANGE: 'Cambio de Estado',
  FIELD_UPDATE: 'Actualizacion',
  DOCUMENT_UPLOAD: 'Documento',
  COST_UPDATE: 'Costo',
  NOTE_ADDED: 'Nota',
};

const FIELD_LABELS: Record<string, string> = {
  blNumber: 'Numero BL',
  containerNumber: 'Numero Contenedor',
  vesselName: 'Nombre Buque',
  shippingLine: 'Naviera',
  trackingUrl: 'URL Tracking',
  originPort: 'Puerto Origen',
  destinationPort: 'Puerto Destino',
  etd: 'ETD',
  eta: 'ETA',
  actualShipDate: 'Fecha Embarque Real',
  actualArrival: 'Llegada Real',
  customsClearanceDate: 'Fecha Liberacion',
  warehouseEntryDate: 'Ingreso Bodega',
  freightCost: 'Costo Flete',
  insuranceCost: 'Costo Seguro',
  gastosPuerto: 'Gastos Puerto',
  agenteAduana: 'Agente Aduana',
  transporteInterno: 'Transporte Interno',
  otrosGastos: 'Otros Gastos',
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
};

const formatDateTime = (dateStr: string) =>
  new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));

// ---------------------------------------------------------------------------
// API helper for external portal (uses token auth)
// ---------------------------------------------------------------------------

function createPortalApi(token: string) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  async function handleRes<T>(res: Response): Promise<T> {
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `Error ${res.status}` }));
      throw new Error(err.message || `Error ${res.status}`);
    }
    return res.json();
  }

  return {
    get: <T,>(path: string) =>
      fetch(`${API_BASE}${path}`, { headers }).then((r) => handleRes<T>(r)),
    patch: <T,>(path: string, data: unknown) =>
      fetch(`${API_BASE}${path}`, { method: 'PATCH', headers, body: JSON.stringify(data) }).then((r) => handleRes<T>(r)),
    post: <T,>(path: string, data: unknown) =>
      fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(data) }).then((r) => handleRes<T>(r)),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PortalClient({ token: rawToken }: { token: string }) {
  const token = decodeURIComponent(rawToken);
  const portalApi = createPortalApi(token);

  // --- State ---
  const [data, setData] = useState<PortalData | null>(null);
  const [logs, setLogs] = useState<UpdateLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeSection, setActiveSection] = useState<'overview' | 'status' | 'fields' | 'documents' | 'notes' | 'log'>('overview');

  // Status form
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  // Fields form
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [fieldsLoading, setFieldsLoading] = useState(false);

  // Document form
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('BL');
  const [docUrl, setDocUrl] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docLoading, setDocLoading] = useState(false);

  // Note form
  const [noteContent, setNoteContent] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  // --- Data fetching ---
  const fetchData = useCallback(async () => {
    try {
      const [portalData, logData] = await Promise.all([
        portalApi.get<PortalData>('/external-portal/my-import'),
        portalApi.get<UpdateLogEntry[]>('/external-portal/my-import/log'),
      ]);
      setData(portalData);
      setLogs(logData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setStatusLoading(true);
    try {
      await portalApi.patch('/external-portal/my-import/status', {
        newStatus,
        note: statusNote || undefined,
      });
      showSuccess(`Estado actualizado a "${STATUS_LABELS[newStatus] || newStatus}"`);
      setNewStatus('');
      setStatusNote('');
      setShowStatusConfirm(false);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleFieldsUpdate = async () => {
    const updates: Record<string, any> = {};
    for (const [key, value] of Object.entries(fieldValues)) {
      if (value !== undefined && value !== '') {
        if (['freightCost', 'insuranceCost', 'gastosPuerto', 'agenteAduana', 'transporteInterno', 'otrosGastos'].includes(key)) {
          updates[key] = parseFloat(value);
        } else {
          updates[key] = value;
        }
      }
    }
    if (Object.keys(updates).length === 0) return;

    setFieldsLoading(true);
    try {
      await portalApi.patch('/external-portal/my-import/fields', updates);
      showSuccess('Campos actualizados correctamente');
      setFieldValues({});
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar campos');
    } finally {
      setFieldsLoading(false);
    }
  };

  const handleDocUpload = async () => {
    if (!docName || !docUrl) return;
    setDocLoading(true);
    try {
      await portalApi.post('/external-portal/my-import/documents', {
        name: docName,
        type: docType,
        url: docUrl,
        notes: docNotes || undefined,
      });
      showSuccess('Documento agregado correctamente');
      setDocName('');
      setDocUrl('');
      setDocNotes('');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir documento');
    } finally {
      setDocLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setNoteLoading(true);
    try {
      await portalApi.post('/external-portal/my-import/notes', { content: noteContent });
      showSuccess('Nota agregada correctamente');
      setNoteContent('');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar nota');
    } finally {
      setNoteLoading(false);
    }
  };

  // --- Render: Loading ---
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">Cargando portal de importacion...</p>
        </div>
      </div>
    );
  }

  // --- Render: Error (no data) ---
  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-md w-full text-center">
          <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Acceso Denegado</h2>
          <p className="text-sm text-slate-500">{error}</p>
          <p className="text-xs text-slate-400 mt-4">
            Si crees que esto es un error, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { order, agent, permissions } = data;

  // Compute available transitions for this agent
  const globalTransitions = VALID_TRANSITIONS[order.status] || [];
  const agentTransitions = permissions.allowedStatusTransitions.length > 0
    ? globalTransitions.filter((s) => permissions.allowedStatusTransitions.includes(s))
    : globalTransitions;

  // Compute editable fields
  const allEditableFields: string[] = [...permissions.allowedFields];
  if (permissions.canUpdateDates) {
    allEditableFields.push('etd', 'eta', 'actualShipDate', 'actualArrival', 'customsClearanceDate', 'warehouseEntryDate');
  }
  if (permissions.canUpdateCosts) {
    allEditableFields.push('freightCost', 'insuranceCost', 'gastosPuerto', 'agenteAduana', 'transporteInterno', 'otrosGastos');
  }
  const editableFields = [...new Set(allEditableFields)];

  // Navigation items
  const navItems = [
    { key: 'overview', label: 'Resumen' },
    ...(permissions.canUpdateStatus && agentTransitions.length > 0 ? [{ key: 'status', label: 'Estado' }] : []),
    ...(editableFields.length > 0 ? [{ key: 'fields', label: 'Campos' }] : []),
    ...(permissions.canUploadDocuments ? [{ key: 'documents', label: 'Documentos' }] : []),
    { key: 'notes', label: 'Notas' },
    { key: 'log', label: 'Actividad' },
  ] as Array<{ key: typeof activeSection; label: string }>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <span className="text-lg font-bold text-slate-800">
                  TORQUE <span className="text-blue-600">360</span>
                </span>
                <span className="text-xs text-slate-400 ml-2 hidden sm:inline">Portal de Importacion</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${AGENT_TYPE_COLORS[agent.agentType] || 'bg-slate-100 text-slate-700'}`}>
                {AGENT_TYPE_LABELS[agent.agentType] || agent.agentType}
              </span>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{agent.agentName}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Success / Error banners */}
      {successMsg && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-sm text-emerald-700">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {successMsg}
          </div>
        </div>
      )}
      {error && data && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-red-700">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {error}
            </div>
            <button onClick={() => setError('')} className="underline text-xs">Cerrar</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Order summary bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-800">Orden #{order.orderNumber}</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {order.originPort || order.originCountry || '?'} &rarr; {order.destinationPort || '?'}
                {order.incoterm && <span className="ml-2 text-slate-400">({order.incoterm})</span>}
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Creada: {formatDate(order.createdAt)}</p>
              <p>Actualizada: {formatDate(order.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeSection === item.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* ============================================================ */}
        {/* OVERVIEW SECTION */}
        {/* ============================================================ */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Shipping info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800">Informacion de Envio</h3>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'BL', value: order.blNumber },
                    { label: 'Contenedor', value: order.containerNumber },
                    { label: 'Buque', value: order.vesselName },
                    { label: 'Naviera', value: order.shippingLine },
                    { label: 'ETD', value: order.etd ? formatDate(order.etd) : null },
                    { label: 'ETA', value: order.eta ? formatDate(order.eta) : null },
                    { label: 'Embarque Real', value: order.actualShipDate ? formatDate(order.actualShipDate) : null },
                    { label: 'Llegada Real', value: order.actualArrival ? formatDate(order.actualArrival) : null },
                    { label: 'Liberacion Aduana', value: order.customsClearanceDate ? formatDate(order.customsClearanceDate) : null },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-sm font-medium text-slate-700">{value || '-'}</p>
                    </div>
                  ))}
                </div>
                {order.trackingUrl && (
                  <div className="mt-4">
                    <p className="text-xs text-slate-400 mb-1">Tracking URL</p>
                    <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                      {order.trackingUrl}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Costs (if visible) */}
            {permissions.canUpdateCosts && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800">Costos</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'FOB Total', value: order.fobTotal },
                      { label: 'CIF Total', value: order.cifTotal },
                      { label: 'Flete', value: order.freightCost },
                      { label: 'Seguro', value: order.insuranceCost },
                      { label: 'Gastos Puerto', value: order.gastosPuerto },
                      { label: 'Agente Aduana', value: order.agenteAduana },
                      { label: 'Transporte Int.', value: order.transporteInterno },
                      { label: 'Otros Gastos', value: order.otrosGastos },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className="text-sm font-medium text-slate-700">
                          {value != null ? `$${Number(value).toLocaleString('es-CL')}` : '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Documents list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800">Documentos ({order.documents?.length || 0})</h3>
              </div>
              <div className="px-6 py-4">
                {(!order.documents || order.documents.length === 0) ? (
                  <p className="text-sm text-slate-400 text-center py-4">No hay documentos adjuntos</p>
                ) : (
                  <div className="space-y-2">
                    {order.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-slate-700">{doc.name}</p>
                            <p className="text-xs text-slate-400">
                              {DOC_TYPE_LABELS[doc.type] || doc.type}
                              {doc.uploadedBy && ` - ${doc.uploadedBy}`}
                              {doc.uploadedAt && ` - ${formatDate(doc.uploadedAt)}`}
                            </p>
                          </div>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex-shrink-0"
                        >
                          Ver
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Items summary */}
            {order.items && order.items.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800">Items ({order.items.length})</h3>
                </div>
                <div className="px-6 py-4">
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <span className="text-sm text-slate-700">{item.description}</span>
                        <span className="text-sm text-slate-500">
                          {item.quantity} x ${Number(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* STATUS UPDATE SECTION */}
        {/* ============================================================ */}
        {activeSection === 'status' && permissions.canUpdateStatus && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">Actualizar Estado</h3>
            </div>
            <div className="px-6 py-6">
              <div className="mb-4">
                <p className="text-sm text-slate-500 mb-1">Estado actual:</p>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              {agentTransitions.length === 0 ? (
                <p className="text-sm text-slate-400">No hay transiciones de estado disponibles desde el estado actual.</p>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nuevo estado</label>
                    <div className="flex flex-wrap gap-2">
                      {agentTransitions.map((status) => (
                        <button
                          key={status}
                          onClick={() => { setNewStatus(status); setShowStatusConfirm(false); }}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                            newStatus === status
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600'
                          }`}
                        >
                          {STATUS_LABELS[status] || status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newStatus && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nota (opcional)</label>
                        <textarea
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          placeholder="Agregar comentario sobre el cambio de estado..."
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={3}
                        />
                      </div>

                      {!showStatusConfirm ? (
                        <button
                          onClick={() => setShowStatusConfirm(true)}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Confirmar Cambio de Estado
                        </button>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-sm text-amber-800 font-medium mb-3">
                            Confirmar cambio: {STATUS_LABELS[order.status] || order.status} &rarr; {STATUS_LABELS[newStatus] || newStatus}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleStatusUpdate}
                              disabled={statusLoading}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              {statusLoading ? 'Actualizando...' : 'Si, Cambiar Estado'}
                            </button>
                            <button
                              onClick={() => setShowStatusConfirm(false)}
                              className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* FIELDS UPDATE SECTION */}
        {/* ============================================================ */}
        {activeSection === 'fields' && editableFields.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">Actualizar Campos</h3>
              <p className="text-xs text-slate-400 mt-1">Solo se muestran los campos que tienes permiso para editar</p>
            </div>
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editableFields.map((field) => {
                  const currentValue = (order as any)[field];
                  const isDate = ['etd', 'eta', 'actualShipDate', 'actualArrival', 'customsClearanceDate', 'warehouseEntryDate'].includes(field);
                  const isCost = ['freightCost', 'insuranceCost', 'gastosPuerto', 'agenteAduana', 'transporteInterno', 'otrosGastos'].includes(field);

                  return (
                    <div key={field}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {FIELD_LABELS[field] || field}
                      </label>
                      <p className="text-xs text-slate-400 mb-1">
                        Actual: {currentValue != null ? (isDate ? formatDate(currentValue) : isCost ? `$${Number(currentValue).toLocaleString('es-CL')}` : String(currentValue)) : '-'}
                      </p>
                      <input
                        type={isDate ? 'date' : isCost ? 'number' : 'text'}
                        value={fieldValues[field] || ''}
                        onChange={(e) => setFieldValues({ ...fieldValues, [field]: e.target.value })}
                        placeholder={isDate ? 'YYYY-MM-DD' : isCost ? '0' : `Nuevo valor para ${FIELD_LABELS[field] || field}`}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        step={isCost ? '0.01' : undefined}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-6">
                <button
                  onClick={handleFieldsUpdate}
                  disabled={fieldsLoading || Object.values(fieldValues).every((v) => !v)}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fieldsLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* DOCUMENTS SECTION */}
        {/* ============================================================ */}
        {activeSection === 'documents' && permissions.canUploadDocuments && (
          <div className="space-y-6">
            {/* Upload form */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800">Agregar Documento</h3>
              </div>
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Documento</label>
                    <input
                      type="text"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      placeholder="Ej: BL-2024-001234"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Documento</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {DOC_TYPES.map((t) => (
                        <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">URL del Documento</label>
                    <input
                      type="url"
                      value={docUrl}
                      onChange={(e) => setDocUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notas (opcional)</label>
                    <textarea
                      value={docNotes}
                      onChange={(e) => setDocNotes(e.target.value)}
                      placeholder="Comentarios adicionales..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleDocUpload}
                    disabled={docLoading || !docName || !docUrl}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {docLoading ? 'Subiendo...' : 'Agregar Documento'}
                  </button>
                </div>
              </div>
            </div>

            {/* Documents list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800">Documentos Existentes ({order.documents?.length || 0})</h3>
              </div>
              <div className="px-6 py-4">
                {(!order.documents || order.documents.length === 0) ? (
                  <p className="text-sm text-slate-400 text-center py-4">No hay documentos adjuntos</p>
                ) : (
                  <div className="space-y-2">
                    {order.documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{doc.name}</p>
                          <p className="text-xs text-slate-400">
                            {DOC_TYPE_LABELS[doc.type] || doc.type}
                            {doc.uploadedBy && ` - ${doc.uploadedBy}`}
                          </p>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Ver
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* NOTES SECTION */}
        {/* ============================================================ */}
        {activeSection === 'notes' && (
          <div className="space-y-6">
            {/* Add note */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-800">Agregar Nota</h3>
              </div>
              <div className="px-6 py-6">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Escribe tu nota o comentario aqui..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                />
                <div className="mt-3">
                  <button
                    onClick={handleAddNote}
                    disabled={noteLoading || !noteContent.trim()}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {noteLoading ? 'Enviando...' : 'Enviar Nota'}
                  </button>
                </div>
              </div>
            </div>

            {/* Previous notes */}
            {order.notes && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800">Notas Anteriores</h3>
                </div>
                <div className="px-6 py-4">
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {order.notes}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* ACTIVITY LOG SECTION */}
        {/* ============================================================ */}
        {activeSection === 'log' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">Registro de Actividad</h3>
            </div>
            <div className="px-6 py-4">
              {logs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No hay actividad registrada</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${log.source === 'EXTERNAL' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-slate-500">
                            {log.agentName || 'Sistema'}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            log.action === 'STATUS_CHANGE' ? 'bg-blue-100 text-blue-700' :
                            log.action === 'DOCUMENT_UPLOAD' ? 'bg-emerald-100 text-emerald-700' :
                            log.action === 'COST_UPDATE' ? 'bg-amber-100 text-amber-700' :
                            log.action === 'NOTE_ADDED' ? 'bg-purple-100 text-purple-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                          <span className="text-[10px] text-slate-400">{formatDateTime(log.createdAt)}</span>
                        </div>
                        <div className="text-sm text-slate-700 mt-0.5">
                          {log.action === 'STATUS_CHANGE' && (
                            <span>{log.oldValue} &rarr; {STATUS_LABELS[log.newValue || ''] || log.newValue}</span>
                          )}
                          {(log.action === 'FIELD_UPDATE' || log.action === 'COST_UPDATE') && (
                            <span>{FIELD_LABELS[log.fieldName || ''] || log.fieldName}: {log.newValue}</span>
                          )}
                          {log.action === 'DOCUMENT_UPLOAD' && (
                            <span>{log.newValue}</span>
                          )}
                          {log.action === 'NOTE_ADDED' && log.note && (
                            <span>{log.note}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xs text-slate-400">Powered by <span className="font-semibold text-slate-500">TORQUE 360</span></span>
            </div>
            <span className="text-xs text-slate-400">Portal de Importacion Seguro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

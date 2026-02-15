'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Types ──

interface Access {
  id: string;
  clientId: string;
  clientName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  clientId: string;
  clientName: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  isPaidReport: boolean;
  reportAmount: number | null;
  reportUrl: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

interface Message {
  id: string;
  senderType: string;
  senderId: string;
  senderName: string;
  message: string;
  attachmentUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

interface Client {
  id: string;
  rut: string;
  name: string;
  email: string;
  phone: string;
}

// ── Badge mappings ──

const statusBadge: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  OPEN: { label: 'Abierto', variant: 'primary' },
  IN_PROGRESS: { label: 'En Progreso', variant: 'info' },
  WAITING_CLIENT: { label: 'Esperando Cliente', variant: 'warning' },
  RESOLVED: { label: 'Resuelto', variant: 'success' },
  CLOSED: { label: 'Cerrado', variant: 'default' },
};

const categoryLabel: Record<string, string> = {
  CONSULTA_ESTADO: 'Consulta Estado',
  CONSULTA_PRESUPUESTO: 'Consulta Presupuesto',
  RECLAMO: 'Reclamo',
  SOLICITUD_INFORME: 'Solicitud Informe',
  GENERAL: 'General',
};

const priorityBadge: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  LOW: { label: 'Baja', variant: 'success' },
  MEDIUM: { label: 'Media', variant: 'warning' },
  HIGH: { label: 'Alta', variant: 'error' },
};

// ── Page Component ──

export default function PortalClientesPage() {
  const [activeTab, setActiveTab] = useState<'accesos' | 'tickets' | 'informes'>('accesos');

  const tabs = [
    { key: 'accesos' as const, label: 'Accesos' },
    { key: 'tickets' as const, label: 'Tickets' },
    { key: 'informes' as const, label: 'Informes' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Portal de Clientes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestiona el acceso de clientes al portal, tickets de soporte e informes
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'accesos' && <AccesosTab />}
      {activeTab === 'tickets' && <TicketsTab />}
      {activeTab === 'informes' && <InformesTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Accesos
// ═══════════════════════════════════════════════════════════════════════════

function AccesosTab() {
  const [accesses, setAccesses] = useState<Access[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ clientId: '', email: '', phone: '' });
  const [creating, setCreating] = useState(false);
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchAccesses = useCallback(async () => {
    try {
      const data = await api.get<Access[]>('/customer-portal/access');
      setAccesses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar accesos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccesses();
    api.get<Client[]>('/clients').then(setClients).catch(() => {});
  }, [fetchAccesses]);

  async function handleCreate() {
    if (!formData.clientId || !formData.email) return;
    setCreating(true);
    setError('');
    try {
      const result = await api.post<{ pin: string }>('/customer-portal/access', formData);
      setCreatedPin(result.pin);
      setShowForm(false);
      setFormData({ clientId: '', email: '', phone: '' });
      fetchAccesses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear acceso');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await api.delete(`/customer-portal/access/${id}`);
      fetchAccesses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar');
    }
  }

  async function handleRegenerate(id: string) {
    try {
      const result = await api.post<{ pin: string }>(`/customer-portal/access/${id}/regenerate`);
      setCreatedPin(result.pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al regenerar PIN');
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Cargando accesos...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* PIN Display */}
      {createdPin && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-emerald-800">PIN Generado</p>
              <p className="text-3xl font-mono font-bold text-emerald-900 mt-1 tracking-widest">
                {createdPin}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Comparta este PIN con el cliente. Solo se muestra una vez.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCreatedPin(null)}>
              Cerrar
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo Acceso'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">Crear Acceso al Portal</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  value={formData.clientId}
                  onChange={(e) => {
                    const client = clients.find((c) => c.id === e.target.value);
                    setFormData({
                      ...formData,
                      clientId: e.target.value,
                      email: client?.email || formData.email,
                    });
                  }}
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.rut})
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Email del Cliente"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@email.com"
              />
              <Input
                label="Telefono (opcional)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+56 9 1234 5678"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleCreate} loading={creating}>
                Crear Acceso y Generar PIN
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Access List */}
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Telefono</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Ultimo Login</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {accesses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No hay accesos creados
                    </td>
                  </tr>
                ) : (
                  accesses.map((a) => (
                    <tr key={a.id} className="border-b border-[var(--color-border)] hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{a.clientName}</td>
                      <td className="px-4 py-3 text-slate-600">{a.email}</td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{a.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={a.isActive ? 'success' : 'default'}>
                          {a.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                        {a.lastLoginAt
                          ? new Date(a.lastLoginAt).toLocaleString('es-CL')
                          : 'Nunca'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {a.isActive && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRegenerate(a.id)}
                            >
                              Regenerar PIN
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeactivate(a.id)}
                            >
                              Desactivar
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Tickets
// ═══════════════════════════════════════════════════════════════════════════

function TicketsTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedTicketData, setSelectedTicketData] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterCategory) params.set('category', filterCategory);
      const queryString = params.toString();
      const data = await api.get<Ticket[]>(
        `/customer-portal/tickets${queryString ? `?${queryString}` : ''}`,
      );
      setTickets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar tickets');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await api.get<{ unreadTickets: number }>('/customer-portal/tickets/unread-count');
      setUnreadCount(data.unreadTickets);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchUnreadCount();
  }, [fetchTickets, fetchUnreadCount]);

  async function openTicket(ticketId: string) {
    setSelectedTicket(ticketId);
    const ticket = tickets.find((t) => t.id === ticketId) || null;
    setSelectedTicketData(ticket);
    try {
      const data = await api.get<{ ticket: Ticket; messages: Message[] }>(
        `/customer-portal/tickets/${ticketId}/messages`,
      );
      setMessages(data.messages);
    } catch {
      setMessages([]);
    }
  }

  async function handleReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setReplying(true);
    try {
      await api.post(`/customer-portal/tickets/${selectedTicket}/reply`, {
        message: replyText,
      });
      setReplyText('');
      // Refresh messages
      const data = await api.get<{ ticket: Ticket; messages: Message[] }>(
        `/customer-portal/tickets/${selectedTicket}/messages`,
      );
      setMessages(data.messages);
      fetchTickets();
      fetchUnreadCount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar respuesta');
    } finally {
      setReplying(false);
    }
  }

  async function handleStatusChange(ticketId: string, status: string) {
    try {
      await api.patch(`/customer-portal/tickets/${ticketId}/status`, { status });
      fetchTickets();
      if (selectedTicket === ticketId) {
        setSelectedTicketData((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado');
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Cargando tickets...</div>;
  }

  // If a ticket is selected, show messages view
  if (selectedTicket && selectedTicketData) {
    const sb = statusBadge[selectedTicketData.status] || { label: selectedTicketData.status, variant: 'default' as const };
    return (
      <div className="space-y-4">
        {/* Back button and ticket info */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTicket(null)}>
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Volver
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-slate-500">{selectedTicketData.ticketNumber}</span>
              <Badge variant={sb.variant}>{sb.label}</Badge>
              <Badge variant={priorityBadge[selectedTicketData.priority]?.variant || 'default'}>
                {priorityBadge[selectedTicketData.priority]?.label || selectedTicketData.priority}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mt-1">{selectedTicketData.subject}</h2>
            <p className="text-sm text-slate-500">
              {selectedTicketData.clientName} &middot; {categoryLabel[selectedTicketData.category] || selectedTicketData.category}
            </p>
          </div>
          <div className="flex gap-2">
            <select
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-white text-sm"
              value={selectedTicketData.status}
              onChange={(e) => handleStatusChange(selectedTicket, e.target.value)}
            >
              <option value="OPEN">Abierto</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="WAITING_CLIENT">Esperando Cliente</option>
              <option value="RESOLVED">Resuelto</option>
              <option value="CLOSED">Cerrado</option>
            </select>
          </div>
        </div>

        {/* Messages */}
        <Card>
          <CardBody>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.senderType === 'STAFF' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      m.senderType === 'STAFF'
                        ? 'bg-[var(--color-primary)] text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-800 rounded-bl-md'
                    }`}
                  >
                    <p className={`text-xs font-medium mb-1 ${
                      m.senderType === 'STAFF' ? 'text-blue-200' : 'text-slate-500'
                    }`}>
                      {m.senderName}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{m.message}</p>
                    {m.attachmentUrl && (
                      <a
                        href={m.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-xs underline mt-1 inline-block ${
                          m.senderType === 'STAFF' ? 'text-blue-200' : 'text-blue-600'
                        }`}
                      >
                        Ver adjunto
                      </a>
                    )}
                    <p className={`text-[10px] mt-1 ${
                      m.senderType === 'STAFF' ? 'text-blue-300' : 'text-slate-400'
                    }`}>
                      {new Date(m.createdAt).toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-center text-slate-400 py-8">Sin mensajes</p>
              )}
            </div>

            {/* Reply */}
            {selectedTicketData.status !== 'CLOSED' && (
              <div className="mt-4 flex gap-2 border-t border-[var(--color-border)] pt-4">
                <input
                  type="text"
                  className="flex-1 px-4 py-2 rounded-full border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  placeholder="Escribir respuesta..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleReply();
                    }
                  }}
                />
                <Button onClick={handleReply} loading={replying} size="sm">
                  Enviar
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Unread count badge */}
      {unreadCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
            {unreadCount}
          </span>
          {unreadCount === 1 ? 'ticket tiene' : 'tickets tienen'} mensajes sin leer de clientes
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="OPEN">Abierto</option>
          <option value="IN_PROGRESS">En Progreso</option>
          <option value="WAITING_CLIENT">Esperando Cliente</option>
          <option value="RESOLVED">Resuelto</option>
          <option value="CLOSED">Cerrado</option>
        </select>
        <select
          className="px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">Todas las categorias</option>
          <option value="CONSULTA_ESTADO">Consulta Estado</option>
          <option value="CONSULTA_PRESUPUESTO">Consulta Presupuesto</option>
          <option value="RECLAMO">Reclamo</option>
          <option value="SOLICITUD_INFORME">Solicitud Informe</option>
          <option value="GENERAL">General</option>
        </select>
      </div>

      {/* Tickets List */}
      <Card>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Ticket</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Asunto</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Categoria</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Prioridad</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No hay tickets
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => {
                    const sb = statusBadge[t.status] || { label: t.status, variant: 'default' as const };
                    const pb = priorityBadge[t.priority] || { label: t.priority, variant: 'warning' as const };
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-[var(--color-border)] hover:bg-slate-50 cursor-pointer"
                        onClick={() => openTicket(t.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500">{t.ticketNumber}</span>
                            {t.unreadCount > 0 && (
                              <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                                {t.unreadCount}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{t.clientName}</td>
                        <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{t.subject}</td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                          {categoryLabel[t.category] || t.category}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={sb.variant}>{sb.label}</Badge>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <Badge variant={pb.variant}>{pb.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                          {new Date(t.createdAt).toLocaleDateString('es-CL')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: Informes
// ═══════════════════════════════════════════════════════════════════════════

function InformesTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const data = await api.get<Ticket[]>('/customer-portal/tickets?category=SOLICITUD_INFORME');
        setTickets(data.filter((t) => t.isPaidReport));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Cargando informes...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">Solicitudes de Informes Pagados</h3>
          <p className="text-sm text-slate-500">
            Informes tecnicos solicitados por clientes a traves del portal
          </p>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Ticket</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Asunto</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Monto</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Informe</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No hay solicitudes de informes pagados
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => {
                    const sb = statusBadge[t.status] || { label: t.status, variant: 'default' as const };
                    return (
                      <tr key={t.id} className="border-b border-[var(--color-border)]">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.ticketNumber}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{t.clientName}</td>
                        <td className="px-4 py-3 text-slate-700">{t.subject}</td>
                        <td className="px-4 py-3">
                          <Badge variant={sb.variant}>{sb.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {t.reportAmount
                            ? `$${Number(t.reportAmount).toLocaleString('es-CL')}`
                            : 'Pendiente'}
                        </td>
                        <td className="px-4 py-3">
                          {t.reportUrl ? (
                            <a
                              href={t.reportUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              Descargar PDF
                            </a>
                          ) : (
                            <span className="text-slate-400 text-sm">No disponible</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

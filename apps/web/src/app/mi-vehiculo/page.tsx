'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ══════════════════════════════════════════════════════════════════════════════
// API Helper
// ══════════════════════════════════════════════════════════════════════════════

const portalApi = {
  token: () =>
    typeof window !== 'undefined'
      ? localStorage.getItem('torque_portal_token')
      : null,

  async post(url: string, body: any) {
    const res = await fetch(`/api${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token() ? { Authorization: `Bearer ${this.token()}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      localStorage.removeItem('torque_portal_token');
      localStorage.removeItem('torque_portal_client');
      window.location.reload();
      throw new Error('Sesion expirada');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `Error ${res.status}` }));
      throw new Error(err.message || `Error ${res.status}`);
    }
    if (res.status === 204) return {} as any;
    return res.json();
  },

  async get(url: string) {
    const res = await fetch(`/api${url}`, {
      headers: {
        ...(this.token() ? { Authorization: `Bearer ${this.token()}` } : {}),
      },
    });
    if (res.status === 401) {
      localStorage.removeItem('torque_portal_token');
      localStorage.removeItem('torque_portal_client');
      window.location.reload();
      throw new Error('Sesion expirada');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `Error ${res.status}` }));
      throw new Error(err.message || `Error ${res.status}`);
    }
    if (res.status === 204) return {} as any;
    return res.json();
  },

  async patch(url: string, body?: any) {
    const res = await fetch(`/api${url}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token() ? { Authorization: `Bearer ${this.token()}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 401) {
      localStorage.removeItem('torque_portal_token');
      localStorage.removeItem('torque_portal_client');
      window.location.reload();
      throw new Error('Sesion expirada');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `Error ${res.status}` }));
      throw new Error(err.message || `Error ${res.status}`);
    }
    if (res.status === 204) return {} as any;
    return res.json();
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

interface DashboardData {
  client: { id: string; name: string; email: string; phone: string };
  vehicles: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    year: number;
    color: string;
    mileage: number;
  }[];
  activeWorkOrders: {
    id: string;
    orderNumber: number;
    vehicleId: string;
    status: string;
    type: string;
    description: string;
    priority: string;
    progress: number;
    dueDate: string | null;
    startedAt: string | null;
    createdAt: string;
  }[];
  quotations: {
    id: string;
    quoteNumber: number;
    status: string;
    total: number;
    createdAt: string;
  }[];
  recentInvoices: {
    id: string;
    folio: number;
    dteType: number;
    status: string;
    issueDate: string;
  }[];
  openTicketsCount: number;
  unreadMessages: number;
}

interface WorkOrderDetail {
  id: string;
  orderNumber: number;
  status: string;
  type: string;
  description: string;
  diagnosis: string | null;
  priority: string;
  progress: number;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  vehicle: {
    plate: string;
    brand: string;
    model: string;
    year: number;
    color: string;
  } | null;
  partsStatus: {
    total: number;
    received: number;
    pending: number;
    ordered: number;
  };
  timeline: { label: string; date: string | null; completed: boolean }[];
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  isPaidReport: boolean;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  senderType: string;
  senderName: string;
  message: string;
  attachmentUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// Labels & Maps
// ══════════════════════════════════════════════════════════════════════════════

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completado',
  invoiced: 'Facturado',
  dispatched: 'Despachado',
  cancelled: 'Cancelado',
};

const ticketStatusLabels: Record<string, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En Progreso',
  WAITING_CLIENT: 'Esperando Respuesta',
  RESOLVED: 'Resuelto',
  CLOSED: 'Cerrado',
};

const categoryLabels: Record<string, string> = {
  CONSULTA_ESTADO: 'Estado del Vehiculo',
  CONSULTA_PRESUPUESTO: 'Presupuesto',
  RECLAMO: 'Reclamo',
  SOLICITUD_INFORME: 'Solicitud de Informe',
  GENERAL: 'Consulta General',
};

const dteLabels: Record<number, string> = {
  33: 'Factura',
  34: 'Factura Exenta',
  39: 'Boleta',
  41: 'Boleta Exenta',
  56: 'Nota Debito',
  61: 'Nota Credito',
  52: 'Guia Despacho',
};

function formatCLP(n: number): string {
  return '$' + n.toLocaleString('es-CL');
}

// ══════════════════════════════════════════════════════════════════════════════
// Shared Components
// ══════════════════════════════════════════════════════════════════════════════

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';
  return (
    <svg
      className={`animate-spin ${s} text-blue-400`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5 animate-pulse">
      <div className="h-4 bg-slate-700 rounded w-2/3 mb-3" />
      <div className="h-3 bg-slate-700/60 rounded w-1/2 mb-2" />
      <div className="h-3 bg-slate-700/60 rounded w-3/4" />
    </div>
  );
}

function StatusBadge({ status, map }: { status: string; map?: Record<string, string> }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    invoiced: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    dispatched: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    OPEN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    IN_PROGRESS: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    WAITING_CLIENT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    RESOLVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    CLOSED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    pagada: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pendiente: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  const label = map ? map[status] || status : statusLabels[status] || ticketStatusLabels[status] || status;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
        colors[status] || 'bg-slate-600/20 text-slate-400 border-slate-600/30'
      }`}
    >
      {label}
    </span>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors mb-4"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
      Volver
    </button>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Icons (inline SVGs)
// ══════════════════════════════════════════════════════════════════════════════

function IconCar({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}

function IconHome({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function IconChat({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

function IconDoc({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function IconGear({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconLogout({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

function IconSend({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function IconPlus({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IconCheck({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function IconCalendar({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function MiVehiculoPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [clientInfo, setClientInfo] = useState<{ clientName: string; email: string } | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('torque_portal_token') : null;
    const raw = typeof window !== 'undefined' ? localStorage.getItem('torque_portal_client') : null;
    if (token && raw) {
      try {
        const client = JSON.parse(raw);
        setIsLoggedIn(true);
        setClientInfo(client);
      } catch {
        // corrupted data
      }
    }
    setChecking(false);
  }, []);

  function handleLogin(token: string, clientName: string, email: string) {
    localStorage.setItem('torque_portal_token', token);
    localStorage.setItem('torque_portal_client', JSON.stringify({ clientName, email }));
    setIsLoggedIn(true);
    setClientInfo({ clientName, email });
  }

  function handleLogout() {
    localStorage.removeItem('torque_portal_token');
    localStorage.removeItem('torque_portal_client');
    setIsLoggedIn(false);
    setClientInfo(null);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <PortalShell clientInfo={clientInfo!} onLogout={handleLogout} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════

function LoginScreen({
  onLogin,
}: {
  onLogin: (token: string, clientName: string, email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || pin.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await portalApi.post('/portal/login', { email, pin });
      onLogin(res.accessToken, res.clientName, res.email);
    } catch (err: any) {
      setError(err.message || 'Credenciales invalidas');
    } finally {
      setLoading(false);
    }
  }

  function handlePinChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newPin = pin.split('');
    newPin[index] = digit;
    const joined = newPin.join('').slice(0, 6);
    setPin(joined);
    if (digit && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  }

  function handlePinKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
      const newPin = pin.split('');
      newPin[index - 1] = '';
      setPin(newPin.join(''));
    }
  }

  function handlePinPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setPin(pasted);
    const nextFocus = Math.min(pasted.length, 5);
    pinRefs.current[nextFocus]?.focus();
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-5 py-10">
      {/* Gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl mb-4 shadow-lg shadow-blue-500/25">
            <IconGear className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            TORQUE <span className="text-blue-400">360</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1.5">Portal del Cliente</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              Correo electronico
            </label>
            <input
              type="email"
              className="w-full px-4 py-3.5 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
              placeholder="su@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {/* PIN */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
              PIN de acceso
            </label>
            <div className="flex gap-2.5 justify-center" onPaste={handlePinPaste}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                  key={i}
                  ref={(el) => { pinRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-11 h-14 text-center text-xl font-bold text-white bg-slate-800/80 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
                  value={pin[i] || ''}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  autoComplete="off"
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || pin.length !== 6}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
          >
            {loading ? <Spinner size="sm" /> : null}
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-8">
          Solicite su PIN de acceso en el taller
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PORTAL SHELL (after login - manages tabs)
// ══════════════════════════════════════════════════════════════════════════════

type TabKey = 'inicio' | 'vehiculos' | 'mensajes' | 'informes';

function PortalShell({
  clientInfo,
  onLogout,
}: {
  clientInfo: { clientName: string; email: string };
  onLogout: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('inicio');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await portalApi.get('/portal/dashboard');
      setDashboard(data);
    } catch {
      // may be expired token - handled by portalApi auto-redirect
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      key: 'inicio',
      label: 'Inicio',
      icon: <IconHome />,
    },
    {
      key: 'vehiculos',
      label: 'Vehiculos',
      icon: <IconCar />,
    },
    {
      key: 'mensajes',
      label: 'Mensajes',
      icon: <IconChat />,
      badge: dashboard?.unreadMessages || 0,
    },
    {
      key: 'informes',
      label: 'Informes',
      icon: <IconDoc />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <header className="bg-[#0f172a]/95 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <IconGear className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">TORQUE 360</p>
              <p className="text-[10px] text-slate-500 leading-tight">Portal Cliente</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {refreshing && <Spinner size="sm" />}
            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800/50"
              title="Cerrar sesion"
            >
              <IconLogout className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 pt-5 pb-24">
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : !dashboard ? (
          <div className="text-center py-20">
            <p className="text-slate-400 mb-4">No se pudo cargar la informacion.</p>
            <button
              onClick={() => loadDashboard()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'inicio' && (
              <TabInicio
                dashboard={dashboard}
                clientInfo={clientInfo}
                onRefresh={() => loadDashboard(true)}
                onGoToVehiculos={() => setActiveTab('vehiculos')}
                onGoToMensajes={() => setActiveTab('mensajes')}
              />
            )}
            {activeTab === 'vehiculos' && <TabVehiculos dashboard={dashboard} />}
            {activeTab === 'mensajes' && <TabMensajes onRefreshDashboard={() => loadDashboard(true)} />}
            {activeTab === 'informes' && <TabInformes />}
          </>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-lg border-t border-slate-800 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-lg mx-auto flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-400'
                  : 'text-slate-500 active:text-slate-300'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="mt-0.5">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: Inicio (Dashboard Overview)
// ══════════════════════════════════════════════════════════════════════════════

function TabInicio({
  dashboard,
  clientInfo,
  onRefresh,
  onGoToVehiculos,
  onGoToMensajes,
}: {
  dashboard: DashboardData;
  clientInfo: { clientName: string; email: string };
  onRefresh: () => void;
  onGoToVehiculos: () => void;
  onGoToMensajes: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="pb-1">
        <h1 className="text-xl font-bold text-white">
          Hola, {clientInfo.clientName.split(' ')[0]}
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Bienvenido a tu portal de servicio
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onGoToVehiculos}
          className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 text-left hover:bg-slate-800/80 transition-colors"
        >
          <div className="w-9 h-9 bg-blue-500/15 rounded-lg flex items-center justify-center mb-2.5">
            <IconCar className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">{dashboard.vehicles.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {dashboard.vehicles.length === 1 ? 'Vehiculo' : 'Vehiculos'}
          </p>
        </button>

        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
          <div className="w-9 h-9 bg-amber-500/15 rounded-lg flex items-center justify-center mb-2.5">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-3.06a1.5 1.5 0 010-2.58l5.1-3.06a1.5 1.5 0 011.58 0l5.1 3.06a1.5 1.5 0 010 2.58l-5.1 3.06a1.5 1.5 0 01-1.58 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.32 11.06L2.25 13.5l9.75 5.85 9.75-5.85-4.07-2.44" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">{dashboard.activeWorkOrders.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {dashboard.activeWorkOrders.length === 1 ? 'Orden Activa' : 'Ordenes Activas'}
          </p>
        </div>

        <button
          onClick={onGoToMensajes}
          className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 text-left hover:bg-slate-800/80 transition-colors"
        >
          <div className="w-9 h-9 bg-emerald-500/15 rounded-lg flex items-center justify-center mb-2.5">
            <IconChat className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{dashboard.openTicketsCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {dashboard.openTicketsCount === 1 ? 'Ticket Abierto' : 'Tickets Abiertos'}
          </p>
        </button>

        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
          <div className="w-9 h-9 bg-purple-500/15 rounded-lg flex items-center justify-center mb-2.5">
            <IconDoc className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{dashboard.quotations.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {dashboard.quotations.length === 1 ? 'Cotizacion' : 'Cotizaciones'}
          </p>
        </div>
      </div>

      {/* Active Work Orders */}
      {dashboard.activeWorkOrders.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
            Ordenes Activas
          </h2>
          <div className="space-y-3">
            {dashboard.activeWorkOrders.slice(0, 3).map((wo) => {
              const vehicle = dashboard.vehicles.find((v) => v.id === wo.vehicleId);
              return (
                <div
                  key={wo.id}
                  className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">OT #{wo.orderNumber}</span>
                      <StatusBadge status={wo.status} />
                    </div>
                    {wo.priority === 'HIGH' && (
                      <span className="text-[10px] font-bold text-red-400 uppercase">Urgente</span>
                    )}
                  </div>
                  {vehicle && (
                    <p className="text-sm font-medium text-white mb-1">
                      {vehicle.brand} {vehicle.model} {vehicle.year}
                    </p>
                  )}
                  {wo.description && (
                    <p className="text-xs text-slate-400 line-clamp-1 mb-3">{wo.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Progreso</span>
                    <span className="font-semibold text-blue-400">{wo.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${wo.progress}%` }}
                    />
                  </div>
                  {wo.dueDate && (
                    <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                      <IconCalendar className="w-3.5 h-3.5" />
                      Entrega: {new Date(wo.dueDate).toLocaleDateString('es-CL')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pending Quotations */}
      {dashboard.quotations.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
            Cotizaciones
          </h2>
          <div className="space-y-2">
            {dashboard.quotations.slice(0, 5).map((q) => (
              <div
                key={q.id}
                className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">Cotizacion #{q.quoteNumber}</p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(q.createdAt).toLocaleDateString('es-CL')}
                  </p>
                </div>
                <div className="text-right">
                  {q.total != null && (
                    <p className="text-sm font-bold text-white">{formatCLP(Number(q.total))}</p>
                  )}
                  <StatusBadge status={q.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Invoices */}
      {dashboard.recentInvoices.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">
            Facturas Recientes
          </h2>
          <div className="space-y-2">
            {dashboard.recentInvoices.slice(0, 5).map((inv) => (
              <div
                key={inv.id}
                className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {dteLabels[inv.dteType] || 'DTE'} #{inv.folio}
                  </p>
                  <p className="text-[11px] text-slate-500">{inv.issueDate}</p>
                </div>
                <StatusBadge
                  status={inv.status}
                  map={{ pagada: 'Pagada', pendiente: 'Pendiente' }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pull to refresh hint */}
      <button
        onClick={onRefresh}
        className="w-full py-3 text-xs text-slate-500 hover:text-slate-400 transition-colors text-center"
      >
        Toca para actualizar
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: Vehiculos (vehicles + work order detail)
// ══════════════════════════════════════════════════════════════════════════════

function TabVehiculos({ dashboard }: { dashboard: DashboardData }) {
  const [selectedWO, setSelectedWO] = useState<WorkOrderDetail | null>(null);
  const [loadingWO, setLoadingWO] = useState(false);

  async function openWorkOrder(id: string) {
    setLoadingWO(true);
    try {
      const data = await portalApi.get(`/portal/work-orders/${id}`);
      setSelectedWO(data);
    } catch {
      // silent
    } finally {
      setLoadingWO(false);
    }
  }

  // ── Work Order Detail View ──
  if (selectedWO) {
    return (
      <div>
        <BackButton onClick={() => setSelectedWO(null)} />

        <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-700/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-mono">OT #{selectedWO.orderNumber}</p>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  {selectedWO.vehicle
                    ? `${selectedWO.vehicle.brand} ${selectedWO.vehicle.model} ${selectedWO.vehicle.year}`
                    : `Orden #${selectedWO.orderNumber}`}
                </h2>
                {selectedWO.vehicle?.plate && (
                  <p className="text-sm text-slate-400">Patente: {selectedWO.vehicle.plate}</p>
                )}
              </div>
              <StatusBadge status={selectedWO.status} />
            </div>
          </div>

          {/* Progress */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400 font-medium">Progreso</span>
              <span className="text-blue-400 font-bold text-lg">{selectedWO.progress}%</span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-600 to-blue-400 h-3 rounded-full transition-all duration-700"
                style={{ width: `${selectedWO.progress}%` }}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="px-5 py-4 border-t border-slate-700/30">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
              Estado del Servicio
            </h3>
            <div className="space-y-5 relative">
              {/* Vertical line */}
              <div className="absolute left-3 top-3 bottom-3 w-px bg-slate-700/50" />

              {selectedWO.timeline.map((step, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                      step.completed
                        ? 'bg-blue-500 shadow-lg shadow-blue-500/30'
                        : 'bg-slate-700 border-2 border-slate-600'
                    }`}
                  >
                    {step.completed ? (
                      <IconCheck className="w-3 h-3 text-white" />
                    ) : (
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 pb-1">
                    <p
                      className={`text-sm font-medium ${
                        step.completed ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(step.date).toLocaleString('es-CL', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Parts Status */}
          {selectedWO.partsStatus.total > 0 && (
            <div className="px-5 py-4 border-t border-slate-700/30">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Estado de Repuestos
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-emerald-400">
                    {selectedWO.partsStatus.received}
                  </p>
                  <p className="text-[10px] text-emerald-400/70 font-medium">Recibidos</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-400">
                    {selectedWO.partsStatus.ordered}
                  </p>
                  <p className="text-[10px] text-amber-400/70 font-medium">Pedidos</p>
                </div>
                <div className="bg-slate-500/10 border border-slate-600/30 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-slate-300">
                    {selectedWO.partsStatus.pending}
                  </p>
                  <p className="text-[10px] text-slate-400/70 font-medium">Pendientes</p>
                </div>
              </div>
            </div>
          )}

          {/* Description / Diagnosis */}
          {(selectedWO.description || selectedWO.diagnosis) && (
            <div className="px-5 py-4 border-t border-slate-700/30">
              {selectedWO.description && (
                <div className="mb-3">
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
                    Descripcion
                  </p>
                  <p className="text-sm text-slate-300">{selectedWO.description}</p>
                </div>
              )}
              {selectedWO.diagnosis && (
                <div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
                    Diagnostico
                  </p>
                  <p className="text-sm text-slate-300">{selectedWO.diagnosis}</p>
                </div>
              )}
            </div>
          )}

          {/* Estimated Delivery */}
          {selectedWO.dueDate && (
            <div className="px-5 py-4 border-t border-slate-700/30 bg-blue-500/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <IconCalendar className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-[11px] text-blue-400/70 font-medium">
                    Fecha estimada de entrega
                  </p>
                  <p className="text-sm font-bold text-blue-300">
                    {new Date(selectedWO.dueDate).toLocaleDateString('es-CL', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vehicle List ──
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-white">Mis Vehiculos</h1>

      {dashboard.vehicles.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-10 text-center">
          <IconCar className="w-14 h-14 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No hay vehiculos registrados</p>
        </div>
      ) : (
        dashboard.vehicles.map((v) => {
          const vehicleOrders = dashboard.activeWorkOrders.filter(
            (wo) => wo.vehicleId === v.id,
          );
          return (
            <div
              key={v.id}
              className="bg-slate-800/60 border border-slate-700/40 rounded-2xl overflow-hidden"
            >
              {/* Vehicle Header */}
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <IconCar className="w-7 h-7 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-base">
                    {v.brand} {v.model} {v.year}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                    {v.plate && (
                      <span className="bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded font-mono text-[11px]">
                        {v.plate}
                      </span>
                    )}
                    {v.color && <span>{v.color}</span>}
                    <span>{v.mileage?.toLocaleString('es-CL') || 0} km</span>
                  </div>
                </div>
              </div>

              {/* Work Orders for this vehicle */}
              {vehicleOrders.length > 0 ? (
                vehicleOrders.map((wo) => (
                  <div
                    key={wo.id}
                    className="mx-4 mb-4 bg-slate-900/50 border border-slate-700/30 rounded-xl p-4 cursor-pointer active:bg-slate-700/30 transition-colors"
                    onClick={() => openWorkOrder(wo.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500 font-mono">
                        OT #{wo.orderNumber}
                      </span>
                      <StatusBadge status={wo.status} />
                    </div>
                    {wo.description && (
                      <p className="text-sm text-slate-300 mb-3 line-clamp-2">
                        {wo.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500">Progreso</span>
                      <span className="font-semibold text-blue-400">{wo.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-blue-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${wo.progress}%` }}
                      />
                    </div>
                    {wo.dueDate && (
                      <p className="text-[11px] text-slate-500 mt-2">
                        Entrega: {new Date(wo.dueDate).toLocaleDateString('es-CL')}
                      </p>
                    )}
                    <p className="text-xs text-blue-400 mt-2.5 font-medium">
                      Ver detalle completo &rarr;
                    </p>
                  </div>
                ))
              ) : (
                <div className="mx-4 mb-4 bg-slate-900/30 rounded-xl p-4 text-center">
                  <p className="text-sm text-slate-500">Sin ordenes activas</p>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Loading overlay */}
      {loadingWO && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 flex flex-col items-center">
            <Spinner size="lg" />
            <p className="text-sm text-slate-400 mt-3">Cargando orden...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: Mensajes (Tickets + Chat)
// ══════════════════════════════════════════════════════════════════════════════

function TabMensajes({ onRefreshDashboard }: { onRefreshDashboard: () => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    subject: '',
    category: 'GENERAL',
    message: '',
  });
  const [creatingTicket, setCreatingTicket] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const data = await portalApi.get('/portal/tickets');
      setTickets(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function openChat(ticketId: string) {
    setSelectedTicketId(ticketId);
    try {
      const data = await portalApi.get(`/portal/tickets/${ticketId}/messages`);
      setTicketData(data.ticket);
      setMessages(data.messages);
      // Mark as read
      await portalApi.post(`/portal/tickets/${ticketId}/mark-read`, {}).catch(() => {});
      onRefreshDashboard();
    } catch {
      setMessages([]);
    }
  }

  async function sendMessage() {
    if (!selectedTicketId || !newMessage.trim()) return;
    setSending(true);
    try {
      await portalApi.post(`/portal/tickets/${selectedTicketId}/messages`, {
        message: newMessage.trim(),
      });
      setNewMessage('');
      // Refresh messages
      const data = await portalApi.get(`/portal/tickets/${selectedTicketId}/messages`);
      setMessages(data.messages);
      setTicketData(data.ticket);
      fetchTickets();
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  async function createTicket() {
    if (!newTicketForm.subject.trim() || !newTicketForm.message.trim()) return;
    setCreatingTicket(true);
    try {
      await portalApi.post('/portal/tickets', {
        subject: newTicketForm.subject.trim(),
        category: newTicketForm.category,
        message: newTicketForm.message.trim(),
      });
      setShowNewTicket(false);
      setNewTicketForm({ subject: '', category: 'GENERAL', message: '' });
      fetchTickets();
      onRefreshDashboard();
    } catch {
      // silent
    } finally {
      setCreatingTicket(false);
    }
  }

  // ── Chat View ──
  if (selectedTicketId && ticketData) {
    return (
      <div className="flex flex-col" style={{ height: 'calc(100dvh - 140px)' }}>
        {/* Chat Header */}
        <div className="bg-slate-800/80 border border-slate-700/40 rounded-t-2xl px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => {
              setSelectedTicketId(null);
              setTicketData(null);
              setMessages([]);
            }}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {ticketData.subject}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-slate-500 font-mono">
                {ticketData.ticketNumber}
              </span>
              <StatusBadge status={ticketData.status} />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 bg-[#0b1120] border-x border-slate-700/40 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">Sin mensajes aun</p>
          )}
          {messages.map((m) => {
            const isClient = m.senderType === 'CLIENT';
            return (
              <div key={m.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${
                    isClient
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-bl-md'
                  }`}
                >
                  <p
                    className={`text-[10px] font-semibold mb-0.5 ${
                      isClient ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {isClient ? 'Tu' : m.senderName}
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.message}</p>
                  {m.attachmentUrl && (
                    <a
                      href={m.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-[11px] underline mt-1 inline-block ${
                        isClient ? 'text-blue-200' : 'text-blue-400'
                      }`}
                    >
                      Ver adjunto
                    </a>
                  )}
                  <p
                    className={`text-[10px] mt-1 ${
                      isClient ? 'text-blue-300/60' : 'text-slate-500'
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleString('es-CL', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {ticketData.status !== 'CLOSED' ? (
          <div className="bg-slate-800/80 border border-slate-700/40 border-t-0 rounded-b-2xl px-3 py-3 flex items-center gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              className="flex-1 px-4 py-2.5 rounded-full bg-slate-900/60 border border-slate-700/40 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
              placeholder="Escribir mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              {sending ? <Spinner size="sm" /> : <IconSend className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/40 rounded-b-2xl border border-slate-700/40 border-t-0 px-4 py-3 text-center text-sm text-slate-500">
            Este ticket esta cerrado
          </div>
        )}
      </div>
    );
  }

  // ── Ticket List ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Mensajes</h1>
        <button
          onClick={() => setShowNewTicket(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <IconPlus className="w-4 h-4" />
          Nueva Consulta
        </button>
      </div>

      {/* New Ticket Form */}
      {showNewTicket && (
        <div className="bg-slate-800/80 border border-slate-700/40 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-white">Nueva Consulta</h3>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Asunto</label>
            <input
              type="text"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
              placeholder="Ej: Consulta sobre estado de reparacion"
              value={newTicketForm.subject}
              onChange={(e) =>
                setNewTicketForm({ ...newTicketForm, subject: e.target.value })
              }
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Categoria</label>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition appearance-none"
              value={newTicketForm.category}
              onChange={(e) =>
                setNewTicketForm({ ...newTicketForm, category: e.target.value })
              }
            >
              <option value="GENERAL">Consulta General</option>
              <option value="CONSULTA_ESTADO">Estado del Vehiculo</option>
              <option value="CONSULTA_PRESUPUESTO">Presupuesto</option>
              <option value="RECLAMO">Reclamo</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Mensaje</label>
            <textarea
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition resize-none"
              rows={4}
              placeholder="Describa su consulta..."
              value={newTicketForm.message}
              onChange={(e) =>
                setNewTicketForm({ ...newTicketForm, message: e.target.value })
              }
            />
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={() => {
                setShowNewTicket(false);
                setNewTicketForm({ subject: '', category: 'GENERAL', message: '' });
              }}
              className="flex-1 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={createTicket}
              disabled={
                creatingTicket ||
                !newTicketForm.subject.trim() ||
                !newTicketForm.message.trim()
              }
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {creatingTicket ? <Spinner size="sm" /> : null}
              {creatingTicket ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}

      {/* Ticket List */}
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-10 text-center">
          <IconChat className="w-14 h-14 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No tiene consultas aun</p>
          <p className="text-xs text-slate-500 mt-1">
            Use &quot;Nueva Consulta&quot; para enviar un mensaje al taller
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3.5 cursor-pointer active:bg-slate-700/40 transition-colors"
              onClick={() => openChat(t.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      {t.subject}
                    </p>
                    {t.unreadCount > 0 && (
                      <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {t.ticketNumber}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {categoryLabels[t.category] || t.category}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={t.status} />
                  <span className="text-[10px] text-slate-500">
                    {new Date(t.updatedAt).toLocaleDateString('es-CL')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: Informes (Request Paid Reports)
// ══════════════════════════════════════════════════════════════════════════════

function TabInformes() {
  const [reportType, setReportType] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const reportOptions = [
    {
      value: 'INSPECCION_VEHICULAR',
      label: 'Informe de Gestion',
      description:
        'Revision integral del estado mecanico, electrico y de carroceria. Incluye recomendaciones de mantenimiento preventivo.',
      price: 25000,
      tier: 'standard' as const,
    },
    {
      value: 'DIAGNOSTICO_TECNICO',
      label: 'Informe por Reclamo / Falencia',
      description:
        'Analisis tecnico detallado para respaldar un reclamo formal. Incluye diagnostico, evidencia fotografica y conclusion profesional.',
      price: 45000,
      tier: 'premium' as const,
    },
    {
      value: 'VALUACION',
      label: 'Incumplimiento de Mercado',
      description:
        'Peritaje completo con comparativa de mercado. Documento con validez para procesos legales y arbitrajes.',
      price: 65000,
      tier: 'premium' as const,
    },
  ];

  async function handleSubmit() {
    if (!reportType) return;
    setSubmitting(true);
    setError('');
    try {
      // The backend route is POST /portal/tickets/:id/request-report
      // The :id param is not consumed by the handler, so we pass "new" as placeholder
      await portalApi.post('/portal/tickets/new/request-report', {
        reportType,
        notes: notes.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Error al solicitar el informe');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <IconCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-white">Solicitud Enviada</h3>
        <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">
          Su solicitud de informe ha sido recibida. El equipo tecnico se pondra en contacto
          a traves del sistema de mensajes para confirmar detalles y coordinar el pago.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setReportType('');
            setNotes('');
          }}
          className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors text-sm"
        >
          Solicitar Otro Informe
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-white">Solicitar Informe</h1>
        <p className="text-sm text-slate-400 mt-1">
          Informes tecnicos profesionales elaborados por nuestro equipo de especialistas.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Report Options */}
      <div className="space-y-3">
        {reportOptions.map((opt) => {
          const isSelected = reportType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setReportType(opt.value)}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                isSelected
                  ? 'border-blue-500/60 bg-blue-500/10'
                  : 'border-slate-700/40 bg-slate-800/60 hover:border-slate-600/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-white">{opt.label}</p>
                    {opt.tier === 'premium' && (
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
                        Premium
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{opt.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-white">{formatCLP(opt.price)}</p>
                  <p className="text-[10px] text-slate-500">CLP</p>
                </div>
              </div>
              {/* Selection indicator */}
              <div className="flex items-center gap-2 mt-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {isSelected && <IconCheck className="w-3 h-3 text-white" />}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isSelected ? 'text-blue-400' : 'text-slate-500'
                  }`}
                >
                  {isSelected ? 'Seleccionado' : 'Seleccionar'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Notas adicionales (opcional)
        </label>
        <textarea
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition resize-none"
          rows={3}
          placeholder="Describa detalles adicionales sobre el informe que necesita..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
        />
        <p className="text-[10px] text-slate-600 text-right mt-1">{notes.length}/500</p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !reportType}
        className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
      >
        {submitting ? <Spinner size="sm" /> : null}
        {submitting ? 'Enviando solicitud...' : 'Solicitar Informe'}
      </button>

      {/* Info note */}
      <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-3">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Una vez enviada la solicitud, nuestro equipo se comunicara con usted a traves del
          sistema de mensajes para confirmar los detalles, coordinar el pago y acordar los
          plazos de entrega del informe.
        </p>
      </div>
    </div>
  );
}

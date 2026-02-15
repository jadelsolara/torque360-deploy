'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Employee {
  id: string;
  rut: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  nationality: string;
  maritalStatus: string;
  address: string;
  comuna: string;
  city: string;
  phone: string;
  personalEmail: string;
  employeeCode: string;
  hireDate: string;
  terminationDate: string | null;
  contractType: string;
  position: string;
  department: string;
  workSchedule: string;
  weeklyHours: number;
  baseSalary: number;
  gratificationType: string;
  colacionAmount: number;
  movilizacionAmount: number;
  healthSystem: string;
  isapre: string;
  isapreCode: string;
  isaprePlanUf: number;
  fonasaTramo: string;
  afpName: string;
  afpCode: string;
  afpRate: number;
  isAfpVoluntary: boolean;
  voluntaryAfpAmount: number;
  seguroCesantiaType: string;
  apvAmount: number;
  familyAllowanceTramo: string;
  numberOfDependents: number;
  isActive: boolean;
}

interface PayrollHeader {
  id: string;
  period: string;
  status: string;
  totalHaberes: number;
  totalDescuentos: number;
  totalLiquido: number;
  totalCostoEmpresa: number;
  employeeCount: number;
  ufValue: number;
  utmValue: number;
  ingresoMinimo: number;
  calculatedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  paidAt: string | null;
}

interface PayrollDetailLine {
  id: string;
  employeeId: string;
  employee: { firstName: string; lastName: string; rut: string };
  sueldoBase: number;
  gratificacion: number;
  horasExtra: number;
  montoHorasExtra: number;
  bonos: number;
  comisiones: number;
  colacion: number;
  movilizacion: number;
  otrosHaberes: number;
  totalImponible: number;
  totalNoImponible: number;
  totalHaberes: number;
  afpRate: number;
  afpAmount: number;
  saludRate: number;
  saludAmount: number;
  saludAdicionalIsapre: number;
  seguroCesantiaRate: number;
  seguroCesantiaAmount: number;
  impuestoUnico: number;
  apvAmount: number;
  anticipos: number;
  prestamos: number;
  otrosDescuentos: number;
  totalDescuentos: number;
  seguroCesantiaEmpleador: number;
  sis: number;
  mutualidad: number;
  totalCostoEmpleador: number;
  sueldoLiquido: number;
  costoTotalEmpresa: number;
  daysWorked: number;
  daysAbsent: number;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: { firstName: string; lastName: string; rut: string };
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hoursWorked: number;
  type: string;
  notes: string;
}

interface PayrollMonthSummary {
  period: string;
  status: string;
  employeeCount: number;
  totalHaberes: number;
  totalDescuentos: number;
  totalLiquido: number;
  totalCostoEmpresa: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const AFP_OPTIONS: Record<string, number> = {
  CAPITAL: 11.44,
  CUPRUM: 11.44,
  HABITAT: 11.27,
  MODELO: 10.58,
  PLANVITAL: 11.16,
  PROVIDA: 11.45,
  UNO: 10.69,
};

const CONTRACT_LABELS: Record<string, string> = {
  INDEFINIDO: 'Indefinido',
  PLAZO_FIJO: 'Plazo Fijo',
  POR_OBRA: 'Por Obra',
  HONORARIOS: 'Honorarios',
};

const PAYROLL_STATUS_BADGE: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  DRAFT: 'default',
  CALCULATED: 'info',
  APPROVED: 'primary',
  PAID: 'success',
  VOIDED: 'error',
};

const PAYROLL_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  CALCULATED: 'Calculada',
  APPROVED: 'Aprobada',
  PAID: 'Pagada',
  VOIDED: 'Anulada',
};

const ATTENDANCE_TYPE_LABELS: Record<string, string> = {
  NORMAL: 'Normal',
  HORA_EXTRA: 'Hora Extra',
  FERIADO: 'Feriado',
  LICENCIA_MEDICA: 'Licencia Medica',
  VACACIONES: 'Vacaciones',
  PERMISO: 'Permiso',
};

const ATTENDANCE_TYPE_BADGE: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  NORMAL: 'default',
  HORA_EXTRA: 'warning',
  FERIADO: 'info',
  LICENCIA_MEDICA: 'error',
  VACACIONES: 'success',
  PERMISO: 'primary',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
}

function formatPercent(rate: number): string {
  return `${Number(rate).toFixed(2)}%`;
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Select Component (inline, no external dep)
// ═══════════════════════════════════════════════════════════════════════════════

function Select({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = 'empleados' | 'nomina' | 'asistencia' | 'reportes';

export default function RrhhPage() {
  const [activeTab, setActiveTab] = useState<TabId>('empleados');

  const tabs: { id: TabId; label: string }[] = [
    { id: 'empleados', label: 'Empleados' },
    { id: 'nomina', label: 'Nomina' },
    { id: 'asistencia', label: 'Asistencia' },
    { id: 'reportes', label: 'Reportes' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">RRHH y Nominas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestion de empleados, nominas con calculo de obligaciones legales chilenas, asistencia y reportes.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <nav className="flex gap-0 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'empleados' && <EmpleadosTab />}
      {activeTab === 'nomina' && <NominaTab />}
      {activeTab === 'asistencia' && <AsistenciaTab />}
      {activeTab === 'reportes' && <ReportesTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLEADOS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function EmpleadosTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [headcount, setHeadcount] = useState<{ total: number; active: number; inactive: number; byContractType: Record<string, number> } | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<Employee[]>('/rrhh/employees');
      setEmployees(data);
      const hc = await api.get<any>('/rrhh/employees/headcount');
      setHeadcount(hc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.rut.toLowerCase().includes(q) ||
        (e.position || '').toLowerCase().includes(q) ||
        (e.department || '').toLowerCase().includes(q)
    );
  }, [employees, search]);

  const handleSaved = () => {
    setShowForm(false);
    setEditingEmployee(null);
    fetchEmployees();
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      {headcount && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardBody>
              <p className="text-xs font-medium text-slate-500 uppercase">Total</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{headcount.total}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs font-medium text-slate-500 uppercase">Activos</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{headcount.active}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs font-medium text-slate-500 uppercase">Inactivos</p>
              <p className="text-2xl font-bold text-slate-400 mt-1">{headcount.inactive}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs font-medium text-slate-500 uppercase">Contratos</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(headcount.byContractType).map(([k, v]) => (
                  <Badge key={k} variant="info">{CONTRACT_LABELS[k] || k}: {v}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <Input
            placeholder="Buscar por nombre, RUT, cargo, departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={() => { setEditingEmployee(null); setShowForm(true); }}>
            + Nuevo Empleado
          </Button>
        </CardBody>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <EmployeeFormModal
          employee={editingEmployee}
          onClose={() => { setShowForm(false); setEditingEmployee(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Employee Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50">RUT</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50">Nombre</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50 hidden md:table-cell">Cargo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50 hidden md:table-cell">Departamento</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50 hidden lg:table-cell">Contrato</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50 hidden lg:table-cell">Sueldo Base</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50 hidden xl:table-cell">AFP</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50 hidden xl:table-cell">Salud</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 bg-slate-50">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 bg-slate-50">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Cargando...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-red-500">{error}</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">No hay empleados registrados</td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="border-b border-[var(--color-border)] hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{emp.rut}</td>
                    <td className="px-4 py-3">{emp.firstName} {emp.lastName}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600">{emp.position || '-'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600">{emp.department || '-'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Badge variant="info">{CONTRACT_LABELS[emp.contractType] || emp.contractType}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-right font-medium">{formatCLP(Number(emp.baseSalary))}</td>
                    <td className="px-4 py-3 hidden xl:table-cell text-slate-600">{emp.afpName || '-'} ({formatPercent(emp.afpRate)})</td>
                    <td className="px-4 py-3 hidden xl:table-cell text-slate-600">
                      {emp.healthSystem === 'ISAPRE' ? emp.isapre || 'Isapre' : 'Fonasa'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={emp.isActive ? 'success' : 'default'}>
                        {emp.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingEmployee(emp); setShowForm(true); }}>
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Employee Form Modal
// ═══════════════════════════════════════════════════════════════════════════════

function EmployeeFormModal({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!employee;

  const [form, setForm] = useState({
    rut: employee?.rut || '',
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    birthDate: employee?.birthDate?.split('T')[0] || '',
    gender: employee?.gender || '',
    nationality: employee?.nationality || 'Chilena',
    maritalStatus: employee?.maritalStatus || '',
    address: employee?.address || '',
    comuna: employee?.comuna || '',
    city: employee?.city || '',
    phone: employee?.phone || '',
    personalEmail: employee?.personalEmail || '',
    employeeCode: employee?.employeeCode || '',
    hireDate: employee?.hireDate?.split('T')[0] || '',
    contractType: employee?.contractType || 'INDEFINIDO',
    position: employee?.position || '',
    department: employee?.department || '',
    workSchedule: employee?.workSchedule || 'FULL_TIME',
    weeklyHours: employee?.weeklyHours || 45,
    baseSalary: employee?.baseSalary || 0,
    gratificationType: employee?.gratificationType || 'ARTICULO_47',
    colacionAmount: employee?.colacionAmount || 0,
    movilizacionAmount: employee?.movilizacionAmount || 0,
    healthSystem: employee?.healthSystem || 'FONASA',
    isapre: employee?.isapre || '',
    isapreCode: employee?.isapreCode || '',
    isaprePlanUf: employee?.isaprePlanUf || 0,
    fonasaTramo: employee?.fonasaTramo || 'B',
    afpName: employee?.afpName || 'HABITAT',
    afpRate: employee?.afpRate || AFP_OPTIONS['HABITAT'],
    apvAmount: employee?.apvAmount || 0,
    familyAllowanceTramo: employee?.familyAllowanceTramo || '',
    numberOfDependents: employee?.numberOfDependents || 0,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'afpName') {
        next.afpRate = AFP_OPTIONS[value] || 0;
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError('');
      const payload = {
        ...form,
        baseSalary: Number(form.baseSalary),
        colacionAmount: Number(form.colacionAmount),
        movilizacionAmount: Number(form.movilizacionAmount),
        isaprePlanUf: Number(form.isaprePlanUf),
        afpRate: Number(form.afpRate),
        apvAmount: Number(form.apvAmount),
        weeklyHours: Number(form.weeklyHours),
        numberOfDependents: Number(form.numberOfDependents),
      };

      if (isEdit) {
        await api.patch(`/rrhh/employees/${employee.id}`, payload);
      } else {
        await api.post('/rrhh/employees', payload);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">
            {isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>

        <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Personal */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Datos Personales</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="RUT" value={form.rut} onChange={(e) => handleChange('rut', e.target.value)} placeholder="12.345.678-9" />
              <Input label="Nombre" value={form.firstName} onChange={(e) => handleChange('firstName', e.target.value)} />
              <Input label="Apellido" value={form.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
              <Input label="Fecha Nacimiento" type="date" value={form.birthDate} onChange={(e) => handleChange('birthDate', e.target.value)} />
              <Select label="Genero" value={form.gender} onChange={(v) => handleChange('gender', v)} options={[
                { value: '', label: 'Seleccionar...' },
                { value: 'MASCULINO', label: 'Masculino' },
                { value: 'FEMENINO', label: 'Femenino' },
                { value: 'OTRO', label: 'Otro' },
              ]} />
              <Select label="Estado Civil" value={form.maritalStatus} onChange={(v) => handleChange('maritalStatus', v)} options={[
                { value: '', label: 'Seleccionar...' },
                { value: 'SOLTERO', label: 'Soltero/a' },
                { value: 'CASADO', label: 'Casado/a' },
                { value: 'DIVORCIADO', label: 'Divorciado/a' },
                { value: 'VIUDO', label: 'Viudo/a' },
                { value: 'UNION_CIVIL', label: 'Union Civil' },
              ]} />
              <Input label="Telefono" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
              <Input label="Email Personal" type="email" value={form.personalEmail} onChange={(e) => handleChange('personalEmail', e.target.value)} />
              <Input label="Nacionalidad" value={form.nationality} onChange={(e) => handleChange('nationality', e.target.value)} />
              <Input label="Direccion" value={form.address} onChange={(e) => handleChange('address', e.target.value)} />
              <Input label="Comuna" value={form.comuna} onChange={(e) => handleChange('comuna', e.target.value)} />
              <Input label="Ciudad" value={form.city} onChange={(e) => handleChange('city', e.target.value)} />
            </div>
          </div>

          {/* Employment */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Datos Laborales</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="Codigo Empleado" value={form.employeeCode} onChange={(e) => handleChange('employeeCode', e.target.value)} />
              <Input label="Fecha Ingreso" type="date" value={form.hireDate} onChange={(e) => handleChange('hireDate', e.target.value)} />
              <Select label="Tipo Contrato" value={form.contractType} onChange={(v) => handleChange('contractType', v)} options={[
                { value: 'INDEFINIDO', label: 'Indefinido' },
                { value: 'PLAZO_FIJO', label: 'Plazo Fijo' },
                { value: 'POR_OBRA', label: 'Por Obra' },
                { value: 'HONORARIOS', label: 'Honorarios' },
              ]} />
              <Input label="Cargo" value={form.position} onChange={(e) => handleChange('position', e.target.value)} />
              <Input label="Departamento" value={form.department} onChange={(e) => handleChange('department', e.target.value)} />
              <Select label="Jornada" value={form.workSchedule} onChange={(v) => handleChange('workSchedule', v)} options={[
                { value: 'FULL_TIME', label: 'Completa' },
                { value: 'PART_TIME', label: 'Parcial' },
              ]} />
              <Input label="Horas Semanales" type="number" value={String(form.weeklyHours)} onChange={(e) => handleChange('weeklyHours', Number(e.target.value))} />
            </div>
          </div>

          {/* Compensation */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Remuneracion</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="Sueldo Base (CLP)" type="number" value={String(form.baseSalary)} onChange={(e) => handleChange('baseSalary', Number(e.target.value))} />
              <Select label="Gratificacion" value={form.gratificationType} onChange={(v) => handleChange('gratificationType', v)} options={[
                { value: 'ARTICULO_47', label: 'Art. 47 (Tope 4.75 IMM)' },
                { value: 'ARTICULO_50', label: 'Art. 50 (30% Utilidades)' },
              ]} />
              <Input label="Colacion (CLP)" type="number" value={String(form.colacionAmount)} onChange={(e) => handleChange('colacionAmount', Number(e.target.value))} />
              <Input label="Movilizacion (CLP)" type="number" value={String(form.movilizacionAmount)} onChange={(e) => handleChange('movilizacionAmount', Number(e.target.value))} />
            </div>
          </div>

          {/* Health */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Salud</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select label="Sistema de Salud" value={form.healthSystem} onChange={(v) => handleChange('healthSystem', v)} options={[
                { value: 'FONASA', label: 'Fonasa' },
                { value: 'ISAPRE', label: 'Isapre' },
              ]} />
              {form.healthSystem === 'FONASA' && (
                <Select label="Tramo Fonasa" value={form.fonasaTramo} onChange={(v) => handleChange('fonasaTramo', v)} options={[
                  { value: 'A', label: 'Tramo A' },
                  { value: 'B', label: 'Tramo B' },
                  { value: 'C', label: 'Tramo C' },
                  { value: 'D', label: 'Tramo D' },
                ]} />
              )}
              {form.healthSystem === 'ISAPRE' && (
                <>
                  <Input label="Nombre Isapre" value={form.isapre} onChange={(e) => handleChange('isapre', e.target.value)} />
                  <Input label="Plan Isapre (UF)" type="number" step="0.0001" value={String(form.isaprePlanUf)} onChange={(e) => handleChange('isaprePlanUf', Number(e.target.value))} />
                </>
              )}
            </div>
          </div>

          {/* Pension */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Pension (AFP)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select label="AFP" value={form.afpName} onChange={(v) => handleChange('afpName', v)} options={[
                { value: '', label: 'Seleccionar...' },
                ...Object.keys(AFP_OPTIONS).map((k) => ({ value: k, label: `${k} (${AFP_OPTIONS[k]}%)` })),
              ]} />
              <Input label="Tasa AFP (%)" type="number" step="0.01" value={String(form.afpRate)} onChange={(e) => handleChange('afpRate', Number(e.target.value))} />
              <Input label="APV (CLP)" type="number" value={String(form.apvAmount)} onChange={(e) => handleChange('apvAmount', Number(e.target.value))} />
            </div>
          </div>

          {/* Other */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">Otros</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select label="Tramo Asignacion Familiar" value={form.familyAllowanceTramo} onChange={(v) => handleChange('familyAllowanceTramo', v)} options={[
                { value: '', label: 'Sin asignacion' },
                { value: 'A', label: 'Tramo A' },
                { value: 'B', label: 'Tramo B' },
                { value: 'C', label: 'Tramo C' },
                { value: 'D', label: 'Tramo D' },
              ]} />
              <Input label="N. Cargas" type="number" value={String(form.numberOfDependents)} onChange={(e) => handleChange('numberOfDependents', Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={handleSubmit}>
            {isEdit ? 'Guardar Cambios' : 'Crear Empleado'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOMINA TAB
// ═══════════════════════════════════════════════════════════════════════════════

function NominaTab() {
  const [payrolls, setPayrolls] = useState<PayrollHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<string | null>(null);
  const [details, setDetails] = useState<PayrollDetailLine[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create form state
  const [newPeriod, setNewPeriod] = useState(currentPeriod());
  const [newUf, setNewUf] = useState('38000');
  const [newUtm, setNewUtm] = useState('66000');
  const [newImm, setNewImm] = useState('500000');

  const fetchPayrolls = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get<PayrollHeader[]>('/rrhh/payroll');
      setPayrolls(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar nominas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayrolls(); }, [fetchPayrolls]);

  const fetchDetails = async (payrollId: string) => {
    try {
      setDetailsLoading(true);
      const data = await api.get<{ payroll: PayrollHeader; details: PayrollDetailLine[] }>(`/rrhh/payroll/${payrollId}/details`);
      setDetails(data.details);
      setSelectedPayroll(payrollId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar detalles');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setActionLoading('create');
      await api.post('/rrhh/payroll', {
        period: newPeriod,
        ufValue: Number(newUf),
        utmValue: Number(newUtm),
        ingresoMinimo: Number(newImm),
      });
      setShowCreateForm(false);
      fetchPayrolls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear nomina');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCalculate = async (payrollId: string) => {
    try {
      setActionLoading(`calc-${payrollId}`);
      await api.post(`/rrhh/payroll/${payrollId}/calculate`, {});
      fetchPayrolls();
      if (selectedPayroll === payrollId) fetchDetails(payrollId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al calcular');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (payrollId: string) => {
    try {
      setActionLoading(`approve-${payrollId}`);
      await api.patch(`/rrhh/payroll/${payrollId}/approve`, {});
      fetchPayrolls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al aprobar');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePay = async (payrollId: string) => {
    try {
      setActionLoading(`pay-${payrollId}`);
      await api.patch(`/rrhh/payroll/${payrollId}/pay`, {});
      fetchPayrolls();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al marcar como pagada');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVoid = async (payrollId: string) => {
    if (!confirm('Seguro que desea anular esta nomina?')) return;
    try {
      setActionLoading(`void-${payrollId}`);
      await api.patch(`/rrhh/payroll/${payrollId}/void`, {});
      fetchPayrolls();
      if (selectedPayroll === payrollId) { setSelectedPayroll(null); setDetails([]); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al anular');
    } finally {
      setActionLoading(null);
    }
  };

  const selectedPayrollData = payrolls.find((p) => p.id === selectedPayroll);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      {/* Create Payroll */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between">
          {showCreateForm ? (
            <div className="flex flex-wrap gap-3 items-end w-full">
              <Input label="Periodo" value={newPeriod} onChange={(e) => setNewPeriod(e.target.value)} placeholder="2026-02" className="w-32" />
              <Input label="UF ($)" value={newUf} onChange={(e) => setNewUf(e.target.value)} type="number" className="w-32" />
              <Input label="UTM ($)" value={newUtm} onChange={(e) => setNewUtm(e.target.value)} type="number" className="w-32" />
              <Input label="IMM ($)" value={newImm} onChange={(e) => setNewImm(e.target.value)} type="number" className="w-32" />
              <Button loading={actionLoading === 'create'} onClick={handleCreate}>Crear Nomina</Button>
              <Button variant="ghost" onClick={() => setShowCreateForm(false)}>Cancelar</Button>
            </div>
          ) : (
            <>
              <div>
                <h3 className="font-semibold text-slate-800">Nominas</h3>
                <p className="text-xs text-slate-500">Crear, calcular, aprobar y pagar nominas mensuales</p>
              </div>
              <Button onClick={() => setShowCreateForm(true)}>+ Nueva Nomina</Button>
            </>
          )}
        </CardBody>
      </Card>

      {/* Payroll List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50">Periodo</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 bg-slate-50">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 bg-slate-50 hidden md:table-cell">Empleados</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50 hidden md:table-cell">Total Haberes</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50 hidden lg:table-cell">Total Descuentos</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50">Total Liquido</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50 hidden lg:table-cell">Costo Empresa</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 bg-slate-50">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">Cargando...</td>
                </tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">No hay nominas creadas</td>
                </tr>
              ) : (
                payrolls.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-[var(--color-border)] hover:bg-slate-50 transition-colors cursor-pointer ${selectedPayroll === p.id ? 'bg-blue-50' : ''}`}
                    onClick={() => fetchDetails(p.id)}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{p.period}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={PAYROLL_STATUS_BADGE[p.status] || 'default'}>
                        {PAYROLL_STATUS_LABEL[p.status] || p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">{p.employeeCount}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">{formatCLP(Number(p.totalHaberes))}</td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell text-red-600">{formatCLP(Number(p.totalDescuentos))}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCLP(Number(p.totalLiquido))}</td>
                    <td className="px-4 py-3 text-right hidden lg:table-cell text-slate-600">{formatCLP(Number(p.totalCostoEmpresa))}</td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 justify-center flex-wrap">
                        {(p.status === 'DRAFT' || p.status === 'CALCULATED') && (
                          <Button size="sm" variant="primary" loading={actionLoading === `calc-${p.id}`} onClick={() => handleCalculate(p.id)}>
                            Calcular
                          </Button>
                        )}
                        {p.status === 'CALCULATED' && (
                          <Button size="sm" variant="secondary" loading={actionLoading === `approve-${p.id}`} onClick={() => handleApprove(p.id)}>
                            Aprobar
                          </Button>
                        )}
                        {p.status === 'APPROVED' && (
                          <Button size="sm" variant="primary" loading={actionLoading === `pay-${p.id}`} onClick={() => handlePay(p.id)}>
                            Pagar
                          </Button>
                        )}
                        {p.status !== 'PAID' && p.status !== 'VOIDED' && (
                          <Button size="sm" variant="danger" loading={actionLoading === `void-${p.id}`} onClick={() => handleVoid(p.id)}>
                            Anular
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payroll Details */}
      {selectedPayroll && selectedPayrollData && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">
                Detalle Nomina {selectedPayrollData.period}
                <Badge variant={PAYROLL_STATUS_BADGE[selectedPayrollData.status] || 'default'} className="ml-2">
                  {PAYROLL_STATUS_LABEL[selectedPayrollData.status] || selectedPayrollData.status}
                </Badge>
              </h3>
              <div className="text-xs text-slate-500 space-x-4">
                <span>UF: {formatCLP(Number(selectedPayrollData.ufValue))}</span>
                <span>UTM: {formatCLP(Number(selectedPayrollData.utmValue))}</span>
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50">Empleado</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50">Sueldo Base</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50 hidden md:table-cell">Total Haberes</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50 hidden md:table-cell">AFP</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50 hidden lg:table-cell">Salud</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50 hidden lg:table-cell">Impuesto</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50">Total Desc.</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50">Liquido</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600 bg-slate-50 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {detailsLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">Cargando detalles...</td>
                  </tr>
                ) : details.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">Sin lineas de detalle. Presione &quot;Calcular&quot; para generar.</td>
                  </tr>
                ) : (
                  details.map((d) => (
                    <>
                      <tr
                        key={d.id}
                        className="border-b border-[var(--color-border)] hover:bg-slate-50 cursor-pointer"
                        onClick={() => setExpandedLine(expandedLine === d.id ? null : d.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{d.employee?.firstName} {d.employee?.lastName}</div>
                          <div className="text-xs text-slate-500">{d.employee?.rut}</div>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCLP(Number(d.sueldoBase))}</td>
                        <td className="px-4 py-3 text-right hidden md:table-cell">{formatCLP(Number(d.totalHaberes))}</td>
                        <td className="px-4 py-3 text-right hidden md:table-cell text-red-600">{formatCLP(Number(d.afpAmount))}</td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell text-red-600">{formatCLP(Number(d.saludAmount) + Number(d.saludAdicionalIsapre))}</td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell text-red-600">{formatCLP(Number(d.impuestoUnico))}</td>
                        <td className="px-4 py-3 text-right text-red-600 font-medium">{formatCLP(Number(d.totalDescuentos))}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCLP(Number(d.sueldoLiquido))}</td>
                        <td className="px-4 py-3 text-center text-slate-400">{expandedLine === d.id ? '-' : '+'}</td>
                      </tr>
                      {expandedLine === d.id && (
                        <tr key={`${d.id}-detail`} className="bg-slate-50">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                              {/* Haberes */}
                              <div>
                                <h4 className="font-semibold text-slate-700 mb-2 uppercase">Haberes</h4>
                                <div className="space-y-1">
                                  <div className="flex justify-between"><span>Sueldo Base</span><span>{formatCLP(Number(d.sueldoBase))}</span></div>
                                  <div className="flex justify-between"><span>Gratificacion</span><span>{formatCLP(Number(d.gratificacion))}</span></div>
                                  {Number(d.montoHorasExtra) > 0 && <div className="flex justify-between"><span>Horas Extra ({d.horasExtra}h)</span><span>{formatCLP(Number(d.montoHorasExtra))}</span></div>}
                                  {Number(d.bonos) > 0 && <div className="flex justify-between"><span>Bonos</span><span>{formatCLP(Number(d.bonos))}</span></div>}
                                  {Number(d.comisiones) > 0 && <div className="flex justify-between"><span>Comisiones</span><span>{formatCLP(Number(d.comisiones))}</span></div>}
                                  {Number(d.colacion) > 0 && <div className="flex justify-between text-slate-500"><span>Colacion (no imp.)</span><span>{formatCLP(Number(d.colacion))}</span></div>}
                                  {Number(d.movilizacion) > 0 && <div className="flex justify-between text-slate-500"><span>Movilizacion (no imp.)</span><span>{formatCLP(Number(d.movilizacion))}</span></div>}
                                  <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total Imponible</span><span>{formatCLP(Number(d.totalImponible))}</span></div>
                                  <div className="flex justify-between font-semibold"><span>Total Haberes</span><span>{formatCLP(Number(d.totalHaberes))}</span></div>
                                </div>
                              </div>
                              {/* Descuentos */}
                              <div>
                                <h4 className="font-semibold text-red-700 mb-2 uppercase">Descuentos</h4>
                                <div className="space-y-1">
                                  <div className="flex justify-between"><span>AFP ({formatPercent(d.afpRate)})</span><span className="text-red-600">{formatCLP(Number(d.afpAmount))}</span></div>
                                  <div className="flex justify-between"><span>Salud ({formatPercent(d.saludRate)})</span><span className="text-red-600">{formatCLP(Number(d.saludAmount))}</span></div>
                                  {Number(d.saludAdicionalIsapre) > 0 && <div className="flex justify-between"><span>Adicional Isapre</span><span className="text-red-600">{formatCLP(Number(d.saludAdicionalIsapre))}</span></div>}
                                  <div className="flex justify-between"><span>Seguro Cesantia ({formatPercent(d.seguroCesantiaRate)})</span><span className="text-red-600">{formatCLP(Number(d.seguroCesantiaAmount))}</span></div>
                                  <div className="flex justify-between"><span>Impuesto Unico</span><span className="text-red-600">{formatCLP(Number(d.impuestoUnico))}</span></div>
                                  {Number(d.apvAmount) > 0 && <div className="flex justify-between"><span>APV</span><span className="text-red-600">{formatCLP(Number(d.apvAmount))}</span></div>}
                                  {Number(d.anticipos) > 0 && <div className="flex justify-between"><span>Anticipos</span><span className="text-red-600">{formatCLP(Number(d.anticipos))}</span></div>}
                                  {Number(d.prestamos) > 0 && <div className="flex justify-between"><span>Prestamos</span><span className="text-red-600">{formatCLP(Number(d.prestamos))}</span></div>}
                                  <div className="flex justify-between font-semibold border-t pt-1 mt-1 text-red-700"><span>Total Descuentos</span><span>{formatCLP(Number(d.totalDescuentos))}</span></div>
                                </div>
                              </div>
                              {/* Aportes y Resultado */}
                              <div>
                                <h4 className="font-semibold text-slate-700 mb-2 uppercase">Aportes Empleador</h4>
                                <div className="space-y-1">
                                  <div className="flex justify-between"><span>Seg. Cesantia Empleador</span><span>{formatCLP(Number(d.seguroCesantiaEmpleador))}</span></div>
                                  <div className="flex justify-between"><span>SIS (1.53%)</span><span>{formatCLP(Number(d.sis))}</span></div>
                                  <div className="flex justify-between"><span>Mutualidad</span><span>{formatCLP(Number(d.mutualidad))}</span></div>
                                  <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total Costo Empleador</span><span>{formatCLP(Number(d.totalCostoEmpleador))}</span></div>
                                </div>
                                <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                                  <div className="flex justify-between font-bold text-emerald-800 text-sm">
                                    <span>SUELDO LIQUIDO</span>
                                    <span>{formatCLP(Number(d.sueldoLiquido))}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-600 mt-1">
                                    <span>Costo Total Empresa</span>
                                    <span>{formatCLP(Number(d.costoTotalEmpresa))}</span>
                                  </div>
                                </div>
                                <div className="mt-2 text-slate-500">
                                  Dias trabajados: {d.daysWorked} | Ausencias: {d.daysAbsent}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASISTENCIA TAB
// ═══════════════════════════════════════════════════════════════════════════════

function AsistenciaTab() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState(currentPeriod());
  const [filterEmployee, setFilterEmployee] = useState('');

  // Form state
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCheckIn, setFormCheckIn] = useState('08:00');
  const [formCheckOut, setFormCheckOut] = useState('17:00');
  const [formType, setFormType] = useState('NORMAL');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [attData, empData] = await Promise.all([
        api.get<AttendanceRecord[]>(`/rrhh/attendance?period=${filterPeriod}${filterEmployee ? `&employeeId=${filterEmployee}` : ''}`),
        api.get<Employee[]>('/rrhh/employees?isActive=true'),
      ]);
      setRecords(attData);
      setEmployees(empData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar asistencia');
    } finally {
      setLoading(false);
    }
  }, [filterPeriod, filterEmployee]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await api.post('/rrhh/attendance', {
        employeeId: formEmployeeId,
        date: formDate,
        checkIn: formType === 'NORMAL' || formType === 'HORA_EXTRA' ? `${formDate}T${formCheckIn}:00` : undefined,
        checkOut: formType === 'NORMAL' || formType === 'HORA_EXTRA' ? `${formDate}T${formCheckOut}:00` : undefined,
        type: formType,
        notes: formNotes || undefined,
      });
      setShowForm(false);
      setFormNotes('');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">&times;</button>
        </div>
      )}

      {/* Toolbar */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between">
          <div className="flex flex-wrap gap-3 items-end">
            <Input label="Periodo" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} placeholder="YYYY-MM" className="w-32" />
            <Select
              label="Empleado"
              value={filterEmployee}
              onChange={(v) => setFilterEmployee(v)}
              options={[
                { value: '', label: 'Todos' },
                ...employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })),
              ]}
              className="w-48"
            />
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cerrar' : '+ Registrar'}
          </Button>
        </CardBody>
      </Card>

      {/* Record Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-800">Nuevo Registro de Asistencia</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select
                label="Empleado"
                value={formEmployeeId}
                onChange={(v) => setFormEmployeeId(v)}
                options={[
                  { value: '', label: 'Seleccionar...' },
                  ...employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName} (${e.rut})` })),
                ]}
              />
              <Input label="Fecha" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              <Select label="Tipo" value={formType} onChange={(v) => setFormType(v)} options={[
                { value: 'NORMAL', label: 'Normal' },
                { value: 'HORA_EXTRA', label: 'Hora Extra' },
                { value: 'FERIADO', label: 'Feriado' },
                { value: 'LICENCIA_MEDICA', label: 'Licencia Medica' },
                { value: 'VACACIONES', label: 'Vacaciones' },
                { value: 'PERMISO', label: 'Permiso' },
              ]} />
              {(formType === 'NORMAL' || formType === 'HORA_EXTRA') && (
                <>
                  <Input label="Entrada" type="time" value={formCheckIn} onChange={(e) => setFormCheckIn(e.target.value)} />
                  <Input label="Salida" type="time" value={formCheckOut} onChange={(e) => setFormCheckOut(e.target.value)} />
                </>
              )}
              <Input label="Notas" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>
            <div className="mt-3 flex justify-end">
              <Button loading={saving} onClick={handleSave} disabled={!formEmployeeId}>Guardar Registro</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Records Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50">Empleado</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 bg-slate-50">Tipo</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 bg-slate-50 hidden md:table-cell">Entrada</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600 bg-slate-50 hidden md:table-cell">Salida</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50">Horas</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50 hidden lg:table-cell">Notas</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">Cargando...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">No hay registros de asistencia para este periodo</td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--color-border)] hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{new Date(r.date).toLocaleDateString('es-CL')}</td>
                    <td className="px-4 py-3">
                      {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={ATTENDANCE_TYPE_BADGE[r.type] || 'default'}>
                        {ATTENDANCE_TYPE_LABELS[r.type] || r.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {r.checkIn ? new Date(r.checkIn).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      {r.checkOut ? new Date(r.checkOut).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">{Number(r.hoursWorked).toFixed(1)}h</td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{r.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTES TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ReportesTab() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [summary, setSummary] = useState<{
    year: string;
    months: PayrollMonthSummary[];
    totals: { totalHaberes: number; totalDescuentos: number; totalLiquido: number; totalCostoEmpresa: number };
  } | null>(null);
  const [departments, setDepartments] = useState<{ department: string; count: number }[]>([]);
  const [headcount, setHeadcount] = useState<{ total: number; active: number; inactive: number; byContractType: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const [sumData, deptData, hcData] = await Promise.all([
        api.get<any>(`/rrhh/payroll/summary?year=${year}`),
        api.get<any>('/rrhh/employees/by-department'),
        api.get<any>('/rrhh/employees/headcount'),
      ]);
      setSummary(sumData);
      setDepartments(deptData);
      setHeadcount(hcData);
    } catch {
      // Silently handle — empty data is fine for reports
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const maxCosto = summary?.months?.length
    ? Math.max(...summary.months.map((m) => m.totalCostoEmpresa), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <Card>
        <CardBody className="flex items-center gap-4">
          <h3 className="font-semibold text-slate-800">Reportes Anuales</h3>
          <Input value={year} onChange={(e) => setYear(e.target.value)} className="w-24" placeholder="YYYY" />
        </CardBody>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Cargando reportes...</div>
      ) : (
        <>
          {/* Headcount & Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Headcount */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-800">Dotacion</h3>
              </CardHeader>
              <CardBody>
                {headcount && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total empleados</span>
                      <span className="font-bold text-slate-800">{headcount.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600">Activos</span>
                      <span className="font-bold text-emerald-700">{headcount.active}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Inactivos</span>
                      <span className="font-bold text-slate-400">{headcount.inactive}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs font-medium text-slate-500 mb-2">Por tipo de contrato:</p>
                      {Object.entries(headcount.byContractType).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm">
                          <span className="text-slate-600">{CONTRACT_LABELS[k] || k}</span>
                          <span className="font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Department distribution */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-slate-800">Por Departamento</h3>
              </CardHeader>
              <CardBody>
                {departments.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin datos</p>
                ) : (
                  <div className="space-y-2">
                    {departments.map((d) => {
                      const maxCount = Math.max(...departments.map((dd) => dd.count), 1);
                      const widthPct = (d.count / maxCount) * 100;
                      return (
                        <div key={d.department}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-700">{d.department}</span>
                            <span className="font-medium text-slate-800">{d.count}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-[var(--color-primary)] h-2 rounded-full transition-all"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Annual Payroll Summary */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-slate-800">Resumen Nomina Anual {year}</h3>
            </CardHeader>
            {summary && summary.months.length > 0 ? (
              <>
                {/* Simple bar chart */}
                <CardBody>
                  <div className="flex items-end gap-2 h-48">
                    {summary.months.map((m) => {
                      const heightPct = (m.totalCostoEmpresa / maxCosto) * 100;
                      const monthIdx = parseInt(m.period.split('-')[1], 10) - 1;
                      return (
                        <div key={m.period} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] text-slate-500">{formatCLP(m.totalLiquido)}</span>
                          <div className="w-full flex flex-col gap-0.5" style={{ height: `${Math.max(heightPct, 5)}%` }}>
                            <div className="flex-1 bg-[var(--color-primary)] rounded-t-sm" title={`Liquido: ${formatCLP(m.totalLiquido)}`} />
                          </div>
                          <span className="text-xs text-slate-600 font-medium">{MONTH_NAMES[monthIdx]}</span>
                          <Badge variant={PAYROLL_STATUS_BADGE[m.status] || 'default'} className="text-[9px]">
                            {PAYROLL_STATUS_LABEL[m.status]?.substring(0, 4) || m.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>

                {/* Detailed table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 bg-slate-50">Mes</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-600 bg-slate-50">Estado</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-600 bg-slate-50 hidden md:table-cell">Emp.</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50">Haberes</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50">Descuentos</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50">Liquido</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-slate-50">Costo Empresa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.months.map((m) => {
                        const monthIdx = parseInt(m.period.split('-')[1], 10) - 1;
                        return (
                          <tr key={m.period} className="border-b border-[var(--color-border)] hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium">{MONTH_NAMES[monthIdx]} {year}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant={PAYROLL_STATUS_BADGE[m.status] || 'default'}>
                                {PAYROLL_STATUS_LABEL[m.status] || m.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center hidden md:table-cell">{m.employeeCount}</td>
                            <td className="px-4 py-3 text-right">{formatCLP(m.totalHaberes)}</td>
                            <td className="px-4 py-3 text-right text-red-600">{formatCLP(m.totalDescuentos)}</td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatCLP(m.totalLiquido)}</td>
                            <td className="px-4 py-3 text-right text-slate-600">{formatCLP(m.totalCostoEmpresa)}</td>
                          </tr>
                        );
                      })}
                      {/* Totals row */}
                      <tr className="bg-slate-100 font-bold">
                        <td className="px-4 py-3" colSpan={3}>TOTAL ANUAL</td>
                        <td className="px-4 py-3 text-right">{formatCLP(summary.totals.totalHaberes)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{formatCLP(summary.totals.totalDescuentos)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700">{formatCLP(summary.totals.totalLiquido)}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatCLP(summary.totals.totalCostoEmpresa)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <CardBody>
                <p className="text-sm text-slate-400 text-center py-8">No hay nominas para el anio {year}</p>
              </CardBody>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

interface StepProgress {
  stepId: string;
  title: string;
  description: string;
  type: 'TOUR' | 'INFO' | 'INTERACTIVE';
  completed: boolean;
  completedAt: string | null;
  skipped: boolean;
}

interface ModuleProgress {
  moduleId: string;
  moduleName: string;
  description: string;
  icon: string;
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  percentage: number;
  steps: StepProgress[];
}

interface FullProgress {
  activated: boolean;
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  overallPercentage: number;
  modules: ModuleProgress[];
}

interface TrainingStep {
  id: string;
  title: string;
  description: string;
  type: 'TOUR' | 'INFO' | 'INTERACTIVE';
}

interface TrainingModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredRole: string;
  steps: TrainingStep[];
}

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

const STEP_TYPE_CONFIG: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' }> = {
  TOUR: { label: 'Tour', variant: 'primary' },
  INFO: { label: 'Info', variant: 'success' },
  INTERACTIVE: { label: 'Interactivo', variant: 'warning' },
};

const MODULE_ICONS: Record<string, string> = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  'work-orders': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM9 13h6v2H9v-2zm0 4h6v2H9v-2z',
  inventory: 'M20 2H4c-1.1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-.9-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z',
  clients: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  receivables: 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z',
  suppliers: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z',
  hr: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  imports: 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z',
};

// ═══════════════════════════════════════════════════════════════════
//  Progress Ring Component
// ═══════════════════════════════════════════════════════════════════

function ProgressRing({ percentage, size = 120 }: { percentage: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 80 ? '#10b981' :
    percentage >= 40 ? '#f59e0b' :
    '#94a3b8';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-slate-800">{percentage}%</span>
        <span className="text-xs text-slate-500">completado</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Progress Bar Component
// ═══════════════════════════════════════════════════════════════════

function ProgressBar({ percentage }: { percentage: number }) {
  const color =
    percentage >= 80 ? 'bg-emerald-500' :
    percentage >= 40 ? 'bg-amber-500' :
    'bg-slate-300';

  return (
    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{
          width: `${percentage}%`,
          transition: 'width 0.6s ease-in-out',
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Module Icon Component
// ═══════════════════════════════════════════════════════════════════

function ModuleIcon({ icon, className = '' }: { icon: string; className?: string }) {
  const path = MODULE_ICONS[icon] || MODULE_ICONS.dashboard;
  return (
    <svg
      className={`w-6 h-6 ${className}`}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d={path} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Module Card Component
// ═══════════════════════════════════════════════════════════════════

function ModuleCard({
  module,
  onClick,
}: {
  module: ModuleProgress;
  onClick: () => void;
}) {
  const borderColor =
    module.percentage >= 80 ? 'border-l-emerald-500' :
    module.percentage >= 40 ? 'border-l-amber-500' :
    'border-l-slate-300';

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left bg-white rounded-xl border border-[var(--color-border)]
        shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200
        border-l-4 ${borderColor}
      `}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <ModuleIcon icon={module.icon} className="text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{module.moduleName}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{module.description}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-slate-600">
              {module.completedSteps}/{module.totalSteps} pasos completados
            </span>
            <span className="text-sm font-medium text-slate-700">{module.percentage}%</span>
          </div>
          <ProgressBar percentage={module.percentage} />
        </div>

        {module.skippedSteps > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            {module.skippedSteps} paso{module.skippedSteps > 1 ? 's' : ''} saltado{module.skippedSteps > 1 ? 's' : ''}
          </p>
        )}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Step Item Component
// ═══════════════════════════════════════════════════════════════════

function StepItem({
  step,
  moduleId,
  onComplete,
  onSkip,
  loading,
}: {
  step: StepProgress;
  moduleId: string;
  onComplete: (moduleId: string, stepId: string) => void;
  onSkip: (moduleId: string, stepId: string) => void;
  loading: boolean;
}) {
  const typeConfig = STEP_TYPE_CONFIG[step.type] || STEP_TYPE_CONFIG.INFO;

  return (
    <div
      className={`
        flex items-start gap-4 p-4 rounded-lg border transition-colors duration-200
        ${step.completed
          ? 'bg-emerald-50 border-emerald-200'
          : step.skipped
            ? 'bg-slate-50 border-slate-200 opacity-60'
            : 'bg-white border-[var(--color-border)] hover:border-slate-300'
        }
      `}
    >
      {/* Checkbox */}
      <button
        onClick={() => !step.completed && !loading && onComplete(moduleId, step.stepId)}
        disabled={step.completed || loading}
        className={`
          mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
          transition-colors duration-200
          ${step.completed
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-slate-300 hover:border-emerald-400'
          }
          ${step.completed || loading ? 'cursor-default' : 'cursor-pointer'}
        `}
      >
        {step.completed && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium ${step.completed ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>
            {step.title}
          </span>
          <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
          {step.skipped && <Badge variant="default">Saltado</Badge>}
        </div>
        <p className="text-sm text-slate-500 mt-1">{step.description}</p>
        {step.completedAt && (
          <p className="text-xs text-emerald-600 mt-1">
            Completado el {new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(step.completedAt))}
          </p>
        )}
      </div>

      {/* Skip button */}
      {!step.completed && !step.skipped && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSkip(moduleId, step.stepId)}
          disabled={loading}
        >
          Saltar
        </Button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Module Detail View
// ═══════════════════════════════════════════════════════════════════

function ModuleDetail({
  module,
  onBack,
  onComplete,
  onSkip,
  onReset,
  loading,
}: {
  module: ModuleProgress;
  onBack: () => void;
  onComplete: (moduleId: string, stepId: string) => void;
  onSkip: (moduleId: string, stepId: string) => void;
  onReset: (moduleId: string) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-slate-100 rounded-lg">
            <ModuleIcon icon={module.icon} className="text-slate-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{module.moduleName}</h2>
            <p className="text-sm text-slate-500">{module.description}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onReset(module.moduleId)}
          disabled={loading}
        >
          Reiniciar Modulo
        </Button>
      </div>

      {/* Progress */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">
                {module.completedSteps} de {module.totalSteps} pasos completados
              </p>
              {module.skippedSteps > 0 && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {module.skippedSteps} saltado{module.skippedSteps > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <span className="text-lg font-bold text-slate-700">{module.percentage}%</span>
          </div>
          <div className="mt-3">
            <ProgressBar percentage={module.percentage} />
          </div>
        </CardBody>
      </Card>

      {/* Steps */}
      <div className="space-y-3">
        {module.steps.map((step, idx) => (
          <div key={step.stepId} className="flex items-start gap-3">
            <div className="flex flex-col items-center mt-5">
              <span className="text-xs font-medium text-slate-400 w-6 text-center">{idx + 1}</span>
            </div>
            <div className="flex-1">
              <StepItem
                step={step}
                moduleId={module.moduleId}
                onComplete={onComplete}
                onSkip={onSkip}
                loading={loading}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Not Activated View
// ═══════════════════════════════════════════════════════════════════

function NotActivatedView({
  modules,
  onActivate,
  loading,
}: {
  modules: TrainingModule[];
  onActivate: () => void;
  loading: boolean;
}) {
  const totalSteps = modules.reduce((sum, m) => sum + m.steps.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Centro de Capacitacion</h1>
      </div>

      <Card>
        <CardBody className="py-12">
          <div className="text-center max-w-lg mx-auto">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Capacitacion disponible
            </h2>
            <p className="text-slate-500 mb-6">
              Activa el sistema de capacitacion para entrenar a tu equipo en cada modulo del ERP.
              Incluye {modules.length} modulos con {totalSteps} pasos guiados.
            </p>
            <Button onClick={onActivate} loading={loading} size="lg">
              Activar Capacitacion
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Preview of available modules */}
      <div>
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Modulos disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod) => (
            <Card key={mod.id}>
              <CardBody>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <ModuleIcon icon={mod.icon} className="text-slate-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">{mod.name}</h4>
                    <p className="text-xs text-slate-400">{mod.steps.length} pasos</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">{mod.description}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Main Page Component
// ═══════════════════════════════════════════════════════════════════

export default function CapacitacionPage() {
  const [progress, setProgress] = useState<FullProgress | null>(null);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    setError('');
    try {
      const [progressData, modulesData] = await Promise.all([
        api.get<FullProgress>('/onboarding/progress'),
        api.get<TrainingModule[]>('/onboarding/modules'),
      ]);
      setProgress(progressData);
      setModules(modulesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos de capacitacion');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Activate onboarding ──
  const handleActivate = async () => {
    setActionLoading(true);
    setError('');
    try {
      await api.post('/onboarding/activate');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al activar capacitacion');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Deactivate onboarding ──
  const handleDeactivate = async () => {
    if (!confirm('Esto eliminara todo tu progreso de capacitacion. Continuar?')) return;
    setActionLoading(true);
    setError('');
    try {
      await api.post('/onboarding/deactivate');
      setSelectedModule(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desactivar capacitacion');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Complete step ──
  const handleComplete = async (moduleId: string, stepId: string) => {
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/onboarding/${moduleId}/${stepId}/complete`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al completar paso');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Skip step ──
  const handleSkip = async (moduleId: string, stepId: string) => {
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/onboarding/${moduleId}/${stepId}/skip`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al saltar paso');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Reset module ──
  const handleReset = async (moduleId: string) => {
    if (!confirm('Esto reiniciara todo el progreso de este modulo. Continuar?')) return;
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/onboarding/${moduleId}/reset`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reiniciar modulo');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Cargando capacitacion...</p>
        </div>
      </div>
    );
  }

  // ── Not activated ──
  if (progress && !progress.activated) {
    return (
      <>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}
        <NotActivatedView
          modules={modules}
          onActivate={handleActivate}
          loading={actionLoading}
        />
      </>
    );
  }

  // ── Module detail view ──
  if (selectedModule && progress) {
    const moduleData = progress.modules.find((m) => m.moduleId === selectedModule);
    if (moduleData) {
      return (
        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}
          <ModuleDetail
            module={moduleData}
            onBack={() => setSelectedModule(null)}
            onComplete={handleComplete}
            onSkip={handleSkip}
            onReset={handleReset}
            loading={actionLoading}
          />
        </div>
      );
    }
  }

  // ── Overview (main view) ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Centro de Capacitacion</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeactivate}
          disabled={actionLoading}
        >
          Desactivar Capacitacion
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Overall Progress */}
      {progress && (
        <Card>
          <CardBody>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ProgressRing percentage={progress.overallPercentage} />
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg font-semibold text-slate-800 mb-1">Progreso General</h2>
                <p className="text-slate-500">
                  {progress.completedSteps} de {progress.totalSteps} pasos completados
                  {progress.skippedSteps > 0 && ` (${progress.skippedSteps} saltados)`}
                </p>
                <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-600">Completados ({progress.completedSteps})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                    <span className="text-xs text-slate-600">Pendientes ({progress.totalSteps - progress.completedSteps - progress.skippedSteps})</span>
                  </div>
                  {progress.skippedSteps > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <span className="text-xs text-slate-600">Saltados ({progress.skippedSteps})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Module Cards Grid */}
      {progress && (
        <div>
          <h3 className="text-lg font-semibold text-slate-700 mb-3">Modulos de Capacitacion</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {progress.modules.map((mod) => (
              <ModuleCard
                key={mod.moduleId}
                module={mod}
                onClick={() => setSelectedModule(mod.moduleId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

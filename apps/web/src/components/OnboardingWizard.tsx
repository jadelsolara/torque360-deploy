'use client';

import { useState, useCallback } from 'react';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: { key: string; label: string; placeholder: string; type?: string; required?: boolean }[];
}

const STEPS: WizardStep[] = [
  {
    id: 'workshop',
    title: 'Crear tu taller',
    description: 'Configura la información básica de tu taller automotriz.',
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
        />
      </svg>
    ),
    fields: [
      {
        key: 'workshopName',
        label: 'Nombre del taller',
        placeholder: 'Ej: Taller Automotriz Central',
        required: true,
      },
      {
        key: 'workshopAddress',
        label: 'Dirección',
        placeholder: 'Av. Principal 1234',
        required: true,
      },
      { key: 'workshopPhone', label: 'Teléfono', placeholder: '+56 9 1234 5678', type: 'tel' },
      { key: 'workshopRut', label: 'RUT empresa', placeholder: '76.123.456-7' },
    ],
  },
  {
    id: 'services',
    title: 'Agregar servicios',
    description: 'Selecciona los servicios que ofrece tu taller.',
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
    fields: [],
  },
  {
    id: 'work-order',
    title: 'Primera orden de trabajo',
    description: 'Crea tu primera OT para familiarizarte con el flujo.',
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
    fields: [
      { key: 'clientName', label: 'Nombre del cliente', placeholder: 'Juan Pérez', required: true },
      { key: 'vehiclePlate', label: 'Patente', placeholder: 'AB-CD-12', required: true },
      { key: 'vehicleBrand', label: 'Marca', placeholder: 'Toyota' },
      {
        key: 'serviceDescription',
        label: 'Descripción del servicio',
        placeholder: 'Cambio de aceite y filtros',
      },
    ],
  },
  {
    id: 'team',
    title: 'Invitar equipo',
    description: 'Agrega a los miembros de tu equipo para colaborar.',
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        />
      </svg>
    ),
    fields: [
      {
        key: 'memberEmail1',
        label: 'Email del miembro',
        placeholder: 'mecanico@taller.cl',
        type: 'email',
      },
      { key: 'memberRole1', label: 'Rol', placeholder: 'OPERATOR' },
      {
        key: 'memberEmail2',
        label: 'Email (opcional)',
        placeholder: 'admin@taller.cl',
        type: 'email',
      },
      { key: 'memberRole2', label: 'Rol (opcional)', placeholder: 'MANAGER' },
    ],
  },
];

const SERVICES = [
  { id: 'oil', label: 'Cambio de aceite', icon: '🛢️' },
  { id: 'brakes', label: 'Frenos', icon: '🔧' },
  { id: 'suspension', label: 'Suspensión', icon: '🔩' },
  { id: 'electrical', label: 'Eléctrico', icon: '⚡' },
  { id: 'tires', label: 'Neumáticos', icon: '🔘' },
  { id: 'alignment', label: 'Alineación y balanceo', icon: '📐' },
  { id: 'engine', label: 'Motor', icon: '🏎️' },
  { id: 'transmission', label: 'Transmisión', icon: '⚙️' },
  { id: 'ac', label: 'Aire acondicionado', icon: '❄️' },
  { id: 'bodywork', label: 'Carrocería y pintura', icon: '🎨' },
  { id: 'diagnostic', label: 'Diagnóstico computarizado', icon: '💻' },
  { id: 'inspection', label: 'Revisión técnica', icon: '✅' },
];

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState(false);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleService = useCallback((id: string) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const canAdvance = () => {
    if (step.id === 'services') return selectedServices.size > 0;
    const required = step.fields.filter((f) => f.required);
    return required.every((f) => formData[f.key]?.trim());
  };

  const handleNext = async () => {
    if (isLast) {
      setCompleting(true);
      try {
        localStorage.setItem('torque_onboarding_complete', 'true');
        onComplete();
      } finally {
        setCompleting(false);
      }
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--color-bg)] dark:bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-[var(--color-border)]">
        {/* Progress bar */}
        <div className="flex gap-1 p-4 pb-0">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= currentStep ? 'bg-[var(--color-primary)]' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 text-xs text-[var(--color-text-muted)]">
          Paso {currentStep + 1} de {STEPS.length}
        </div>

        {/* Header */}
        <div className="px-6 pt-2 pb-4 flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
            {step.icon}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text)]">{step.title}</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{step.description}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 min-h-[260px]">
          {step.id === 'services' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SERVICES.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => toggleService(svc.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors text-left ${
                    selectedServices.has(svc.id)
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  <span className="text-lg">{svc.icon}</span>
                  <span>{svc.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {step.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                    {field.label}
                    {field.required && <span className="text-[var(--color-error)] ml-0.5">*</span>}
                  </label>
                  <input
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={formData[field.key] || ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] dark:bg-[var(--color-surface)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-colors"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <div>
            {isFirst ? (
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                Omitir configuración
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
                Anterior
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance() || completing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {completing ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
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
                Finalizando...
              </>
            ) : isLast ? (
              'Comenzar a usar TORQUE 360'
            ) : (
              <>
                Siguiente
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 4.5l7.5 7.5-7.5 7.5"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

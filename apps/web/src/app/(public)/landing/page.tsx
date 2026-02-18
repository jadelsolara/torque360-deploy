'use client';

import { useState } from 'react';
import Link from 'next/link';

const FEATURES = [
  {
    title: 'Ordenes de Trabajo',
    description:
      'Gestiona el ciclo completo de cada servicio: recepción, diagnóstico, ejecución, entrega.',
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75"
        />
      </svg>
    ),
  },
  {
    title: 'Inventario + WMS',
    description:
      'Control de stock con Costo Promedio Ponderado, bodegas jerárquicas y trazabilidad completa.',
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
        />
      </svg>
    ),
  },
  {
    title: 'Facturación Electrónica',
    description:
      'Integración directa con SII Chile. Boletas, facturas y notas de crédito en un clic.',
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
        />
      </svg>
    ),
  },
  {
    title: 'TORQUE Network',
    description: 'Marketplace B2B: compra y vende repuestos entre talleres de tu red.',
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
        />
      </svg>
    ),
  },
  {
    title: 'RRHH y Nómina',
    description: 'Gestión de empleados, turnos, asistencia y cálculo de remuneraciones.',
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
  },
  {
    title: 'Automatización',
    description:
      'Motor de reglas con operadores avanzados. Automatiza alertas, estados y acciones.',
    icon: (
      <svg
        className="w-7 h-7"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: '$99.000',
    period: '/mes',
    description: 'Para talleres que inician su digitalización.',
    features: [
      '1 usuario',
      'Ordenes de trabajo',
      'Inventario básico',
      'Facturación electrónica',
      'Soporte por email',
    ],
    cta: 'Comenzar gratis',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$199.000',
    period: '/mes',
    description: 'Para talleres en crecimiento con equipo.',
    features: [
      '5 usuarios',
      'Todo en Starter',
      'WMS completo',
      'TORQUE Network',
      'RRHH y nómina',
      'Automatización',
      'Soporte prioritario',
    ],
    cta: 'Probar 14 días gratis',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$399.000',
    period: '/mes',
    description: 'Para redes de talleres y operaciones complejas.',
    features: [
      'Usuarios ilimitados',
      'Todo en Pro',
      'API access',
      'Multi-sucursal',
      'Importaciones',
      'SLA garantizado',
      'Onboarding dedicado',
    ],
    cta: 'Contactar ventas',
    highlight: false,
  },
];

const DEMO_STEPS = [
  { label: 'Recepción', status: 'done' as const },
  { label: 'Diagnóstico', status: 'done' as const },
  { label: 'En reparación', status: 'active' as const },
  { label: 'Control calidad', status: 'pending' as const },
  { label: 'Entrega', status: 'pending' as const },
];

export default function LandingPage() {
  const [activePlan, setActivePlan] = useState(1);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <span className="text-lg font-bold">
              TORQUE <span className="text-blue-400">360</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">
              Funcionalidades
            </a>
            <a href="#demo" className="hover:text-white transition-colors">
              Demo
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              Precios
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-slate-300 hover:text-white transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Probar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            ERP cloud-native para talleres automotrices
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            Tu taller, <span className="text-blue-400">bajo control total</span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
            Ordenes de trabajo, inventario, facturación electrónica, RRHH y marketplace B2B. Todo en
            una plataforma moderna diseñada para talleres en Latinoamérica.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors text-center"
            >
              Comenzar gratis — 14 días
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto px-8 py-3 border border-slate-700 hover:border-slate-500 text-slate-300 font-medium rounded-xl transition-colors text-center"
            >
              Ver demo interactiva
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Sin tarjeta de crédito. Configura tu taller en 5 minutos.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Todo lo que necesita tu taller</h2>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
            Desde la recepción del vehículo hasta la entrega, cada paso está cubierto.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feat) => (
              <div
                key={feat.title}
                className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feat.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section id="demo" className="py-20 px-4 border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Flujo de una Orden de Trabajo</h2>
          <p className="text-slate-400 text-center mb-12">
            Así se ve gestionar un servicio automotriz en TORQUE 360.
          </p>

          {/* Demo OT card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
            {/* OT Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold">OT-2024-0042</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/30">
                    En reparación
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Toyota Hilux 2022 — ABCD-12 — Juan Pérez
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm text-slate-400">Estimado</p>
                <p className="text-lg font-semibold text-emerald-400">$185.000</p>
              </div>
            </div>

            {/* Progress steps */}
            <div className="flex items-center gap-1 mb-8">
              {DEMO_STEPS.map((s, i) => (
                <div key={s.label} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        s.status === 'done'
                          ? 'bg-emerald-500 text-white'
                          : s.status === 'active'
                            ? 'bg-blue-500 text-white ring-4 ring-blue-500/30'
                            : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {s.status === 'done' ? (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    {i < DEMO_STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-1 ${s.status === 'done' ? 'bg-emerald-500' : 'bg-slate-700'}`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-xs ${s.status === 'active' ? 'text-blue-400 font-medium' : 'text-slate-500'}`}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Service lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-sm">Cambio de aceite 10W-40 (5L)</span>
                </div>
                <span className="text-sm text-emerald-400">$35.000</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-sm">Filtro de aceite OEM</span>
                </div>
                <span className="text-sm text-emerald-400">$12.000</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span className="text-sm text-blue-300">Revisión de frenos delanteros</span>
                </div>
                <span className="text-sm text-blue-400">$45.000</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg opacity-50">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-sm">Alineación y balanceo</span>
                </div>
                <span className="text-sm text-slate-400">$40.000</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Precios transparentes</h2>
          <p className="text-slate-400 text-center mb-12">
            Hasta 60% más económico que la competencia. Sin contratos, cancela cuando quieras.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                onClick={() => setActivePlan(i)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                  plan.highlight
                    ? 'bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/30 scale-105'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                {plan.highlight && (
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-500 text-white text-xs font-medium mb-3">
                    Más popular
                  </span>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-slate-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-slate-400 mt-2">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <svg
                        className="w-4 h-4 text-emerald-400 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`mt-6 block w-full py-2.5 rounded-lg text-sm font-medium text-center transition-colors ${
                    plan.highlight
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-slate-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Listo para modernizar tu taller?</h2>
          <p className="text-slate-400 mb-8">
            Únete a los talleres que ya gestionan su operación con TORQUE 360.
          </p>
          <Link
            href="/login"
            className="inline-flex px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>TORQUE 360 — ERP Automotriz</p>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-slate-300 transition-colors">
              Funcionalidades
            </a>
            <a href="#pricing" className="hover:text-slate-300 transition-colors">
              Precios
            </a>
            <Link href="/login" className="hover:text-slate-300 transition-colors">
              Acceder
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setTokens } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    tenantName: '',
    tenantSlug: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-generate slug from tenant name
    if (field === 'tenantName') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData((prev) => ({ ...prev, tenantName: value, tenantSlug: slug }));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || 'Error al registrar la cuenta');
      }

      const data = await response.json();
      setTokens(data.accessToken, data.refreshToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-secondary)]">
            TORQUE <span className="text-[var(--color-primary)]">360</span>
          </h1>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          Crea tu cuenta para comenzar
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nombre del taller"
            type="text"
            placeholder="Mi Taller Automotriz"
            value={formData.tenantName}
            onChange={(e) => updateField('tenantName', e.target.value)}
            required
          />
          <Input
            label="Identificador (slug)"
            type="text"
            placeholder="mi-taller"
            value={formData.tenantSlug}
            onChange={(e) => updateField('tenantSlug', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nombre"
            type="text"
            placeholder="Juan"
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            required
          />
          <Input
            label="Apellido"
            type="text"
            placeholder="Perez"
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            required
          />
        </div>

        <Input
          label="Correo electronico"
          type="email"
          placeholder="tu@correo.com"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
          required
          autoComplete="email"
        />

        <Input
          label="Contrasena"
          type="password"
          placeholder="Minimo 8 caracteres"
          value={formData.password}
          onChange={(e) => updateField('password', e.target.value)}
          required
          autoComplete="new-password"
          minLength={8}
        />

        <Button
          type="submit"
          loading={loading}
          className="w-full"
          size="lg"
        >
          Crear Cuenta
        </Button>
      </form>

      {/* Login link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors"
          >
            Iniciar sesion
          </Link>
        </p>
      </div>
    </div>
  );
}

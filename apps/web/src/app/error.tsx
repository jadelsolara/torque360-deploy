'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-6 text-6xl font-bold text-[var(--color-error)]">!</div>
        <h1 className="mb-2 text-2xl font-semibold text-[var(--color-text)]">
          Algo salió mal
        </h1>
        <p className="mb-6 text-[var(--color-text-muted)]">
          Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-dark)]"
          >
            Intentar de nuevo
          </button>
          <a
            href="/"
            className="rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
          >
            Ir al inicio
          </a>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-[var(--color-text-muted)]">
            Código: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}

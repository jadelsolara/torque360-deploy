import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-4 text-8xl font-bold text-[var(--color-primary)]">404</div>
        <h1 className="mb-2 text-2xl font-semibold text-[var(--color-text)]">
          Página no encontrada
        </h1>
        <p className="mb-6 text-[var(--color-text-muted)]">
          La página que buscas no existe o fue movida.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-dark)]"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

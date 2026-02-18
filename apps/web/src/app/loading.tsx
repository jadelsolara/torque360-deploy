export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    </div>
  );
}

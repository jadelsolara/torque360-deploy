'use client';

import { useLocale } from 'next-intl';

const labels: Record<string, string> = {
  es: 'ES',
  en: 'EN',
};

export default function LocaleSwitcher() {
  const locale = useLocale();

  const switchLocale = (next: string) => {
    document.cookie = `locale=${next};path=/;max-age=31536000;samesite=lax`;
    window.location.reload();
  };

  return (
    <select
      value={locale}
      onChange={(e) => switchLocale(e.target.value)}
      aria-label="Language"
      className="h-8 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]
        px-2 text-xs text-[var(--color-text)] outline-none"
    >
      {Object.entries(labels).map(([code, label]) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}

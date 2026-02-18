'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const initial = stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
    setTheme(initial);
    applyTheme(initial);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') applyTheme('system');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycle = () => {
    const order: Theme[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    localStorage.setItem('theme', next);
    applyTheme(next);
  };

  const icons: Record<Theme, string> = {
    light: '\u2600\uFE0F',
    dark: '\uD83C\uDF19',
    system: '\uD83D\uDCBB',
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${theme}`}
      title={`Theme: ${theme}`}
      className="inline-flex items-center justify-center w-8 h-8 rounded-md
        text-sm transition-colors hover:bg-[var(--color-border)]"
    >
      {icons[theme]}
    </button>
  );
}

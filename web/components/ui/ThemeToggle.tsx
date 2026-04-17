'use client';

import { useEffect, useState } from 'react';

const KEY = 'qf_theme';

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('qf-dark', theme === 'dark');
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem(KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(KEY, next);
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </button>
  );
}

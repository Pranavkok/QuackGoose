'use client';

import { useEffect, useState } from 'react';

const KEY = 'qf_theme';

function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('qf-dark', theme === 'dark');
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    const resolved: 'light' | 'dark' =
      stored === 'dark' || stored === 'light'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

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

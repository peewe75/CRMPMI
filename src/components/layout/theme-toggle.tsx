'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = localStorage.getItem('theme');
    const dark = stored ? stored === 'dark' : prefersDark;
    setIsDark(dark);
    if (dark) document.documentElement.classList.add('dark');
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="rounded-lg p-2 text-muted-foreground transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800"
      aria-label={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

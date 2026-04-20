// SPDX-License-Identifier: MIT
import { createContext, useCallback, useState, type ReactNode } from 'react';

/**
 * Theme system.
 *
 * Centralised theme state with React Context. Any component in the
 * tree can read the current theme or toggle it via `useTheme()`.
 *
 * During prerendering (build time) there is no `document` or
 * `localStorage`, so the provider starts in a safe default state and
 * the no-flash script in `root.tsx` sets the actual theme attribute
 * on `<html>` before hydration. Once the client mounts, the effect
 * below syncs React state to match the DOM attribute — this keeps
 * hydration free of mismatch warnings and guarantees no flash of
 * wrong theme.
 */

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);

const STORAGE_KEY = 'nuance-theme';

function readDOMTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage can be blocked (private mode, sandboxed iframe, etc.).
    // The DOM attribute is authoritative either way.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readDOMTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

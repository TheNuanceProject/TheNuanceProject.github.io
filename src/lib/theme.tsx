// SPDX-License-Identifier: MIT
import { createContext, useCallback, useState, type ReactNode } from 'react';

/**
 * Theme System
 *
 * Centralized theme state with React Context. A component anywhere in
 * the tree can read the current theme or toggle it via useTheme().
 *
 * The initial theme is read from the data-theme attribute on <html>,
 * which is set by the no-flash script in index.html BEFORE React
 * renders. This guarantees no flash of wrong theme on page load.
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

function getInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'light';

  // The no-flash script in index.html has already set this attribute.
  // Reading from it guarantees React's initial state matches what's
  // already visible on screen, preventing any hydration flicker.
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;

  return 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* localStorage may be blocked — fail silently */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

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

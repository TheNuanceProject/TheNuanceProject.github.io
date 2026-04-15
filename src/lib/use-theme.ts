// SPDX-License-Identifier: MIT
import { useContext } from 'react';
import { ThemeContext } from './theme';

/**
 * useTheme — read or toggle the current theme from anywhere.
 *
 * Must be used inside a <ThemeProvider>. Throws a clear error if not,
 * which catches setup mistakes during development.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error(
      'useTheme() must be called inside a <ThemeProvider>. ' +
        'Check that your component tree includes <ThemeProvider> near the root.'
    );
  }
  return ctx;
}

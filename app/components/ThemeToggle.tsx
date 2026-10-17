// SPDX-License-Identifier: MIT
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '~/lib/use-theme';
import { Icon } from './icons/Icon';

/**
 * ThemeToggle: button that switches between light and dark mode.
 *
 * Both icons are always rendered; CSS (the project's `dark:` variant, keyed on
 * the `data-theme` attribute) shows the sun in light mode and the moon in dark
 * mode. Because the visible icon is driven by the attribute, which the
 * no-flash script in `root.tsx` sets before hydration, the correct icon
 * appears on first paint with no flash, and the toggle does not depend on React
 * state at render time, so there is no hydration mismatch. The accessible label
 * is static for the same reason; it describes the control rather than the
 * current state.
 */
export function ThemeToggle() {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Switch between light and dark theme"
      className="
        inline-flex items-center justify-center
        size-(--size-control-lg) rounded-sm
        text-text-tertiary
        hover:text-text
        transition-colors
      "
    >
      <Icon icon={Sun} className="block dark:hidden" />
      <Icon icon={Moon} className="hidden dark:block" />
    </button>
  );
}

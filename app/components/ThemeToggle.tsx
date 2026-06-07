// SPDX-License-Identifier: MIT
import { useTheme } from '~/lib/use-theme';

/**
 * ThemeToggle — button that switches between light and dark mode.
 *
 * Both icons are always rendered; CSS (the project's `dark:` variant, keyed on
 * the `data-theme` attribute) shows the sun in light mode and the moon in dark
 * mode. Because the visible icon is driven by the attribute — which the
 * no-flash script in `root.tsx` sets before hydration — the correct icon
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
        w-8 h-8 rounded
        text-[var(--color-text-mid)]
        hover:text-[var(--color-text-primary)]
        transition-colors duration-150
      "
    >
      <SunIcon className="block dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </button>
  );
}

function SunIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

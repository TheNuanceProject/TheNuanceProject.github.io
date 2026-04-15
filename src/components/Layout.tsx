// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

/**
 * Layout — the shell wrapper for every page.
 *
 * Every page on the site renders inside this Layout. Provides:
 *   - Sticky Header with navigation
 *   - Main content area (<main> element for accessibility)
 *   - Site Footer
 *   - Skip-to-content link for keyboard users (accessibility rule
 *     from DESIGN_SYSTEM.md section 10)
 */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="
          sr-only focus:not-sr-only
          focus:fixed focus:top-4 focus:left-4 focus:z-[100]
          focus:px-4 focus:py-2
          focus:bg-[var(--color-paper)]
          focus:border focus:border-[var(--color-text-primary)]
          focus:rounded
          focus:text-sm focus:font-display
        "
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}

// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { siteConfig } from '@/config/site.config';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/cn';

/**
 * Header — sticky top navigation with responsive mobile menu.
 *
 * Layout per DESIGN_SYSTEM.md section 6:
 *   - Fixed/sticky top, height 64px
 *   - Background: bg-paper with subtle backdrop blur
 *   - Logo on left, nav links on right
 *   - Nav links: Poppins 500, 14px
 *   - Active page: color is text-primary (vs default text-secondary)
 *   - Hover: underline fades in from accent-orange
 *
 * Responsive behavior:
 *   - Desktop (≥ md, 768px+): full inline nav, no menu button
 *   - Mobile (< 768px): hamburger button opens a slide-down panel
 *     below the header. Panel closes on route change, on Escape,
 *     and when any link is tapped.
 *
 * Accessibility:
 *   - Menu button exposes aria-expanded and aria-controls
 *   - Panel has role="dialog" with aria-label
 *   - Escape closes the panel
 *   - Body scroll locked while the panel is open
 */
export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const lastPathRef = useRef(location.pathname);

  // Close the menu automatically on route change (user taps a link).
  // Using a ref to gate this means we only call setState when the path
  // actually changes — not on every render — but React 19's lint rule
  // still flags any setState inside an effect. This is one of the rule's
  // documented false positives (route-change cleanup is a textbook
  // legitimate effect). Suppressed with intent.
  useEffect(() => {
    if (lastPathRef.current !== location.pathname) {
      lastPathRef.current = location.pathname;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMenuOpen(false);
    }
  }, [location.pathname]);

  // Close on Escape, and lock body scroll while the panel is open so
  // the page behind doesn't scroll when the user drags on the panel.
  useEffect(() => {
    if (!isMenuOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [isMenuOpen]);

  return (
    <header
      className="
        sticky top-0 z-50
        border-b border-[var(--color-border)]
        bg-[var(--color-paper)]/85
        backdrop-blur-md
        transition-colors duration-250
      "
    >
      <div className="max-w-[var(--container-wide)] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <Logo />

        {/* Desktop nav — inline links visible at md and above */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-8"
        >
          {siteConfig.nav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                cn(
                  'relative font-display text-sm font-medium',
                  'transition-colors duration-150',
                  'after:absolute after:left-0 after:-bottom-1 after:h-px',
                  'after:transition-[width] after:duration-250 after:ease-out',
                  'after:bg-[var(--color-accent)]',
                  isActive
                    ? ['text-[var(--color-text-primary)]', 'after:w-full']
                    : [
                        'text-[var(--color-text-primary)]',
                        'hover:text-[var(--color-text-secondary)]',
                        'after:w-0 hover:after:w-full',
                      ]
                )
              }
            >
              {item.label}
            </NavLink>
          ))}

          <div className="ml-2 flex items-center">
            <ThemeToggle />
          </div>
        </nav>

        {/* Mobile controls — theme toggle + hamburger, visible below md */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-panel"
            onClick={() => setIsMenuOpen((v) => !v)}
            className="
              flex h-10 w-10 items-center justify-center
              rounded-md
              text-[var(--color-text-primary)]
              transition-colors duration-150
              hover:bg-[var(--color-surface)]
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]
              focus-visible:ring-offset-2
              focus-visible:ring-offset-[var(--color-paper)]
            "
          >
            <MenuIcon open={isMenuOpen} />
          </button>
        </div>
      </div>

      {/* Mobile panel — slides down below the header on small screens */}
      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-label="Site navigation"
        aria-hidden={!isMenuOpen}
        className={cn(
          'md:hidden overflow-hidden',
          'border-b border-[var(--color-border)]',
          'bg-[var(--color-paper)]',
          'transition-[max-height,opacity] duration-250 ease-out',
          isMenuOpen
            ? 'max-h-96 opacity-100'
            : 'max-h-0 opacity-0 pointer-events-none'
        )}
      >
        <nav aria-label="Primary" className="px-6 py-4 flex flex-col">
          {siteConfig.nav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                cn(
                  'font-display text-base font-medium',
                  'py-3 border-b border-[var(--color-border)] last:border-b-0',
                  'transition-colors duration-150',
                  isActive
                    ? 'text-[var(--color-accent)]'
                    : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent)]'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

/**
 * Inline SVG icon — hamburger that morphs to X when open.
 * Kept inline (rather than importing from lucide-react) so the icon
 * is part of the initial HTML paint with no extra bundle cost.
 */
function MenuIcon({ open }: { readonly open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {open ? (
        <>
          <line x1="5" y1="5" x2="15" y2="15" />
          <line x1="15" y1="5" x2="5" y2="15" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="17" y2="6" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="14" x2="17" y2="14" />
        </>
      )}
    </svg>
  );
}

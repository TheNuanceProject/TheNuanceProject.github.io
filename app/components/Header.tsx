// SPDX-License-Identifier: MIT
import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { siteConfig } from '~/config/site.config';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from './CommandPalette';
import { Menu, Search, X } from 'lucide-react';
import { cn } from '~/lib/cn';
import { Icon } from './icons/Icon';

/**
 * Header: sticky top navigation with a responsive mobile menu.
 *
 * Desktop (≥ 768px): inline nav + theme toggle.
 * Mobile (< 768px): hamburger button opens a slide-down panel. The
 * panel closes on route change, on Escape, and when any link is
 * tapped. Body scroll locks while it is open.
 *
 * Accessibility: the menu button exposes aria-expanded and
 * aria-controls; the panel is a dialog; Escape closes it.
 */
export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const location = useLocation();
  const lastPathRef = useRef(location.pathname);

  // Close the menu when the route changes. The ref gate ensures
  // setState runs only on an actual path transition, not every
  // render.
  useEffect(() => {
    if (lastPathRef.current !== location.pathname) {
      lastPathRef.current = location.pathname;
      setIsMenuOpen(false);
      setIsSearchOpen(false);
    }
  }, [location.pathname]);

  // Global Cmd/Ctrl-K toggles the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close on Escape. Lock body scroll while the panel is open so
  // the page behind doesn't scroll when the user drags on it.
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
        border-b border-divider
        bg-paper/85
        backdrop-blur-md
        transition-colors duration-(--duration-slow)
      "
    >
      <div className="max-w-wide mx-auto px-(--web-gutter-phone) md:px-(--web-gutter-tablet) h-16 flex items-center justify-between">
        <Logo />

        {/* Desktop nav: inline links visible at md and above */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-8"
        >
          {siteConfig.nav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              viewTransition
              className={({ isActive }) =>
                cn(
                  'link-underline font-sans text-ui-lg font-medium',
                  'transition-colors',
                  isActive
                    ? 'text-text'
                    : 'text-text hover:text-text-secondary'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}

          <button
            type="button"
            aria-label="Search"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 font-sans text-ui-lg text-text-tertiary hover:text-text transition-colors"
          >
            <Icon icon={Search} />
            <span className="hidden lg:inline font-mono text-mono-sm bg-surface rounded-sm px-1">
              ⌘K
            </span>
          </button>

          <div className="ml-2 flex items-center">
            <ThemeToggle />
          </div>
        </nav>

        {/* Mobile controls: theme toggle + hamburger, visible below md */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setIsSearchOpen(true)}
            className="flex size-(--size-control-lg) items-center justify-center rounded-sm text-text transition-colors hover:bg-divider"
          >
            <Icon icon={Search} size="md" />
          </button>
          <ThemeToggle />
          <button
            type="button"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-panel"
            onClick={() => setIsMenuOpen((v) => !v)}
            className="
              flex size-(--size-control-lg) items-center justify-center
              rounded-sm
              text-text
              transition-colors
              hover:bg-divider
            "
          >
            <Icon icon={isMenuOpen ? X : Menu} size="md" />
          </button>
        </div>
      </div>

      {/* Mobile panel: slides down below the header on small screens */}
      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-label="Site navigation"
        aria-hidden={!isMenuOpen}
        className={cn(
          'md:hidden overflow-hidden',
          'border-b border-divider',
          'bg-paper',
          'transition-[max-height,opacity] duration-(--duration-base) ease-out',
          isMenuOpen
            ? 'max-h-96 opacity-100'
            : 'max-h-0 opacity-0 pointer-events-none'
        )}
      >
        <nav aria-label="Primary" className="px-(--web-gutter-phone) py-4 flex flex-col">
          {siteConfig.nav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              viewTransition
              className={({ isActive }) =>
                cn(
                  'font-sans text-body font-medium',
                  'py-3 border-b border-divider last:border-b-0',
                  'transition-colors',
                  isActive
                    ? 'text-accent-strong'
                    : 'text-text hover:text-accent-strong'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {isSearchOpen && <CommandPalette onClose={closeSearch} />}
    </header>
  );
}

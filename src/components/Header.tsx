// SPDX-License-Identifier: MIT
import { NavLink } from 'react-router-dom';
import { siteConfig } from '@/config/site.config';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/cn';

/**
 * Header — sticky top navigation.
 *
 * Layout per DESIGN_SYSTEM.md section 6:
 *   - Fixed/sticky top, height 64px
 *   - Background: bg-paper with subtle backdrop blur
 *   - Logo on left, nav links on right
 *   - Nav links: Poppins 500, lowercase, 14px
 *   - Active page: color is text-primary (vs default text-mid)
 *   - Hover: link color shifts to accent-orange over 200ms (with
 *     subtle underline appearing)
 */
export function Header() {
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

        <nav className="flex items-center gap-6 md:gap-8">
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
                    ? [
                        'text-[var(--color-text-primary)]',
                        'after:w-full',
                      ]
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

          <div className="ml-1 md:ml-2 flex items-center">
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}

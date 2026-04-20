// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';
import { cn } from '~/lib/cn';

interface ContainerProps {
  /** Width preset — narrow for prose, default for standard pages, wide for hero */
  width?: 'narrow' | 'default' | 'wide';
  /** Additional className */
  className?: string;
  children: ReactNode;
}

/**
 * Container — consistent page-width wrapper with side gutters.
 *
 * Width presets:
 *   - `narrow`  — 720px, for article body and prose
 *   - `default` — 1080px, for standard pages
 *   - `wide`    — 1280px, for hero and multi-column layouts
 *
 * Centralising the gutters means every page uses the same horizontal
 * rhythm; changing them at any breakpoint here updates the site.
 */
export function Container({
  width = 'default',
  className,
  children,
}: ContainerProps) {
  const widthClass = {
    narrow: 'max-w-[var(--container-narrow)]',
    default: 'max-w-[var(--container-default)]',
    wide: 'max-w-[var(--container-wide)]',
  }[width];

  return (
    <div
      className={cn(
        widthClass,
        'mx-auto px-6 md:px-12 lg:px-16',
        className
      )}
    >
      {children}
    </div>
  );
}

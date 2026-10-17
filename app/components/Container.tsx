// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';
import { cn } from '~/lib/cn';

interface ContainerProps {
  /** Width preset: narrow for prose, default for standard pages, wide for hero */
  width?: 'narrow' | 'default' | 'wide';
  /** Additional className */
  className?: string;
  children: ReactNode;
}

/**
 * Container: consistent page-width wrapper with side gutters.
 *
 * Width presets:
 *   - `narrow` : for article body and prose
 *   - `default`: for standard pages
 *   - `wide`   : for hero and multi-column layouts
 *
 * The widths and the gutters are tokens of the design language, so every
 * page has the same horizontal rhythm.
 */
export function Container({
  width = 'default',
  className,
  children,
}: ContainerProps) {
  const widthClass = {
    narrow: 'max-w-narrow',
    default: 'max-w-default',
    wide: 'max-w-wide',
  }[width];

  return (
    <div
      className={cn(
        widthClass,
        'mx-auto px-(--web-gutter-phone) md:px-(--web-gutter-tablet) lg:px-(--web-gutter-desktop)',
        className
      )}
    >
      {children}
    </div>
  );
}

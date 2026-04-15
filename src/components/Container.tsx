// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

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
 * Per DESIGN_SYSTEM.md section 4:
 *   - narrow:  720px  (article body, prose)
 *   - default: 1080px (standard pages)
 *   - wide:    1280px (hero, multi-column layouts)
 *
 *   Side gutters: 24px mobile, 48px tablet, 64px desktop
 *
 * Centralizing this means every page on the site uses the same
 * horizontal rhythm. Changing the gutter at any breakpoint here updates
 * the entire site.
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

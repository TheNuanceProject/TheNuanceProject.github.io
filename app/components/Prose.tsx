// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';
import { cn } from '~/lib/cn';

interface ProseProps {
  children: ReactNode;
  className?: string;
}

/**
 * Prose — wrapper for article-style serif body content.
 *
 * Applies the site's long-form reading typography: Lora serif at
 * 17px with 1.75 line-height, a comfortable reading width, and
 * generous spacing between paragraphs. Used on WireTrace, About,
 * and individual article pages so every piece of long-form content
 * reads consistently.
 */
export function Prose({ children, className }: ProseProps) {
  return (
    <div
      className={cn(
        'font-body text-[17px] leading-[1.75]',
        'text-[var(--color-text-primary)]',
        'max-w-[var(--container-narrow)]',
        'space-y-6',
        className
      )}
    >
      {children}
    </div>
  );
}

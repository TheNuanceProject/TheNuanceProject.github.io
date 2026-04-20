// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';
import { cn } from '~/lib/cn';

interface SectionProps {
  /** Small uppercase label shown above the section (e.g., "WORK", "WRITING") */
  label?: string;
  /** Optional section heading rendered below the label */
  heading?: string;
  /** Content of the section */
  children: ReactNode;
  /** Whether to render a hairline divider above this section */
  divided?: boolean;
  /** Additional className applied to the outer <section> */
  className?: string;
  /** Optional id for in-page anchoring */
  id?: string;
}

/**
 * Section — labelled content section with consistent rhythm.
 *
 * A section is:
 *   - Vertical padding (top and bottom)
 *   - Optional small uppercase label in accent colour
 *   - Optional heading
 *   - Content
 *
 * Centralising it here means consistent vertical rhythm across every
 * page and a single place to change the spacing.
 */
export function Section({
  label,
  heading,
  children,
  divided = false,
  className,
  id,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'py-16 md:py-20',
        divided && 'border-t border-[var(--color-border)]',
        className
      )}
    >
      {label && (
        <p className="text-xs font-display font-medium uppercase tracking-[0.08em] text-[var(--color-accent)] mb-6">
          {label}
        </p>
      )}
      {heading && (
        <h2 className="font-display text-2xl md:text-[32px] text-[var(--color-text-primary)] tracking-[-0.01em] mb-8">
          {heading}
        </h2>
      )}
      {children}
    </section>
  );
}

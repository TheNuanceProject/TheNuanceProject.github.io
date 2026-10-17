// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';
import { cn } from '~/lib/cn';
import { useReveal } from '~/lib/use-reveal';

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
 * Section: labelled content section with consistent rhythm.
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
  const revealRef = useReveal<HTMLElement>();
  return (
    <section
      id={id}
      ref={revealRef}
      className={cn(
        'py-16 md:py-20',
        divided && 'border-t border-divider',
        className
      )}
    >
      {label && (
        <p className="text-label font-sans uppercase text-accent-strong mb-6">
          {label}
        </p>
      )}
      {heading && (
        <h2 className="font-sans text-title-sm md:text-title text-text mb-8">
          {heading}
        </h2>
      )}
      {children}
    </section>
  );
}

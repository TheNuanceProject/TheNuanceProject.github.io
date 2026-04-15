// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ProseProps {
  children: ReactNode;
  className?: string;
}

/**
 * Prose — wrapper for article-style serif body content.
 *
 * Applies the body typography rules from DESIGN_SYSTEM.md section 6:
 *   - Lora serif at 17px
 *   - 1.75 line-height
 *   - Max width 720px (var(--container-narrow))
 *   - Paragraphs separated by 24px (space-y-6)
 *
 * Used inside multi-paragraph content sections on WireTrace, About,
 * and individual Article pages. Centralizes typography rules so every
 * piece of long-form content reads consistently.
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

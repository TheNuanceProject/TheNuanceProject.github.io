// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';

/**
 * Timeline — a general, content-agnostic vertical timeline for prose.
 *
 * Composable and reusable by any writing piece: pass a sequence of
 * <TimelineItem> children, each with a `date` label and free-form body
 * content. Nothing here is specific to a single article.
 *
 * It deliberately reuses the site's existing timeline grammar (the
 * hairline rule, accent node dots punched through the line with a
 * --color-paper border) so it reads as the same family as ReleasesTimeline
 * rather than a one-off style. Static by design; nothing to guard for
 * reduced-motion.
 */

interface TimelineItemProps {
  readonly date: string;
  readonly children: ReactNode;
}

export function TimelineItem({ date, children }: TimelineItemProps) {
  return (
    <li className="relative pl-6 pb-7 last:pb-0">
      <span
        aria-hidden="true"
        className="
          absolute -left-[5px] top-1.5
          h-2 w-2 rounded-full
          border-2 border-[var(--color-paper)]
          bg-[var(--color-accent)]
        "
      />
      <div className="font-mono text-[12.5px] uppercase tracking-[0.04em] text-[var(--color-text-secondary)]">
        {date}
      </div>
      <div className="font-body text-[16px] leading-[1.7] text-[var(--color-text-primary)] mt-1">
        {children}
      </div>
    </li>
  );
}

interface TimelineProps {
  readonly children: ReactNode;
}

export function Timeline({ children }: TimelineProps) {
  return (
    <ol className="relative list-none p-0 my-8 ml-1.5 border-l border-[var(--color-border)]">
      {children}
    </ol>
  );
}

// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';

/**
 * Timeline: a general, content-agnostic vertical timeline for prose.
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
    <li className="relative pl-6 pb-8 last:pb-0">
      <span
        aria-hidden="true"
        className="
          absolute left-0 -translate-x-1/2 top-1
          size-(--size-status-dot) rounded-full
          bg-accent
        "
      />
      <div className="font-mono text-label uppercase text-text-secondary">
        {date}
      </div>
      <div className="font-serif text-body text-text mt-1">
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
    <ol className="relative list-none p-0 my-8 ml-1 border-l border-divider">
      {children}
    </ol>
  );
}

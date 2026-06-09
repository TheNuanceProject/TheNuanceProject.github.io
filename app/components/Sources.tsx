// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';

/**
 * Sources — a compact, reusable primary-sources block for prose.
 *
 * Composable and content-agnostic: pass a sequence of <Source> children,
 * each a labelled link with a one-line description of what it is. Any
 * writing piece can use it; nothing here is specific to a single article.
 *
 * Each source renders as a hairline card whose whole area is the link, in
 * the site's border/accent token language (border lifts to the accent on
 * hover). The source's host is shown as a small mono label. Static; it
 * prerenders into the no-JS HTML.
 */

/** Display host for a URL (e.g., "crowdstrike.com"), or "" if unparseable. */
function displayHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

interface SourceProps {
  readonly href: string;
  readonly label: string;
  readonly children: ReactNode;
}

export function Source({ href, label, children }: SourceProps) {
  const host = displayHost(href);
  const isExternal = /^https?:\/\//.test(href);

  return (
    <li>
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="
          group block no-underline
          rounded-lg border border-[var(--color-border)]
          px-4 py-3.5
          hover:border-[var(--color-accent)]
          transition-colors duration-150
        "
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-[15px] leading-snug text-[var(--color-text-primary)]">
            {label}
          </span>
          {host && (
            <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.04em] text-[var(--color-text-mid)] group-hover:text-[var(--color-accent)] transition-colors duration-150">
              {host}
            </span>
          )}
        </div>
        <p className="font-body text-[14px] leading-[1.6] text-[var(--color-text-secondary)] mt-1.5">
          {children}
        </p>
      </a>
    </li>
  );
}

interface SourcesProps {
  readonly children: ReactNode;
}

export function Sources({ children }: SourcesProps) {
  return <ul className="list-none p-0 my-8 space-y-3">{children}</ul>;
}

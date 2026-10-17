// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';

/**
 * Sources: a compact, reusable primary-sources block for prose.
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
          rounded-lg border border-divider
          px-4 py-3
          hover:border-accent-strong
          transition-colors duration-(--duration-fast)
        "
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-sans text-body text-text">
            {label}
          </span>
          {host && (
            <span className="shrink-0 font-mono text-label uppercase text-text-tertiary group-hover:text-accent-strong transition-colors duration-(--duration-fast)">
              {host}
            </span>
          )}
        </div>
        <p className="font-serif text-ui-lg text-text-secondary mt-1">
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

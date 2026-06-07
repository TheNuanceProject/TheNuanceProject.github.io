// SPDX-License-Identifier: MIT
import { Link } from 'react-router';

export interface Crumb {
  readonly name: string;
  readonly href: string;
}

/**
 * Breadcrumbs — a visible trail for inner pages, mirroring the
 * BreadcrumbList JSON-LD emitted in each page's meta so the on-page
 * trail and the structured data agree. The final crumb is the current
 * page (not a link). Wraps on narrow screens and truncates the current
 * title so it never overflows.
 */
export function Breadcrumbs({ crumbs }: { crumbs: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-10">
      <ol
        className="
          flex flex-wrap items-center gap-x-2 gap-y-1
          font-display text-sm text-[var(--color-text-mid)]
          list-none p-0 m-0
        "
      >
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center gap-x-2 min-w-0">
              {isLast ? (
                <span
                  aria-current="page"
                  className="
                    text-[var(--color-text-secondary)]
                    truncate max-w-[60vw] sm:max-w-none
                  "
                >
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link
                    to={crumb.href}
                    viewTransition
                    className="
                      hover:text-[var(--color-text-primary)]
                      transition-colors duration-150 no-underline
                    "
                  >
                    {crumb.name}
                  </Link>
                  <span aria-hidden="true" className="text-[var(--color-border)]">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

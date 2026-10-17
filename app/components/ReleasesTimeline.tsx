// SPDX-License-Identifier: MIT
import type { Release } from '~/lib/build-data/releases';
import { formatIsoDate } from '~/lib/content/dates';
import { cn } from '~/lib/cn';

interface ReleasesTimelineProps {
  /** Stable releases, newest first, read from GitHub when the site was
   *  built. */
  readonly releases: readonly Release[];
  /** One line on each version, where there is one. */
  readonly summaries: Readonly<Record<string, string>>;
}

/**
 * ReleasesTimeline: a vertical history of releases, newest first, each
 * with its date, its one-line summary and a link to its notes.
 *
 * Everything in it is in the page as built; the visitor's browser asks
 * GitHub for nothing.
 */
export function ReleasesTimeline({ releases, summaries }: ReleasesTimelineProps) {
  return (
    <ol className="relative list-none p-0 m-0 ml-1 border-l border-divider max-w-narrow">
      {releases.map((release, index) => (
        <li key={release.version} className="relative pl-6 pb-8 last:pb-0">
          <span
            aria-hidden="true"
            className={cn(
              // A status dot, centred on the line and on the first line of text.
              'absolute left-0 -translate-x-1/2 top-2 size-(--size-status-dot) rounded-full',
              index === 0 ? 'bg-accent' : 'bg-muted'
            )}
          />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-sans text-body text-text">v{release.version}</p>
            <a
              href={release.url}
              target="_blank"
              rel="noopener noreferrer"
              className="
                font-sans text-ui-lg
                text-text-secondary
                hover:text-text
                no-underline
                border-b border-transparent hover:border-accent-strong
                transition-colors duration-(--duration-fast)
              "
            >
              Notes
            </a>
          </div>
          <p className="font-serif text-ui-lg text-text-tertiary mt-0.5">{formatIsoDate(release.date)}</p>
          {summaries[release.version] && (
            <p className="font-serif text-body text-text-secondary mt-1">
              {summaries[release.version]}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import { cn } from '~/lib/cn';

interface ReleasesTimelineProps {
  /** Fallback latest version (from project meta), shown before live data. */
  readonly version: string;
  /** Repo URL, used to derive the GitHub Releases API endpoint. */
  readonly githubUrl: string;
  /** Releases page link, used as the fallback entry's link. */
  readonly releasesUrl: string;
}

interface ReleaseEntry {
  readonly version: string;
  readonly date: string | null;
  readonly url: string;
}

/** Derive the releases-list API endpoint from a github.com repo URL. */
function apiFromGithub(url: string): string | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;
  return `https://api.github.com/repos/${match[1]}/${match[2]}/releases`;
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * ReleasesTimeline — a vertical history of releases.
 *
 * Prerenders the one known release from project meta, so the static
 * HTML and no-JS visitors always show something real. After mount it
 * fetches the full releases list and replaces the timeline in place
 * (newest first, drafts excluded), degrading to the fallback on any
 * failure. No download count is read or shown.
 */
export function ReleasesTimeline({
  version,
  githubUrl,
  releasesUrl,
}: ReleasesTimelineProps) {
  const [releases, setReleases] = useState<readonly ReleaseEntry[]>([
    { version, date: null, url: releasesUrl },
  ]);

  useEffect(() => {
    const api = apiFromGithub(githubUrl);
    if (!api) return;
    let alive = true;
    fetch(api, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data:
            | Array<{
                tag_name?: string;
                published_at?: string;
                html_url?: string;
                draft?: boolean;
              }>
            | null
        ) => {
          if (!alive || !Array.isArray(data)) return;
          const mapped = data
            .filter((rel) => typeof rel.tag_name === 'string' && !rel.draft)
            .map((rel) => ({
              version: (rel.tag_name as string).replace(/^v/, ''),
              date:
                typeof rel.published_at === 'string' ? rel.published_at : null,
              url: typeof rel.html_url === 'string' ? rel.html_url : releasesUrl,
            }));
          if (mapped.length > 0) setReleases(mapped);
        }
      )
      .catch(() => {
        /* keep the fallback */
      });
    return () => {
      alive = false;
    };
  }, [githubUrl, releasesUrl]);

  return (
    <ol className="relative list-none p-0 m-0 ml-1.5 border-l border-[var(--color-border)]">
      {releases.map((rel, index) => {
        const date = formatDate(rel.date);
        return (
          <li key={`${rel.version}-${index}`} className="relative pl-6 pb-8 last:pb-0">
            <span
              aria-hidden="true"
              className={cn(
                'absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full',
                'border-2 border-[var(--color-paper)]',
                index === 0
                  ? 'bg-[var(--color-accent)]'
                  : 'bg-[var(--color-text-mid)]'
              )}
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="font-display text-base text-[var(--color-text-primary)]">
                v{rel.version}
              </p>
              <a
                href={rel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  font-display text-sm
                  text-[var(--color-text-secondary)]
                  hover:text-[var(--color-text-primary)]
                  no-underline
                  border-b border-transparent hover:border-[var(--color-accent)]
                  transition-colors duration-150
                "
              >
                Notes
              </a>
            </div>
            {date && (
              <p className="font-body text-sm text-[var(--color-text-mid)] mt-0.5">
                {date}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

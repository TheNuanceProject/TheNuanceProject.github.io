// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import { Button } from '~/components/Button';
import { ArrowIcon } from '~/components/icons/ArrowIcon';

interface ReleaseCardProps {
  /** Display name, e.g. "WireTrace". */
  readonly name: string;
  /** Fallback version (from project meta), shown until/if live data loads. */
  readonly version: string;
  /** Download link (stable). */
  readonly downloadUrl: string;
  /** Releases page link. */
  readonly releasesUrl: string;
  /** Repo URL, used to derive the GitHub Releases API endpoint. */
  readonly githubUrl: string;
}

/** Derive the "latest release" API endpoint from a github.com repo URL. */
function apiFromGithub(url: string): string | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;
  return `https://api.github.com/repos/${match[1]}/${match[2]}/releases/latest`;
}

/**
 * ReleaseCard — shows the current release, upgrading in place from live
 * GitHub data.
 *
 * The static fallback (version from project meta) renders immediately,
 * so the prerendered HTML and no-JS visitors always show a real
 * version. After mount it fetches the latest release and updates the
 * version and date in place — same layout, no shift. On any failure
 * (offline, rate limit) it simply keeps the fallback. No download count
 * is read or shown.
 */
export function ReleaseCard({
  name,
  version,
  downloadUrl,
  releasesUrl,
  githubUrl,
}: ReleaseCardProps) {
  const [current, setCurrent] = useState(version);
  const [date, setDate] = useState<string | null>(null);

  useEffect(() => {
    const api = apiFromGithub(githubUrl);
    if (!api) return;
    let alive = true;
    fetch(api, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { tag_name?: string; published_at?: string } | null) => {
        if (!alive || !data || typeof data.tag_name !== 'string') return;
        setCurrent(data.tag_name.replace(/^v/, ''));
        if (typeof data.published_at === 'string') setDate(data.published_at);
      })
      .catch(() => {
        /* keep the fallback */
      });
    return () => {
      alive = false;
    };
  }, [githubUrl]);

  const dateLabel = date
    ? `Released ${new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`
    : 'Latest stable release';

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
        <div>
          <span className="block text-xs font-display font-medium uppercase tracking-[0.08em] text-[var(--color-text-mid)] mb-2">
            Latest release
          </span>
          <p className="font-display text-2xl text-[var(--color-text-primary)]">
            {name}{' '}
            <span className="text-[var(--color-accent)]">v{current}</span>
          </p>
          <p className="font-body text-sm text-[var(--color-text-mid)] mt-1">
            {dateLabel}
          </p>
        </div>
        <Button href={downloadUrl} external>
          Download
          <ArrowIcon />
        </Button>
      </div>
      <a
        href={releasesUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="
          mt-5 inline-block font-display text-sm
          text-[var(--color-text-secondary)]
          hover:text-[var(--color-text-primary)]
          transition-colors duration-150 no-underline
          border-b border-transparent hover:border-[var(--color-accent)]
        "
      >
        All releases and notes
      </a>
    </div>
  );
}

// SPDX-License-Identifier: MIT
import { Button } from '~/components/Button';
import { ArrowRight } from 'lucide-react';
import { Icon } from '~/components/icons/Icon';
import type { Release } from '~/lib/build-data/releases';
import { formatIsoDate } from '~/lib/content/dates';

interface ReleaseCardProps {
  /** Display name, e.g. "WireTrace". */
  readonly name: string;
  /** The latest stable release, read from GitHub when the site was
   *  built, or null when there is none. */
  readonly release: Release | null;
  /** The version the project's meta names, shown when there is no
   *  release to show. */
  readonly version: string;
  /** Download link (stable). */
  readonly downloadUrl: string;
  /** Releases page link. */
  readonly releasesUrl: string;
}

/**
 * ReleaseCard: the current release, with its date and a download button.
 *
 * Everything in it is in the page as built; the visitor's browser asks
 * GitHub for nothing. No download count is read or shown.
 */
export function ReleaseCard({ name, release, version, downloadUrl, releasesUrl }: ReleaseCardProps) {
  return (
    <div className="rounded-lg border border-divider bg-surface p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
        <div>
          <span className="block text-label font-sans font-medium uppercase text-text-tertiary mb-2">
            Latest release
          </span>
          <p className="font-sans text-title text-text">
            {name}{' '}
            <span className="text-accent-strong">v{release?.version ?? version}</span>
          </p>
          <p className="font-serif text-ui-lg text-text-tertiary mt-1">
            {release ? `Released ${formatIsoDate(release.date)}` : 'Latest stable release'}
          </p>
        </div>
        <Button href={downloadUrl} external>
          Download
          <Icon icon={ArrowRight} />
        </Button>
      </div>
      <a
        href={release?.url ?? releasesUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="
          mt-5 inline-block font-sans text-ui-lg
          text-text-secondary
          hover:text-text
          transition-colors duration-(--duration-fast) no-underline
          border-b border-transparent hover:border-accent-strong
        "
      >
        Release notes
      </a>
    </div>
  );
}

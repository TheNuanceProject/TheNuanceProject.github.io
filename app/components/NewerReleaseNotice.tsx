// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { ArrowRight, Info } from 'lucide-react';
import { Icon } from '~/components/icons/Icon';
import type { NewerRelease } from '~/lib/content/writing';

interface NewerReleaseNoticeProps {
  /** The later release, from `newerRelease`. */
  readonly release: NewerRelease;
}

/**
 * NewerReleaseNotice: tells the reader of a piece about an earlier
 * release that a later one is out, and where to find it.
 *
 * Nothing in it is written per release: the piece names the version it
 * describes once, in its meta, and the latest version is the project's
 * own, which the build confirms is its latest release on GitHub.
 */
export function NewerReleaseNotice({ release }: NewerReleaseNoticeProps) {
  return (
    <aside
      aria-label={`${release.title} ${release.latest} is out`}
      className="
        mt-10 md:mt-12 max-w-narrow
        flex items-start gap-3
        rounded-lg border border-divider bg-surface
        px-5 py-4
        font-sans text-ui-lg text-text-secondary
      "
    >
      <Icon icon={Info} size="md" className="mt-0.5 shrink-0 text-text-secondary" />
      <p className="min-w-0">
        Written about {release.title} {release.described}. The latest version is{' '}
        <span className="text-text">{release.latest}</span>.{' '}
        <Link
          to={`/projects/${release.slug}/`}
          viewTransition
          className="
            inline-flex items-center gap-1
            text-text no-underline
            border-b border-transparent hover:border-accent-strong
            transition-colors duration-(--duration-fast)
          "
        >
          <span>See {release.title} {release.latest}</span>
          <Icon icon={ArrowRight} />
        </Link>
      </p>
    </aside>
  );
}

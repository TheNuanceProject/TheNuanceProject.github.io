// SPDX-License-Identifier: MIT
import { Link } from 'react-router-dom';
import { siteConfig } from '@/config/site.config';

/**
 * Logo — the "/TheNuanceProject" wordmark.
 *
 * The forward slash is a path metaphor: this is a directory, a place
 * where work lives. The slash is rendered in accent orange and sits
 * directly against the wordmark with no space, matching how a real
 * file path appears (/Users, /Applications, /TheNuanceProject).
 *
 * The wordmark itself uses CamelCase to mirror the GitHub organization
 * name (github.com/TheNuanceProject). Three capitals create internal
 * word boundaries so the name reads cleanly without spaces.
 *
 * Font: Poppins 400. Orange slash is the only colored element.
 */
export function Logo() {
  return (
    <Link
      to="/"
      className="group inline-flex items-baseline no-underline"
      aria-label={siteConfig.identity.name}
    >
      <span
        aria-hidden="true"
        className="
          text-[var(--color-accent)] font-display font-normal
          text-[17px] leading-none
          transition-colors duration-150
        "
      >
        /
      </span>
      <span
        className="
          text-[var(--color-text-primary)] font-display font-normal
          text-[15px] tracking-[-0.01em] leading-none
          transition-colors duration-150
          group-hover:text-[var(--color-text-secondary)]
        "
      >
        {siteConfig.identity.shortName}
      </span>
    </Link>
  );
}

// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { siteConfig } from '~/config/site.config';

/**
 * Logo: the "/TheNuanceProject" wordmark.
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
        data-logo-slash=""
        className="
          inline-block origin-bottom
          text-accent font-sans font-regular
          text-reading
          transition-[color,transform] duration-(--duration-base) ease-out
          group-hover:-translate-y-px group-hover:-rotate-12
          motion-reduce:transition-none
        "
      >
        /
      </span>
      <span
        className="
          text-text font-sans font-regular
          text-body
          transition-colors duration-(--duration-fast)
          group-hover:text-text-secondary
        "
      >
        {siteConfig.identity.shortName}
      </span>
    </Link>
  );
}

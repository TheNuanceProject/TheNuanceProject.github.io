// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Icon } from '~/components/icons/Icon';

interface ProjectCardProps {
  /** Project name displayed as the row title */
  name: string;
  /** Short description shown below the name */
  description: string;
  /** Optional metadata shown right-aligned (version, status) */
  meta?: string;
  /** Optional small tags shown below the description */
  tags?: readonly string[];
  /** Optional availability line shown directly under the name */
  availability?: string;
  /** Internal route the row links to */
  href: string;
  /** Optional explicit "Read more" link label (default: "Read more") */
  ctaLabel?: string;
}

/**
 * ProjectCard: full-width clickable row.
 *
 * Not a traditional card. A full-width row with hairline borders
 * top and bottom; the whole row is the clickable target. Used on
 * the Home page "Work" section and the Projects index.
 */
export function ProjectCard({
  name,
  description,
  meta,
  tags,
  availability,
  href,
  ctaLabel = 'Read more',
}: ProjectCardProps) {
  return (
    <Link
      to={href}
      viewTransition
      className="
        group block
        border-t border-divider
        py-8 md:py-10
        transition-colors duration-(--duration-fast)
        hover:bg-surface
        no-underline
        last:border-b
        -mx-(--web-gutter-phone) md:-mx-(--web-gutter-tablet) lg:-mx-(--web-gutter-desktop)
        px-(--web-gutter-phone) md:px-(--web-gutter-tablet) lg:px-(--web-gutter-desktop)
      "
      aria-label={`${name}: ${description}`}
    >
      <div className="flex items-baseline justify-between gap-6 mb-2">
        <h3 className="font-sans text-title-sm md:text-title text-text font-regular">
          {name}
        </h3>
        {meta && (
          <span className="font-sans text-ui-lg text-text-tertiary shrink-0 hidden sm:block">
            {meta}
          </span>
        )}
      </div>

      {availability && (
        <p className="font-serif italic text-ui-lg text-text-tertiary mb-4">
          {availability}
        </p>
      )}

      <p className="font-serif text-reading text-text-secondary max-w-narrow">
        {description}
      </p>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="
                inline-flex items-center
                font-sans text-ui font-medium
                h-(--size-control-sm) px-(--size-control-padding-sm)
                border border-divider
                text-text-tertiary
                rounded-sm
              "
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-1 font-sans text-ui-lg text-text">
        <span className="border-b border-transparent group-hover:border-accent-strong transition-colors duration-(--duration-fast)">
          {ctaLabel}
        </span>
        <Icon icon={ArrowRight} className="transition-transform duration-(--duration-base) group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

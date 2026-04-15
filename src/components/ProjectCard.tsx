// SPDX-License-Identifier: MIT
import { Link } from 'react-router-dom';
import { ArrowIcon } from './icons/ArrowIcon';

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
 * ProjectCard — full-width clickable row.
 *
 * Implements the "card" pattern from DESIGN_SYSTEM.md section 6.
 * NOT a traditional card — it's a full-width row with a hairline border
 * top and bottom that reveals on hover. Whole row is clickable.
 *
 * Used on the Home page (Work section) and the Projects index.
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
      className="
        group block
        border-t border-[var(--color-border)]
        py-8 md:py-10
        transition-colors duration-150
        hover:bg-[var(--color-surface)]
        no-underline
        last:border-b
        -mx-6 md:-mx-12 lg:-mx-16
        px-6 md:px-12 lg:px-16
      "
      aria-label={`${name} — ${description}`}
    >
      <div className="flex items-baseline justify-between gap-6 mb-2">
        <h3 className="font-display text-xl md:text-2xl text-[var(--color-text-primary)] font-normal tracking-[-0.01em]">
          {name}
        </h3>
        {meta && (
          <span className="font-display text-sm text-[var(--color-text-mid)] shrink-0 hidden sm:block">
            {meta}
          </span>
        )}
      </div>

      {availability && (
        <p className="font-body italic text-sm text-[var(--color-text-mid)] mb-4">
          {availability}
        </p>
      )}

      <p className="font-body text-[17px] leading-[1.6] text-[var(--color-text-secondary)] max-w-[var(--container-narrow)]">
        {description}
      </p>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="
                inline-block
                font-display text-xs font-medium
                tracking-[0.04em]
                px-2.5 py-1
                border border-[var(--color-border)]
                text-[var(--color-text-mid)]
                rounded-sm
              "
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-1.5 font-display text-sm text-[var(--color-text-primary)]">
        <span className="border-b border-transparent group-hover:border-[var(--color-accent)] transition-colors duration-150">
          {ctaLabel}
        </span>
        <ArrowIcon className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

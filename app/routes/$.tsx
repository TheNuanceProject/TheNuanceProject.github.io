// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { Container } from '~/components/Container';
import { ArrowIcon } from '~/components/icons/ArrowIcon';
import { pageMeta } from '~/lib/page-meta';

/**
 * NotFound — the 404 page.
 *
 * Matches any URL not covered by another route. Kept quiet and
 * deliberately low-key — a missing page isn't a reason for alarm.
 */

export const meta = () =>
  pageMeta({
    title: 'Page not found',
    description: 'This page doesn\u2019t exist.',
    path: '/404',
  });

export default function NotFound() {
  return (
    <Container width="default">
      <section className="pt-20 md:pt-32 pb-20 md:pb-32">
        <p
          className="
            text-xs font-display font-medium
            uppercase tracking-[0.08em]
            text-[var(--color-accent)]
            mb-6
          "
        >
          404
        </p>

        <h1
          className="
            font-display font-normal
            text-3xl md:text-[2.75rem]
            leading-[1.15] tracking-[-0.02em]
            text-[var(--color-text-primary)]
            mb-6
          "
        >
          This page doesn&rsquo;t exist.
        </h1>

        <p
          className="
            font-body text-[17px] leading-[1.75]
            text-[var(--color-text-secondary)]
            max-w-[var(--container-narrow)]
            mb-10
          "
        >
          The link may be broken, or the page may have moved. Head back
          to the front of the site to find your way.
        </p>

        <Link
          to="/"
          className="
            inline-flex items-center gap-2
            font-display text-sm
            text-[var(--color-text-primary)]
            no-underline
            border-b border-transparent hover:border-[var(--color-accent)]
            transition-colors duration-150
          "
        >
          <ArrowIcon className="rotate-180" />
          <span>Back to home</span>
        </Link>
      </section>
    </Container>
  );
}

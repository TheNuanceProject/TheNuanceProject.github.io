// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { Container } from '~/components/Container';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '~/components/icons/Icon';
import { pageMeta } from '~/lib/page-meta';

/**
 * NotFound: the 404 page.
 *
 * Matches any URL not covered by another route. Kept quiet and
 * deliberately low-key: a missing page isn't a reason for alarm.
 */

export const meta = () =>
  pageMeta({
    title: 'Page not found',
    description: 'This page doesn’t exist.',
    path: '/404',
  });

export default function NotFound() {
  return (
    <Container width="default">
      <section className="pt-20 md:pt-32 pb-20 md:pb-32">
        <p
          className="
            text-label font-sans font-medium
            uppercase
            text-accent-strong
            mb-6
          "
        >
          404
        </p>

        <h1
          className="
            font-sans font-regular
            text-display-sm
            text-text
            mb-6
          "
        >
          This page doesn&rsquo;t exist.
        </h1>

        <p
          className="
            font-serif text-reading
            text-text-secondary
            max-w-narrow
            mb-10
          "
        >
          The link may be broken, or the page may have moved. Here are a
          few places to pick up from:
        </p>

        <nav
          aria-label="Suggested pages"
          className="flex flex-wrap items-center gap-x-6 gap-y-3"
        >
          <Link
            to="/"
            className="
              inline-flex items-center gap-2
              font-sans text-ui-lg
              text-text
              no-underline
              border-b border-transparent hover:border-accent-strong
              transition-colors duration-(--duration-fast)
            "
          >
            <Icon icon={ArrowLeft} />
            <span>Home</span>
          </Link>

          <Link
            to="/writing"
            className="
              font-sans text-ui-lg
              text-text-secondary
              no-underline hover:text-text
              border-b border-transparent hover:border-accent-strong
              transition-colors duration-(--duration-fast)
            "
          >
            Writing
          </Link>

          <Link
            to="/projects"
            className="
              font-sans text-ui-lg
              text-text-secondary
              no-underline hover:text-text
              border-b border-transparent hover:border-accent-strong
              transition-colors duration-(--duration-fast)
            "
          >
            Projects
          </Link>
        </nav>
      </section>
    </Container>
  );
}

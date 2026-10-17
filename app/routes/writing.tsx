// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { Container } from '~/components/Container';
import { allWriting } from '~/lib/content/writing';
import { useReveal } from '~/lib/use-reveal';
import { pageMeta } from '~/lib/page-meta';
import { breadcrumbSchema } from '~/lib/structured-data';

/**
 * Writing: index page listing writing pieces.
 *
 * Shows the most recent pieces (capped at `PAGE_SIZE`). If more
 * than that exist, a small note appears at the bottom. Sort order:
 * effective date (updated ?? published), newest first. Auto-
 * discovered from `content/writing/[slug]/meta.ts`.
 */

const PAGE_SIZE = 10;

export const meta = () =>
  pageMeta({
    title: 'Writing',
    description:
      'Notes on what I’m working on, what I’ve learned, and the occasional thought that wouldn’t fit anywhere else.',
    path: '/writing/',
    structuredData: [
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Writing', url: '/writing/' },
      ]),
    ],
  });

export default function Writing() {
  const pieces = allWriting.slice(0, PAGE_SIZE);
  const hasMore = allWriting.length > PAGE_SIZE;
  const isEmpty = pieces.length === 0;
  const revealRef = useReveal<HTMLElement>();

  return (
    <Container width="default">
      <section className="pt-20 md:pt-28 pb-12 md:pb-16">
        <h1
          className="
            font-sans font-regular
            text-display-sm
            text-text
          "
        >
          Writing
        </h1>

        <p
          className="
            mt-6 md:mt-8
            font-serif text-lead
            text-text-secondary
            max-w-narrow
          "
        >
          A place for things I want to share. Notes on what I&rsquo;m
          working on, what I&rsquo;ve learned, and the occasional
          thought that wouldn&rsquo;t fit anywhere else.
        </p>
      </section>

      <section ref={revealRef} className="pb-24 md:pb-32">
        {isEmpty ? (
          <p
            className="
              border-t border-divider
              pt-12
              font-serif text-reading
              text-text-secondary
              max-w-narrow
            "
          >
            Nothing here yet. When I write something, it will appear
            here.
          </p>
        ) : (
          <>
            <ul className="border-t border-divider">
              {pieces.map((piece) => (
                <li key={piece.slug}>
                  <Link
                    to={`/writing/${piece.slug}`}
                    viewTransition
                    className="
                      group block
                      border-b border-divider
                      py-8 md:py-10
                      transition-colors duration-(--duration-fast)
                      hover:bg-surface
                      no-underline
                      -mx-(--web-gutter-phone) md:-mx-(--web-gutter-tablet) lg:-mx-(--web-gutter-desktop)
                      px-(--web-gutter-phone) md:px-(--web-gutter-tablet) lg:px-(--web-gutter-desktop)
                    "
                  >
                    <p
                      className="
                        text-label font-sans font-medium
                        uppercase
                        text-text-tertiary
                        mb-3
                      "
                    >
                      {piece.displayDate}
                      {piece.updatedDate && (
                        <span className="ml-3 text-text-tertiary">
                          · Updated
                        </span>
                      )}
                      {piece.readingTime != null && (
                        <span className="ml-3 text-text-tertiary">
                          · {piece.readingTime} min read
                        </span>
                      )}
                    </p>

                    <h2
                      className="
                        font-sans text-title-sm md:text-title
                        text-text
                        font-regular
                        mb-3
                      "
                    >
                      {piece.title}
                    </h2>

                    <p
                      className="
                        font-serif text-reading
                        text-text-secondary
                        max-w-narrow
                      "
                    >
                      {piece.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            {hasMore && (
              <div className="pt-8 text-center">
                <p className="font-sans text-ui-lg text-text-tertiary">
                  Showing the most recent {PAGE_SIZE} pieces.{' '}
                  <span className="text-text-secondary">
                    An archive of older pieces will live here.
                  </span>
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </Container>
  );
}

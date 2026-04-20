// SPDX-License-Identifier: MIT
import { Link } from 'react-router-dom';
import { Container } from '@/components/Container';
import { allWriting } from '@/lib/content/writing';
import { usePageMeta } from '@/lib/use-page-meta';
import { SEO } from '@/components/SEO';
import { breadcrumbSchema } from '@/lib/structured-data';

/**
 * Writing — index page listing writing pieces.
 *
 * Shows the most recent 10 pieces. If more than 10 exist, a small
 * "Older pieces →" link appears at the bottom (the archive page is
 * a Phase 7 deliverable; until then the link is a noop placeholder).
 *
 * Sort order: by effective date (updated ?? published), newest first.
 * Auto-discovered from src/pages/writing/[slug]/meta.ts files.
 *
 * Empty state shown when no pieces exist.
 */

const PAGE_SIZE = 10;

export default function Writing() {
  usePageMeta({
    title: 'Writing',
    description:
      'Notes on what I\u2019m working on, what I\u2019ve learned, and the occasional thought that wouldn\u2019t fit anywhere else.',
  });

  const pieces = allWriting.slice(0, PAGE_SIZE);
  const hasMore = allWriting.length > PAGE_SIZE;
  const isEmpty = pieces.length === 0;

  return (
    <Container width="default">
      <SEO
        structuredData={[
          breadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Writing', url: '/writing' },
          ]),
        ]}
      />

      {/* ─── Page header ─────────────────────────────────────────────── */}
      <section className="pt-20 md:pt-28 pb-12 md:pb-16">
        <h1
          className="
            font-display font-normal
            text-3xl md:text-[2.75rem]
            leading-[1.15] tracking-[-0.02em]
            text-[var(--color-text-primary)]
          "
        >
          Writing
        </h1>

        <p
          className="
            mt-6 md:mt-8
            font-body text-[19px] md:text-xl
            leading-[1.55]
            text-[var(--color-text-secondary)]
            max-w-[var(--container-narrow)]
          "
        >
          A place for things I want to share. Notes on what I&rsquo;m
          working on, what I&rsquo;ve learned, and the occasional
          thought that wouldn&rsquo;t fit anywhere else.
        </p>
      </section>

      {/* ─── Empty state OR essay list ────────────────────────────────── */}
      <section className="pb-24 md:pb-32">
        {isEmpty ? (
          <p
            className="
              border-t border-[var(--color-border)]
              pt-12
              font-body text-[17px] leading-[1.75]
              text-[var(--color-text-secondary)]
              max-w-[var(--container-narrow)]
            "
          >
            Nothing here yet. When I write something, it will appear
            here.
          </p>
        ) : (
          <>
            <ul className="border-t border-[var(--color-border)]">
              {pieces.map((piece) => (
                <li key={piece.slug}>
                  <Link
                    to={`/writing/${piece.slug}`}
                    className="
                      group block
                      border-b border-[var(--color-border)]
                      py-8 md:py-10
                      transition-colors duration-150
                      hover:bg-[var(--color-surface)]
                      no-underline
                      -mx-6 md:-mx-12 lg:-mx-16
                      px-6 md:px-12 lg:px-16
                    "
                  >
                    <p
                      className="
                        text-xs font-display font-medium
                        uppercase tracking-[0.08em]
                        text-[var(--color-text-mid)]
                        mb-3
                      "
                    >
                      {piece.displayDate}
                      {piece.updatedDate && (
                        <span className="ml-3 text-[var(--color-text-mid)]">
                          · Updated
                        </span>
                      )}
                    </p>

                    <h2
                      className="
                        font-display text-xl md:text-2xl
                        text-[var(--color-text-primary)]
                        font-normal tracking-[-0.01em]
                        mb-3
                      "
                    >
                      {piece.title}
                    </h2>

                    <p
                      className="
                        font-body text-[17px] leading-[1.6]
                        text-[var(--color-text-secondary)]
                        max-w-[var(--container-narrow)]
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
                <p className="font-display text-sm text-[var(--color-text-mid)]">
                  Showing the most recent {PAGE_SIZE} pieces.
                  {' '}
                  <span className="text-[var(--color-text-secondary)]">
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

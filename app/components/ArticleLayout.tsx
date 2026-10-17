// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Container } from '~/components/Container';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '~/components/icons/Icon';
import { Breadcrumbs } from '~/components/Breadcrumbs';
import { NewerReleaseNotice } from '~/components/NewerReleaseNotice';
import { allProjects } from '~/lib/content/projects';
import {
  allWriting,
  adjacentWriting,
  newerRelease,
  relatedWriting,
} from '~/lib/content/writing';
import type { ResolvedWriting } from '~/lib/content/types';

interface ArticleLayoutProps {
  /** The resolved writing metadata from this piece's meta.ts */
  meta: ResolvedWriting;
  /** The article body: use prose components from ~/components/writing-prose */
  children: ReactNode;
}

/**
 * ArticleLayout: the standard wrapper for every writing piece.
 *
 * Provides the full chrome around an article's body:
 *   - Back link to /writing (top)
 *   - Date label
 *   - Large title
 *   - Description as a lead paragraph
 *   - A notice when the project release it describes is no longer the latest
 *   - The article body (passed as children)
 *   - Footer with "Published X · Updated Y" and a second back link
 *
 * Each writing piece's route file exports its own `meta` via the
 * `pageMeta` helper for the document `<head>`, then wraps its body
 * in this component for the visual layout. That keeps every article
 * visually consistent while letting each piece use arbitrary custom
 * components in its body.
 */
export function ArticleLayout({ meta, children }: ArticleLayoutProps) {
  const { newer, older } = adjacentWriting(allWriting, meta.slug);
  const later = newerRelease(meta.about, allProjects);
  const related = relatedWriting(allWriting, meta.slug, 3).filter(
    (r) => r.slug !== newer?.slug && r.slug !== older?.slug
  );

  return (
    <Container width="default">
      <article className="pt-12 md:pt-16 pb-16 md:pb-20">
        {/* ─── Breadcrumb trail ───────────────────────────────────── */}
        <Breadcrumbs
          crumbs={[
            { name: 'Home', href: '/' },
            { name: 'Writing', href: '/writing/' },
            { name: meta.title, href: `/writing/${meta.slug}/` },
          ]}
        />

        {/* ─── Date label ──────────────────────────────────────────── */}
        <p
          className="
            text-label font-sans font-medium
            uppercase
            text-accent-strong
            mb-6
          "
        >
          {meta.displayDate}
          {meta.readingTime != null && (
            <span className="text-text-tertiary">
              {' '}· {meta.readingTime} min read
            </span>
          )}
        </p>

        {/* ─── Title ───────────────────────────────────────────────── */}
        <h1
          className="
            font-sans font-regular
            text-title md:text-display-sm
            text-text
            max-w-narrow
          "
        >
          {meta.title}
        </h1>

        {/* ─── Description as lead ─────────────────────────────────── */}
        <p
          className="
            mt-6 md:mt-8
            font-serif text-lead
            text-text-secondary
            max-w-narrow
          "
        >
          {meta.description}
        </p>

        {/* ─── A later release of what the piece describes ─────────── */}
        {later && <NewerReleaseNotice release={later} />}

        {/* ─── Body ────────────────────────────────────────────────── */}
        <div className="article-body mt-12 md:mt-16 max-w-narrow">
          {children}
        </div>

        {/* ─── Prev / next + related ───────────────────────────────── */}
        {(older || newer || related.length > 0) && (
          <nav
            aria-label="More writing"
            className="mt-20 pt-8 border-t border-divider max-w-narrow"
          >
            {(older || newer) && (
              <div className="grid gap-8 sm:grid-cols-2">
                <div>
                  {older && (
                    <Link
                      to={`/writing/${older.slug}`}
                      viewTransition
                      className="group block no-underline"
                    >
                      <span className="block text-label font-sans font-medium uppercase text-text-tertiary mb-2">
                        Older
                      </span>
                      <span className="block font-sans text-text group-hover:text-accent-strong transition-colors duration-(--duration-fast)">
                        {older.title}
                      </span>
                    </Link>
                  )}
                </div>
                <div className="sm:text-right">
                  {newer && (
                    <Link
                      to={`/writing/${newer.slug}`}
                      viewTransition
                      className="group block no-underline"
                    >
                      <span className="block text-label font-sans font-medium uppercase text-text-tertiary mb-2">
                        Newer
                      </span>
                      <span className="block font-sans text-text group-hover:text-accent-strong transition-colors duration-(--duration-fast)">
                        {newer.title}
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            )}
            {related.length > 0 && (
              <div className="mt-10">
                <span className="block text-label font-sans font-medium uppercase text-text-tertiary mb-4">
                  Related reading
                </span>
                <ul className="space-y-3 list-none p-0 m-0">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link
                        to={`/writing/${r.slug}`}
                        viewTransition
                        className="font-sans text-text hover:text-accent-strong transition-colors duration-(--duration-fast) no-underline"
                      >
                        {r.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </nav>
        )}

        {/* ─── Footer ──────────────────────────────────────────────── */}
        <footer className="mt-20 pt-8 border-t border-divider max-w-narrow">
          <p className="font-sans text-ui-lg text-text-tertiary mb-6">
            {meta.updatedDate ? (
              <>
                Published {meta.publishedDate}
                <span className="mx-2">·</span>
                Updated {meta.updatedDate}
              </>
            ) : (
              <>Published {meta.publishedDate}</>
            )}
          </p>
          <Link
            to="/writing"
            viewTransition
            className="
              inline-flex items-center gap-2
              font-sans text-ui-lg
              text-text-tertiary
              hover:text-text
              transition-colors duration-(--duration-fast)
              no-underline
            "
          >
            <Icon icon={ArrowLeft} />
            <span>Back to writing</span>
          </Link>
        </footer>
      </article>
    </Container>
  );
}

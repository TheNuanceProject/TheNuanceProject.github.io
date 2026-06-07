// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { Container } from '~/components/Container';
import { ArticleLayout } from '~/components/ArticleLayout';
import { ArrowIcon } from '~/components/icons/ArrowIcon';
import { findWritingBySlug } from '~/lib/content/writing';
import { pageMeta } from '~/lib/page-meta';
import { articleSchema, breadcrumbSchema } from '~/lib/structured-data';
import type { ComponentType, ReactNode } from 'react';
import type { Route } from './+types/writing.$slug';

/**
 * Writing article — dynamic per-slug route.
 *
 * Renders an individual writing piece by resolving the URL slug to:
 *   1. Its `meta.ts` (discovered by the writing loader) — for the
 *      title, dates, description, and ArticleLayout chrome.
 *   2. Its `index.tsx` — the essay body component.
 *
 * Both files live at `content/writing/[slug]/`. The folder name MUST
 * match the slug declared in meta.ts (the loader rejects mismatches
 * at module load, so a broken pairing is caught at dev server start
 * or build time, not in production render).
 *
 * Pre-rendering: see `react-router.config.ts` — its `prerender()`
 * enumerates one URL per discovered writing folder, so this route
 * emits one static HTML file per essay at build time.
 *
 * 404 path: if a user lands on `/writing/<unknown-slug>/`, we
 * render the same low-key not-found UI used by the splat route.
 */

interface ArticleModule {
  default: ComponentType;
}

/**
 * Eagerly import every writing piece's index.tsx so we can resolve
 * slug → body component at render time. The path glob mirrors the
 * loader in `~/lib/content/writing.ts`.
 */
const articleModules = import.meta.glob<ArticleModule>(
  '/content/writing/[!_]*/index.tsx',
  { eager: true }
);

/**
 * Build a stable slug → component map ONCE at module load time.
 *
 * Resolving the component at module scope (not at render time) is
 * required by the `react-hooks/static-components` rule and is also
 * better practice — the lookup is just a map index in render, no
 * iteration, no re-computation per request.
 */
const articleComponentBySlug: Record<string, ComponentType> = (() => {
  const map: Record<string, ComponentType> = {};
  for (const [path, mod] of Object.entries(articleModules)) {
    // Path shape: /content/writing/<slug>/index.tsx
    const match = path.match(/\/content\/writing\/([^/]+)\/index\.tsx$/);
    if (match && match[1]) {
      map[match[1]] = mod.default;
    }
  }
  return map;
})();

export const meta = ({ params }: Route.MetaArgs) => {
  const slug = params.slug;
  const piece = slug ? findWritingBySlug(slug) : undefined;

  if (!piece) {
    return pageMeta({
      title: 'Page not found',
      description: 'This page doesn\u2019t exist.',
      path: `/writing/${slug ?? ''}/`,
    });
  }

  return pageMeta({
    title: piece.title,
    description: piece.description,
    path: `/writing/${piece.slug}/`,
    ogType: 'article',
    articlePublishedTime: piece.published,
    articleModifiedTime: piece.updated ?? piece.published,
    structuredData: [
      articleSchema({
        title: piece.title,
        description: piece.description,
        pagePath: `/writing/${piece.slug}/`,
        datePublished: piece.published,
        dateModified: piece.updated ?? piece.published,
      }),
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Writing', url: '/writing/' },
        { name: piece.title, url: `/writing/${piece.slug}/` },
      ]),
    ],
  });
};

export default function WritingArticle({ params }: Route.ComponentProps) {
  const slug = params.slug;
  const piece = slug ? findWritingBySlug(slug) : undefined;
  const ArticleBody = slug ? articleComponentBySlug[slug] : undefined;

  // Slug doesn't match any published writing piece.
  // Render the same low-key 404 used by the splat route, but keep
  // the user on the writing-context back link.
  if (!piece || !ArticleBody) {
    return <NotFoundArticle />;
  }

  return (
    <ArticleLayout meta={piece}>
      <ArticleBody />
    </ArticleLayout>
  );
}

/**
 * NotFoundArticle — the in-writing 404 fallback.
 *
 * Visually quiet. Sends the reader back to /writing rather than
 * the home page, since they were looking for a piece specifically.
 */
function NotFoundArticle(): ReactNode {
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
          This piece doesn&rsquo;t exist.
        </h1>

        <p
          className="
            font-body text-[17px] leading-[1.75]
            text-[var(--color-text-secondary)]
            max-w-[var(--container-narrow)]
            mb-10
          "
        >
          The link may be broken, or the piece may have moved. Head
          back to the writing index to find what you were looking for.
        </p>

        <Link
          to="/writing"
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
          <span>Back to writing</span>
        </Link>
      </section>
    </Container>
  );
}

// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/Container';
import { ArrowIcon } from '@/components/icons/ArrowIcon';
import { usePageMeta } from '@/lib/use-page-meta';
import type { ResolvedWriting } from '@/lib/content/types';

interface ArticleLayoutProps {
  /** The resolved writing metadata from this piece's meta.ts */
  meta: ResolvedWriting;
  /** The article body — use prose components from @/components/writing-prose */
  children: ReactNode;
}

/**
 * ArticleLayout — the standard wrapper for every writing piece.
 *
 * Provides the full chrome around an article's body:
 *   - Back link to /writing (top)
 *   - Date label (uses sortDate — "April 2026")
 *   - Large title
 *   - Description as a lead paragraph
 *   - The article body (passed as children)
 *   - Footer with "Published X · Updated Y" and a second back link
 *
 * A writing piece's index.tsx wraps its body in this component. That
 * keeps every article visually consistent while letting each piece
 * still use arbitrary custom components in its body.
 *
 * Example usage in a writing piece:
 *
 *   import { ArticleLayout } from '@/components/ArticleLayout';
 *   import { P, H2 } from '@/components/writing-prose';
 *   import { meta } from './meta';
 *   import { deriveDates } from '@/lib/content/dates';
 *
 *   export default function Article() {
 *     const resolved = { ...meta, ...deriveDates(meta.published, meta.updated) };
 *     return (
 *       <ArticleLayout meta={resolved}>
 *         <P>Opening paragraph...</P>
 *         <H2>First section</H2>
 *         <P>More content...</P>
 *       </ArticleLayout>
 *     );
 *   }
 *
 * Or just import from the findWritingBySlug loader if the piece wants
 * to avoid duplicating the derivation.
 */
export function ArticleLayout({ meta, children }: ArticleLayoutProps) {
  usePageMeta({
    title: meta.title,
    description: meta.description,
  });

  return (
    <Container width="default">
      <article className="pt-12 md:pt-16 pb-16 md:pb-20">
        {/* ─── Top back link ──────────────────────────────────────── */}
        <Link
          to="/writing"
          className="
            inline-flex items-center gap-2
            font-display text-sm
            text-[var(--color-text-mid)]
            hover:text-[var(--color-text-primary)]
            transition-colors duration-150
            no-underline
            mb-10
          "
        >
          <ArrowIcon className="rotate-180" />
          <span>Back to writing</span>
        </Link>

        {/* ─── Date label ──────────────────────────────────────────── */}
        <p
          className="
            text-xs font-display font-medium
            uppercase tracking-[0.08em]
            text-[var(--color-accent)]
            mb-6
          "
        >
          {meta.displayDate}
        </p>

        {/* ─── Title ───────────────────────────────────────────────── */}
        <h1
          className="
            font-display font-normal
            text-[2.25rem] md:text-[3rem]
            leading-[1.1] tracking-[-0.02em]
            text-[var(--color-text-primary)]
            max-w-[var(--container-narrow)]
          "
        >
          {meta.title}
        </h1>

        {/* ─── Description as lead ─────────────────────────────────── */}
        <p
          className="
            mt-6 md:mt-8
            font-body text-[19px] md:text-xl
            leading-[1.55]
            text-[var(--color-text-secondary)]
            max-w-[var(--container-narrow)]
          "
        >
          {meta.description}
        </p>

        {/* ─── Body ────────────────────────────────────────────────── */}
        <div className="mt-12 md:mt-16 max-w-[var(--container-narrow)]">
          {children}
        </div>

        {/* ─── Footer ──────────────────────────────────────────────── */}
        <footer className="mt-20 pt-8 border-t border-[var(--color-border)] max-w-[var(--container-narrow)]">
          <p className="font-display text-sm text-[var(--color-text-mid)] mb-6">
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
            className="
              inline-flex items-center gap-2
              font-display text-sm
              text-[var(--color-text-mid)]
              hover:text-[var(--color-text-primary)]
              transition-colors duration-150
              no-underline
            "
          >
            <ArrowIcon className="rotate-180" />
            <span>Back to writing</span>
          </Link>
        </footer>
      </article>
    </Container>
  );
}

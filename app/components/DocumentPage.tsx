// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';
import { Container } from '~/components/Container';
import { Breadcrumbs, type Crumb } from '~/components/Breadcrumbs';
import { DocumentBody, Inlines } from '~/components/DocumentBody';
import { contentsOf, type ContentsEntry, type DocumentTree } from '~/lib/docs/document';
import { cn } from '~/lib/cn';

/**
 * DocumentPage: the page of a product's document, such as WireTrace's
 * user guide.
 *
 * The title and lead are the document's own. Below the lead, the
 * contents: on a wide screen a column beside the text that stays in view
 * as the page scrolls, on a narrower one a list that opens under the
 * lead. The text keeps the reading width.
 */

const CONTENTS_LINK =
  'block py-1 text-text-secondary hover:text-text no-underline transition-colors duration-(--duration-fast)';

function ContentsList({ entries, nested = false }: { entries: readonly ContentsEntry[]; nested?: boolean }) {
  return (
    <ul className={cn('list-none p-0 m-0', nested && 'pl-3')}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <a href={`#${entry.id}`} className={CONTENTS_LINK}>
            {entry.text}
          </a>
          {entry.children.length > 0 && <ContentsList entries={entry.children} nested />}
        </li>
      ))}
    </ul>
  );
}

export function DocumentPage({
  document,
  pictures,
  crumbs,
  related,
}: {
  document: DocumentTree;
  pictures: readonly string[];
  crumbs: readonly Crumb[];
  /** Links under the lead, to the pages that go with this one. */
  related: ReactNode;
}) {
  const contents = contentsOf(document);
  return (
    <Container width="wide">
      <div className="pt-12 md:pt-16 pb-24 md:pb-32 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-16">
        <header className="lg:col-start-1 max-w-narrow">
          <Breadcrumbs crumbs={crumbs} />
          <h1 className="font-sans font-regular text-display-sm md:text-display text-text">{document.title}</h1>
          <p className="mt-6 md:mt-8 font-serif text-lead text-text-secondary">
            <Inlines content={document.lead} />
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-ui-lg">{related}</div>
        </header>

        <details className="lg:hidden mt-10 border-y border-divider">
          <summary className="py-3 font-sans text-ui-lg text-text cursor-pointer">Contents</summary>
          <nav aria-label="Contents" className="pb-4 font-sans text-ui-lg">
            <ContentsList entries={contents} />
          </nav>
        </details>

        <nav
          aria-label="Contents"
          className="
            hidden lg:block lg:col-start-2 lg:row-start-1 lg:row-span-2 w-60
            lg:sticky lg:top-(--header-row) lg:self-start
            lg:max-h-[calc(100dvh-var(--header-row))] lg:overflow-y-auto
            lg:pt-2 pb-12 font-sans text-ui
          "
        >
          <p className="mb-3 text-label font-sans font-medium uppercase text-text-tertiary">Contents</p>
          <ContentsList entries={contents} />
        </nav>

        <div className="lg:col-start-1 mt-12 md:mt-16 max-w-narrow min-w-0">
          <DocumentBody blocks={document.blocks} pictures={pictures} />
        </div>
      </div>
    </Container>
  );
}

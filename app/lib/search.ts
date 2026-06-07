// SPDX-License-Identifier: MIT

/** One entry in the build-time search index (dist/client/search-index.json). */
export interface SearchItem {
  readonly title: string;
  readonly description?: string;
  readonly url: string;
  readonly kind: string;
}

/**
 * Filter the search index for a query. Empty query returns the first
 * few entries (so the palette shows useful jumps before typing). A
 * non-empty query matches when every whitespace-separated term appears
 * in the title or description (case-insensitive). Pure, so it is
 * unit-testable without the DOM.
 */
export function filterIndex(
  index: readonly SearchItem[],
  query: string,
  emptyLimit = 8,
  matchLimit = 12
): SearchItem[] {
  const q = query.trim().toLowerCase();
  if (q === '') return index.slice(0, emptyLimit);
  const terms = q.split(/\s+/);
  return index
    .filter((item) => {
      const hay = `${item.title} ${item.description ?? ''}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    })
    .slice(0, matchLimit);
}

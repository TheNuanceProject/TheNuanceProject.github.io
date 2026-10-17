// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Container } from '~/components/Container';
import { filterIndex, type SearchItem } from '~/lib/search';
import { pageMeta } from '~/lib/page-meta';

/**
 * Search: the results page behind the WebSite SearchAction.
 *
 * The query lives in the URL (`?q=`), so results are shareable and the
 * SearchAction target (`/search?q={term}`) resolves to a real page.
 * Search runs client-side over the build-time index; the page is
 * noindex (a results page shouldn't be indexed) but is prerendered so
 * the URL exists for crawlers following the SearchAction.
 */
export const meta = () => [
  ...pageMeta({
    title: 'Search',
    description: 'Search writing and projects on The Nuance Project.',
    path: '/search/',
  }),
  { name: 'robots', content: 'noindex' },
];

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [index, setIndex] = useState<readonly SearchItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load the index and focus the input, on mount.
  useEffect(() => {
    inputRef.current?.focus();
    let alive = true;
    fetch('/search-index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SearchItem[]) => {
        if (!alive) return;
        setIndex(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const onChange = (value: string) => {
    setQuery(value);
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  const trimmed = query.trim();
  const results = useMemo(
    () => (trimmed ? filterIndex(index, trimmed, 0, 50) : []),
    [index, trimmed]
  );

  return (
    <Container width="default">
      <section className="pt-20 md:pt-28 pb-24 md:pb-32">
        <h1
          className="
            font-sans font-regular
            text-display-sm
            text-text
          "
        >
          Search
        </h1>

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search writing and projects…"
          aria-label="Search query"
          className="
            mt-8 w-full max-w-narrow
            h-12 px-4
            font-sans text-body text-text
            placeholder:text-text-tertiary
            bg-paper
            border border-edge rounded-sm
          "
        />

        <div className="mt-10">
          {!trimmed ? (
            <p className="font-serif text-reading text-text-secondary">
              Type to search across writing and projects.
            </p>
          ) : results.length === 0 ? (
            <p className="font-serif text-reading text-text-secondary">
              {loaded
                ? `No results for “${trimmed}”.`
                : 'Searching…'}
            </p>
          ) : (
            <ul className="border-t border-divider list-none p-0 m-0">
              {results.map((item) => (
                <li key={item.url}>
                  <Link
                    to={item.url}
                    className="
                      group block
                      border-b border-divider
                      py-6 md:py-8
                      transition-colors duration-(--duration-fast)
                      hover:bg-surface
                      no-underline
                      -mx-(--web-gutter-phone) md:-mx-(--web-gutter-tablet) lg:-mx-(--web-gutter-desktop)
                      px-(--web-gutter-phone) md:px-(--web-gutter-tablet) lg:px-(--web-gutter-desktop)
                    "
                  >
                    <span className="block font-sans text-title-sm text-text">
                      {item.title}
                    </span>
                    {item.description && (
                      <span className="block mt-1 font-serif text-body text-text-secondary max-w-narrow">
                        {item.description}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </Container>
  );
}

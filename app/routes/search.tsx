// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Container } from '~/components/Container';
import { filterIndex, type SearchItem } from '~/lib/search';
import { pageMeta } from '~/lib/page-meta';

/**
 * Search — the results page behind the WebSite SearchAction.
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
            font-display font-normal
            text-3xl md:text-[2.75rem]
            leading-[1.15] tracking-[-0.02em]
            text-[var(--color-text-primary)]
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
            mt-8 w-full max-w-[var(--container-narrow)]
            px-4 py-3.5
            font-display text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-mid)]
            bg-[var(--color-surface)]
            border border-[var(--color-border)] rounded-lg
            focus:outline-none focus:border-[var(--color-accent)]
            transition-colors duration-150
          "
        />

        <div className="mt-10">
          {!trimmed ? (
            <p className="font-body text-[17px] text-[var(--color-text-secondary)]">
              Type to search across writing and projects.
            </p>
          ) : results.length === 0 ? (
            <p className="font-body text-[17px] text-[var(--color-text-secondary)]">
              {loaded
                ? `No results for \u201C${trimmed}\u201D.`
                : 'Searching\u2026'}
            </p>
          ) : (
            <ul className="border-t border-[var(--color-border)] list-none p-0 m-0">
              {results.map((item) => (
                <li key={item.url}>
                  <Link
                    to={item.url}
                    className="
                      group block
                      border-b border-[var(--color-border)]
                      py-6 md:py-7
                      transition-colors duration-150
                      hover:bg-[var(--color-surface)]
                      no-underline
                      -mx-6 md:-mx-12 lg:-mx-16
                      px-6 md:px-12 lg:px-16
                    "
                  >
                    <span className="block font-display text-lg md:text-xl text-[var(--color-text-primary)] tracking-[-0.01em]">
                      {item.title}
                    </span>
                    {item.description && (
                      <span className="block mt-1 font-body text-[15px] leading-[1.6] text-[var(--color-text-secondary)] max-w-[var(--container-narrow)]">
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

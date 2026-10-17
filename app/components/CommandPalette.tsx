// SPDX-License-Identifier: MIT
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { filterIndex, type SearchItem } from '~/lib/search';
import { cn } from '~/lib/cn';

/**
 * CommandPalette: a search-and-jump dialog over writing and projects.
 *
 * Mounted by the Header only while open, so each open starts with fresh
 * state (no reset effects). The Header owns the global Cmd/Ctrl-K
 * shortcut and the trigger buttons. The index is fetched lazily on
 * mount. Behaviour mirrors the Header's mobile panel: Escape closes,
 * body scroll locks while open, and it is a labelled dialog.
 * Responsive: a near-full-width sheet on mobile, a centred dialog on
 * larger screens.
 */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [index, setIndex] = useState<readonly SearchItem[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  // Fetch the index once on mount.
  useEffect(() => {
    let alive = true;
    fetch('/search-index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SearchItem[]) => {
        if (alive) setIndex(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (alive) setIndex([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Focus the input, lock scroll, close on Escape, all on mount.
  useEffect(() => {
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  const results = useMemo(() => filterIndex(index, query), [index, query]);

  const go = (item?: SearchItem) => {
    if (!item) return;
    onClose();
    navigate(item.url);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[selected]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-70 flex items-start justify-center p-4 sm:pt-[14vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 bg-scrim backdrop-blur-sm"
      />
      <div className="relative w-full max-w-144 rounded-md border border-divider bg-paper shadow-float overflow-hidden">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search writing and projects…"
          aria-label="Search query"
          className="
            w-full h-12 px-4 bg-transparent
            font-sans text-body text-text
            placeholder:text-text-tertiary
            border-b border-divider
            focus-visible:-outline-offset-(--size-focus-ring)
          "
        />
        <ul className="max-h-[50vh] overflow-y-auto p-1 list-none m-0">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center font-sans text-ui-lg text-text-tertiary">
              No results
            </li>
          ) : (
            results.map((item, i) => (
              <li key={item.url}>
                <button
                  type="button"
                  onClick={() => go(item)}
                  onMouseEnter={() => setSelected(i)}
                  className={cn(
                    'w-full text-left rounded-sm px-3 py-2',
                    'flex flex-col gap-0.5 transition-colors duration-(--duration-fast)',
                    i === selected
                      ? 'bg-surface'
                      : 'hover:bg-surface'
                  )}
                >
                  <span className="font-sans text-ui-lg text-text">
                    {item.title}
                  </span>
                  {item.description && (
                    <span className="font-serif text-ui text-text-tertiary line-clamp-1">
                      {item.description}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

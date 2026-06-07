// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';

/**
 * ReadingProgress — a slim bar fixed to the top of the viewport that
 * fills as the reader scrolls through the page.
 *
 * Client-only behaviour, SSR-safe: it renders at 0% on the server and
 * on the first client render (so there is no hydration mismatch), then
 * updates on scroll via a requestAnimationFrame-throttled listener.
 * The width transition is applied only under `motion-safe`, so it
 * honours `prefers-reduced-motion`.
 */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
    };

    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] pointer-events-none"
    >
      <div
        className="
          h-full bg-[var(--color-accent)]
          motion-safe:transition-[width] motion-safe:duration-75
          motion-safe:ease-out
        "
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// SPDX-License-Identifier: MIT
import { useEffect, useRef } from 'react';

interface RevealHeadingProps {
  /** The heading text. Rendered verbatim on the server. */
  text: string;
  /** Classes applied to the <h1>. */
  className?: string;
}

/**
 * RevealHeading: the home hero headline that settles in on load (D-7).
 *
 * Progressive enhancement and SSR-safe: the server and the first client render
 * emit a plain <h1>{text}</h1>, so prerendered HTML and no-JS visitors get the
 * full heading with no hydration mismatch. After mount, on the client only and
 * unless `prefers-reduced-motion` is set, the heading is split (imperatively,
 * with no React re-render) into words and characters that rise and fade in
 * with a small stagger, once.
 *
 * Word integrity: each WORD is wrapped in an inline-block span with
 * `white-space: nowrap`, so a line can only break at the real spaces between
 * words, never mid-word. Characters animate inside their word.
 *
 * The forced reflow before revealing commits the hidden start state to the
 * layout, so the transition actually plays rather than being coalesced away.
 *
 * Accessibility: the <h1> keeps an aria-label with the full text and the word
 * spans are aria-hidden, so assistive tech reads one string, not single
 * letters. The split is reverted on cleanup.
 */
export function RevealHeading({ text, className }: RevealHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    el.setAttribute('aria-label', text);
    el.textContent = '';

    const words = text.split(' ');
    const chars: HTMLSpanElement[] = [];
    let index = 0;

    words.forEach((word, wordIndex) => {
      const wordEl = document.createElement('span');
      wordEl.className = 'rh-word';
      wordEl.setAttribute('aria-hidden', 'true');

      for (const ch of Array.from(word)) {
        const charEl = document.createElement('span');
        charEl.className = 'rh-char';
        // The stagger between letters is the choreography of this reveal
        // (SITE_DYNAMISM_REQUIREMENTS D-7); its duration is a token.
        charEl.style.transitionDelay = `${index * 16}ms`;
        charEl.textContent = ch;
        wordEl.appendChild(charEl);
        chars.push(charEl);
        index += 1;
      }

      el.appendChild(wordEl);
      // Real, breakable space between words (line wraps only here).
      if (wordIndex < words.length - 1) {
        el.appendChild(document.createTextNode(' '));
      }
    });

    // Commit the hidden start state before transitioning, so the animation
    // plays on load instead of being coalesced into a single paint.
    void el.offsetWidth;

    const id = window.requestAnimationFrame(() => {
      for (const c of chars) c.classList.add('in');
    });

    return () => {
      window.cancelAnimationFrame(id);
      el.removeAttribute('aria-label');
      el.textContent = text;
    };
  }, [text]);

  return (
    <h1 ref={ref} className={className}>
      {text}
    </h1>
  );
}

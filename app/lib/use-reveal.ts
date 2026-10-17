// SPDX-License-Identifier: MIT
import { useEffect, useRef } from 'react';

/**
 * useReveal: fade-and-rise a block in once, as it enters the viewport (D-6).
 *
 * Progressive enhancement: the element is fully visible by default, including
 * in prerendered HTML and with JavaScript disabled. On mount (client only)
 * this hook *arms* the element with the hidden start state, then reveals it
 * when it scrolls into view, a single time. Under `prefers-reduced-motion` it
 * does nothing and the element simply stays visible.
 *
 * Returns a ref to attach to the element to reveal.
 */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    el.classList.add('reveal-armed');

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-in');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return ref;
}

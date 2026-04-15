// SPDX-License-Identifier: MIT
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — scrolls to the top of the page on every route change.
 *
 * React Router does not do this by default — it preserves scroll
 * position across navigations, which makes sense for SPAs that act
 * like apps but is wrong for a content site where each page is its
 * own document.
 *
 * Renders nothing — only side-effect.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

// SPDX-License-Identifier: MIT
import { useEffect } from 'react';
import type { StructuredData } from '@/lib/structured-data';

interface SEOProps {
  /**
   * One or more JSON-LD objects to inject into <head>. Each object is
   * rendered as its own <script type="application/ld+json"> tag, which
   * is what Google's structured-data parsers expect.
   */
  structuredData: readonly StructuredData[];
}

/**
 * SEO — injects JSON-LD structured data into <head>.
 *
 * Renders nothing visible. On mount (and whenever the data changes),
 * it mounts one <script type="application/ld+json"> tag per object
 * into <head>. On unmount, it removes them, so navigating between
 * routes does not stack up schema from previous pages.
 *
 * This component is paired with usePageMeta: pages that want
 * structured data render <SEO structuredData={[...]} /> inside their
 * return tree, anywhere. The tag doesn't affect layout.
 *
 * Implementation notes:
 *   - Each tag is marked with data-nuance-seo="1" so we can safely
 *     query our own tags without touching any unrelated ones.
 *   - We stringify with no indentation (production-mode) because the
 *     extra bytes do not help search engines.
 *   - Script tags are appended to <head>; Google reads them from
 *     wherever they appear, but <head> is the conventional place.
 */
export function SEO({ structuredData }: SEOProps) {
  useEffect(() => {
    const tags: HTMLScriptElement[] = structuredData.map((data) => {
      const tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.setAttribute('data-nuance-seo', '1');
      tag.textContent = JSON.stringify(data);
      document.head.appendChild(tag);
      return tag;
    });

    return () => {
      for (const tag of tags) {
        if (tag.parentNode) {
          tag.parentNode.removeChild(tag);
        }
      }
    };
  }, [structuredData]);

  return null;
}

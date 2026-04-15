// SPDX-License-Identifier: MIT
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { siteConfig } from '@/config/site.config';

interface PageMeta {
  /** Page title — appended with the site name automatically */
  title: string;
  /** Meta description — one sentence, ~140-160 chars */
  description: string;
  /** If true, uses the title verbatim (no " · The Nuance Project" suffix) */
  titleAsIs?: boolean;
}

/**
 * usePageMeta — sets per-page title, description, and canonical URL.
 *
 * Every page component calls this at the top of its render with the
 * title and description it wants. The hook:
 *   - Updates <title> to "[title] · The Nuance Project"
 *   - Updates <meta name="description"> to the supplied value
 *   - Updates <link rel="canonical"> to the current path
 *   - Updates og:title, og:description, og:url
 *   - Updates twitter:title, twitter:description, twitter:url
 *
 * This gives each page correct metadata for browser tabs, search
 * engines, and link previews (Open Graph / Twitter Card).
 *
 * Home page opts out of the suffix via titleAsIs:true so the tab
 * just reads "The Nuance Project" instead of "The Nuance Project ·
 * The Nuance Project".
 *
 * No dependency on react-helmet or similar — direct DOM manipulation
 * is the simplest correct solution for a small SPA with explicit
 * routes. Changes are safe because they run in useEffect (after
 * render commit) and only read/write known meta elements.
 */
export function usePageMeta(meta: PageMeta): void {
  const location = useLocation();

  useEffect(() => {
    // ─── Title ────────────────────────────────────────────────────
    const fullTitle = meta.titleAsIs
      ? meta.title
      : `${meta.title} · ${siteConfig.identity.name}`;
    document.title = fullTitle;

    // ─── Description ──────────────────────────────────────────────
    setMetaContent('description', meta.description);

    // ─── Canonical URL ────────────────────────────────────────────
    const canonicalUrl = `${siteConfig.identity.url}${location.pathname}`;
    setLinkHref('canonical', canonicalUrl);

    // ─── Open Graph ───────────────────────────────────────────────
    setMetaContent('og:title', fullTitle, 'property');
    setMetaContent('og:description', meta.description, 'property');
    setMetaContent('og:url', canonicalUrl, 'property');

    // ─── Twitter Card ─────────────────────────────────────────────
    setMetaContent('twitter:title', fullTitle);
    setMetaContent('twitter:description', meta.description);
    setMetaContent('twitter:url', canonicalUrl);
  }, [meta.title, meta.description, meta.titleAsIs, location.pathname]);
}

/**
 * Set a meta tag's content by name or property attribute.
 * Creates the tag if it doesn't exist (defensive — shouldn't happen
 * in practice since all expected tags are in index.html, but guards
 * against future HTML changes).
 */
function setMetaContent(
  key: string,
  value: string,
  attr: 'name' | 'property' = 'name'
): void {
  let tag = document.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

/**
 * Set a link tag's href by rel attribute.
 */
function setLinkHref(rel: string, value: string): void {
  let tag = document.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"]`
  );
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', value);
}

// SPDX-License-Identifier: MIT
import { siteConfig } from '~/config/site.config';
import type { StructuredData } from './structured-data';

/**
 * SEO helpers for Framework Mode `meta` exports.
 *
 * Each helper returns an array of meta descriptors ready to be
 * spread into a route's `meta()` function. They own the repetitive
 * work of building absolute URLs, wiring Open Graph and Twitter
 * Card tags in parallel, and serialising JSON-LD structured data
 * into `<script type="application/ld+json">` tags.
 *
 * Canonical URLs are normalised to a single trailing-slash form so
 * the canonical tag, sitemap, schema, and the path GitHub Pages
 * actually serves (`/about/`) all agree — no duplicate-URL signals.
 */

interface PageMetaInput {
  /** Page title — the site suffix is added automatically unless `titleAsIs` is true. */
  readonly title: string;
  /** Short description used by search engines and link previews. */
  readonly description: string;
  /** Site-relative path for this page, e.g. "/about". Normalised to a trailing slash. */
  readonly path: string;
  /** Open Graph type (defaults to "website"). */
  readonly ogType?: 'website' | 'article' | 'profile';
  /** JSON-LD structured data to embed on this page. */
  readonly structuredData?: readonly StructuredData[];
  /** When true, the supplied title is used verbatim (no site suffix). */
  readonly titleAsIs?: boolean;
  /** Absolute URL of a per-page Open Graph image. Falls back to the site default. */
  readonly ogImage?: string;
  /** Alt text for the Open Graph image. Falls back to the site name. */
  readonly ogImageAlt?: string;
  /** For `ogType: 'article'` — ISO publish date. */
  readonly articlePublishedTime?: string;
  /** For `ogType: 'article'` — ISO last-modified date. */
  readonly articleModifiedTime?: string;
}

type MetaDescriptor =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string }
  | { tagName: 'link'; rel: string; href: string }
  | { 'script:ld+json': StructuredData };

/** Normalise a site-relative path to a single trailing-slash form. */
function normalisePath(path: string): string {
  if (path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

/** Map a site-relative path to its OG card key. Mirrors scripts/og.mjs. */
function ogKey(path: string): string {
  if (path === '/') return 'home';
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? 'home' : trimmed.replace(/\//g, '-');
}

export function pageMeta(input: PageMetaInput): MetaDescriptor[] {
  const fullTitle = input.titleAsIs
    ? input.title
    : `${input.title} · ${siteConfig.identity.name}`;
  const canonical = `${siteConfig.identity.url}${normalisePath(input.path)}`;
  const ogImage =
    input.ogImage ??
    `${siteConfig.identity.url}/og/${ogKey(input.path)}.png`;
  const ogImageAlt = input.ogImageAlt ?? fullTitle;
  const ogType = input.ogType ?? 'website';

  const descriptors: MetaDescriptor[] = [
    { title: fullTitle },
    { name: 'description', content: input.description },

    // Canonical URL. Framework Mode supports link tags via `tagName`.
    { tagName: 'link', rel: 'canonical', href: canonical },

    // Open Graph — covers LinkedIn, Facebook, Slack, WhatsApp.
    { property: 'og:type', content: ogType },
    { property: 'og:site_name', content: siteConfig.identity.name },
    { property: 'og:url', content: canonical },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: input.description },
    { property: 'og:image', content: ogImage },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: ogImageAlt },
    { property: 'og:locale', content: 'en_US' },

    // Twitter Card.
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:site', content: siteConfig.author.twitterHandle },
    { name: 'twitter:creator', content: siteConfig.author.twitterHandle },
    { name: 'twitter:url', content: canonical },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: input.description },
    { name: 'twitter:image', content: ogImage },
  ];

  // Article-specific Open Graph timestamps + author.
  if (ogType === 'article') {
    if (input.articlePublishedTime) {
      descriptors.push({
        property: 'article:published_time',
        content: input.articlePublishedTime,
      });
    }
    if (input.articleModifiedTime) {
      descriptors.push({
        property: 'article:modified_time',
        content: input.articleModifiedTime,
      });
    }
    descriptors.push({
      property: 'article:author',
      content: `${siteConfig.identity.url}/about/`,
    });
  }

  for (const schema of input.structuredData ?? []) {
    descriptors.push({ 'script:ld+json': schema });
  }

  return descriptors;
}

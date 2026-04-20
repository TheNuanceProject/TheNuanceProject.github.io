// SPDX-License-Identifier: MIT
import { siteConfig } from '@/config/site.config';

/**
 * structured-data — JSON-LD schema builders.
 *
 * Emits schema.org structured data that search engines use to
 * understand the site's entities and their relationships. Google's
 * entity resolver uses the `sameAs` array on Person to consolidate
 * the "Mohamad Shahin Ambalatha Kandy" and "Shahin Hashim" identities
 * as one person.
 *
 * Every builder returns a plain object; serialisation to JSON happens
 * in the SEO component when it renders the <script> tag. Keeping
 * builders as pure functions makes them testable without DOM.
 *
 * Reference: https://schema.org/docs/full.html
 * Validation: https://validator.schema.org
 */

// ─── Shared types ─────────────────────────────────────────────────────

/**
 * A loose JSON-LD object. Not trying to be fully type-safe against
 * the entire schema.org vocabulary — that would require generating
 * thousands of types. Instead the builder functions below return
 * well-formed specific shapes; this type just constrains them to
 * plain JSON.
 */
export type StructuredData = Record<string, unknown>;

// ─── Person ────────────────────────────────────────────────────────────

/**
 * Person schema for the About page.
 *
 * The `sameAs` array is the key field: it lists every URL under
 * which this person can also be found. Google uses this to
 * consolidate multi-profile identities into one entity.
 *
 * jobTitle is broad ("Software Engineer") rather than domain-locked
 * so the entity isn't narrowed prematurely to a specific specialism.
 */
export function personSchema(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: siteConfig.author.fullName,
    alternateName: siteConfig.author.alternateNames,
    givenName: 'Mohamad Shahin',
    familyName: 'Ambalatha Kandy',
    jobTitle: 'Software Engineer',
    description:
      'Software engineer based in Bangalore, India. Builds software, writes, and runs The Nuance Project — an independent studio.',
    url: siteConfig.identity.url,
    email: `mailto:${siteConfig.author.email}`,
    image: `${siteConfig.identity.url}/og-image.png`,
    sameAs: siteConfig.author.sameAs,
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: 'Northumbria University',
      location: 'Newcastle upon Tyne, United Kingdom',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bangalore',
      addressRegion: 'Karnataka',
      addressCountry: 'IN',
    },
    knowsAbout: siteConfig.author.knowsAbout,
  };
}

// ─── Organization ──────────────────────────────────────────────────────

/**
 * Organization schema for the home page — represents the studio.
 * Kept minimal: name, url, founder (links to Person), logo.
 */
export function organizationSchema(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.identity.name,
    alternateName: siteConfig.identity.shortName,
    url: siteConfig.identity.url,
    logo: `${siteConfig.identity.url}/apple-touch-icon.png`,
    description: siteConfig.identity.description,
    founder: {
      '@type': 'Person',
      name: siteConfig.author.fullName,
      url: `${siteConfig.identity.url}/about`,
    },
    email: siteConfig.author.email,
    sameAs: [siteConfig.links.github],
  };
}

// ─── WebSite ───────────────────────────────────────────────────────────

/**
 * WebSite schema — provides the canonical site-level entity that
 * search engines can attach sitelinks and search-action metadata to.
 * Used on the home page alongside Organization.
 */
export function websiteSchema(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.identity.name,
    url: siteConfig.identity.url,
    description: siteConfig.identity.tagline,
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: siteConfig.identity.name,
      url: siteConfig.identity.url,
    },
  };
}

// ─── SoftwareApplication ───────────────────────────────────────────────

interface SoftwareApplicationInput {
  /** Project name as it appears publicly. */
  name: string;
  /** Short description — one sentence. */
  description: string;
  /** Canonical page URL on this site (e.g. /projects/wiretrace). */
  pageUrl: string;
  /** Current version string (e.g. "1.0.0"). */
  version: string;
  /** Operating systems supported (e.g. ["Windows"]). */
  operatingSystems: readonly string[];
  /** Release URL (GitHub release or download link). */
  downloadUrl: string;
  /** Category tag (e.g. "DeveloperApplication"). */
  applicationCategory?: string;
}

/**
 * SoftwareApplication schema for a project detail page.
 * Price is '0' because the project is free. Kept simple — no reviews,
 * no aggregateRating, because those would be fabricated.
 */
export function softwareApplicationSchema(
  input: SoftwareApplicationInput
): StructuredData {
  const fullUrl = `${siteConfig.identity.url}${input.pageUrl}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: input.name,
    description: input.description,
    url: fullUrl,
    applicationCategory: input.applicationCategory ?? 'DeveloperApplication',
    operatingSystem: [...input.operatingSystems].join(', '),
    softwareVersion: input.version,
    downloadUrl: input.downloadUrl,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Person',
      name: siteConfig.author.fullName,
      url: `${siteConfig.identity.url}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.identity.name,
      url: siteConfig.identity.url,
    },
  };
}

// ─── Article ───────────────────────────────────────────────────────────

interface ArticleInput {
  /** Headline as it appears on the page. */
  title: string;
  /** Short description — one sentence. */
  description: string;
  /** Canonical page URL on this site (e.g. /writing/some-slug). */
  pageUrl: string;
  /** Publication date as ISO (YYYY-MM-DD). */
  datePublished: string;
  /** Last-update date as ISO, if revised. */
  dateModified?: string;
}

/**
 * Article schema for a writing piece.
 */
export function articleSchema(input: ArticleInput): StructuredData {
  const fullUrl = `${siteConfig.identity.url}${input.pageUrl}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    url: fullUrl,
    mainEntityOfPage: fullUrl,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: {
      '@type': 'Person',
      name: siteConfig.author.fullName,
      url: `${siteConfig.identity.url}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.identity.name,
      url: siteConfig.identity.url,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.identity.url}/apple-touch-icon.png`,
      },
    },
    image: `${siteConfig.identity.url}/og-image.png`,
    inLanguage: 'en',
  };
}

// ─── BreadcrumbList ────────────────────────────────────────────────────

interface BreadcrumbCrumb {
  name: string;
  url: string;
}

/**
 * BreadcrumbList schema — for nested pages (project details, writing
 * pieces) to help search engines show breadcrumb trails in results.
 *
 * Each crumb's url is a site-relative path (e.g. "/projects") that
 * this function expands to a full URL.
 */
export function breadcrumbSchema(
  crumbs: readonly BreadcrumbCrumb[]
): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${siteConfig.identity.url}${crumb.url}`,
    })),
  };
}

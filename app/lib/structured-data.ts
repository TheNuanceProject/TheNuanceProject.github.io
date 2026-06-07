// SPDX-License-Identifier: MIT
import { siteConfig } from '~/config/site.config';

/**
 * JSON-LD schema builders.
 *
 * Emits schema.org structured data that search engines use to
 * understand the site's entities and their relationships. The
 * `sameAs` array on Person lets Google's entity resolver
 * consolidate the "Mohamad Shahin Ambalatha Kandy" and "Shahin
 * Hashim" identities into one. Stable `@id` values let every other
 * block (Organization.founder, SoftwareApplication.author,
 * WebSite.publisher, ProfilePage.mainEntity, Article.author) point
 * at the same Person/Organization node rather than re-declaring it.
 *
 * Each builder returns a plain object. Serialisation happens where
 * the schema is rendered (in a route's `meta` export) so the JSON
 * lands in the prerendered HTML.
 *
 * Reference: https://schema.org/docs/full.html
 * Validation: https://validator.schema.org
 */

export type StructuredData = Record<string, unknown>;

// ─── Stable entity IDs ─────────────────────────────────────────────────
// Used as both the canonical `@id` on the full node and the reference
// `{ '@id': … }` from every other block, so the graph resolves to one
// Person and one Organization.

const PERSON_ID = `${siteConfig.identity.url}/about/#person`;
const ORG_ID = `${siteConfig.identity.url}/#organization`;

// ─── Person ────────────────────────────────────────────────────────────

export function personSchema(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
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

// ─── ProfilePage ───────────────────────────────────────────────────────
// Marks the About page as the person's profile page (richer creator
// results in Google). `mainEntity` references the Person by `@id`.

export function profilePageSchema(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${siteConfig.identity.url}/about/#profilepage`,
    url: `${siteConfig.identity.url}/about/`,
    name: `About ${siteConfig.author.fullName}`,
    mainEntity: { '@id': PERSON_ID },
  };
}

// ─── Organization ──────────────────────────────────────────────────────

export function organizationSchema(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: siteConfig.identity.name,
    alternateName: siteConfig.identity.shortName,
    url: siteConfig.identity.url,
    logo: `${siteConfig.identity.url}/apple-touch-icon.png`,
    description: siteConfig.identity.description,
    founder: { '@id': PERSON_ID },
    email: siteConfig.author.email,
    sameAs: [siteConfig.links.github],
  };
}

// ─── WebSite ───────────────────────────────────────────────────────────

export function websiteSchema(): StructuredData {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: siteConfig.identity.url,
    name: siteConfig.identity.name,
    description: siteConfig.identity.tagline,
    inLanguage: 'en',
    publisher: { '@id': ORG_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.identity.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ─── SoftwareApplication ───────────────────────────────────────────────

interface SoftwareApplicationInput {
  readonly name: string;
  readonly description: string;
  readonly pageUrl: string;
  readonly version: string;
  readonly operatingSystems: readonly string[];
  readonly downloadUrl: string;
  readonly applicationCategory?: string;
}

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
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORG_ID },
  };
}

// ─── Article (BlogPosting) ─────────────────────────────────────────────

interface ArticleInput {
  readonly title: string;
  readonly description: string;
  readonly pagePath: string;
  readonly datePublished: string;
  readonly dateModified: string;
  readonly image?: string;
}

export function articleSchema(input: ArticleInput): StructuredData {
  const fullUrl = `${siteConfig.identity.url}${input.pagePath}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    url: fullUrl,
    mainEntityOfPage: fullUrl,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    image: input.image ?? `${siteConfig.identity.url}/og-image.png`,
    author: { '@id': PERSON_ID },
    publisher: { '@id': ORG_ID },
  };
}

// ─── BreadcrumbList ────────────────────────────────────────────────────

interface BreadcrumbCrumb {
  readonly name: string;
  readonly url: string;
}

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

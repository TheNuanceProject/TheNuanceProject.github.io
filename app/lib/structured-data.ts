// SPDX-License-Identifier: MIT
import { siteConfig } from '~/config/site.config';

/**
 * JSON-LD schema builders.
 *
 * Emits schema.org structured data that search engines use to
 * understand the site's entities and their relationships. The
 * `sameAs` array on Person lets Google's entity resolver
 * consolidate the "Mohamad Shahin Ambalatha Kandy" and "Shahin
 * Hashim" identities into one.
 *
 * Each builder returns a plain object. Serialisation happens where
 * the schema is rendered (in a route's `meta` export) so the JSON
 * lands in the prerendered HTML.
 *
 * Reference: https://schema.org/docs/full.html
 * Validation: https://validator.schema.org
 */

export type StructuredData = Record<string, unknown>;

// ─── Person ────────────────────────────────────────────────────────────

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
      url: `${siteConfig.identity.url}/about/`,
    },
    email: siteConfig.author.email,
    sameAs: [siteConfig.links.github],
  };
}

// ─── WebSite ───────────────────────────────────────────────────────────

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
    author: {
      '@type': 'Person',
      name: siteConfig.author.fullName,
      url: `${siteConfig.identity.url}/about/`,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.identity.name,
      url: siteConfig.identity.url,
    },
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

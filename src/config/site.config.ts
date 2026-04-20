// SPDX-License-Identifier: MIT
/**
 * Site Configuration — Single Source of Truth
 *
 * This file holds site-wide identity and shared metadata. To change
 * something across the entire site, edit ONE value here.
 *
 * What belongs here:
 *   - Site identity (name, domain)
 *   - Author info (name, email, alternate names, sameAs profile URLs,
 *     areas of practice)
 *   - Social links (GitHub, LinkedIn)
 *   - Navigation menu structure
 *
 * What does NOT belong here:
 *   - Project-specific data — each project owns its own meta.ts in
 *     src/pages/projects/[slug]/meta.ts. Auto-discovered by the
 *     project loader at build time.
 *   - Essay content — each writing folder in src/pages/writing/ is
 *     auto-discovered by the writing loader.
 *   - Page-specific prose — lives in the page component file.
 *
 * The pattern: drop a file, it appears on the site. No central list
 * to update.
 */

export interface NavLink {
  readonly label: string;
  readonly href: string;
}

export interface SiteConfig {
  readonly identity: {
    readonly name: string;
    readonly shortName: string;
    readonly tagline: string;
    readonly description: string;
    readonly domain: string;
    readonly url: string;
  };
  readonly author: {
    readonly fullName: string;
    readonly shortName: string;
    readonly email: string;
    /**
     * Other legitimate name renderings this person is known by.
     * Used in the Person JSON-LD `alternateName` array to help
     * search engines consolidate the identity.
     */
    readonly alternateNames: readonly string[];
    /**
     * Every public URL where this person can be found under the
     * same identity. Used in the Person JSON-LD `sameAs` array.
     * Order matters less than completeness; Google does not weight
     * position in this array.
     */
    readonly sameAs: readonly string[];
    /**
     * Broad areas of practice. Used in the Person JSON-LD
     * `knowsAbout` field. Deliberately broad rather than narrow —
     * a too-specific list narrows the entity prematurely.
     */
    readonly knowsAbout: readonly string[];
  };
  readonly links: {
    readonly github: string;
    readonly linkedin: string;
  };
  readonly nav: readonly NavLink[];
}

export const siteConfig: SiteConfig = {
  identity: {
    name: 'The Nuance Project',
    shortName: 'TheNuanceProject',
    tagline:
      'A small studio for software, writing, and the work that lives outside of working hours.',
    description:
      'A small, independent studio for software, writing, and research by Mohamad Shahin Ambalatha Kandy.',
    domain: 'thenuanceproject.com',
    url: 'https://thenuanceproject.com',
  },

  author: {
    fullName: 'Mohamad Shahin Ambalatha Kandy',
    shortName: 'Shahin',
    email: 'shahin@thenuanceproject.com',
    alternateNames: ['Shahin Hashim', 'Shahin', 'Mohamad Shahin'],
    sameAs: [
      'https://www.linkedin.com/in/mohamad-shahin-ambalatha-kandy',
      'https://github.com/shahin-hashim',
      'https://github.com/TheNuanceProject',
      'https://huggingface.co/shahin-hashim',
      'https://substack.com/@shahinhashim',
      'https://x.com/shahin_hashim',
      'https://www.reddit.com/user/shahin_hashim/',
      'https://www.instagram.com/shahin_hashim/',
      'https://www.facebook.com/MohamadShahinHashim',
      'https://www.threads.com/@shahin_hashim',
      'https://www.youtube.com/@shahin_hashim',
    ],
    knowsAbout: [
      'Software Engineering',
      'Web Development',
      'Python',
      'React',
      'TypeScript',
      'Application Development',
      'Research and Development',
    ],
  },

  links: {
    github: 'https://github.com/TheNuanceProject',
    linkedin: 'https://www.linkedin.com/in/mohamad-shahin-ambalatha-kandy',
  },

  nav: [
    { label: 'Projects', href: '/projects' },
    { label: 'Writing', href: '/writing' },
    { label: 'About', href: '/about' },
  ],
} as const;

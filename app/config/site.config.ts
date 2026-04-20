// SPDX-License-Identifier: MIT
/**
 * Site configuration — single source of truth.
 *
 * Site-wide identity and shared metadata. To change something across
 * the entire site, edit one value here.
 *
 * What lives here:
 *   - Site identity (name, domain, tagline)
 *   - Author info (name, email, alternate names, linked profiles,
 *     areas of practice)
 *   - External links
 *   - Navigation menu structure
 *
 * What does not live here:
 *   - Project-specific data — each project owns its own `meta.ts` in
 *     `content/projects/[slug]/meta.ts`, auto-discovered by the
 *     project loader.
 *   - Essay content — each writing folder in `content/writing/` is
 *     auto-discovered by the writing loader.
 *   - Page-specific prose — lives in the route file.
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
    /** Other name renderings the same person is known by. */
    readonly alternateNames: readonly string[];
    /** Public URLs where the same person can be found. */
    readonly sameAs: readonly string[];
    /** Broad areas of practice for the `knowsAbout` schema field. */
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

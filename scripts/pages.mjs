// SPDX-License-Identifier: MIT
/**
 * The site's pages that are not discovered from `content/`: one list,
 * read by `react-router.config.ts` (what is prerendered) and by
 * `postbuild.mjs` (the sitemap, the social cards, the search index and
 * `llms.txt`), so a page is added in one place.
 *
 * Each page:
 *   - path: with a leading slash and no trailing one
 *   - title: its name in the search index and on its social card
 *   - sitemap: its priority and change frequency, or absent to leave it
 *     out of the sitemap
 *   - search: whether the site search lists it
 *   - llms: what it is, one line: its line in `llms.txt` and its
 *     description in the search index; absent to leave it out of both
 */
export const STATIC_PAGES = [
  {
    path: '/',
    title: 'Home',
    sitemap: { priority: '1.0', changefreq: 'weekly' },
    search: true,
    llms: "the studio's front door.",
  },
  {
    path: '/projects',
    title: 'Projects',
    sitemap: { priority: '0.8', changefreq: 'weekly' },
    search: true,
    llms: 'software shipped under the studio.',
  },
  {
    path: '/projects/wiretrace/usage',
    title: 'Where WireTrace is used',
    sitemap: { priority: '0.6', changefreq: 'daily' },
    search: true,
    llms: 'WireTrace usage: active installations by country and area, from the update checks.',
  },
  {
    path: '/writing',
    title: 'Writing',
    sitemap: { priority: '0.8', changefreq: 'weekly' },
    search: true,
    llms: 'essays and notes.',
  },
  {
    path: '/about',
    title: 'About',
    sitemap: { priority: '0.7', changefreq: 'monthly' },
    search: true,
    llms: 'about the studio and Mohamad Shahin Ambalatha Kandy (Shahin Hashim).',
  },
  {
    path: '/privacy',
    title: 'Privacy',
    sitemap: { priority: '0.3', changefreq: 'yearly' },
    search: true,
  },
  { path: '/search', title: 'Search', search: false },
];

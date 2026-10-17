// SPDX-License-Identifier: MIT
/** Types of `pages.mjs`, for `react-router.config.ts`. */
export interface StaticPage {
  readonly path: string;
  readonly title: string;
  readonly sitemap?: { readonly priority: string; readonly changefreq: string };
  readonly search: boolean;
  readonly llms?: string;
}

export declare const STATIC_PAGES: readonly StaticPage[];

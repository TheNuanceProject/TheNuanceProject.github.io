// SPDX-License-Identifier: MIT
import type { Config } from '@react-router/dev/config';

/**
 * React Router framework configuration.
 *
 * `ssr: false` and `prerender: true` together produce a static site:
 * every route in `app/routes/` is rendered at build time into its own
 * HTML file. The output is served by any static host (GitHub Pages,
 * Cloudflare Pages, S3, etc.) — no runtime server required.
 *
 * `buildDirectory: 'dist'` matches the existing deploy workflow,
 * which uploads `./dist` as the Pages artifact.
 *
 * See https://reactrouter.com/how-to/pre-rendering
 */
export default {
  ssr: false,
  prerender: true,
  buildDirectory: 'dist',
} satisfies Config;

// SPDX-License-Identifier: MIT
import type { Config } from '@react-router/dev/config';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * React Router framework configuration.
 *
 * `ssr: false` together with a full `prerender()` path list produces
 * a static site: every URL the app responds to is rendered at build
 * time into its own HTML file. The output is served by any static
 * host (GitHub Pages, Cloudflare Pages, S3, etc.) — no runtime
 * server required.
 *
 * Why a function instead of `prerender: true`:
 *   The site has a dynamic `writing/:slug` route. React Router's
 *   auto-discovery only emits HTML for *static* routes; dynamic
 *   routes need their concrete paths enumerated. We discover the
 *   slugs by scanning `content/writing/` for folders that contain a
 *   `meta.ts` (and skip underscore-prefixed drafts). This keeps the
 *   config data-driven: adding a new essay folder is enough, no
 *   config edit needed.
 *
 * `buildDirectory: 'dist'` matches the existing deploy workflow,
 * which uploads `./dist` as the Pages artifact.
 *
 * See https://reactrouter.com/how-to/pre-rendering
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, 'content');

const STATIC_PATHS = [
  '/',
  '/about',
  '/projects',
  '/projects/wiretrace',
  '/writing',
  '/privacy',
];

/** Discover slugs under content/writing that have a meta.ts and are not drafts. */
function discoverWritingSlugs(): string[] {
  const dir = join(CONTENT_DIR, 'writing');
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const slugs: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue;
    const metaPath = join(dir, entry.name, 'meta.ts');
    if (!existsSync(metaPath)) continue;
    // Confirm the meta declares a slug equal to the folder name —
    // protects against a stray file accidentally matching the pattern.
    const text = readFileSync(metaPath, 'utf8');
    const match = text.match(/slug:\s*['"]([^'"]+)['"]/);
    if (match && match[1] === entry.name) {
      slugs.push(entry.name);
    }
  }
  return slugs;
}

export default {
  ssr: false,
  async prerender() {
    const writingSlugs = discoverWritingSlugs();
    return [
      ...STATIC_PATHS,
      ...writingSlugs.map((slug) => `/writing/${slug}`),
    ];
  },
  buildDirectory: 'dist',
} satisfies Config;

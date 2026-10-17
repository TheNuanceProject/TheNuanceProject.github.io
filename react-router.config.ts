// SPDX-License-Identifier: MIT
import type { Config } from '@react-router/dev/config';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { STATIC_PAGES } from './scripts/pages.mjs';

/**
 * React Router framework configuration.
 *
 * `ssr: false` together with a full `prerender()` path list produces
 * a static site: every URL the app responds to is rendered at build
 * time into its own HTML file. The output is served by any static
 * host (GitHub Pages, Cloudflare Pages, S3, etc.), no runtime
 * server required.
 *
 * Why a function instead of `prerender: true`:
 *   The site has dynamic `writing/:slug` (and per-slug project)
 *   routes. React Router's auto-discovery only emits HTML for
 *   *static* routes; dynamic routes need their concrete paths
 *   enumerated. We discover the slugs by scanning `content/writing/`
 *   and `content/projects/` for folders that contain a `meta.ts`
 *   (and skip underscore-prefixed drafts). This keeps the config
 *   data-driven: adding a new essay or project folder is enough, no
 *   config edit needed. It also guarantees every content page is
 *   prerendered, never left to the SPA fallback.
 *
 * `buildDirectory: 'dist'` matches the existing deploy workflow,
 * which uploads `./dist` as the Pages artifact.
 *
 * See https://reactrouter.com/how-to/pre-rendering
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = join(__dirname, 'content');

/** Pages that are not discovered from `content/`: see scripts/pages.mjs. */
const STATIC_PATHS = STATIC_PAGES.map((page) => page.path);

/**
 * Discover slugs under `content/<kind>` that have a `meta.ts` whose
 * declared slug matches the folder name, skipping underscore-prefixed
 * drafts. Mirrors the auto-discovery in the content loaders so the
 * prerender list and the rendered routes never diverge.
 */
function discoverSlugs(kind: 'writing' | 'projects'): string[] {
  const dir = join(CONTENT_DIR, kind);
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const slugs: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue;
    const metaPath = join(dir, entry.name, 'meta.ts');
    if (!existsSync(metaPath)) continue;
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
    const writingSlugs = discoverSlugs('writing');
    const projectSlugs = discoverSlugs('projects');
    return [
      ...STATIC_PATHS,
      ...projectSlugs.map((slug) => `/projects/${slug}`),
      ...writingSlugs.map((slug) => `/writing/${slug}`),
    ];
  },
  buildDirectory: 'dist',
} satisfies Config;

// SPDX-License-Identifier: MIT
/**
 * Post-build finalisation.
 *
 * Runs after `react-router build` via the `postbuild` npm hook.
 * Two concerns:
 *
 *   1. Sitemap generation — scans `content/` for projects and
 *      writing pieces, combines them with static top-level routes,
 *      and writes `dist/client/sitemap.xml`.
 *
 *   2. GitHub Pages 404 handling — renames React Router's
 *      `__spa-fallback.html` to `404.html` so GitHub Pages serves
 *      it for unknown paths. This preserves client-side routing
 *      for any edge case the pre-renderer cannot statically
 *      resolve (e.g. dynamic splat routes).
 *
 * `meta.ts` files are parsed by regex, not by importing, so this
 * script has no TypeScript dependency. If a file's shape changes
 * in a way the regex cannot match, the entry is skipped with a
 * warning rather than producing a broken sitemap.
 */
import {
  readFileSync,
  readdirSync,
  writeFileSync,
  existsSync,
  renameSync,
} from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SITE_URL = 'https://thenuanceproject.com';
const OUT_FILE = join(ROOT, 'dist', 'client', 'sitemap.xml');

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/projects/', priority: '0.8', changefreq: 'weekly' },
  { path: '/writing/', priority: '0.8', changefreq: 'weekly' },
  { path: '/about/', priority: '0.7', changefreq: 'monthly' },
  { path: '/privacy/', priority: '0.3', changefreq: 'yearly' },
];

/** Extract slug and dates from a meta.ts file using regex. */
function parseMetaFile(metaPath, kind) {
  const text = readFileSync(metaPath, 'utf8');
  const slug = text.match(/slug:\s*['"]([^'"]+)['"]/);
  const published = text.match(/published:\s*['"](\d{4}-\d{2}-\d{2})['"]/);
  const updated = text.match(/updated:\s*['"](\d{4}-\d{2}-\d{2})['"]/);

  if (!slug) {
    console.warn(`[sitemap] Skipping ${metaPath}: could not extract slug`);
    return null;
  }
  if (!published) {
    console.warn(
      `[sitemap] Skipping ${metaPath}: could not extract published date`
    );
    return null;
  }

  return {
    slug: slug[1],
    published: published[1],
    updated: updated ? updated[1] : published[1],
    kind,
  };
}

/** Discover folders under `contentDir` that contain a `meta.ts` and are not underscore-prefixed. */
function discoverPages(contentDir, kind) {
  if (!existsSync(contentDir)) return [];
  const entries = readdirSync(contentDir, { withFileTypes: true });
  const pages = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue;
    const metaPath = join(contentDir, entry.name, 'meta.ts');
    if (!existsSync(metaPath)) continue;
    const parsed = parseMetaFile(metaPath, kind);
    if (parsed) pages.push(parsed);
  }
  return pages;
}

function buildSitemap(staticRoutes, dynamicPages) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = [];

  for (const route of staticRoutes) {
    entries.push(
      `  <url>\n` +
        `    <loc>${SITE_URL}${route.path}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${route.changefreq}</changefreq>\n` +
        `    <priority>${route.priority}</priority>\n` +
        `  </url>`
    );
  }

  for (const page of dynamicPages) {
    const path =
      page.kind === 'project'
        ? `/projects/${page.slug}/`
        : `/writing/${page.slug}/`;
    const priority = page.kind === 'project' ? '0.9' : '0.7';
    entries.push(
      `  <url>\n` +
        `    <loc>${SITE_URL}${path}</loc>\n` +
        `    <lastmod>${page.updated}</lastmod>\n` +
        `    <changefreq>monthly</changefreq>\n` +
        `    <priority>${priority}</priority>\n` +
        `  </url>`
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.join('\n') +
    `\n</urlset>\n`
  );
}

// ─── Main ──────────────────────────────────────────────────────────────

const projects = discoverPages(
  join(ROOT, 'content', 'projects'),
  'project'
);
const writing = discoverPages(join(ROOT, 'content', 'writing'), 'writing');

const sitemap = buildSitemap(STATIC_ROUTES, [...projects, ...writing]);

if (!existsSync(join(ROOT, 'dist', 'client'))) {
  throw new Error(
    '[sitemap] dist/client/ does not exist. Run `react-router build` before this script.'
  );
}

writeFileSync(OUT_FILE, sitemap, 'utf8');

const totalRoutes =
  STATIC_ROUTES.length + projects.length + writing.length;
console.log(
  `[postbuild] Wrote ${totalRoutes} URLs to dist/client/sitemap.xml ` +
    `(${STATIC_ROUTES.length} static, ${projects.length} projects, ` +
    `${writing.length} writing)`
);

// ─── 404 handling ──────────────────────────────────────────────────────
// Rename React Router's SPA fallback to `404.html` so GitHub Pages
// serves it automatically for unknown paths.
const spaFallback = join(ROOT, 'dist', 'client', '__spa-fallback.html');
const notFound = join(ROOT, 'dist', 'client', '404.html');

if (existsSync(spaFallback)) {
  renameSync(spaFallback, notFound);
  console.log('[postbuild] Renamed __spa-fallback.html → 404.html');
}

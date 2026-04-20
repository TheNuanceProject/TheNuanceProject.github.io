// SPDX-License-Identifier: MIT
/**
 * generate-sitemap.mjs
 *
 * Post-build script. Runs after `vite build` via the postbuild npm
 * hook. Emits `dist/sitemap.xml` covering every route the app
 * responds to.
 *
 * How it works:
 *   1. Start with the static top-level routes.
 *   2. Scan src/pages/projects/* for folders that are not underscore-
 *      prefixed; each is a project detail page.
 *   3. Scan src/pages/writing/* with the same rule; each is a writing
 *      piece.
 *   4. For each discovered page, read its meta.ts to extract the
 *      slug and published/updated dates (regex — no TypeScript compile
 *      needed because meta.ts files use a narrow literal-object
 *      pattern).
 *   5. Emit a standards-conformant sitemap.xml.
 *
 * Parallel changes required elsewhere:
 *   - package.json: "postbuild": "node scripts/generate-sitemap.mjs"
 *   - public/robots.txt: "Sitemap: https://thenuanceproject.com/sitemap.xml"
 *
 * Limitations acknowledged:
 *   - Regex parsing of meta.ts is fragile if the file format changes.
 *     If it ever fails, the error messages below are loud enough to
 *     catch in CI. Accepted trade-off vs. adding a TypeScript
 *     build-time dependency.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SITE_URL = 'https://thenuanceproject.com';
const OUT_FILE = join(ROOT, 'dist', 'sitemap.xml');

/**
 * Static top-level pages. Order here is the order they appear in
 * sitemap.xml. Home first by convention; Privacy last because
 * compliance pages conventionally sit low in sitemaps.
 */
const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/projects', priority: '0.8', changefreq: 'weekly' },
  { path: '/writing', priority: '0.8', changefreq: 'weekly' },
  { path: '/about', priority: '0.7', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
];

/**
 * Extract slug, published, updated from a meta.ts file using regex.
 * Returns null with a warning if any required field is missing.
 */
function parseMetaFile(metaPath, kind) {
  const text = readFileSync(metaPath, 'utf8');

  const slugMatch = text.match(/slug:\s*['"]([^'"]+)['"]/);
  const publishedMatch = text.match(/published:\s*['"](\d{4}-\d{2}-\d{2})['"]/);
  const updatedMatch = text.match(/updated:\s*['"](\d{4}-\d{2}-\d{2})['"]/);

  if (!slugMatch) {
    console.warn(
      `[sitemap] Skipping ${metaPath}: could not extract slug`
    );
    return null;
  }
  if (!publishedMatch) {
    console.warn(
      `[sitemap] Skipping ${metaPath}: could not extract published date`
    );
    return null;
  }

  return {
    slug: slugMatch[1],
    published: publishedMatch[1],
    updated: updatedMatch ? updatedMatch[1] : publishedMatch[1],
    kind,
  };
}

/**
 * Scan src/pages/{projects,writing}/ for folders that contain
 * meta.ts and are not underscore-prefixed.
 */
function discoverPages(pagesDir, kind) {
  if (!existsSync(pagesDir)) return [];

  const entries = readdirSync(pagesDir, { withFileTypes: true });
  const pages = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_')) continue;

    const metaPath = join(pagesDir, entry.name, 'meta.ts');
    if (!existsSync(metaPath)) continue;

    const parsed = parseMetaFile(metaPath, kind);
    if (parsed) {
      pages.push(parsed);
    }
  }

  return pages;
}

/**
 * Build the XML string. Newlines and indentation are for human
 * readability; search engines don't care either way.
 */
function buildSitemap(staticRoutes, dynamicPages) {
  const today = new Date().toISOString().slice(0, 10);

  const entries = [];

  // Static routes
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

  // Dynamic pages (projects, writing)
  for (const page of dynamicPages) {
    const path =
      page.kind === 'project'
        ? `/projects/${page.slug}`
        : `/writing/${page.slug}`;
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
  join(ROOT, 'src', 'pages', 'projects'),
  'project'
);
const writing = discoverPages(
  join(ROOT, 'src', 'pages', 'writing'),
  'writing'
);

const sitemap = buildSitemap(STATIC_ROUTES, [...projects, ...writing]);

if (!existsSync(join(ROOT, 'dist'))) {
  throw new Error(
    '[sitemap] dist/ does not exist. Run `vite build` before this script.'
  );
}

writeFileSync(OUT_FILE, sitemap, 'utf8');

const totalRoutes = STATIC_ROUTES.length + projects.length + writing.length;
console.log(
  `[sitemap] Wrote ${totalRoutes} URLs to dist/sitemap.xml ` +
    `(${STATIC_ROUTES.length} static, ${projects.length} projects, ` +
    `${writing.length} writing)`
);

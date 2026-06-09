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
import { generateOgCards } from './og.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SITE_URL = 'https://thenuanceproject.com';
const SITE_TAGLINE =
  'A small studio for software, writing, and the work that lives outside of working hours.';
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
  const title = text.match(/title:\s*['"]([^'"]+)['"]/);
  const description = text.match(/description:\s*['"]([^'"]+)['"]/);

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
    title: title ? title[1] : slug[1],
    description: description ? description[1] : '',
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

/**
 * Build `llms.txt` — a clean Markdown map of identity and content for
 * AI assistants (ChatGPT, Claude, Gemini, Perplexity). Generated from
 * the same discovered content as the sitemap, so it never drifts.
 */
/** Escape text for safe inclusion in XML. */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build `feed.xml` (RSS 2.0) from the discovered writing pieces, newest
 * first. Subscribable by any reader; linked from every page's <head>.
 */
function buildRssFeed(writing) {
  const now = new Date().toUTCString();
  const items = writing
    .slice()
    .sort((a, b) => (a.published < b.published ? 1 : -1))
    .map((w) => {
      const url = `${SITE_URL}/writing/${w.slug}/`;
      const pubDate = new Date(`${w.published}T00:00:00Z`).toUTCString();
      return (
        `    <item>\n` +
        `      <title>${escapeXml(w.title)}</title>\n` +
        `      <link>${url}</link>\n` +
        `      <guid isPermaLink="true">${url}</guid>\n` +
        `      <pubDate>${pubDate}</pubDate>\n` +
        `      <description>${escapeXml(w.description)}</description>\n` +
        `    </item>`
      );
    })
    .join('\n');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
    `  <channel>\n` +
    `    <title>${escapeXml('The Nuance Project — Writing')}</title>\n` +
    `    <link>${SITE_URL}/writing/</link>\n` +
    `    <atom:link href="${SITE_URL}/feed.xml" rel="self" ` +
    `type="application/rss+xml" />\n` +
    `    <description>${escapeXml(SITE_TAGLINE)}</description>\n` +
    `    <language>en</language>\n` +
    `    <lastBuildDate>${now}</lastBuildDate>\n` +
    (items ? items + '\n' : '') +
    `  </channel>\n` +
    `</rss>\n`
  );
}

function buildLlmsTxt(projects, writing) {
  const lines = [
    '# The Nuance Project',
    '',
    `> ${SITE_TAGLINE}`,
    '',
    'The Nuance Project is a small, independent studio for software, ' +
      'writing, and research by Mohamad Shahin Ambalatha Kandy (also ' +
      'known as Shahin Hashim), a software engineer based in Bangalore, ' +
      'India.',
    '',
    `Site: ${SITE_URL}`,
    '',
    '## Pages',
    `- [Home](${SITE_URL}/): the studio's front door.`,
    `- [Projects](${SITE_URL}/projects/): software shipped under the studio.`,
    `- [Writing](${SITE_URL}/writing/): essays and notes.`,
    `- [About](${SITE_URL}/about/): about the studio and Mohamad Shahin ` +
      'Ambalatha Kandy (Shahin Hashim).',
  ];
  if (projects.length > 0) {
    lines.push('', '## Projects');
    for (const p of projects) {
      lines.push(`- [${p.title}](${SITE_URL}/projects/${p.slug}/): ${p.description}`);
    }
  }
  if (writing.length > 0) {
    lines.push('', '## Writing');
    for (const w of writing) {
      lines.push(`- [${w.title}](${SITE_URL}/writing/${w.slug}/): ${w.description}`);
    }
  }
  lines.push('');
  return lines.join('\n');
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

// ─── llms.txt ──────────────────────────────────────────────────────────
const LLMS_FILE = join(ROOT, 'dist', 'client', 'llms.txt');
writeFileSync(LLMS_FILE, buildLlmsTxt(projects, writing), 'utf8');
console.log('[postbuild] Wrote dist/client/llms.txt');

// ─── feed.xml (RSS 2.0) ────────────────────────────────────────────────
const FEED_FILE = join(ROOT, 'dist', 'client', 'feed.xml');
writeFileSync(FEED_FILE, buildRssFeed(writing), 'utf8');
console.log('[postbuild] Wrote dist/client/feed.xml');

// ─── Open Graph cards (per page) ───────────────────────────────────────
const ogPages = [
  { path: '/', title: SITE_TAGLINE },
  { path: '/about', title: 'About' },
  { path: '/projects', title: 'Projects' },
  { path: '/writing', title: 'Writing' },
  { path: '/privacy', title: 'Privacy' },
  { path: '/404', title: 'Page not found' },
  { path: '/search', title: 'Search' },
  ...projects.map((p) => ({ path: `/projects/${p.slug}`, title: p.title })),
  ...writing.map((w) => ({ path: `/writing/${w.slug}`, title: w.title })),
];
const ogCount = await generateOgCards({
  distDir: join(ROOT, 'dist', 'client'),
  siteName: 'The Nuance Project',
  domain: SITE_URL.replace(/^https?:\/\//, ''),
  pages: ogPages,
});
console.log(`[postbuild] Wrote ${ogCount} OG cards to dist/client/og/`);

// ─── search-index.json ─────────────────────────────────────────────────
const searchIndex = [
  { title: 'Home', url: '/', kind: 'page' },
  { title: 'About', url: '/about/', kind: 'page' },
  { title: 'Projects', url: '/projects/', kind: 'page' },
  { title: 'Writing', url: '/writing/', kind: 'page' },
  { title: 'Privacy', url: '/privacy/', kind: 'page' },
  ...projects.map((p) => ({
    title: p.title,
    description: p.description,
    url: `/projects/${p.slug}/`,
    kind: 'project',
  })),
  ...writing.map((w) => ({
    title: w.title,
    description: w.description,
    url: `/writing/${w.slug}/`,
    kind: 'writing',
  })),
];
writeFileSync(
  join(ROOT, 'dist', 'client', 'search-index.json'),
  JSON.stringify(searchIndex),
  'utf8'
);
console.log(
  `[postbuild] Wrote dist/client/search-index.json (${searchIndex.length} entries)`
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

// ─── Source greeting (D-11) ────────────────────────────────────────────
// Inject a short HTML comment at the top of every prerendered page — a
// quiet hello for anyone who opens "view source". Idempotent via a marker
// so re-runs never stack duplicate comments. Runs last so 404.html (created
// by the rename above) is included.
const GREETING = `<!--
  / the nuance project
  Built by Shahin. If you are reading the source, hello — you found one.
  The site is open source: https://github.com/TheNuanceProject
-->
`;
const GREETING_MARKER = 'you found one';

function collectHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectHtml(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const CLIENT_DIR = join(ROOT, 'dist', 'client');
let greeted = 0;
for (const file of collectHtml(CLIENT_DIR)) {
  const html = readFileSync(file, 'utf8');
  if (html.includes(GREETING_MARKER)) continue;
  const doctype = html.match(/<!doctype html>/i);
  const next = doctype
    ? html.replace(doctype[0], `${doctype[0]}\n${GREETING}`)
    : GREETING + html;
  writeFileSync(file, next, 'utf8');
  greeted += 1;
}
console.log(`[postbuild] Injected source greeting into ${greeted} HTML files`);

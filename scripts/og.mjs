// SPDX-License-Identifier: MIT
/**
 * Per-page Open Graph card generation.
 *
 * Renders a 1200×630 PNG per page at build time with satori (JSX-like
 * tree → SVG) and resvg (SVG → PNG), using the site's Poppins font and
 * design-system colours. Output lands in `dist/client/og/<key>.png`,
 * where `<key>` is derived from the page path by `ogKey()` — the same
 * mapping `page-meta.ts` uses to point each page's `og:image` at its
 * card. Keeping both in sync via an identical key function means no
 * per-route wiring and no drift.
 *
 * Fonts are read from the `@fontsource/poppins` package (woff, which
 * satori supports), so generation needs no network access.
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = join(ROOT, 'node_modules', '@fontsource', 'poppins', 'files');

// Design-system colours (light/paper theme — the brand default).
const COLOR = {
  paper: '#FAF9F5',
  ink: '#1A1A18',
  accent: '#D97757',
  mid: '#8A8A82',
};

/** Map a site-relative path to its OG card key. Mirrors page-meta.ts. */
export function ogKey(path) {
  if (path === '/') return 'home';
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? 'home' : trimmed.replace(/\//g, '-');
}

function loadFonts() {
  return [
    {
      name: 'Poppins',
      weight: 400,
      style: 'normal',
      data: readFileSync(join(FONT_DIR, 'poppins-latin-400-normal.woff')),
    },
    {
      name: 'Poppins',
      weight: 600,
      style: 'normal',
      data: readFileSync(join(FONT_DIR, 'poppins-latin-600-normal.woff')),
    },
  ];
}

/** The card layout as a satori element tree. */
function card({ eyebrow, title, footer }) {
  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: COLOR.paper,
        color: COLOR.ink,
        fontFamily: 'Poppins',
        padding: '88px 80px',
        position: 'relative',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '12px',
              background: COLOR.accent,
            },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: '26px',
              fontWeight: 400,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: COLOR.mid,
            },
            children: eyebrow,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: '70px',
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              maxWidth: '1000px',
            },
            children: title,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: '28px',
              fontWeight: 400,
              color: COLOR.mid,
            },
            children: footer,
          },
        },
      ],
    },
  };
}

/**
 * Generate one PNG per page into `dist/client/og/`.
 * `pages` = [{ path, title }]. `eyebrow`/`footer` are shared.
 */
export async function generateOgCards({ distDir, siteName, domain, pages }) {
  const fonts = loadFonts();
  const outDir = join(distDir, 'og');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  let count = 0;
  for (const page of pages) {
    const svg = await satori(
      card({ eyebrow: siteName, title: page.title, footer: domain }),
      { width: 1200, height: 630, fonts }
    );
    const png = new Resvg(svg, { background: COLOR.paper }).render().asPng();
    writeFileSync(join(outDir, `${ogKey(page.path)}.png`), png);
    count += 1;
  }
  return count;
}

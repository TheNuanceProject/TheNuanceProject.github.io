// SPDX-License-Identifier: MIT
/**
 * Per-page Open Graph card generation.
 *
 * Renders a 1200×630 PNG per page at build time with satori (JSX-like
 * tree → SVG) and resvg (SVG → PNG), in the Nuance Design Language: its
 * colours, its Poppins at the weights it uses, and its type scale and
 * spacing. A link preview shows the card at about half its size, so the
 * card is drawn at twice the language's sizes. Output lands in `dist/client/og/<key>.png`,
 * where `<key>` is derived from the page path by `ogKey()`, the same
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

import { resolveThemes } from '../design/generate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = join(ROOT, 'node_modules', '@fontsource', 'poppins', 'files');

// The light theme: the brand's default.
const { values: TOKENS } = resolveThemes().themes.light;
const colour = (role) => TOKENS.get(`color.${role}`).hex;
const COLOR = {
  paper: colour('paper'),
  ink: colour('text'),
  accent: colour('accent'),
  mid: colour('text-tertiary'),
};

/** A link preview shows the card at about half its size. */
const CARD_SCALE = 2;
const px = (value) => `${value * CARD_SCALE}px`;
const type = (name) => TOKENS.get(`type.${name}`);
const measure = (path) => TOKENS.get(path);
const REGULAR = TOKENS.get('font.weight.regular');
const MEDIUM = TOKENS.get('font.weight.medium');

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
      weight: REGULAR,
      style: 'normal',
      data: readFileSync(join(FONT_DIR, `poppins-latin-${REGULAR}-normal.woff`)),
    },
    {
      name: 'Poppins',
      weight: MEDIUM,
      style: 'normal',
      data: readFileSync(join(FONT_DIR, `poppins-latin-${MEDIUM}-normal.woff`)),
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
        padding: px(measure('space.10')),
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
              height: px(measure('size.progress')),
              background: COLOR.accent,
            },
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: px(type('label').size),
              fontWeight: type('label').weight,
              letterSpacing: px(type('label').letterSpacing),
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
              fontSize: px(type('title').size),
              fontWeight: type('title').weight,
              lineHeight: px(type('title').lineHeight),
              letterSpacing: px(type('title').letterSpacing),
            },
            children: title,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: px(type('ui-lg').size),
              fontWeight: type('ui-lg').weight,
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

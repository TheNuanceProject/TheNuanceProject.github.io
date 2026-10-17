// SPDX-License-Identifier: MIT
/**
 * Generate what each product reads from the Nuance Design Language.
 *
 * The decisions live in one place, `design/nuance.resolver.json` and the
 * token files it names, written in the W3C Design Tokens Community
 * Group's format, version 2025.10 (Format, Color and Resolver modules).
 * This script resolves them for each theme, checks them against the
 * format and against the language's own rules, and writes:
 *
 *   - the website's tokens, `app/styles/tokens.css`, which Tailwind's
 *     `@theme` and the site's styles read, and `app/lib/design-tokens.ts`,
 *     the same values for code that needs a number or a colour;
 *   - WireTrace's tokens, `ui/themes/design_tokens.py`, when the path of a
 *     WireTrace checkout is given.
 *
 * Every generated file carries the SHA-256 of the token sources it was
 * made from, and the SHA-256 of its own body, so a file edited by hand or
 * made from other sources is recognised.
 *
 * Usage:
 *   node design/generate.mjs                          # write the website's tokens
 *   node design/generate.mjs --wiretrace ../WireTrace  # and WireTrace's
 *   node design/generate.mjs --check [--wiretrace ..]  # verify only (exit 1 if out of date)
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DESIGN_DIR = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(DESIGN_DIR, '..');
const RESOLVER = join(DESIGN_DIR, 'nuance.resolver.json');
const SITE_OUTPUT = join(SITE_ROOT, 'app', 'styles', 'tokens.css');
const SITE_SCRIPT_OUTPUT = join(SITE_ROOT, 'app', 'lib', 'design-tokens.ts');
const WIRETRACE_OUTPUT = join('ui', 'themes', 'design_tokens.py');
const FORMAT_VERSION = '2025.10';
const THEMES = ['light', 'dark'];
const GRID = 4;
const ROOT_FONT_PX = 16;
const BODY_PLACEHOLDER = '@@BODY_SHA256@@';

export class TokenError extends Error {}

// ── Reading and resolving ────────────────────────────────────────────────

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new TokenError(`${path} could not be read as JSON: ${error.message}`);
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Merge `over` into `base`, a later source overriding an earlier one. */
function deepMerge(base, over) {
  const out = { ...base };
  for (const [key, value] of Object.entries(over)) {
    out[key] = isPlainObject(value) && isPlainObject(out[key]) && !('$value' in value)
      ? deepMerge(out[key], value)
      : value;
  }
  return out;
}

/** The resolver document, its source files, and their combined SHA-256. */
export function loadSources(resolverPath = RESOLVER) {
  const base = dirname(resolverPath);
  const resolver = readJson(resolverPath);
  if (resolver.version !== FORMAT_VERSION) {
    throw new TokenError(`the resolver's version must be ${FORMAT_VERSION}, not ${resolver.version}`);
  }
  const files = [resolverPath];
  const fromRef = ({ $ref }) => {
    const path = resolve(base, $ref);
    if (!files.includes(path)) files.push(path);
    return readJson(path);
  };
  const order = resolver.resolutionOrder;
  if (!Array.isArray(order) || order.length === 0) {
    throw new TokenError('the resolver has no resolutionOrder');
  }
  const contexts = {};
  for (const theme of THEMES) {
    let tokens = {};
    for (const step of order) {
      const pointer = step.$ref ?? '';
      const [, kind, name] = pointer.match(/^#\/(sets|modifiers)\/([^/]+)$/) ?? [];
      if (kind === 'sets') {
        for (const source of resolver.sets?.[name]?.sources ?? []) tokens = deepMerge(tokens, fromRef(source));
      } else if (kind === 'modifiers') {
        const modifier = resolver.modifiers?.[name];
        const sources = modifier?.contexts?.[theme];
        if (!sources) throw new TokenError(`the modifier ${name} has no context ${theme}`);
        for (const source of sources) tokens = deepMerge(tokens, fromRef(source));
      } else {
        throw new TokenError(`the resolutionOrder entry ${JSON.stringify(step)} is not a set or modifier`);
      }
    }
    contexts[theme] = tokens;
  }
  // Read every file of every context before hashing, in a fixed order.
  const hash = createHash('sha256');
  for (const path of [...files].sort()) {
    hash.update(relative(base, path).replaceAll('\\', '/'));
    hash.update('\0');
    hash.update(readFileSync(path));
    hash.update('\0');
  }
  return { contexts, sourcesSha256: hash.digest('hex') };
}

const NAME = /^(?!\$)[^{}.]+$/;
const TYPES = new Set([
  'color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number', 'typography', 'shadow',
]);

/** Every token by its dotted path: { type, value, description }. */
function flatten(group, path = [], inherited = undefined, out = new Map()) {
  const type = group.$type ?? inherited;
  for (const [key, node] of Object.entries(group)) {
    if (key.startsWith('$')) continue;
    if (!NAME.test(key)) throw new TokenError(`the name ${[...path, key].join('.')} is not allowed`);
    if (!isPlainObject(node)) throw new TokenError(`${[...path, key].join('.')} is neither a token nor a group`);
    if ('$value' in node) {
      const tokenType = node.$type ?? type;
      if (!TYPES.has(tokenType)) {
        throw new TokenError(`${[...path, key].join('.')} has no supported $type (${tokenType})`);
      }
      out.set([...path, key].join('.'), { type: tokenType, value: node.$value, description: node.$description ?? '' });
    } else {
      flatten(node, [...path, key], type, out);
    }
  }
  return out;
}

const REFERENCE = /^\{([^{}]+)\}$/;

function resolveReferences(tokens) {
  const resolving = new Set();
  const resolveValue = (value, from) => {
    if (typeof value === 'string') {
      const match = value.match(REFERENCE);
      if (!match) return value;
      const target = match[1];
      if (!tokens.has(target)) throw new TokenError(`${from} refers to ${target}, which does not exist`);
      if (resolving.has(target)) throw new TokenError(`${from} refers to ${target} in a circle`);
      resolving.add(target);
      const resolved = resolveValue(tokens.get(target).value, target);
      resolving.delete(target);
      return resolved;
    }
    if (Array.isArray(value)) return value.map((item) => resolveValue(item, from));
    if (isPlainObject(value)) {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveValue(v, from)]));
    }
    return value;
  };
  return new Map([...tokens].map(([path, token]) => [path, { ...token, value: resolveValue(token.value, path) }]));
}

// ── Checking the format ──────────────────────────────────────────────────

function check(condition, message) {
  if (!condition) throw new TokenError(message);
}

function px(value, path) {
  check(isPlainObject(value) && typeof value.value === 'number' && value.unit === 'px',
    `${path} must be a dimension in px`);
  return value.value;
}

function checkColour(value, path) {
  check(isPlainObject(value) && value.colorSpace === 'srgb', `${path} must be an sRGB colour`);
  check(Array.isArray(value.components) && value.components.length === 3
    && value.components.every((c) => typeof c === 'number' && c >= 0 && c <= 1),
    `${path} must have three components from 0 to 1`);
  const alpha = value.alpha ?? 1;
  check(typeof alpha === 'number' && alpha >= 0 && alpha <= 1, `${path} has an alpha outside 0 to 1`);
  check(typeof value.hex === 'string' && /^#[0-9a-f]{6}$/.test(value.hex), `${path} needs a six-digit hex fallback`);
  const fromComponents = '#' + value.components.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
  check(fromComponents === value.hex, `${path}: components ${fromComponents} and hex ${value.hex} differ`);
  return { hex: value.hex, alpha };
}

function checkToken(path, { type, value }) {
  switch (type) {
    case 'color': return checkColour(value, path);
    case 'dimension': return px(value, path);
    case 'duration':
      check(isPlainObject(value) && typeof value.value === 'number' && value.unit === 'ms', `${path} must be a duration in ms`);
      return value.value;
    case 'fontFamily':
      check(Array.isArray(value) && value.length > 0 && value.every((f) => typeof f === 'string' && f), `${path} must list font families`);
      return value;
    case 'fontWeight':
      check(Number.isInteger(value) && value >= 1 && value <= 1000, `${path} must be a weight from 1 to 1000`);
      return value;
    case 'cubicBezier':
      check(Array.isArray(value) && value.length === 4 && value.every((n) => typeof n === 'number')
        && value[0] >= 0 && value[0] <= 1 && value[2] >= 0 && value[2] <= 1, `${path} must be a cubic Bezier`);
      return value;
    case 'number':
      check(typeof value === 'number', `${path} must be a number`);
      return value;
    case 'shadow': {
      check(isPlainObject(value), `${path} must be a shadow object`);
      for (const key of ['color', 'offsetX', 'offsetY', 'blur', 'spread']) check(key in value, `${path} has no ${key}`);
      return {
        colour: checkColour(value.color, `${path}.color`),
        offsetX: px(value.offsetX, `${path}.offsetX`),
        offsetY: px(value.offsetY, `${path}.offsetY`),
        blur: px(value.blur, `${path}.blur`),
        spread: px(value.spread, `${path}.spread`),
      };
    }
    case 'typography': {
      check(isPlainObject(value), `${path} must be a typography object`);
      for (const key of ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight']) {
        check(key in value, `${path} has no ${key}`);
      }
      const size = px(value.fontSize, `${path}.fontSize`);
      const lineHeight = Math.round(size * value.lineHeight);
      check(Math.abs(lineHeight - size * value.lineHeight) < 0.01, `${path}: its line height is not a whole pixel`);
      return {
        family: checkToken(`${path}.fontFamily`, { type: 'fontFamily', value: value.fontFamily }),
        size,
        weight: checkToken(`${path}.fontWeight`, { type: 'fontWeight', value: value.fontWeight }),
        letterSpacing: px(value.letterSpacing, `${path}.letterSpacing`),
        lineHeight,
      };
    }
    default:
      throw new TokenError(`${path}: unsupported type ${type}`);
  }
}

// ── Checking the language's own rules ────────────────────────────────────

/** Measures that may leave the 4-pixel grid, each for a stated reason. */
const OFF_GRID = new Map([
  ['space.half', 'the half step between two lines that belong together'],
  ['border.hairline', 'a line is one pixel'],
  ['border.mark', 'a mark is two pixels'],
  ['size.focus-ring', 'the focus ring is a mark'],
  ['size.focus-offset', 'the focus ring sits two pixels outside its shape'],
  ['radius.xs', 'the smallest radius'],
  ['radius.full', 'a pill or circle'],
  ['grid.dot', 'a dot of the grid'],
]);

function luminance(hex) {
  const channel = (i) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT = 4.5;
const NON_TEXT = 3;

/** Every colour pair the products use, and the contrast it needs (WCAG 2.2 AA). */
function contrastRules(c) {
  const plain = ['paper', 'surface'];
  const rules = [];
  const add = (fg, bgs, need, why) => bgs.forEach((bg) => rules.push({ fg, bg, need, why }));
  for (const role of ['text', 'text-secondary', 'text-tertiary', 'accent-strong']) add(role, plain, TEXT, 'text');
  for (const role of ['error', 'warning', 'info', 'command', 'success'].map((r) => `wiretrace.${r}`)) add(role, plain, TEXT, 'severity text');
  add('edge', plain, NON_TEXT, 'a control boundary (1.4.11)');
  add('accent-strong', plain, NON_TEXT, 'the focus ring');
  for (const role of ['wiretrace.connected', 'wiretrace.logging']) add(role, plain, NON_TEXT, 'a status mark');
  for (const fill of ['text', 'primary-hover', 'primary-pressed']) add('paper', [fill], TEXT, 'a filled button label');
  // The hover and chosen fill: rows, menu items, checked buttons. Meta text
  // (text-tertiary) and accent-strong are never drawn on it.
  for (const role of ['text', 'text-secondary', 'wiretrace.error', 'wiretrace.warning', 'wiretrace.info']) {
    add(role, ['divider'], TEXT, 'text on a hover or chosen fill');
  }
  // Selected text is drawn in the text colour, whatever its own colour.
  add('text', ['selection'], TEXT, 'selected text');
  add('text', ['wiretrace.search-hit'], TEXT, 'a search match');
  add('wiretrace.error', ['wiretrace.error-row'], TEXT, 'an error line');
  add('wiretrace.warning', ['wiretrace.warning-row'], TEXT, 'a warning line');
  add('text', ['wiretrace.error-row', 'wiretrace.warning-row'], TEXT, 'text on a row tint');
  return rules.map((rule) => {
    const fg = c.get(`color.${rule.fg}`);
    const bg = c.get(`color.${rule.bg}`);
    check(fg && bg, `the contrast rule ${rule.fg} on ${rule.bg} names a colour that does not exist`);
    return { ...rule, ratio: contrast(fg.hex, bg.hex) };
  });
}

function checkLanguage(theme, values, types) {
  for (const [path, value] of values) {
    if (types.get(path) !== 'dimension') continue;
    check(Number.isInteger(value) && value > 0, `${path} must be a whole number of pixels`);
    if (!OFF_GRID.has(path)) check(value % GRID === 0, `${path} (${value}) is off the ${GRID}-pixel grid`);
  }
  for (const [path, value] of values) {
    if (!path.startsWith('type.')) continue;
    check(value.lineHeight % GRID === 0, `${path}: its line height ${value.lineHeight} is off the grid`);
    check(value.size >= 12, `${path}: no text is smaller than 12 px`);
  }
  // The glow around the pointer fades from full, through its middle, to nothing.
  const [middle, strength, end] = ['grid.glow-middle', 'grid.glow-middle-strength', 'grid.glow-end']
    .map((path) => values.get(path));
  check(middle > 0 && middle < end && end <= 1, 'the glow must fade within its radius, middle before end');
  check(strength > 0 && strength < 1, 'the glow\'s middle strength must be between 0 and 1');
  const colours = new Map([...values].filter(([path]) => path.startsWith('color.')));
  for (const rule of contrastRules(colours)) {
    check(rule.ratio >= rule.need,
      `${theme}: ${rule.fg} on ${rule.bg} is ${rule.ratio.toFixed(2)}:1; ${rule.why} needs ${rule.need}:1`);
  }
}

/** Resolved and checked values of each theme: Map(path -> value). */
export function resolveThemes(resolverPath = RESOLVER) {
  const { contexts, sourcesSha256 } = loadSources(resolverPath);
  const themes = {};
  for (const theme of THEMES) {
    const raw = flatten(contexts[theme]);
    const tokens = resolveReferences(raw);
    for (const [path, { type, value }] of raw) {
      // A shadow names its colour, so the website's stylesheet can follow the theme.
      if (type === 'shadow') {
        const target = String(value.color).match(REFERENCE)?.[1];
        check(target?.startsWith('color.'), `${path}: its colour must refer to a colour token`);
        tokens.get(path).colourToken = target;
      }
    }
    const values = new Map([...tokens].map(([path, token]) => [path, checkToken(path, token)]));
    checkLanguage(theme, values, new Map([...tokens].map(([path, token]) => [path, token.type])));
    themes[theme] = { tokens, values };
  }
  // Only colours differ between themes; a shadow's colour is a colour token of its own.
  const withoutColour = (value) => (isPlainObject(value) && 'colour' in value ? { ...value, colour: null } : value);
  const shared = [...themes.light.values.keys()].filter((p) => !p.startsWith('color.'));
  for (const path of shared) {
    check(JSON.stringify(withoutColour(themes.light.values.get(path)))
      === JSON.stringify(withoutColour(themes.dark.values.get(path))),
      `${path} differs between themes; only colours may`);
  }
  const lightNames = [...themes.light.values.keys()].sort();
  const darkNames = [...themes.dark.values.keys()].sort();
  check(JSON.stringify(lightNames) === JSON.stringify(darkNames), 'the light and dark themes name different tokens');
  return { themes, sourcesSha256 };
}

// ── Writing ──────────────────────────────────────────────────────────────

function rem(pxValue) {
  return `${+(pxValue / ROOT_FONT_PX).toFixed(4)}rem`;
}

function cssColour({ hex, alpha }) {
  if (alpha === 1) return hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r} ${g} ${b} / ${+alpha.toFixed(4)})`;
}

function cssFamily(families) {
  return families.map((f) => (/^[a-z-]+$/.test(f) ? f : `'${f}'`)).join(', ');
}

/** CSS custom property name of a colour token, as the website uses it. */
function cssColourName(path) {
  return `--color-${path.replace(/^color\./, '').replace(/^site\./, '').replaceAll('.', '-')}`;
}

/** Write the SHA-256 of the body, taken with the placeholder in place, into it. */
function sealed(body) {
  const bodySha = createHash('sha256').update(body).digest('hex');
  return body.replace(BODY_PLACEHOLDER, bodySha);
}

function websiteCss({ themes, sourcesSha256 }) {
  const v = themes.light.values;
  const get = (path) => v.get(path);
  const lines = [];
  const colourLines = (theme) => [...themes[theme].values]
    .filter(([path]) => path.startsWith('color.') && !path.startsWith('color.wiretrace.'))
    .map(([path, value]) => `  ${cssColourName(path)}: ${cssColour(value)};`);

  lines.push('/* SPDX-License-Identifier: MIT */');
  lines.push('/* Generated by design/generate.mjs from design/nuance.resolver.json. Do not edit:');
  lines.push(`   change the token files and run \`npm run tokens\`.`);
  lines.push(`   sources-sha256: ${sourcesSha256}`);
  lines.push(`   body-sha256: ${BODY_PLACEHOLDER} */`);
  lines.push('');
  lines.push('@theme {');
  lines.push('  /* Only the language\'s own values exist: Tailwind\'s defaults are removed. */');
  for (const ns of ['color', 'font', 'font-weight', 'text', 'tracking', 'leading', 'radius', 'shadow', 'ease', 'breakpoint', 'container']) {
    lines.push(`  --${ns}-*: initial;`);
  }
  lines.push(`  --spacing: ${rem(GRID)};`);
  for (const name of ['sans', 'serif', 'mono']) lines.push(`  --font-${name}: ${cssFamily(get(`font.family.${name}`))};`);
  for (const name of ['regular', 'medium', 'semibold']) lines.push(`  --font-weight-${name}: ${get(`font.weight.${name}`)};`);
  for (const [path, style] of v) {
    if (!path.startsWith('type.')) continue;
    const name = path.slice('type.'.length);
    lines.push(`  --text-${name}: ${rem(style.size)};`);
    lines.push(`  --text-${name}--line-height: ${rem(style.lineHeight)};`);
    lines.push(`  --text-${name}--letter-spacing: ${rem(style.letterSpacing)};`);
    lines.push(`  --text-${name}--font-weight: ${style.weight};`);
  }
  for (const name of ['xs', 'sm', 'md', 'lg', 'full']) lines.push(`  --radius-${name}: ${rem(get(`radius.${name}`))};`);
  for (const [path, token] of themes.light.tokens) {
    if (token.type !== 'shadow') continue;
    const s = get(path);
    const geometry = [s.offsetX, s.offsetY, s.blur, s.spread].map(rem).join(' ');
    lines.push(`  --shadow-${path.slice('shadow.'.length)}: ${geometry} var(${cssColourName(token.colourToken)});`);
  }
  lines.push(`  --ease-out: cubic-bezier(${get('motion.easing.out').join(', ')});`);
  lines.push(`  --ease-in-out: cubic-bezier(${get('motion.easing.in-out').join(', ')});`);
  for (const name of ['sm', 'md', 'lg', 'xl']) lines.push(`  --breakpoint-${name}: ${rem(get(`web.breakpoint.${name}`))};`);
  for (const name of ['narrow', 'default', 'wide']) lines.push(`  --container-${name}: ${rem(get(`web.container.${name}`))};`);
  lines.push(...colourLines('light'));
  lines.push('}');
  lines.push('');
  lines.push('/* Measures that are not Tailwind utilities, read with var(). */');
  lines.push(':root {');
  for (const [path, value] of v) {
    if (path.startsWith('motion.duration.')) lines.push(`  --duration-${path.split('.').pop()}: ${value}ms;`);
  }
  const typeOf = (path) => themes.light.tokens.get(path).type;
  for (const [path, value] of v) {
    if (!/^(size|border|grid|web\.gutter|web\.ambient)\./.test(path)) continue;
    const unit = typeOf(path) === 'dimension' ? 'px' : '';
    lines.push(`  --${path.replaceAll('.', '-')}: ${value}${unit};`);
  }
  lines.push('}');
  lines.push('');
  lines.push("[data-theme='dark'] {");
  lines.push(...colourLines('dark'));
  lines.push('}');
  lines.push('');
  return sealed(lines.join('\n'));
}

function pyString(value) {
  return JSON.stringify(value);
}

function wiretracePython({ themes, sourcesSha256 }) {
  const v = themes.light.values;
  const typeOf = (path) => themes.light.tokens.get(path).type;
  const section = (prefix, mapper = (x) => x) => [...v]
    .filter(([path]) => path.startsWith(prefix))
    .map(([path, value]) => `    ${pyString(path.slice(prefix.length))}: ${mapper(value)},`);
  const colours = (theme) => [...themes[theme].values]
    .filter(([path]) => path.startsWith('color.') && !path.startsWith('color.site.'))
    .map(([path, value]) => `        ${pyString(path.slice('color.'.length))}: (${pyString(value.hex.toUpperCase())}, ${value.alpha}),`);
  const lines = [
    '# SPDX-License-Identifier: GPL-3.0-or-later',
    '"""The Nuance Design Language, as WireTrace reads it.',
    '',
    'Generated by design/generate.mjs in the website repository',
    '(TheNuanceProject.github.io) from design/nuance.resolver.json. Do not',
    'edit: change the token files there and generate again. ``tokens.py``',
    'builds the palettes, sizes and type styles from these values.',
    '"""',
    '',
    `SOURCES_SHA256 = ${pyString(sourcesSha256)}`,
    `BODY_SHA256 = ${pyString(BODY_PLACEHOLDER)}`,
    '',
    '#: Font families, first choice first.',
    'FONT_FAMILIES: dict[str, tuple[str, ...]] = {',
    ...section('font.family.', (f) => `(${f.map(pyString).join(', ')})`),
    '}',
    '',
    'FONT_WEIGHTS: dict[str, int] = {',
    ...section('font.weight.'),
    '}',
    '',
    '#: Type styles: family role, size and line height in logical pixels,',
    '#: weight, letter spacing in logical pixels.',
    'TYPE_STYLES: dict[str, tuple[str, int, int, int, float]] = {',
    ...section('type.', (s) => {
      const role = Object.entries({ sans: v.get('font.family.sans'), serif: v.get('font.family.serif'), mono: v.get('font.family.mono') })
        .find(([, families]) => JSON.stringify(families) === JSON.stringify(s.family))[0];
      return `(${pyString(role)}, ${s.size}, ${s.lineHeight}, ${s.weight}, ${s.letterSpacing})`;
    }),
    '}',
    '',
    '#: Every measure in logical pixels, by its token path.',
    'MEASURES: dict[str, int] = {',
    ...[...v].filter(([path]) => typeOf(path) === 'dimension'
      && /^(space|size|border|radius|grid|web|wiretrace)\./.test(path))
      .map(([path, value]) => `    ${pyString(path)}: ${value},`),
    '}',
    '',
    '#: Numbers that are not measures (a count, a share), by their token path.',
    'NUMBERS: dict[str, int | float] = {',
    ...[...v].filter(([path]) => typeOf(path) === 'number')
      .map(([path, value]) => `    ${pyString(path)}: ${value},`),
    '}',
    '',
    'DURATIONS_MS: dict[str, int] = {',
    ...section('motion.duration.'),
    '}',
    '',
    'EASINGS: dict[str, tuple[float, float, float, float]] = {',
    ...section('motion.easing.', (e) => `(${e.join(', ')})`),
    '}',
    '',
    '#: Colours of each theme: (#RRGGBB, opacity), by role.',
    'COLOURS: dict[str, dict[str, tuple[str, float]]] = {',
    ...THEMES.flatMap((theme) => [`    ${pyString(theme)}: {`, ...colours(theme), '    },']),
    '}',
    '',
  ];
  return sealed(lines.join('\n'));
}

/** The measures, for the site's code that needs a number (an icon's size, a line's width). */
function websiteScript({ themes, sourcesSha256 }) {
  const v = themes.light.values;
  const typeOf = (path) => themes.light.tokens.get(path).type;
  const lines = [
    '// SPDX-License-Identifier: MIT',
    '/**',
    ' * The Nuance Design Language\'s measures, in pixels, for code that needs a',
    ' * number rather than a class: an icon\'s size, the width of a drawn line.',
    ' *',
    ' * Generated by design/generate.mjs from design/nuance.resolver.json. Do not',
    ' * edit: change the token files and run `npm run tokens`.',
    ` * sources-sha256: ${sourcesSha256}`,
    ` * body-sha256: ${BODY_PLACEHOLDER}`,
    ' */',
    '',
    'export const MEASURES = {',
    ...[...v].filter(([path]) => typeOf(path) === 'dimension' && !path.startsWith('wiretrace.'))
      .map(([path, value]) => `  '${path}': ${value},`),
    '} as const;',
    '',
    'export type Measure = keyof typeof MEASURES;',
    '',
    '/** Opaque colours of each theme, as #rrggbb, by role. */',
    'export const COLOURS = {',
    ...THEMES.flatMap((theme) => [
      `  ${theme}: {`,
      ...[...themes[theme].values]
        .filter(([path, value]) => path.startsWith('color.') && !path.startsWith('color.wiretrace.') && value.alpha === 1)
        .map(([path, value]) => `    '${path.replace(/^color\.(site\.)?/, '')}': '${value.hex}',`),
      '  },',
    ]),
    '} as const;',
    '',
    '/** Font families, first choice first. */',
    'export const FONT_FAMILIES = {',
    ...['sans', 'serif', 'mono'].map((name) => `  ${name}: [${v.get(`font.family.${name}`).map((f) => `'${f}'`).join(', ')}],`),
    '} as const;',
    '',
    '/** The type scale: sizes and line heights in pixels. */',
    'export const TYPE = {',
    ...[...v].filter(([path]) => path.startsWith('type.')).map(([path, style]) =>
      `  '${path.slice('type.'.length)}': { size: ${style.size}, lineHeight: ${style.lineHeight}, weight: ${style.weight}, letterSpacing: ${style.letterSpacing} },`),
    '} as const;',
    '',
  ];
  return sealed(lines.join('\n'));
}

// ── Command line ─────────────────────────────────────────────────────────

export function outputs(wiretraceRoot) {
  const resolved = resolveThemes();
  const files = [[SITE_OUTPUT, websiteCss(resolved)], [SITE_SCRIPT_OUTPUT, websiteScript(resolved)]];
  if (wiretraceRoot) {
    const root = resolve(wiretraceRoot);
    if (!existsSync(join(root, 'version.py'))) {
      throw new TokenError(`${root} is not a WireTrace checkout (it has no version.py)`);
    }
    files.push([join(root, WIRETRACE_OUTPUT), wiretracePython(resolved)]);
  }
  return files;
}

function main(args) {
  const checkOnly = args.includes('--check');
  const at = args.indexOf('--wiretrace');
  const wiretraceRoot = at >= 0 ? args[at + 1] : undefined;
  if (at >= 0 && !wiretraceRoot) throw new TokenError('--wiretrace needs the path of a WireTrace checkout');
  let stale = 0;
  for (const [path, text] of outputs(wiretraceRoot)) {
    const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (current === text) {
      console.log(`up to date: ${path}`);
    } else if (checkOnly) {
      console.error(`out of date: ${path}`);
      stale += 1;
    } else {
      writeFileSync(path, text, 'utf8');
      console.log(`written: ${path}`);
    }
  }
  return stale === 0 ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof TokenError)) throw error;
    console.error(`design tokens: ${error.message}`);
    process.exitCode = 1;
  }
}

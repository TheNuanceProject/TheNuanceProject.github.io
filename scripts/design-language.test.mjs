// SPDX-License-Identifier: MIT
/**
 * The site follows the Nuance Design Language: every class a component
 * uses is one Tailwind makes from the language's tokens, and no class
 * writes a value of its own.
 *
 * Tailwind ignores a class it cannot make, without a word; so does a
 * browser. These tests make the build fail instead.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '@tailwindcss/node';
import { beforeAll, describe, expect, it } from 'vitest';

import { classNames } from './class-names.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STYLES = join(ROOT, 'app', 'styles', 'globals.css');

/** @type {{ name: string, file: string, line: number }[]} */
const found = classNames(ROOT);
const where = (item) => `${item.file}:${item.line} ${item.name}`;

/** The class names globals.css defines itself, and Tailwind's markers. */
function ownClasses(css) {
  const names = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.([a-z][a-z0-9-]*)/g)].map((m) => m[1]);
  return new Set([...names, 'group']);
}

/** The value written inside a class's brackets, if any. */
function arbitrary(name) {
  return name.match(/\[([^\]]+)\]/)?.[1] ?? null;
}

const LENGTH = /\d(?:px|rem|em|pt|pc|cm|mm|in|q|ms|s)\b/i;
const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const TYPE_UTILITY = /^(?:[a-z-]+:)*-?(?:text|leading|tracking|font)-\[/;
const OFF_GRID_STEP = /^(?:[a-z-]+:)*-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|w|h|size|top|right|bottom|left|inset|translate-x|translate-y)-([1-9]\d*)\.5$/;

describe('the classes of the site', () => {
  let unknown;
  let own;

  beforeAll(async () => {
    const css = readFileSync(STYLES, 'utf8');
    own = ownClasses(css);
    // Tailwind adds each class it is given to what it has made so far; a
    // class that adds nothing is one it cannot make.
    const compiler = await compile(css, { base: dirname(STYLES), onDependency: () => {} });
    let made = compiler.build([]);
    unknown = new Set();
    for (const name of [...new Set(found.map((item) => item.name))].sort()) {
      if (own.has(name)) continue;
      const next = compiler.build([name]);
      if (next === made) unknown.add(name);
      made = next;
    }
  });

  it('are found in the components', () => {
    expect(found.length).toBeGreaterThan(500);
  });

  it('are each one Tailwind makes from the tokens, or one the site defines', () => {
    expect(found.filter((item) => unknown.has(item.name)).map(where)).toEqual([]);
  });

  it('write no length, colour or type of their own', () => {
    const bad = found.filter((item) => {
      const value = arbitrary(item.name);
      if (value === null) return false;
      if (LENGTH.test(value) || COLOUR.test(value) || /['"]/.test(value)) return true;
      return TYPE_UTILITY.test(item.name) && !/^var\(--[\w-]+\)$/.test(value);
    });
    expect(bad.map(where)).toEqual([]);
  });

  it('take their durations and delays from the tokens', () => {
    const literal = /^(?:[a-z-]+:)*(?:duration|delay)-\d+$/;
    expect(found.filter((item) => literal.test(item.name)).map(where)).toEqual([]);
  });

  it('keep to the 4-pixel grid', () => {
    expect(found.filter((item) => OFF_GRID_STEP.test(item.name)).map(where)).toEqual([]);
  });
});

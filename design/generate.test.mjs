// SPDX-License-Identifier: MIT
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { TokenError, contrast, outputs, resolveThemes } from './generate.mjs';

const DESIGN_DIR = dirname(fileURLToPath(import.meta.url));
const copies = [];

/** A copy of the token sources, changed by `edit(file, json)`. */
function changedSources(file, edit) {
  const dir = mkdtempSync(join(tmpdir(), 'nuance-tokens-'));
  copies.push(dir);
  cpSync(join(DESIGN_DIR, 'nuance.resolver.json'), join(dir, 'nuance.resolver.json'));
  cpSync(join(DESIGN_DIR, 'tokens'), join(dir, 'tokens'), { recursive: true });
  const path = join(dir, 'tokens', file);
  const json = JSON.parse(readFileSync(path, 'utf8'));
  edit(json);
  writeFileSync(path, JSON.stringify(json));
  return join(dir, 'nuance.resolver.json');
}

function srgb(hex) {
  const components = [1, 3, 5].map((i) => +(parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(6));
  return { colorSpace: 'srgb', components, hex };
}

afterEach(() => {
  while (copies.length) rmSync(copies.pop(), { recursive: true, force: true });
});

describe('the design tokens', () => {
  it('resolve and pass every rule in both themes', () => {
    const { themes, sourcesSha256 } = resolveThemes();
    expect(sourcesSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(themes.light.values.get('type.ui')).toMatchObject({ size: 13, lineHeight: 20 });
  });

  it('match the website\'s generated files, which were not edited by hand', () => {
    const files = outputs();
    expect(files).toHaveLength(2);
    for (const [path, text] of files) {
      const current = readFileSync(path, 'utf8');
      expect(current).toBe(text);
      const bodySha = current.match(/body-sha256: ([0-9a-f]{64})/)[1];
      const body = current.replace(bodySha, '@@BODY_SHA256@@');
      expect(createHash('sha256').update(body).digest('hex')).toBe(bodySha);
    }
  });

  it('measure contrast as WCAG does', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });
});

describe('the generator refuses', () => {
  const refuses = (file, edit, message) => {
    const resolver = changedSources(file, edit);
    expect(() => resolveThemes(resolver)).toThrow(TokenError);
    expect(() => resolveThemes(resolver)).toThrow(message);
  };

  it('text below 4.5:1', () => {
    refuses('theme/light.tokens.json', (j) => { j.color['text-tertiary'].$value = srgb('#9a9a98'); },
      /light: text-tertiary on paper is .*needs 4\.5:1/);
  });

  it('a control edge below 3:1', () => {
    refuses('theme/dark.tokens.json', (j) => { j.color.edge.$value = srgb('#3a3a37'); },
      /dark: edge on paper is .*needs 3:1/);
  });

  it('a measure off the 4-pixel grid', () => {
    refuses('base.tokens.json', (j) => { j.size.control.md.$value = { value: 30, unit: 'px' }; },
      'size.control.md (30) is off the 4-pixel grid');
  });

  it('a line height off the grid', () => {
    refuses('base.tokens.json', (j) => { j.type.ui.$value.lineHeight = 1.4; },
      /type\.ui: its line height/);
  });

  it('a reference to a token that does not exist', () => {
    refuses('base.tokens.json', (j) => { j.type.ui.$value.fontFamily = '{font.family.display}'; },
      'type.ui refers to font.family.display, which does not exist');
  });

  it('a colour whose hex and components differ', () => {
    refuses('theme/light.tokens.json', (j) => { j.color.paper.$value.hex = '#ffffff'; },
      'color.paper: components #faf9f5 and hex #ffffff differ');
  });

  it('a measure that differs between themes', () => {
    refuses('theme/dark.tokens.json', (j) => { j.radius = { $type: 'dimension', sm: { $value: { value: 8, unit: 'px' } } }; },
      'radius.sm differs between themes; only colours may');
  });
});

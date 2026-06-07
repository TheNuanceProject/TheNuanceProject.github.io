// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { highlightCode } from './highlight';

describe('highlightCode', () => {
  it('highlights a known language with dual-theme variables', async () => {
    const html = await highlightCode('const x: number = 1;', 'typescript');
    expect(html).not.toBeNull();
    expect(html).toContain('shiki');
    expect(html).toContain('--shiki-dark');
  });

  it('resolves aliases (ts -> typescript)', async () => {
    expect(await highlightCode('let y = 2;', 'ts')).toContain('shiki');
  });

  it('falls back to a styled block for an unknown language', async () => {
    const html = await highlightCode('plain text here', 'made-up-lang');
    expect(html).not.toBeNull();
    expect(html).toContain('shiki');
  });
});

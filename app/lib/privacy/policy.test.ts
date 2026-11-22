// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import { PolicyError, parsePolicy } from './policy';

const HEAD = '# Privacy policy\n\nLast updated 19 November 2026\n\n## 1. Who we are\n\n';
const policy = (body: string) => `${HEAD}${body}\n`;

describe('the privacy policy, read by the rules WireTrace reads it by', () => {
  it('reads the title, the day, sections, paragraphs, lists, bold and links', () => {
    const read = parsePolicy(policy(
      'One line\ngoes on.\n\n- **First:** item\n- [Second](https://example.org/a) item\n\nMail [a@b.c](mailto:a@b.c).',
    ));

    expect(read.title).toBe('Privacy policy');
    expect(read.updated).toBe('Last updated 19 November 2026');
    expect(read.sections).toEqual([{
      label: '1. Who we are',
      blocks: [
        { texts: [[{ text: 'One line goes on.', bold: false, url: null }]], isList: false },
        {
          texts: [
            [{ text: 'First:', bold: true, url: null }, { text: ' item', bold: false, url: null }],
            [{ text: 'Second', bold: false, url: 'https://example.org/a' }, { text: ' item', bold: false, url: null }],
          ],
          isList: true,
        },
        {
          texts: [[
            { text: 'Mail ', bold: false, url: null },
            { text: 'a@b.c', bold: false, url: 'mailto:a@b.c' },
            { text: '.', bold: false, url: null },
          ]],
          isList: false,
        },
      ],
    }]);
  });

  it.each([
    ['Phé text', 'only ASCII'],
    ['Text\twith a tab', 'control character'],
    ['Text ', 'ends with a space'],
    ['A *single* star', 'markup'],
    ['Some _emphasis_', 'markup'],
    ['A `code` span', 'markup'],
    ['An <b>element</b>', 'markup'],
    ['A [plain](http://example.org) link', 'markup'],
    ['A [script](javascript:alert) link', 'markup'],
    ['> A quote', 'markup'],
    ['### A smaller heading', 'markup'],
    ['1. A numbered list', 'markup'],
    ['* Another list', 'markup'],
    ['- An item\nand a line that is not', 'every line of a list'],
    ['## Heading\nwith text under it', 'a line of its own'],
    ['A back\\slash', 'markup'],
  ])('refuses %j', (markdown, why) => {
    expect(() => parsePolicy(policy(markdown))).toThrow(PolicyError);
    expect(() => parsePolicy(policy(markdown))).toThrow(why);
  });

  it.each([
    ['Privacy policy\n\nLast updated 1 May 2026\n\n## A\n\nText\n', 'the title'],
    ['# Privacy policy\n\nUpdated 1 May 2026\n\n## A\n\nText\n', 'Last updated'],
    ['# Privacy policy\n\nLast updated 1 May 2026\n\nText first\n\n## A\n\nText\n', 'before the first section'],
    ['# Privacy policy\n\nLast updated 1 May 2026\n\n## A\n\n## B\n\nText\n', 'is empty'],
    ['# Privacy policy\r\n\r\nLast updated 1 May 2026\r\n\r\n## A\r\n\r\nText\r\n', 'line feed'],
    ['# Privacy policy\n', 'sections are needed'],
    ['# Privacy policy\n\nLast updated 1 May 2026\n\n## A\n\nText\x1f\n', 'control character'],
    ['# \x1fPrivacy policy\n\nLast updated 1 May 2026\n\n## A\n\nText\n', 'control character'],
    ['# Privacy policy\n\nLast updated 1 May 2026\n\n## A\n\n\x1cText\n', 'control character'],
    ['# Privacy policy\n\nLast updated 1 May 2026\n\n## A\n\nA bell \x07 rings\n', 'control character'],
  ])('refuses a policy out of shape: %j', (markdown, why) => {
    expect(() => parsePolicy(markdown)).toThrow(why);
  });
});

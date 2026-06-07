// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { adjacentWriting, relatedWriting } from './writing';
import type { ResolvedWriting } from './types';

/** Minimal stub — these helpers only read `slug` and list order. */
const piece = (slug: string): ResolvedWriting =>
  ({ slug }) as unknown as ResolvedWriting;

// Newest-first list, as `allWriting` is sorted.
const list = [piece('c'), piece('b'), piece('a')];

describe('adjacentWriting', () => {
  it('returns the newer and older neighbours', () => {
    expect(adjacentWriting(list, 'b')).toEqual({
      newer: list[0],
      older: list[2],
    });
  });

  it('omits `newer` for the newest piece', () => {
    expect(adjacentWriting(list, 'c')).toEqual({
      newer: undefined,
      older: list[1],
    });
  });

  it('omits `older` for the oldest piece', () => {
    expect(adjacentWriting(list, 'a')).toEqual({
      newer: list[1],
      older: undefined,
    });
  });

  it('returns an empty object for an unknown slug', () => {
    expect(adjacentWriting(list, 'unknown')).toEqual({});
  });
});

describe('relatedWriting', () => {
  it('excludes the current slug and caps at n', () => {
    expect(relatedWriting(list, 'b', 2)).toEqual([list[0], list[2]]);
  });

  it('returns fewer when there are not enough pieces', () => {
    expect(relatedWriting([piece('only')], 'only', 3)).toEqual([]);
  });
});

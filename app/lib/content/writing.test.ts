// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { aboutErrors, adjacentWriting, newerRelease, relatedWriting } from './writing';
import type { ResolvedProject, ResolvedWriting } from './types';

/** Minimal stub: these helpers only read `slug` and list order. */
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

/** Minimal stub: these helpers read `slug`, `title` and `version`. */
const project = (slug: string, version: string): ResolvedProject =>
  ({ slug, title: 'WireTrace', version }) as unknown as ResolvedProject;

const projects = [project('wiretrace', '2.0.0')];

describe('newerRelease', () => {
  it('names the later release when the piece describes an earlier one', () => {
    expect(newerRelease({ project: 'wiretrace', version: '1.1.0' }, projects)).toEqual({
      slug: 'wiretrace',
      title: 'WireTrace',
      described: '1.1.0',
      latest: '2.0.0',
    });
  });

  it('is null for a piece about the current release', () => {
    expect(newerRelease({ project: 'wiretrace', version: '2.0.0' }, projects)).toBeNull();
  });

  it('is null for a piece about no release', () => {
    expect(newerRelease(undefined, projects)).toBeNull();
  });

  it('follows the project as it is released, with nothing in the piece changed', () => {
    const about = { project: 'wiretrace', version: '2.0.0' };
    expect(newerRelease(about, [project('wiretrace', '2.1.0')])?.latest).toBe('2.1.0');
  });
});

describe('aboutErrors', () => {
  it('accepts a release of a project there is', () => {
    expect(aboutErrors({ project: 'wiretrace', version: '1.1.0' }, projects)).toEqual([]);
    expect(aboutErrors({ project: 'wiretrace', version: '2.0.0' }, projects)).toEqual([]);
  });

  it('refuses a project there is not', () => {
    expect(aboutErrors({ project: 'wiretrac', version: '1.1.0' }, projects)[0]).toContain('"wiretrac"');
  });

  it('refuses a version not written major.minor.patch', () => {
    expect(aboutErrors({ project: 'wiretrace', version: 'v1.1.0' }, projects)[0]).toContain('major.minor.patch');
  });

  it('refuses a version later than the current one', () => {
    expect(aboutErrors({ project: 'wiretrace', version: '2.0.1' }, projects)[0]).toContain('later than');
  });
});

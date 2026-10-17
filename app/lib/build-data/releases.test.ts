// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import { ReleasesError, readReleases, releasesApi, repositoryOf } from './releases';

const REPO = 'https://github.com/TheNuanceProject/WireTrace';

function release(tag: string, changes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tag_name: tag,
    published_at: '2026-06-21T10:00:00Z',
    html_url: `${REPO}/releases/tag/${tag}`,
    draft: false,
    prerelease: false,
    ...changes,
  };
}

describe('readReleases', () => {
  it('keeps stable releases, newest version first, with their day', () => {
    const read = readReleases(
      [release('v1.1.0', { published_at: '2026-05-29T08:00:00Z' }), release('v1.2.0'), release('v1.10.0')],
      REPO,
    );

    expect(read.map((r) => r.version)).toEqual(['1.10.0', '1.2.0', '1.1.0']);
    expect(read[2]).toEqual({ version: '1.1.0', date: '2026-05-29', url: `${REPO}/releases/tag/v1.1.0` });
  });

  it.each([
    ['a draft', release('v2.0.0', { draft: true })],
    ['a prerelease', release('v2.0.0', { prerelease: true })],
    ['a tag that is not a version', release('nightly')],
    ['a link to another repository', release('v2.0.0', { html_url: 'https://github.com/someone/else/releases/tag/v2.0.0' })],
    ['a link elsewhere', release('v2.0.0', { html_url: 'javascript:alert(1)' })],
    ['no date', release('v2.0.0', { published_at: null })],
  ])('leaves out %s', (_, value) => {
    expect(readReleases([value, release('v1.2.0')], REPO).map((r) => r.version)).toEqual(['1.2.0']);
  });

  it('refuses an answer that is not a list', () => {
    expect(() => readReleases({ message: 'rate limited' }, REPO)).toThrow(ReleasesError);
  });
});

describe('repositoryOf', () => {
  it('names the repository of a GitHub address and its releases API', () => {
    expect(repositoryOf(REPO)).toBe('TheNuanceProject/WireTrace');
    expect(releasesApi(REPO)).toBe('https://api.github.com/repos/TheNuanceProject/WireTrace/releases?per_page=100');
  });

  it.each(['https://gitlab.com/a/b', 'https://github.com/a', 'https://github.com/a/b/c', 'http://github.com/a/b'])(
    'refuses %s',
    (url) => {
      expect(() => repositoryOf(url)).toThrow(ReleasesError);
    },
  );
});

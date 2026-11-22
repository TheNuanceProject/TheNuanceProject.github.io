// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getReleaseBenchmarks } from './data.server';
import fromTheTool from './fixtures/benchmarks-from-the-tool.json';
import { releasesApi } from './releases';

const REPO = 'https://github.com/TheNuanceProject/WireTrace';
const PROJECT = { githubUrl: REPO, version: '2.2.0' };
const FILE = `${REPO}/releases/download/v2.2.0/benchmarks.json`;
const ASSET = 'https://release-assets.githubusercontent.com/github-production-release-asset/1/2?sig=abc';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('getReleaseBenchmarks', () => {
  it("follows GitHub's redirect for the release's file to its host for release files", async () => {
    vi.stubEnv('BUILD_DATA_DIR', '');
    const asked: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      asked.push(input);
      if (input === releasesApi(REPO)) {
        return Response.json([{
          tag_name: 'v2.2.0', published_at: '2026-11-22T10:00:00Z', html_url: `${REPO}/releases/tag/v2.2.0`,
          draft: false, prerelease: false,
        }]);
      }
      if (input === FILE) return new Response(null, { status: 302, headers: { Location: ASSET } });
      if (input === ASSET) return Response.json(fromTheTool);
      throw new TypeError(`no such address: ${input}`);
    }));

    const read = await getReleaseBenchmarks(PROJECT);

    expect(read.machines).toHaveLength(2);
    expect(asked).toEqual([releasesApi(REPO), FILE, ASSET]);
  });
});

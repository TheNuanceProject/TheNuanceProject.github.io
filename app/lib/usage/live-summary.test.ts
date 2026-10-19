// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import { SUMMARY_MAX_BYTES, UsageSummaryError, readUsageSummary } from '~/lib/build-data/usage-summary';

import { LiveSummaryError, type SummaryFetch, fetchLiveSummary, laterSummary } from './live-summary';

const URL = 'https://example.org/updates/wiretrace/summary.json';

/** A summary exactly as the update server writes it. */
function written(changes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    day: 20_743,
    active: { day: 2, week: 2, month: 2 },
    countries: ['IN'],
    versions: [{ name: '2.0.0', share: 1 }],
    systems: [{ name: 'windows', share: 1 }],
    places: [{ lat: 12.5, lon: 77.5, pulse: true }],
    legacyChecks: 0,
    trend: { start: 20_654, counts: [...Array.from({ length: 89 }, () => 0), 2] },
    ...changes,
  };
}

/** A fetch that answers `body` with `status`, and records what it was asked. */
function answering(status: number, body: string, headers: Record<string, string> = {}) {
  const asked: { url: string; init: RequestInit }[] = [];
  const fetcher: SummaryFetch = async (url, init) => {
    asked.push({ url, init });
    return new Response(status === 404 ? null : body, { status, headers });
  };
  return { fetcher, asked };
}

describe('fetchLiveSummary', () => {
  it('reads the summary, checked as the build checks it', async () => {
    const { fetcher } = answering(200, JSON.stringify(written()));

    expect(await fetchLiveSummary(URL, fetcher)).toEqual(readUsageSummary(written()));
  });

  it('asks past any cached copy, without cookies, for JSON', async () => {
    const { fetcher, asked } = answering(200, JSON.stringify(written()));

    await fetchLiveSummary(URL, fetcher);

    expect(asked).toHaveLength(1);
    expect(asked[0]?.url).toBe(URL);
    expect(asked[0]?.init).toMatchObject({ cache: 'no-cache', credentials: 'omit', headers: { Accept: 'application/json' } });
  });

  it('passes on the signal that cancels it', async () => {
    const { fetcher, asked } = answering(200, JSON.stringify(written()));
    const controller = new AbortController();

    await fetchLiveSummary(URL, fetcher, controller.signal);

    expect(asked[0]?.init.signal).toBe(controller.signal);
  });

  it('is null before the update server has made a summary', async () => {
    expect(await fetchLiveSummary(URL, answering(404, '').fetcher)).toBeNull();
  });

  it.each([500, 503, 403])('refuses an answer of %i', async (status) => {
    await expect(fetchLiveSummary(URL, answering(status, '{}').fetcher)).rejects.toThrow(LiveSummaryError);
  });

  it('refuses an answer that declares itself larger than any summary', async () => {
    const { fetcher } = answering(200, JSON.stringify(written()), { 'Content-Length': String(SUMMARY_MAX_BYTES + 1) });

    await expect(fetchLiveSummary(URL, fetcher)).rejects.toThrow(LiveSummaryError);
  });

  it('refuses an answer larger than any summary', async () => {
    const { fetcher } = answering(200, 'x'.repeat(SUMMARY_MAX_BYTES + 1));

    await expect(fetchLiveSummary(URL, fetcher)).rejects.toThrow(LiveSummaryError);
  });

  it('refuses an answer that is not JSON', async () => {
    await expect(fetchLiveSummary(URL, answering(200, '<html>').fetcher)).rejects.toThrow(LiveSummaryError);
  });

  it('refuses JSON that is not exactly a summary', async () => {
    const { fetcher } = answering(200, JSON.stringify(written({ extra: 1 })));

    await expect(fetchLiveSummary(URL, fetcher)).rejects.toThrow(UsageSummaryError);
  });
});

describe('laterSummary', () => {
  const built = readUsageSummary(written());

  it('takes the summary read in the browser when there was none at build time', () => {
    expect(laterSummary(null, built)).toBe(built);
  });

  it('takes a summary of a later day', () => {
    const next = readUsageSummary(written({ day: 20_744, trend: { start: 20_655, counts: [...Array.from({ length: 89 }, () => 0), 2] } }));

    expect(laterSummary(built, next)).toBe(next);
  });

  it('takes a summary of the same day, made later in it', () => {
    const next = readUsageSummary(written({ places: [{ lat: 12.5, lon: 77.5, pulse: true }, { lat: 48.5, lon: 2.5, pulse: true }] }));

    expect(laterSummary(built, next)).toBe(next);
  });

  it('keeps the summary it has over one of an earlier day', () => {
    const earlier = readUsageSummary(written({ day: 20_742, trend: { start: 20_653, counts: [...Array.from({ length: 89 }, () => 0), 2] } }));

    expect(laterSummary(built, earlier)).toBe(built);
  });
});

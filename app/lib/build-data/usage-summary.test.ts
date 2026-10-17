// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import { LIMITS, UsageSummaryError, dayDate, readUsageSummary } from './usage-summary';

/** A summary exactly as the update server writes it. */
function summary(changes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    day: 20_740,
    active: { day: 41, week: 118, month: 263 },
    countries: ['IN', 'DE'],
    versions: [{ name: '2.0.0', share: 0.81 }, { name: 'other', share: 0.19 }],
    systems: [{ name: 'windows', share: 0.72 }, { name: 'linux', share: 0.28 }],
    places: [{ lat: 12.402, lon: 77.596, pulse: true }],
    legacyChecks: 3,
    trend: { start: 20_651, counts: [...Array.from({ length: 89 }, (_, i) => i), 41] },
    ...changes,
  };
}

describe('readUsageSummary', () => {
  it('reads a summary as the update server writes it, countries sorted', () => {
    const read = readUsageSummary(summary());

    expect(read.countries).toEqual(['DE', 'IN']);
    expect(read.active).toEqual({ day: 41, week: 118, month: 263 });
    expect(read.trend.counts).toHaveLength(90);
    expect(read.places[0]).toEqual({ lat: 12.402, lon: 77.596, pulse: true });
  });

  it('reads a summary with no trend yet', () => {
    expect(readUsageSummary(summary({ trend: { start: 20_651, counts: [] } })).trend.counts).toEqual([]);
  });

  it.each([
    ['a field too many', summary({ extra: 1 })],
    ['a field missing', (() => { const s = summary(); delete s.trend; return s; })()],
    ['a count below zero', summary({ legacyChecks: -1 })],
    ['a count that is not whole', summary({ active: { day: 1.5, week: 2, month: 3 } })],
    ['a country that is not a code', summary({ countries: ['India'] })],
    ['markup in a country', summary({ countries: ['<b>'] })],
    ['markup in a version', summary({ versions: [{ name: '<script>', share: 1 }] })],
    ['a share above one', summary({ systems: [{ name: 'windows', share: 1.2 }] })],
    ['a place off the globe', summary({ places: [{ lat: 91, lon: 0, pulse: false }] })],
    ['a place with a count', summary({ places: [{ lat: 1, lon: 1, pulse: true, count: 1 }] })],
    ['a pulse that is not true or false', summary({ places: [{ lat: 1, lon: 1, pulse: 1 }] })],
    ['a trend past its day', summary({ trend: { start: 20_740, counts: [1, 2] } })],
    ['a trend whose last day differs from active.day', summary({ trend: { start: 20_739, counts: [40, 42] } })],
    ['too many trend days', summary({ trend: { start: 0, counts: Array(LIMITS.trendDays + 1).fill(0) } })],
    ['a list where an object belongs', summary({ active: [1, 2, 3] })],
    ['nothing', null],
  ])('refuses a summary with %s', (_, value) => {
    expect(() => readUsageSummary(value)).toThrow(UsageSummaryError);
  });
});

describe('dayDate', () => {
  it('names the UTC date of a day number', () => {
    expect(dayDate(0)).toBe('1970-01-01');
    expect(dayDate(20_740)).toBe('2026-10-14');
  });
});

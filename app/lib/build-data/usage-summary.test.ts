// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import { LIMITS, UsageSummaryError, countryCodes, dayDate, readUsageSummary } from './usage-summary';

const DAY = 20_740;

function place(changes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    lat: 12.402,
    lon: 77.596,
    seen: DAY + 1,
    installations: 3,
    area: { name: 'Bengaluru', country: 'IN' },
    ...changes,
  };
}

/** A summary exactly as the update server writes it. */
function summary(changes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    day: DAY,
    active: { day: 41, week: 118, month: 263 },
    countries: [{ code: 'DE', installations: 12 }, { code: 'IN', installations: 200 }],
    versions: [{ name: '2.0.0', share: 0.81 }, { name: 'other', share: 0.19 }],
    systems: [{ name: 'windows', share: 0.72 }, { name: 'linux', share: 0.28 }],
    places: [place()],
    legacyChecks: 3,
    trend: { start: 20_651, counts: [...Array.from({ length: 89 }, (_, i) => i), 41] },
    ...changes,
  };
}

describe('readUsageSummary', () => {
  it('reads a summary as the update server writes it, countries with most installations first', () => {
    const read = readUsageSummary(summary());

    expect(read.countries).toEqual([{ code: 'IN', installations: 200 }, { code: 'DE', installations: 12 }]);
    expect(read.active).toEqual({ day: 41, week: 118, month: 263 });
    expect(read.trend.counts).toHaveLength(90);
    expect(read.places[0]).toEqual(place());
  });

  it('orders countries with as many installations by code', () => {
    const read = readUsageSummary(summary({
      countries: [{ code: 'IN', installations: 5 }, { code: 'DE', installations: 5 }],
    }));

    expect(read.countries.map((country) => country.code)).toEqual(['DE', 'IN']);
  });

  it('reads an area with no name, and areas seen from 29 days before its day to the day after', () => {
    const places = [place({ area: null }), place({ seen: DAY - LIMITS.placeDays }), place({ seen: DAY })];

    expect(readUsageSummary(summary({ places })).places).toEqual(places);
  });

  it('reads the names of places as GeoNames writes them', () => {
    const area = { name: 'Dolores Hidalgo Cuna de la Independencia Nacional', country: 'MX' };

    expect(readUsageSummary(summary({ places: [place({ area })] })).places[0]?.area).toEqual(area);
  });

  it('reads a summary with no trend yet', () => {
    expect(readUsageSummary(summary({ trend: { start: 20_651, counts: [] } })).trend.counts).toEqual([]);
  });

  it.each([
    ['a field too many', summary({ extra: 1 })],
    ['a field missing', (() => { const s = summary(); delete s.trend; return s; })()],
    ['a count below zero', summary({ legacyChecks: -1 })],
    ['a count that is not whole', summary({ active: { day: 1.5, week: 2, month: 3 } })],
    ['a country given as a code alone', summary({ countries: ['IN'] })],
    ['a country that is not a code', summary({ countries: [{ code: 'India', installations: 1 }] })],
    ['markup in a country', summary({ countries: [{ code: '<b>', installations: 1 }] })],
    ['a country with no installations', summary({ countries: [{ code: 'IN', installations: 0 }] })],
    ['a country given twice', summary({ countries: [{ code: 'IN', installations: 1 }, { code: 'IN', installations: 2 }] })],
    ['countries with more installations than were active', summary({ countries: [{ code: 'IN', installations: 264 }] })],
    ['markup in a version', summary({ versions: [{ name: '<script>', share: 1 }] })],
    ['a share above one', summary({ systems: [{ name: 'windows', share: 1.2 }] })],
    ['a place off the globe', summary({ places: [place({ lat: 91 })] })],
    ['a place in the old form', summary({ places: [{ lat: 1, lon: 1, pulse: true }] })],
    ['a place with a field too many', summary({ places: [{ ...place(), pulse: true }] })],
    ['a place seen before the 30 days', summary({ places: [place({ seen: DAY - LIMITS.placeDays - 1 })] })],
    ['a place seen after the day it was made', summary({ places: [place({ seen: DAY + 2 })] })],
    ['a place with no installations', summary({ places: [place({ installations: 0 })] })],
    ['a place with part of an installation', summary({ places: [place({ installations: 1.5 })] })],
    ['an area with no name', summary({ places: [place({ area: { name: '', country: 'IN' } })] })],
    ['an area name with spaces around it', summary({ places: [place({ area: { name: ' Pune', country: 'IN' } })] })],
    ['an area name with a control character', summary({ places: [place({ area: { name: 'Pu\u0000ne', country: 'IN' } })] })],
    ['an area name too long', summary({ places: [place({ area: { name: 'x'.repeat(LIMITS.areaName + 1), country: 'IN' } })] })],
    ['an area whose country is not a code', summary({ places: [place({ area: { name: 'Pune', country: 'India' } })] })],
    ['an area with a field too many', summary({ places: [place({ area: { name: 'Pune', country: 'IN', people: 1 } })] })],
    ['a trend past its day', summary({ trend: { start: 20_740, counts: [1, 2] } })],
    ['a trend whose last day differs from active.day', summary({ trend: { start: 20_739, counts: [40, 42] } })],
    ['too many trend days', summary({ trend: { start: 0, counts: Array(LIMITS.trendDays + 1).fill(0) } })],
    ['a list where an object belongs', summary({ active: [1, 2, 3] })],
    ['nothing', null],
  ])('refuses a summary with %s', (_, value) => {
    expect(() => readUsageSummary(value)).toThrow(UsageSummaryError);
  });
});

describe('countryCodes', () => {
  it('gives the codes of the countries and of the areas, once each, sorted', () => {
    const read = readUsageSummary(summary({
      places: [place(), place({ area: { name: 'Berlin', country: 'DE' } }), place({ area: { name: 'Lyon', country: 'FR' } }), place({ area: null })],
    }));

    expect(countryCodes(read)).toEqual(['DE', 'FR', 'IN']);
  });
});

describe('dayDate', () => {
  it('names the UTC date of a day number', () => {
    expect(dayDate(0)).toBe('1970-01-01');
    expect(dayDate(20_740)).toBe('2026-10-14');
  });
});

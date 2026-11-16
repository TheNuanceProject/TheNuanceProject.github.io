// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import {
  LIMITS,
  MAP_PERIOD_DAYS,
  TREND_DAYS,
  UsageSummaryError,
  countryCodes,
  dayDate,
  readUsageSummary,
} from './usage-summary';

/** 2026-10-14, 09:30 UTC: day 20,740. */
const MADE_AT = '2026-10-14T09:30:00.000Z';
const DAY = 20_740;

function place(changes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: 'city',
    lat: 13,
    lon: 77.6,
    name: { name: 'Bengaluru', country: 'IN' },
    country: 'IN',
    installations: { count: 199, lastSeen: DAY },
    legacy: null,
    ...changes,
  };
}

const BERLIN = place({
  lat: 52.5, lon: 13.4, name: { name: 'Berlin', country: 'DE' }, country: 'DE', installations: { count: 12, lastSeen: DAY - 3 },
});

function trend(today = 41): Record<string, unknown> {
  return { start: DAY - TREND_DAYS + 1, counts: [...Array.from({ length: TREND_DAYS - 1 }, (_, i) => i), today] };
}

/** A summary exactly as the update server writes it: 263 installations in
 *  the 30 days, 200 in India (199 placed, 1 without a place), 12 in
 *  Germany, 51 of no known country. */
function summary(changes: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    madeAt: MADE_AT,
    day: DAY,
    active: { today: 41, week: 118, month: 263, halfYear: 400 },
    downloads: {
      total: 104,
      packages: [{ format: 'exe', count: 84 }, { format: 'appimage', count: 17 }, { format: 'deb', count: 3 }],
    },
    countries: [{ code: 'DE', installations: 12, withoutPlace: 0 }, { code: 'IN', installations: 200, withoutPlace: 1 }],
    withoutCountry: 51,
    legacyChecks: 3,
    versions: [{ name: '2.0.0', share: 0.81 }, { name: 'other', share: 0.19 }],
    systems: [{ name: 'windows', share: 0.72 }, { name: 'linux', share: 0.28 }],
    places: [place(), BERLIN],
    trend: trend(),
    ...changes,
  };
}

describe('readUsageSummary', () => {
  it('reads a summary as the update server writes it, countries with most installations first', () => {
    const read = readUsageSummary(summary());

    expect(read.madeAt).toBe(Date.parse(MADE_AT));
    expect(read.day).toBe(DAY);
    expect(read.active).toEqual({ today: 41, week: 118, month: 263, halfYear: 400 });
    expect(read.downloads.total).toBe(104);
    expect(read.countries.map((country) => country.code)).toEqual(['IN', 'DE']);
    expect(read.trend.counts).toHaveLength(TREND_DAYS);
    expect(read.places[0]).toEqual(place());
  });

  it('orders countries with as many installations by code', () => {
    const read = readUsageSummary(summary({
      active: { today: 0, week: 2, month: 2, halfYear: 2 },
      countries: [{ code: 'IN', installations: 1, withoutPlace: 1 }, { code: 'DE', installations: 1, withoutPlace: 1 }],
      withoutCountry: 0,
      places: [place({ installations: null, legacy: { count: 1, lastSeen: DAY } })],
      trend: trend(0),
    }));

    expect(read.countries.map((country) => country.code)).toEqual(['DE', 'IN']);
  });

  it('reads cities with no name, of no known country, and seen on any day of the 30', () => {
    const places = [
      place({ installations: { count: 190, lastSeen: DAY - MAP_PERIOD_DAYS + 1 } }),
      place({ name: null, installations: { count: 9, lastSeen: DAY } }),
      place({ lat: 52.5, lon: 13.4, name: { name: 'Berlin', country: 'DE' }, country: 'DE', installations: { count: 12, lastSeen: DAY } }),
      place({ lat: -49.5, lon: -139.5, name: null, country: 'XX', installations: { count: 51, lastSeen: DAY } }),
    ];

    expect(readUsageSummary(summary({ places })).places).toEqual(places);
  });

  it('reads the areas of the checks before the switch to cities beside the cities after it', () => {
    const places = [
      place({ kind: 'area', lat: 12.972, lon: 77.594, installations: { count: 150, lastSeen: DAY - 20 } }),
      place({ kind: 'area', lat: -49.5, lon: -139.5, name: null, country: 'XX', installations: { count: 51, lastSeen: DAY - 20 } }),
      place({ installations: { count: 49, lastSeen: DAY } }),
      BERLIN,
    ];

    expect(readUsageSummary(summary({ places })).places).toEqual(places);
  });

  it('reads a place with 1.x checks only, and one with both', () => {
    const places = [
      place(),
      place({ lat: 52.5, lon: 13.4, name: { name: 'Berlin', country: 'DE' }, country: 'DE', installations: { count: 12, lastSeen: DAY } }),
      place({ lat: 51.5, lon: -0.1, name: { name: 'London', country: 'GB' }, country: 'GB', installations: null, legacy: { count: 2, lastSeen: DAY - 3 } }),
    ];

    expect(readUsageSummary(summary({ places })).places).toEqual(places);
  });

  it('reads the names of places as Cloudflare and GeoNames write them', () => {
    const longest = { name: 'S'.repeat(LIMITS.placeName), country: 'MX' };
    const geoNames = { name: 'Dolores Hidalgo Cuna de la Independencia Nacional', country: 'MX' };
    const read = readUsageSummary(summary({ places: [place({ name: longest }), BERLIN] }));
    const area = readUsageSummary(summary({ places: [place({ kind: 'area', name: geoNames }), BERLIN] }));

    expect(read.places[0]?.name).toEqual(longest);
    expect(area.places[0]?.name).toEqual(geoNames);
  });

  it.each([
    ['a field too many', summary({ extra: 1 })],
    ['a field missing', (() => { const s = summary(); delete s.trend; return s; })()],
    ['a summary of the earlier form', { day: DAY, active: { day: 1, week: 1, month: 1 } }],
    ['a time that is not ISO 8601 UTC', summary({ madeAt: '2026-10-14 09:30' })],
    ['a time that is not a real one', summary({ madeAt: '2026-02-30T09:30:00.000Z' })],
    ['a day that is not the day it was made', summary({ day: DAY + 1 })],
    ['a count below zero', summary({ legacyChecks: -1 })],
    ['a count that is not whole', summary({ active: { today: 1.5, week: 118, month: 263, halfYear: 400 } })],
    ['a field of an earlier form', summary({ active: { today: 41, week: 118, month: 263, halfYear: 400, sinceLaunch: 512 } })],
    ['a longer period with fewer installations', summary({ active: { today: 41, week: 300, month: 263, halfYear: 400 } })],
    ['a package WireTrace is not made in', summary({ downloads: { total: 1, packages: [{ format: 'dmg', count: 1 }] } })],
    ['a package given twice', summary({ downloads: { total: 2, packages: [{ format: 'exe', count: 1 }, { format: 'exe', count: 1 }] } })],
    ['downloads that do not add up', summary({ downloads: { total: 105, packages: [{ format: 'exe', count: 104 }] } })],
    ['a country given as a code alone', summary({ countries: ['IN'] })],
    ['a country that is not a code', summary({ countries: [{ code: 'India', installations: 200, withoutPlace: 1 }] })],
    ['markup in a country', summary({ countries: [{ code: '<b>', installations: 1, withoutPlace: 0 }] })],
    ['the unknown country among the countries', summary({ countries: [{ code: 'XX', installations: 212, withoutPlace: 212 }], places: [] })],
    ['a country with no installations', summary({ countries: [{ code: 'IN', installations: 0, withoutPlace: 0 }] })],
    ['more without an area than a country has', summary({ countries: [{ code: 'DE', installations: 12, withoutPlace: 13 }, { code: 'IN', installations: 200, withoutPlace: 1 }] })],
    ['a country given twice', summary({ countries: [{ code: 'IN', installations: 1, withoutPlace: 0 }, { code: 'IN', installations: 2, withoutPlace: 0 }] })],
    ['countries that do not add up to the total', summary({ withoutCountry: 50 })],
    ['places that do not add up to their country', summary({ places: [place({ installations: { count: 198, lastSeen: DAY } }), BERLIN] })],
    ['installations in a place of a country not listed', summary({ places: [place(), BERLIN, place({ country: 'FR', name: { name: 'Paris', country: 'FR' } })] })],
    ['markup in a version', summary({ versions: [{ name: '<script>', share: 1 }] })],
    ['a share above one', summary({ systems: [{ name: 'windows', share: 1.2 }] })],
    ['a place off the globe', summary({ places: [place({ lat: 91 }), BERLIN] })],
    ['a place of the earliest form', summary({ places: [{ lat: 1, lon: 1, area: null, installations: { seen: DAY, count: 1 }, legacy: null }] })],
    ['a place of the area-only form', summary({ places: [{ lat: 12.972, lon: 77.594, area: { name: 'Bengaluru', country: 'IN' }, country: 'IN', installations: { count: 199, lastSeen: DAY }, legacy: null }, BERLIN] })],
    ['a kind of place the server does not give', summary({ places: [place({ kind: 'street' }), BERLIN] })],
    ['a place with no kind', summary({ places: [place({ kind: null }), BERLIN] })],
    ['a place with a field too many', summary({ places: [{ ...place(), pulse: true }, BERLIN] })],
    ['a place with neither installations nor checks', summary({ places: [place({ installations: null }), BERLIN] })],
    ['installations seen before the 30 days', summary({ places: [place({ installations: { count: 199, lastSeen: DAY - MAP_PERIOD_DAYS } }), BERLIN] })],
    ['installations seen after the day it was made', summary({ places: [place({ installations: { count: 199, lastSeen: DAY + 1 } }), BERLIN] })],
    ['no installations given as a count', summary({ places: [place({ installations: { count: 0, lastSeen: DAY } }), BERLIN] })],
    ['part of an installation', summary({ places: [place({ installations: { count: 1.5, lastSeen: DAY } }), BERLIN] })],
    ['installations given as a number alone', summary({ places: [place({ installations: 199 }), BERLIN] })],
    ['1.x checks with a field too many', summary({ places: [place({ legacy: { count: 1, lastSeen: DAY, extra: 1 } }), BERLIN] })],
    ['a place with no name', summary({ places: [place({ name: { name: '', country: 'IN' } }), BERLIN] })],
    ['a place name with spaces around it', summary({ places: [place({ name: { name: ' Pune', country: 'IN' } }), BERLIN] })],
    ['a place name with a control character', summary({ places: [place({ name: { name: 'Pu\u0000ne', country: 'IN' } }), BERLIN] })],
    ['a place name with a C1 control character', summary({ places: [place({ name: { name: 'Pu\u0085ne', country: 'IN' } }), BERLIN] })],
    ['a place name too long', summary({ places: [place({ name: { name: 'x'.repeat(LIMITS.placeName + 1), country: 'IN' } }), BERLIN] })],
    ['a place name whose country is not a code', summary({ places: [place({ name: { name: 'Pune', country: 'India' } }), BERLIN] })],
    ['a place name with a field too many', summary({ places: [place({ name: { name: 'Pune', country: 'IN', people: 1 } }), BERLIN] })],
    ['a trend that does not end on its day', summary({ trend: { start: DAY - TREND_DAYS, counts: (trend().counts as number[]) } })],
    ['a trend that is not 90 days', summary({ trend: { start: DAY - 1, counts: [40, 41] } })],
    ['a trend whose last day differs from active.today', summary({ trend: trend(40) })],
    ['a list where an object belongs', summary({ active: [1, 2, 3] })],
    ['nothing', null],
  ])('refuses a summary with %s', (_, value) => {
    expect(() => readUsageSummary(value)).toThrow(UsageSummaryError);
  });
});

describe('countryCodes', () => {
  it('gives the codes of the countries, of the checks and of the places, once each, sorted, never XX', () => {
    const read = readUsageSummary(summary({
      places: [
        place(), BERLIN,
        place({ kind: 'area', name: { name: 'Lyon', country: 'FR' }, country: 'FR', installations: null, legacy: { count: 1, lastSeen: DAY } }),
        place({ name: null, country: 'XX', installations: null, legacy: { count: 1, lastSeen: DAY } }),
        place({ name: { name: 'Somewhere', country: 'XX' }, country: 'XX', installations: null, legacy: { count: 1, lastSeen: DAY } }),
      ],
    }));

    expect(countryCodes(read)).toEqual(['DE', 'FR', 'IN']);
  });
});

describe('dayDate', () => {
  it('names the UTC date of a day number', () => {
    expect(dayDate(0)).toBe('1970-01-01');
    expect(dayDate(DAY)).toBe('2026-10-14');
  });
});

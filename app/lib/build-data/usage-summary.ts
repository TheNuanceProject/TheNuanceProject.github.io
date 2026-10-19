// SPDX-License-Identifier: MIT
/**
 * The public summary of WireTrace's update server, as the usage page
 * reads it.
 *
 * The summary is made by the update server (`wiretrace-updates`, its
 * `src/summary.ts`). The site reads it when it is built, and the usage
 * page reads it again when it opens in a browser. Nothing in it is
 * trusted: `readUsageSummary` accepts only exactly the fields and values
 * that server writes, and refuses the whole summary otherwise: the build
 * stops instead of publishing anything unexpected, and the page keeps the
 * figures it was built with.
 */

/** The name of a one-degree area: its place with the most people. */
export interface UsageArea {
  readonly name: string;
  /** ISO 3166-1 alpha-2 code of that place's country. */
  readonly country: string;
}

/** A one-degree area 2.x installations checked in from. */
export interface UsagePlace {
  /** A fixed point inside the area. */
  readonly lat: number;
  readonly lon: number;
  /** The last day installations checked in from the area: a day number,
   *  from 29 days before the summary's `day` to the day after it (the
   *  day the summary was made, which may still be in progress). */
  readonly seen: number;
  /** Installations that checked in from the area on `seen`, each once. */
  readonly installations: number;
  /** Null when the area has no place of 1,000 people. */
  readonly area: UsageArea | null;
}

/** A country 2.x installations were active in. */
export interface UsageCountry {
  /** ISO 3166-1 alpha-2. */
  readonly code: string;
  /** Installations active in the country in the 30 days to `day`. */
  readonly installations: number;
}

export interface UsageShare {
  readonly name: string;
  /** Between 0 and 1. */
  readonly share: number;
}

export interface UsageSummary {
  /** The last complete day the totals cover, as days since 1 January
   *  1970, UTC. */
  readonly day: number;
  readonly active: { readonly day: number; readonly week: number; readonly month: number };
  /** Most installations first; countries with as many by code. */
  readonly countries: readonly UsageCountry[];
  readonly versions: readonly UsageShare[];
  readonly systems: readonly UsageShare[];
  readonly places: readonly UsagePlace[];
  /** WireTrace 1.x update checks on `day`. */
  readonly legacyChecks: number;
  /** Installations active on each day from `start`, a day number. */
  readonly trend: { readonly start: number; readonly counts: readonly number[] };
}

export class UsageSummaryError extends Error {
  override readonly name = 'UsageSummaryError';
}

const SUMMARY_FIELDS = ['day', 'active', 'countries', 'versions', 'systems', 'places', 'legacyChecks', 'trend'];
const ACTIVE_FIELDS = ['day', 'week', 'month'];
const SHARE_FIELDS = ['name', 'share'];
const COUNTRY_FIELDS = ['code', 'installations'];
const PLACE_FIELDS = ['lat', 'lon', 'seen', 'installations', 'area'];
const AREA_FIELDS = ['name', 'country'];
const TREND_FIELDS = ['start', 'counts'];

/** The largest summary accepted, in bytes: more than a summary with
 *  every one-degree area of the Earth in it. */
export const SUMMARY_MAX_BYTES = 8 * 1024 * 1024;

/** Bounds that no real summary comes near; anything past them is not one. */
export const LIMITS = {
  countries: 250,
  shares: 64,
  /** One for each one-degree area of the Earth: 180 by 360. */
  places: 64_800,
  /** Characters in an area's name. GeoNames' longest is under 60. */
  areaName: 100,
  /** The days before the summary's day a place can have been seen. */
  placeDays: 29,
  trendDays: 366,
  count: 1_000_000_000,
  day: 1_000_000,
} as const;

const COUNTRY = /^[A-Z]{2}$/;
/** The C0 controls end before this code point; the C1 controls are
 *  `DELETE_CHAR` to `C1_LAST`. No place name holds one. */
const C0_END = 0x20;
const DELETE_CHAR = 0x7f;
const C1_LAST = 0x9f;

function hasControl(text: string): boolean {
  for (const char of text) {
    const point = char.codePointAt(0) as number;
    if (point < C0_END || (point >= DELETE_CHAR && point <= C1_LAST)) return true;
  }
  return false;
}
/** A version (`2.0.0`), a system (`windows`), or `other`. */
const SHARE_NAME = /^[a-z0-9][a-z0-9._-]{0,31}$/;

function object(value: unknown, fields: readonly string[], what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new UsageSummaryError(`${what} is not an object`);
  }
  const keys = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (keys.length !== expected.length || keys.some((key, i) => key !== expected[i])) {
    throw new UsageSummaryError(`${what} does not have exactly the fields ${expected.join(', ')}`);
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, most: number, what: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length > most) {
    throw new UsageSummaryError(`${what} is not a list of at most ${most}`);
  }
  return value;
}

function count(value: unknown, what: string, most: number = LIMITS.count): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > most) {
    throw new UsageSummaryError(`${what} is not a whole number from 0 to ${most}`);
  }
  return value;
}

function code(value: unknown, what: string): string {
  if (typeof value !== 'string' || !COUNTRY.test(value)) {
    throw new UsageSummaryError(`${what} is not a country code`);
  }
  return value;
}

function between(value: unknown, low: number, high: number, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < low || value > high) {
    throw new UsageSummaryError(`${what} is not a number from ${low} to ${high}`);
  }
  return value;
}

function shares(value: unknown, what: string): UsageShare[] {
  return list(value, LIMITS.shares, what).map((item, i) => {
    const share = object(item, SHARE_FIELDS, `${what}[${i}]`);
    if (typeof share.name !== 'string' || !SHARE_NAME.test(share.name)) {
      throw new UsageSummaryError(`${what}[${i}].name is not a name the update server gives`);
    }
    return { name: share.name, share: between(share.share, 0, 1, `${what}[${i}].share`) };
  });
}

function areaOf(value: unknown, what: string): UsageArea {
  const area = object(value, AREA_FIELDS, what);
  const name = area.name;
  if (
    typeof name !== 'string' ||
    name.trim() !== name ||
    name === '' ||
    [...name].length > LIMITS.areaName ||
    hasControl(name)
  ) {
    throw new UsageSummaryError(`${what}.name is not the name of a place`);
  }
  return { name, country: code(area.country, `${what}.country`) };
}

/**
 * The summary in `value`, checked field by field.
 *
 * @throws UsageSummaryError when it is not exactly a summary.
 */
export function readUsageSummary(value: unknown): UsageSummary {
  const summary = object(value, SUMMARY_FIELDS, 'the summary');
  const active = object(summary.active, ACTIVE_FIELDS, 'active');
  const day = count(summary.day, 'day', LIMITS.day);
  const month = count(active.month, 'active.month');
  const countries = list(summary.countries, LIMITS.countries, 'countries').map((item, i): UsageCountry => {
    const country = object(item, COUNTRY_FIELDS, `countries[${i}]`);
    const installations = count(country.installations, `countries[${i}].installations`);
    if (installations === 0) {
      throw new UsageSummaryError(`countries[${i}] has no installations`);
    }
    return { code: code(country.code, `countries[${i}].code`), installations };
  });
  if (new Set(countries.map((country) => country.code)).size !== countries.length) {
    throw new UsageSummaryError('a country is given twice');
  }
  // The update server counts each installation once in the 30 days, in
  // one country, and leaves out those it could not place.
  if (countries.reduce((total, country) => total + country.installations, 0) > month) {
    throw new UsageSummaryError("the countries' installations add up to more than active.month");
  }
  const places = list(summary.places, LIMITS.places, 'places').map((item, i): UsagePlace => {
    const place = object(item, PLACE_FIELDS, `places[${i}]`);
    const seen = count(place.seen, `places[${i}].seen`, LIMITS.day);
    if (seen < day - LIMITS.placeDays || seen > day + 1) {
      throw new UsageSummaryError(`places[${i}].seen is not within the days a summary of its day covers`);
    }
    const installations = count(place.installations, `places[${i}].installations`);
    if (installations === 0) {
      throw new UsageSummaryError(`places[${i}] has no installations`);
    }
    return {
      lat: between(place.lat, -90, 90, `places[${i}].lat`),
      lon: between(place.lon, -180, 180, `places[${i}].lon`),
      seen,
      installations,
      area: place.area === null ? null : areaOf(place.area, `places[${i}].area`),
    };
  });
  const trend = object(summary.trend, TREND_FIELDS, 'trend');
  const counts = list(trend.counts, LIMITS.trendDays, 'trend.counts').map((n, i) => count(n, `trend.counts[${i}]`));
  const start = count(trend.start, 'trend.start', LIMITS.day);
  if (counts.length > 0 && start + counts.length - 1 > day) {
    throw new UsageSummaryError('the trend runs past the day the summary covers');
  }
  const activeDay = count(active.day, 'active.day');
  // The update server counts both from the same checks, so a trend that
  // reaches the summary's day gives that day the same figure.
  if (counts.length > 0 && start + counts.length - 1 === day && counts[counts.length - 1] !== activeDay) {
    throw new UsageSummaryError("the trend's last day does not match active.day");
  }
  return {
    day,
    active: {
      day: activeDay,
      week: count(active.week, 'active.week'),
      month,
    },
    countries: countries.sort(
      (a, b) => b.installations - a.installations || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0)
    ),
    versions: shares(summary.versions, 'versions'),
    systems: shares(summary.systems, 'systems'),
    places,
    legacyChecks: count(summary.legacyChecks, 'legacyChecks'),
    trend: { start, counts },
  };
}

/** Every country code `summary` names, of countries and of areas, sorted. */
export function countryCodes(summary: UsageSummary): string[] {
  const codes = new Set(summary.countries.map((country) => country.code));
  for (const place of summary.places) {
    if (place.area) codes.add(place.area.country);
  }
  return [...codes].sort();
}

const MS_PER_DAY = 86_400_000;

/** The date of a day number, as `YYYY-MM-DD`. */
export function dayDate(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

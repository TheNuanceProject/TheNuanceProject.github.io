// SPDX-License-Identifier: MIT
/**
 * The public summary of WireTrace's update server, as the usage page
 * reads it.
 *
 * The summary is made by the update server (`wiretrace-updates`, its
 * `src/summary.ts`). The site reads it when it is built, and the usage
 * page reads it again when it opens in a browser. Nothing in it is
 * trusted: `readUsageSummary` accepts only exactly the fields and values
 * that server writes, and only a summary that adds up the way that server
 * makes it, and refuses the whole summary otherwise: the build stops
 * instead of publishing anything unexpected, and the page keeps the
 * figures it was built with.
 *
 * Every figure covers a period that ends with the summary's `day`, the
 * UTC day of `madeAt`, and includes it. A 2.x installation is counted
 * once in a period, in the country and area of its first check in it, so
 * the areas of a country add up to the country, and the countries, with
 * the installations of no known country, add up to the period's total.
 */

/** The named place of a one-degree area: its place with the most people. */
export interface UsageArea {
  readonly name: string;
  /** ISO 3166-1 alpha-2 code of that place's country. */
  readonly country: string;
}

/** A count in the map period, and the last day anything was counted. */
export interface UsageCount {
  /** A whole number from 1. */
  readonly count: number;
  /** A day number in the map period: from `MAP_PERIOD_DAYS - 1` days
   *  before the summary's `day` to that day. */
  readonly lastSeen: number;
}

/** A one-degree area and country WireTrace checked for updates from. */
export interface UsagePlace {
  /** Where its marker sits: the area's named place, or its middle. */
  readonly lat: number;
  readonly lon: number;
  /** Null when the area has no place of 1,000 people. */
  readonly area: UsageArea | null;
  /** The country the checks came from; `XX` when Cloudflare gave none. */
  readonly country: string;
  /** 2.x installations counted in the area in the map period. */
  readonly installations: UsageCount | null;
  /** WireTrace 1.x update checks from the area in the map period:
   *  checks, never installations, since 1.x does not say when it last
   *  checked. */
  readonly legacy: UsageCount | null;
}

/** A country 2.x installations were active in. */
export interface UsageCountry {
  /** ISO 3166-1 alpha-2. */
  readonly code: string;
  /** Installations active in the country in the map period. */
  readonly installations: number;
  /** Of those, the installations whose area Cloudflare did not give. */
  readonly withoutArea: number;
}

export interface UsageShare {
  readonly name: string;
  /** Between 0 and 1. */
  readonly share: number;
}

/** The packages WireTrace is distributed in, as the update server names
 *  them, in the order it gives them. */
export const PACKAGE_FORMATS = ['exe', 'appimage', 'deb'] as const;
export type PackageFormat = (typeof PACKAGE_FORMATS)[number];

export interface UsageSummary {
  /** When the update server made the summary: milliseconds since 1970. */
  readonly madeAt: number;
  /** The UTC day of `madeAt`, as days since 1 January 1970. Every period
   *  ends with it and includes it. */
  readonly day: number;
  /** 2.x installations active in each period, each counted once. */
  readonly active: {
    readonly today: number;
    readonly week: number;
    readonly month: number;
    readonly halfYear: number;
  };
  /** Downloads of WireTrace's packages, as GitHub counts them. */
  readonly downloads: {
    readonly total: number;
    readonly packages: readonly { readonly format: PackageFormat; readonly count: number }[];
  };
  /** Most installations first; countries with as many by code. */
  readonly countries: readonly UsageCountry[];
  /** Installations in the map period whose country Cloudflare did not give. */
  readonly withoutCountry: number;
  /** WireTrace 1.x update checks in the map period. */
  readonly legacyChecks: number;
  readonly versions: readonly UsageShare[];
  readonly systems: readonly UsageShare[];
  readonly places: readonly UsagePlace[];
  /** Installations active on each day from `start`, a day number, to `day`. */
  readonly trend: { readonly start: number; readonly counts: readonly number[] };
}

export class UsageSummaryError extends Error {
  override readonly name = 'UsageSummaryError';
}

/** The days the countries, areas, versions and systems cover, ending
 *  with the summary's day. */
export const MAP_PERIOD_DAYS = 30;
/** The days the trend covers, ending with the summary's day. */
export const TREND_DAYS = 90;

const SUMMARY_FIELDS = [
  'madeAt', 'day', 'active', 'downloads', 'countries', 'withoutCountry', 'legacyChecks',
  'versions', 'systems', 'places', 'trend',
];
const ACTIVE_FIELDS = ['today', 'week', 'month', 'halfYear'];
const DOWNLOADS_FIELDS = ['total', 'packages'];
const PACKAGE_FIELDS = ['format', 'count'];
const SHARE_FIELDS = ['name', 'share'];
const COUNTRY_FIELDS = ['code', 'installations', 'withoutArea'];
const PLACE_FIELDS = ['lat', 'lon', 'area', 'country', 'installations', 'legacy'];
const COUNT_FIELDS = ['count', 'lastSeen'];
const AREA_FIELDS = ['name', 'country'];
const TREND_FIELDS = ['start', 'counts'];
/** The country Cloudflare gives no code for. */
export const UNKNOWN_COUNTRY = 'XX';

/** The largest summary accepted, in bytes: more than a summary with
 *  every one-degree area of the Earth in it. */
export const SUMMARY_MAX_BYTES = 8 * 1024 * 1024;

/** Bounds that no real summary comes near; anything past them is not one. */
export const LIMITS = {
  countries: 250,
  shares: 64,
  /** Each one-degree area of the Earth, 180 by 360, from a few countries. */
  places: 4 * 64_800,
  /** Characters in an area's name. GeoNames' longest is under 60. */
  areaName: 100,
  count: 1_000_000_000,
  day: 1_000_000,
} as const;

const MS_PER_DAY = 86_400_000;
/** An ISO 8601 UTC time as JavaScript writes it. */
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

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

function madeAtOf(value: unknown): number {
  if (typeof value !== 'string' || !ISO_TIME.test(value)) {
    throw new UsageSummaryError('madeAt is not an ISO 8601 UTC time');
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) {
    throw new UsageSummaryError('madeAt is not a real time');
  }
  return time;
}

function packageFormat(value: unknown, what: string): PackageFormat {
  const format = PACKAGE_FORMATS.find((known) => known === value);
  if (format === undefined) {
    throw new UsageSummaryError(`${what} is not a package of WireTrace`);
  }
  return format;
}

/**
 * The summary in `value`, checked field by field and against itself.
 *
 * @throws UsageSummaryError when it is not exactly a summary.
 */
export function readUsageSummary(value: unknown): UsageSummary {
  const summary = object(value, SUMMARY_FIELDS, 'the summary');
  const madeAt = madeAtOf(summary.madeAt);
  const day = count(summary.day, 'day', LIMITS.day);
  if (day !== Math.floor(madeAt / MS_PER_DAY)) {
    throw new UsageSummaryError('day is not the UTC day of madeAt');
  }

  const activePart = object(summary.active, ACTIVE_FIELDS, 'active');
  const active = {
    today: count(activePart.today, 'active.today'),
    week: count(activePart.week, 'active.week'),
    month: count(activePart.month, 'active.month'),
    halfYear: count(activePart.halfYear, 'active.halfYear'),
  };
  // A longer period ending the same day holds every installation of a
  // shorter one.
  if (!(active.today <= active.week && active.week <= active.month && active.month <= active.halfYear)) {
    throw new UsageSummaryError('a longer period has fewer active installations than a shorter one');
  }

  const downloadsPart = object(summary.downloads, DOWNLOADS_FIELDS, 'downloads');
  const packages = list(downloadsPart.packages, PACKAGE_FORMATS.length, 'downloads.packages').map((item, i) => {
    const part = object(item, PACKAGE_FIELDS, `downloads.packages[${i}]`);
    return {
      format: packageFormat(part.format, `downloads.packages[${i}].format`),
      count: count(part.count, `downloads.packages[${i}].count`),
    };
  });
  if (new Set(packages.map((item) => item.format)).size !== packages.length) {
    throw new UsageSummaryError('a package is given twice');
  }
  const downloadsTotal = count(downloadsPart.total, 'downloads.total');
  if (packages.reduce((total, item) => total + item.count, 0) !== downloadsTotal) {
    throw new UsageSummaryError("the packages' downloads do not add up to downloads.total");
  }

  const countries = list(summary.countries, LIMITS.countries, 'countries').map((item, i): UsageCountry => {
    const country = object(item, COUNTRY_FIELDS, `countries[${i}]`);
    const installations = count(country.installations, `countries[${i}].installations`);
    if (installations === 0) {
      throw new UsageSummaryError(`countries[${i}] has no installations`);
    }
    const withoutArea = count(country.withoutArea, `countries[${i}].withoutArea`, installations);
    const countryCode = code(country.code, `countries[${i}].code`);
    if (countryCode === UNKNOWN_COUNTRY) {
      throw new UsageSummaryError(`countries[${i}] is the country Cloudflare gives no code for`);
    }
    return { code: countryCode, installations, withoutArea };
  });
  if (new Set(countries.map((country) => country.code)).size !== countries.length) {
    throw new UsageSummaryError('a country is given twice');
  }
  const withoutCountry = count(summary.withoutCountry, 'withoutCountry');
  if (countries.reduce((total, country) => total + country.installations, 0) + withoutCountry !== active.month) {
    throw new UsageSummaryError('the countries and withoutCountry do not add up to active.month');
  }

  const firstDay = day - MAP_PERIOD_DAYS + 1;
  const countOf = (input: unknown, what: string): UsageCount | null => {
    if (input === null) return null;
    const part = object(input, COUNT_FIELDS, what);
    const n = count(part.count, `${what}.count`);
    if (n === 0) {
      throw new UsageSummaryError(`${what}.count is not from 1`);
    }
    const lastSeen = count(part.lastSeen, `${what}.lastSeen`, LIMITS.day);
    if (lastSeen < firstDay || lastSeen > day) {
      throw new UsageSummaryError(`${what}.lastSeen is not within the ${MAP_PERIOD_DAYS} days ending the summary's day`);
    }
    return { count: n, lastSeen };
  };
  const places = list(summary.places, LIMITS.places, 'places').map((item, i): UsagePlace => {
    const place = object(item, PLACE_FIELDS, `places[${i}]`);
    const installations = countOf(place.installations, `places[${i}].installations`);
    const legacy = countOf(place.legacy, `places[${i}].legacy`);
    if (installations === null && legacy === null) {
      throw new UsageSummaryError(`places[${i}] has neither installations nor 1.x checks`);
    }
    return {
      lat: between(place.lat, -90, 90, `places[${i}].lat`),
      lon: between(place.lon, -180, 180, `places[${i}].lon`),
      area: place.area === null ? null : areaOf(place.area, `places[${i}].area`),
      country: code(place.country, `places[${i}].country`),
      installations,
      legacy,
    };
  });
  const placed = new Map<string, number>();
  for (const place of places) {
    placed.set(place.country, (placed.get(place.country) ?? 0) + (place.installations?.count ?? 0));
  }
  for (const country of countries) {
    if ((placed.get(country.code) ?? 0) + country.withoutArea !== country.installations) {
      throw new UsageSummaryError(`the areas of ${country.code} do not add up to its installations`);
    }
  }
  const listed = new Set(countries.map((country) => country.code));
  for (const [placeCountry, installations] of placed) {
    if (placeCountry === UNKNOWN_COUNTRY ? installations > withoutCountry : installations > 0 && !listed.has(placeCountry)) {
      throw new UsageSummaryError(`the areas of ${placeCountry} hold installations its country does not have`);
    }
  }

  const trend = object(summary.trend, TREND_FIELDS, 'trend');
  const counts = list(trend.counts, TREND_DAYS, 'trend.counts').map((n, i) => count(n, `trend.counts[${i}]`));
  const start = count(trend.start, 'trend.start', LIMITS.day);
  if (start !== day - TREND_DAYS + 1 || counts.length !== TREND_DAYS) {
    throw new UsageSummaryError(`the trend is not the ${TREND_DAYS} days ending the summary's day`);
  }
  // The update server counts both from the same checks.
  if (counts[counts.length - 1] !== active.today) {
    throw new UsageSummaryError("the trend's last day does not match active.today");
  }

  return {
    madeAt,
    day,
    active,
    downloads: { total: downloadsTotal, packages },
    countries: countries.sort(
      (a, b) => b.installations - a.installations || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0)
    ),
    withoutCountry,
    legacyChecks: count(summary.legacyChecks, 'legacyChecks'),
    versions: shares(summary.versions, 'versions'),
    systems: shares(summary.systems, 'systems'),
    places,
    trend: { start, counts },
  };
}

/** Every country code `summary` names, of countries and of areas, sorted,
 *  without the one Cloudflare gives no code for. */
export function countryCodes(summary: UsageSummary): string[] {
  const codes = new Set(summary.countries.map((country) => country.code));
  for (const place of summary.places) {
    if (place.country !== UNKNOWN_COUNTRY) codes.add(place.country);
    if (place.area) codes.add(place.area.country);
  }
  return [...codes].sort();
}

/** The date of a day number, as `YYYY-MM-DD`. */
export function dayDate(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

// SPDX-License-Identifier: MIT
/**
 * The public summary of WireTrace's update server, as the usage page
 * reads it.
 *
 * The summary is made by the update server (`wiretrace-updates`, its
 * `src/summary.ts`) and fetched when the site is built. Nothing in it is
 * trusted: `readUsageSummary` accepts only exactly the fields and values
 * that server writes, and refuses the whole summary otherwise, so the
 * build stops instead of publishing anything unexpected.
 */

/** A place: a fixed point inside a one-degree area. */
export interface UsagePlace {
  readonly lat: number;
  readonly lon: number;
  /** A check came from the area today or yesterday. */
  readonly pulse: boolean;
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
  /** ISO 3166-1 alpha-2 codes, sorted. */
  readonly countries: readonly string[];
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
const PLACE_FIELDS = ['lat', 'lon', 'pulse'];
const TREND_FIELDS = ['start', 'counts'];

/** Bounds that no real summary comes near; anything past them is not one. */
export const LIMITS = {
  countries: 250,
  shares: 64,
  places: 65_000,
  trendDays: 366,
  count: 1_000_000_000,
  day: 1_000_000,
} as const;

const COUNTRY = /^[A-Z]{2}$/;
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

/**
 * The summary in `value`, checked field by field.
 *
 * @throws UsageSummaryError when it is not exactly a summary.
 */
export function readUsageSummary(value: unknown): UsageSummary {
  const summary = object(value, SUMMARY_FIELDS, 'the summary');
  const active = object(summary.active, ACTIVE_FIELDS, 'active');
  const countries = list(summary.countries, LIMITS.countries, 'countries').map((code, i) => {
    if (typeof code !== 'string' || !COUNTRY.test(code)) {
      throw new UsageSummaryError(`countries[${i}] is not a country code`);
    }
    return code;
  });
  const places = list(summary.places, LIMITS.places, 'places').map((item, i) => {
    const place = object(item, PLACE_FIELDS, `places[${i}]`);
    if (typeof place.pulse !== 'boolean') {
      throw new UsageSummaryError(`places[${i}].pulse is not true or false`);
    }
    return {
      lat: between(place.lat, -90, 90, `places[${i}].lat`),
      lon: between(place.lon, -180, 180, `places[${i}].lon`),
      pulse: place.pulse,
    };
  });
  const trend = object(summary.trend, TREND_FIELDS, 'trend');
  const counts = list(trend.counts, LIMITS.trendDays, 'trend.counts').map((n, i) => count(n, `trend.counts[${i}]`));
  const day = count(summary.day, 'day', LIMITS.day);
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
      month: count(active.month, 'active.month'),
    },
    countries: [...new Set(countries)].sort(),
    versions: shares(summary.versions, 'versions'),
    systems: shares(summary.systems, 'systems'),
    places,
    legacyChecks: count(summary.legacyChecks, 'legacyChecks'),
    trend: { start, counts },
  };
}

const MS_PER_DAY = 86_400_000;

/** The date of a day number, as `YYYY-MM-DD`. */
export function dayDate(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

// SPDX-License-Identifier: MIT
import type { IsoDate, DerivedDates } from './types';

/**
 * Date formatters: declared once, reused across the content system.
 *
 * All formats use en-US for consistency with the rest of the site's
 * editorial voice. A date is formatted in UTC, so it reads the same in
 * every timezone and the page a visitor's browser renders matches the
 * one that was built.
 */

const monthYearFmt = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const fullDateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Validate that a value is a well-formed ISO date string (YYYY-MM-DD)
 * and represents an actual calendar date.
 */
export function isValidIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  // Guard against dates like 2026-02-30 which `new Date` normalizes silently
  const roundTrip = d.toISOString().slice(0, 10);
  return roundTrip === value;
}

/**
 * Derive all display-ready date fields from published + optional updated.
 */
export function deriveDates(
  published: IsoDate,
  updated: IsoDate | undefined
): DerivedDates {
  const publishedObj = new Date(`${published}T12:00:00Z`);
  const updatedObj = updated
    ? new Date(`${updated}T12:00:00Z`)
    : null;

  const sortDate = updated ?? published;
  const sortObj = new Date(`${sortDate}T12:00:00Z`);

  return {
    displayDate: monthYearFmt.format(sortObj),
    publishedDate: fullDateFmt.format(publishedObj),
    updatedDate: updatedObj ? fullDateFmt.format(updatedObj) : null,
    sortDate,
  };
}

/** "April 15, 2026" for a YYYY-MM-DD date. */
export function formatIsoDate(value: IsoDate): string {
  return fullDateFmt.format(new Date(`${value}T12:00:00Z`));
}

// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { deriveDates, isValidIsoDate } from './dates';

describe('isValidIsoDate', () => {
  it('accepts well-formed ISO dates', () => {
    expect(isValidIsoDate('2026-04-15')).toBe(true);
    expect(isValidIsoDate('2000-01-01')).toBe(true);
    expect(isValidIsoDate('2099-12-31')).toBe(true);
  });

  it('rejects non-strings', () => {
    expect(isValidIsoDate(null)).toBe(false);
    expect(isValidIsoDate(undefined)).toBe(false);
    expect(isValidIsoDate(12345)).toBe(false);
    expect(isValidIsoDate({})).toBe(false);
  });

  it('rejects wrong shape', () => {
    expect(isValidIsoDate('')).toBe(false);
    expect(isValidIsoDate('not a date')).toBe(false);
    expect(isValidIsoDate('2026/04/15')).toBe(false);
    expect(isValidIsoDate('15-04-2026')).toBe(false);
    expect(isValidIsoDate('2026-4-15')).toBe(false); // must be zero-padded
  });

  it('rejects calendar-invalid dates', () => {
    // Guards against silent `Date` normalization. Without the
    // round-trip check, Feb 30 becomes Mar 2.
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('2026-04-31')).toBe(false);
  });
});

describe('deriveDates', () => {
  it('formats published date as "Month DD, YYYY"', () => {
    const result = deriveDates('2026-04-15', undefined);
    expect(result.publishedDate).toBe('April 15, 2026');
  });

  it('formats display date as "Month YYYY"', () => {
    const result = deriveDates('2026-04-15', undefined);
    expect(result.displayDate).toBe('April 2026');
  });

  it('returns null updatedDate when updated is not given', () => {
    const result = deriveDates('2026-04-15', undefined);
    expect(result.updatedDate).toBeNull();
  });

  it('formats updatedDate when given', () => {
    const result = deriveDates('2026-04-15', '2026-05-01');
    expect(result.updatedDate).toBe('May 1, 2026');
  });

  it('uses updated as sortDate when present, published otherwise', () => {
    expect(deriveDates('2026-04-15', '2026-05-01').sortDate).toBe('2026-05-01');
    expect(deriveDates('2026-04-15', undefined).sortDate).toBe('2026-04-15');
  });

  it('displayDate reflects updated month when present', () => {
    // Content that was updated in May should surface with May's label,
    // not April's — this is how revised pieces bubble up on the index.
    const result = deriveDates('2026-04-15', '2026-05-01');
    expect(result.displayDate).toBe('May 2026');
  });
});

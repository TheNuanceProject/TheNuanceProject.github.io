// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import { regionName, withRegionNames } from './region-names';

describe('regionName', () => {
  it('names a country in English', () => {
    expect(regionName('IN')).toBe('India');
    expect(regionName('DE')).toBe('Germany');
  });

  it('is undefined for a code with no country', () => {
    expect(regionName('QZ')).toBeUndefined();
  });
});

describe('withRegionNames', () => {
  it('keeps the names it is given and adds the missing ones', () => {
    const known = { IN: 'India', XK: 'Kosovo (map)' };

    expect(withRegionNames(known, ['IN', 'XK', 'DE'])).toEqual({ IN: 'India', XK: 'Kosovo (map)', DE: 'Germany' });
  });

  it('names a code with no country by the code', () => {
    expect(withRegionNames({}, ['QZ'])).toEqual({ QZ: 'QZ' });
  });

  it('does not change the names it is given', () => {
    const known = { IN: 'India' };

    withRegionNames(known, ['DE']);

    expect(known).toEqual({ IN: 'India' });
  });
});

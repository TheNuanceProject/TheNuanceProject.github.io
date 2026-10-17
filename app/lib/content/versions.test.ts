// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { compareVersions, isVersion } from './versions';

describe('isVersion', () => {
  it.each(['0.0.0', '1.1.0', '2.0.0', '10.20.30'])('accepts %s', (value) => {
    expect(isVersion(value)).toBe(true);
  });

  it.each(['', 'v1.1.0', '1.1', '1.1.0.0', '01.1.0', '1.1.0-rc.1', ' 1.1.0', 1, null, undefined])(
    'refuses %s',
    (value) => {
      expect(isVersion(value)).toBe(false);
    }
  );
});

describe('compareVersions', () => {
  it('orders by major, then minor, then patch', () => {
    expect(compareVersions('1.1.0', '2.0.0')).toBeLessThan(0);
    expect(compareVersions('2.0.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('2.1.0', '2.0.9')).toBeGreaterThan(0);
    expect(compareVersions('2.0.1', '2.0.0')).toBeGreaterThan(0);
  });

  it('compares numbers, not text', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
  });

  it('finds a version equal to itself', () => {
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
  });

  it('refuses what is not a version', () => {
    expect(() => compareVersions('v2.0.0', '2.0.0')).toThrow('not a version');
  });
});

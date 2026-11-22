// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import { shownMeasurement, shownOf } from './benchmarks-shown';

describe('shownMeasurement', () => {
  it('gives the lowest and highest when the runs differ as written', () => {
    expect(shownMeasurement('capacity_lines', { median: 185_000, lowest: 180_000, highest: 190_000 }))
      .toEqual({ median: '185,000', range: { lowest: '180,000', highest: '190,000' } });
  });

  it('gives no range when the runs differ only below what is written', () => {
    expect(shownMeasurement('idle_memory', { median: 159_300_000, lowest: 159_280_000, highest: 159_340_000 }))
      .toEqual({ median: '159 MB', range: null });
    expect(shownMeasurement('idle_processor', { median: 3.0, lowest: 2.96, highest: 3.04 }).range).toBeNull();
  });

  it("writes the load's measurements by their kind, at any rate", () => {
    expect(shownOf('load_10000_processor')(94.5)).toBe('94.5 %');
    expect(shownOf('load_1000_memory')(172_900_000)).toBe('173 MB');
    expect(shownOf('load_250_sent')(2000.4)).toBe('2,000');
    expect(shownOf('start')(1.534)).toBe('1.53 s');
  });
});

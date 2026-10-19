// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import { type Dot, layoutDots } from './dot-layout';

const SPACING = 8;

function closest(dots: readonly Dot[]): number {
  let least = Infinity;
  for (let i = 0; i < dots.length; i += 1) {
    for (let j = i + 1; j < dots.length; j += 1) {
      const [a, b] = [dots[i] as Dot, dots[j] as Dot];
      least = Math.min(least, Math.hypot(a[0] - b[0], a[1] - b[1]));
    }
  }
  return least;
}

describe('layoutDots', () => {
  it('places one dot on its area', () => {
    expect(layoutDots([{ x: 100, y: 50, count: 1 }], SPACING)).toEqual([[[100, 50]]]);
  });

  it('places every dot, nearest the area first, none closer than the spacing', () => {
    const [dots] = layoutDots([{ x: 0, y: 0, count: 19 }], SPACING) as [Dot[]];

    expect(dots).toHaveLength(19);
    expect(closest(dots)).toBeGreaterThanOrEqual(SPACING - 1e-9);
    // The centre, then the ring of six round it, then the ring of twelve.
    const rings = dots.map(([x, y]) => Math.round(Math.hypot(x, y) / SPACING));
    expect(rings[0]).toBe(0);
    expect(rings.slice(1, 7).every((k) => k === 1)).toBe(true);
    expect(rings.slice(7).every((k) => k === 2)).toBe(true);
  });

  it('keeps the dots of areas that meet apart, and places all of them', () => {
    const anchors = [
      { x: 0, y: 0, count: 30 },
      { x: 3, y: 1, count: 25 },
      { x: -2, y: 4, count: 12 },
    ];

    const laid = layoutDots(anchors, SPACING);

    expect(laid.map((dots) => dots.length)).toEqual([30, 25, 12]);
    expect(closest(laid.flat())).toBeGreaterThanOrEqual(SPACING - 1e-9);
  });

  it('leaves an area that does not meet another as it would be alone', () => {
    const alone = layoutDots([{ x: 500, y: 500, count: 7 }], SPACING)[0];
    const together = layoutDots([{ x: 0, y: 0, count: 7 }, { x: 500, y: 500, count: 7 }], SPACING)[1];

    expect(together).toEqual(alone);
  });

  it('places the same dots every time', () => {
    const anchors = [{ x: 10, y: 10, count: 40 }, { x: 14, y: 12, count: 9 }];

    expect(layoutDots(anchors, SPACING)).toEqual(layoutDots(anchors, SPACING));
  });

  it('places no dot for an area with none', () => {
    expect(layoutDots([{ x: 0, y: 0, count: 0 }], SPACING)).toEqual([[]]);
  });

  it.each([0, -1, Number.NaN])('refuses a spacing of %d', (spacing) => {
    expect(() => layoutDots([{ x: 0, y: 0, count: 1 }], spacing)).toThrow(RangeError);
  });

  it.each([-1, 1.5, Number.POSITIVE_INFINITY])('refuses a count of %d', (count) => {
    expect(() => layoutDots([{ x: 0, y: 0, count }], SPACING)).toThrow(RangeError);
  });
});

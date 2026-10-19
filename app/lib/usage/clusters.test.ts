// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import {
  BUBBLE_FROM,
  BUBBLE_RADIUS_MAX,
  BUBBLE_RADIUS_MIN,
  BUBBLE_RADIUS_PER_DOUBLING,
  DOT_RADIUS,
  DOT_SPACING,
  MARKER_GAP,
  type Marker,
  clusterMarkers,
  dotsOf,
  markerRadius,
} from './clusters';

function apartEnough(markers: readonly Marker[]): boolean {
  return markers.every((a, i) =>
    markers.slice(i + 1).every((b) => Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius + MARKER_GAP - 1e-9)
  );
}

describe('markerRadius', () => {
  it('is one dot for one installation', () => {
    expect(markerRadius(1)).toBe(DOT_RADIUS);
  });

  it('reaches round the dots of fewer than a bubble', () => {
    expect(markerRadius(BUBBLE_FROM - 1)).toBeCloseTo(DOT_SPACING + DOT_RADIUS);
    expect(dotsOf(BUBBLE_FROM - 1)).toHaveLength(BUBBLE_FROM - 1);
  });

  it('grows a bubble with the logarithm of its number, up to its largest', () => {
    expect(markerRadius(BUBBLE_FROM)).toBe(BUBBLE_RADIUS_MIN);
    expect(markerRadius(BUBBLE_FROM * 2)).toBe(BUBBLE_RADIUS_MIN + BUBBLE_RADIUS_PER_DOUBLING);
    expect(markerRadius(1_000_000_000)).toBe(BUBBLE_RADIUS_MAX);
  });
});

describe('clusterMarkers', () => {
  it('keeps points far apart as markers of their own', () => {
    const markers = clusterMarkers([{ x: 0, y: 0, count: 41 }, { x: 300, y: 0, count: 1 }]);

    expect(markers.map(({ count, members }) => [count, members])).toEqual([[41, [0]], [1, [1]]]);
    expect(markers[0]).toMatchObject({ x: 0, y: 0, radius: markerRadius(41) });
  });

  it('merges points that would overlap, at their installations-weighted centre', () => {
    const [marker, ...rest] = clusterMarkers([{ x: 0, y: 0, count: 30 }, { x: 10, y: 0, count: 10 }]);

    expect(rest).toEqual([]);
    expect(marker).toMatchObject({ x: 2.5, y: 0, count: 40, members: [0, 1], radius: markerRadius(40) });
  });

  it('merges again when a marker grows into another', () => {
    // The third point is clear of the first, but not of the first and
    // second merged, which is larger and nearer to it.
    const points = [
      { x: 0, y: 0, count: 200 },
      { x: 44, y: 0, count: 1 },
      { x: 20, y: 0, count: 200 },
    ];
    expect(Math.hypot(44, 0)).toBeGreaterThan(markerRadius(200) + markerRadius(1) + MARKER_GAP);
    expect(44 - 10).toBeLessThan(markerRadius(400) + markerRadius(1) + MARKER_GAP);

    const markers = clusterMarkers(points);

    expect(markers).toHaveLength(1);
    expect(markers[0]?.count).toBe(401);
  });

  it('leaves no two markers overlapping, and every installation in one marker', () => {
    const points = Array.from({ length: 400 }, (_, i) => ({
      x: (i * 37) % 300,
      y: (i * 61) % 200,
      count: (i % 9) + 1,
    }));

    const markers = clusterMarkers(points);

    expect(apartEnough(markers)).toBe(true);
    expect(markers.reduce((total, marker) => total + marker.count, 0)).toBe(points.reduce((t, p) => t + p.count, 0));
    expect(markers.flatMap((marker) => marker.members).sort((a, b) => a - b)).toEqual(points.map((_, i) => i));
  });

  it('gives the same markers every time', () => {
    const points = [{ x: 0, y: 0, count: 3 }, { x: 6, y: 4, count: 2 }, { x: 40, y: 0, count: 7 }];

    expect(clusterMarkers(points)).toEqual(clusterMarkers(points));
  });

  it.each([0, -1, 2.5])('refuses a point with %d installations', (count) => {
    expect(() => clusterMarkers([{ x: 0, y: 0, count }])).toThrow(RangeError);
  });

  it('refuses a point with no position', () => {
    expect(() => clusterMarkers([{ x: Number.NaN, y: 0, count: 1 }])).toThrow(RangeError);
  });
});

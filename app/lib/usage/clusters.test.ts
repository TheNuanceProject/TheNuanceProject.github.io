// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import {
  GROUP_RADIUS,
  MARKER_GAP,
  PIN_RADIUS,
  RADIUS_GROWTH_MAX,
  RADIUS_PER_DOUBLING,
  type Marker,
  clusterMarkers,
  markerRadius,
} from './clusters';

function apartEnough(markers: readonly Marker[]): boolean {
  return markers.every((a, i) =>
    markers.slice(i + 1).every((b) => Math.hypot(a.x - b.x, a.y - b.y) >= a.radius + b.radius + MARKER_GAP - 1e-9)
  );
}

describe('markerRadius', () => {
  it('is a pin for one place with a count of one', () => {
    expect(markerRadius(1, 1)).toBe(PIN_RADIUS);
  });

  it('draws a group larger than a single place with the same count', () => {
    expect(markerRadius(1, 2)).toBe(GROUP_RADIUS);
    expect(markerRadius(8, 2)).toBeGreaterThan(markerRadius(8, 1));
  });

  it('grows with the logarithm of the count, up to its largest', () => {
    expect(markerRadius(2, 1)).toBe(PIN_RADIUS + RADIUS_PER_DOUBLING);
    expect(markerRadius(4, 1)).toBe(PIN_RADIUS + 2 * RADIUS_PER_DOUBLING);
    expect(markerRadius(1_000_000_000, 3)).toBe(GROUP_RADIUS + RADIUS_GROWTH_MAX);
  });
});

describe('clusterMarkers', () => {
  it('keeps points far apart as markers of their own', () => {
    const markers = clusterMarkers([{ x: 0, y: 0, count: 41 }, { x: 300, y: 0, count: 1 }]);

    expect(markers.map(({ count, members }) => [count, members])).toEqual([[41, [0]], [1, [1]]]);
    expect(markers[0]).toMatchObject({ x: 0, y: 0, radius: markerRadius(41, 1) });
  });

  it('merges points that would overlap, at their count-weighted centre', () => {
    const [marker, ...rest] = clusterMarkers([{ x: 0, y: 0, count: 30 }, { x: 10, y: 0, count: 10 }]);

    expect(rest).toEqual([]);
    expect(marker).toMatchObject({ x: 2.5, y: 0, count: 40, members: [0, 1], radius: markerRadius(40, 2) });
  });

  it('merges again when a marker grows into another', () => {
    // The third point is clear of the first alone, but not of the first
    // and second merged, which is larger and nearer to it.
    const first = { x: 0, y: 0, count: 200 };
    const third = { x: 0, y: 0, count: 1 };
    third.x = markerRadius(200, 1) + markerRadius(1, 1) + MARKER_GAP + 1;
    const second = { x: third.x / 2, y: 0, count: 200 };
    // The first and second merged sit halfway between them.
    const mergedAt = second.x / 2;
    expect(third.x - mergedAt).toBeLessThan(markerRadius(400, 2) + markerRadius(1, 1) + MARKER_GAP);

    const markers = clusterMarkers([first, third, second]);

    expect(markers).toHaveLength(1);
    expect(markers[0]?.count).toBe(401);
  });

  it('leaves no two markers overlapping, and every count in one marker', () => {
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

  it('keeps places at the same position one marker, however far apart the rest are', () => {
    const markers = clusterMarkers([
      { x: 100, y: 100, count: 3 },
      { x: 100, y: 100, count: 1 },
      { x: 400, y: 100, count: 1 },
    ]);

    expect(markers.map(({ count, members }) => [count, members])).toEqual([
      [4, [0, 1]],
      [1, [2]],
    ]);
  });

  it('gives the same markers every time', () => {
    const points = [{ x: 0, y: 0, count: 3 }, { x: 6, y: 4, count: 2 }, { x: 40, y: 0, count: 7 }];

    expect(clusterMarkers(points)).toEqual(clusterMarkers(points));
  });

  it.each([0, -1, 1.5, Number.NaN])('refuses a point with a count of %d', (count) => {
    expect(() => clusterMarkers([{ x: 0, y: 0, count }])).toThrow(RangeError);
  });

  it('refuses a point with no position', () => {
    expect(() => clusterMarkers([{ x: Number.NaN, y: 0, count: 1 }])).toThrow(RangeError);
  });
});

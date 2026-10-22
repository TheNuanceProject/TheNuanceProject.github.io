// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import {
  BUBBLE_FROM,
  BUBBLE_RADIUS_MAX,
  BUBBLE_RADIUS_MIN,
  BUBBLE_RADIUS_PER_DOUBLING,
  DOT_RADIUS,
  MARKER_GAP,
  RING_GAP,
  RING_WIDTH,
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
  it('is one dot for one installation', () => {
    expect(markerRadius(1)).toBe(DOT_RADIUS);
  });

  it('shows two or more as a bubble', () => {
    expect(BUBBLE_FROM).toBe(2);
    expect(markerRadius(2)).toBeGreaterThan(markerRadius(1));
  });

  it('grows a bubble with the logarithm of its number, up to its largest', () => {
    expect(markerRadius(BUBBLE_FROM)).toBe(BUBBLE_RADIUS_MIN);
    expect(markerRadius(BUBBLE_FROM * 2)).toBe(BUBBLE_RADIUS_MIN + BUBBLE_RADIUS_PER_DOUBLING);
    expect(markerRadius(1_000_000_000)).toBe(BUBBLE_RADIUS_MAX);
  });
});

describe('clusterMarkers', () => {
  it('keeps points far apart as markers of their own', () => {
    const markers = clusterMarkers([{ x: 0, y: 0, installations: 41, legacy: 0 }, { x: 300, y: 0, installations: 1, legacy: 0 }]);

    expect(markers.map(({ installations, members }) => [installations, members])).toEqual([[41, [0]], [1, [1]]]);
    expect(markers[0]).toMatchObject({ x: 0, y: 0, radius: markerRadius(41) });
  });

  it('merges points that would overlap, at their installations-weighted centre', () => {
    const [marker, ...rest] = clusterMarkers([{ x: 0, y: 0, installations: 30, legacy: 0 }, { x: 10, y: 0, installations: 10, legacy: 0 }]);

    expect(rest).toEqual([]);
    expect(marker).toMatchObject({ x: 2.5, y: 0, installations: 40, members: [0, 1], radius: markerRadius(40), legacy: 0 });
  });

  it('merges again when a marker grows into another', () => {
    // The third point is clear of the first, but not of the first and
    // second merged, which is larger and nearer to it.
    const points = [
      { x: 0, y: 0, installations: 200, legacy: 0 },
      { x: 44, y: 0, installations: 1, legacy: 0 },
      { x: 20, y: 0, installations: 200, legacy: 0 },
    ];
    expect(Math.hypot(44, 0)).toBeGreaterThan(markerRadius(200) + markerRadius(1) + MARKER_GAP);
    expect(44 - 10).toBeLessThan(markerRadius(400) + markerRadius(1) + MARKER_GAP);

    const markers = clusterMarkers(points);

    expect(markers).toHaveLength(1);
    expect(markers[0]?.installations).toBe(401);
  });

  it('leaves no two markers overlapping, and every installation in one marker', () => {
    const points = Array.from({ length: 400 }, (_, i) => ({
      x: (i * 37) % 300,
      y: (i * 61) % 200,
      installations: i % 3 === 0 ? 0 : (i % 9) + 1,
      legacy: i % 3 === 0 || i % 4 === 0 ? (i % 7) + 1 : 0,
    }));

    const markers = clusterMarkers(points);

    expect(apartEnough(markers)).toBe(true);
    expect(markers.reduce((total, marker) => total + marker.installations, 0)).toBe(
      points.reduce((t, p) => t + p.installations, 0)
    );
    expect(markers.reduce((total, marker) => total + marker.legacy, 0)).toBe(points.reduce((t, p) => t + p.legacy, 0));
    expect(markers.flatMap((marker) => marker.members).sort((a, b) => a - b)).toEqual(points.map((_, i) => i));
  });

  it('keeps places at the same position one marker, however far apart the rest are', () => {
    const markers = clusterMarkers([
      { x: 100, y: 100, installations: 3, legacy: 0 },
      { x: 100, y: 100, installations: 1, legacy: 2 },
      { x: 400, y: 100, installations: 1, legacy: 0 },
    ]);

    expect(markers.map(({ installations, legacy, members }) => [installations, legacy, members])).toEqual([
      [4, 2, [0, 1]],
      [1, 0, [2]],
    ]);
  });

  it('gives the same markers every time', () => {
    const points = [{ x: 0, y: 0, installations: 3, legacy: 0 }, { x: 6, y: 4, installations: 2, legacy: 0 }, { x: 40, y: 0, installations: 7, legacy: 0 }];

    expect(clusterMarkers(points)).toEqual(clusterMarkers(points));
  });

  it('gives a point with 1.x checks only a body of its checks and no ring', () => {
    const [marker] = clusterMarkers([{ x: 0, y: 0, installations: 0, legacy: 7 }]);

    expect(marker).toMatchObject({ installations: 0, legacy: 7, body: markerRadius(7), radius: markerRadius(7) });
  });

  it('rings the body of installations when 1.x checks are in the marker too', () => {
    const [marker] = clusterMarkers([{ x: 0, y: 0, installations: 3, legacy: 0 }, { x: 4, y: 0, installations: 0, legacy: 9 }]);

    expect(marker).toMatchObject({ installations: 3, legacy: 9, x: 3, body: markerRadius(3) });
    expect(marker?.radius).toBe(markerRadius(3) + RING_GAP + RING_WIDTH);
  });

  it.each([
    [0, 0],
    [-1, 1],
    [1.5, 0],
    [1, -2],
  ])('refuses a point with %d installations and %d checks', (installations, legacy) => {
    expect(() => clusterMarkers([{ x: 0, y: 0, installations, legacy }])).toThrow(RangeError);
  });

  it('refuses a point with no position', () => {
    expect(() => clusterMarkers([{ x: Number.NaN, y: 0, installations: 1, legacy: 0 }])).toThrow(RangeError);
  });
});

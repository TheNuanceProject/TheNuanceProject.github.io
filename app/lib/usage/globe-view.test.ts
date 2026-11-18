// SPDX-License-Identifier: MIT
import { geoDistance } from 'd3-geo';
import { describe, expect, it } from 'vitest';

import {
  EARTH_RADIUS_KM,
  LATITUDE_LIMIT,
  LEVEL_ZOOMS,
  ZOOM_MAX,
  ZOOM_MIN,
  baseRadius,
  between,
  clampZoom,
  cubicBezier,
  keepUnder,
  levelFor,
  parseCubicBezier,
  pointAt,
  projectionFor,
  scaleBar,
  visibleAngle,
  wrapLongitude,
  zoomAt,
  zoomForSeparation,
} from './globe-view';

const frame = { width: 800, height: 560 };

describe('wrapLongitude', () => {
  it.each([
    [0, 0],
    [190, -170],
    [-190, 170],
    [540, 180],
    [-180, -180],
    [359.5, -0.5],
  ])('brings %d into -180 to 180 as %d', (lon, wrapped) => {
    expect(wrapLongitude(lon)).toBeCloseTo(wrapped, 9);
  });
});

describe('clampZoom', () => {
  it('keeps the zoom between the farthest and the closest', () => {
    expect(clampZoom(0.2)).toBe(ZOOM_MIN);
    expect(clampZoom(10_000)).toBe(ZOOM_MAX);
    expect(clampZoom(12)).toBe(12);
  });
});

describe('the globe at the farthest zoom', () => {
  it('fits the frame with a margin round it', () => {
    expect(baseRadius(frame) * 2).toBeLessThan(Math.min(frame.width, frame.height));
  });

  it('shows the whole visible half', () => {
    expect(visibleAngle({ lon: 0, lat: 0, zoom: 1 }, frame)).toBe(Math.PI / 2);
  });

  it('shows less of the world once it is larger than the frame', () => {
    const close = visibleAngle({ lon: 0, lat: 0, zoom: 40 }, frame);
    expect(close).toBeLessThan(Math.PI / 2);
    // The corner of the frame is that far round the globe from its middle.
    const radius = baseRadius(frame) * 40;
    expect(close).toBeCloseTo(Math.asin(Math.hypot(400, 280) / radius), 9);
  });
});

describe('keepUnder', () => {
  it('turns the globe so a point of the world sits under the pointer', () => {
    const view = { lon: 77, lat: 13, zoom: 6 };
    const bengaluru: [number, number] = [77.594, 12.972];

    const moved = keepUnder(view, frame, bengaluru, 120, 400);

    const at = projectionFor(moved, frame)(bengaluru);
    expect(at?.[0]).toBeCloseTo(120, 1);
    expect(at?.[1]).toBeCloseTo(400, 1);
  });

  it('works across the date line', () => {
    const view = { lon: 178, lat: -17, zoom: 20 };
    const point: [number, number] = [-179.5, -16.8];

    const moved = keepUnder(view, frame, point, 600, 200);

    const at = projectionFor(moved, frame)(point);
    expect(at?.[0]).toBeCloseTo(600, 1);
    expect(at?.[1]).toBeCloseTo(200, 1);
    expect(Math.abs(moved.lon)).toBeLessThanOrEqual(180);
  });

  it('never turns the middle past the latitude limit', () => {
    const moved = keepUnder({ lon: 0, lat: 80, zoom: 1 }, frame, [0, 0], 400, 0);
    expect(Math.abs(moved.lat)).toBeLessThanOrEqual(LATITUDE_LIMIT);
  });
});

describe('zoomAt', () => {
  it('keeps the point under the pointer where it is', () => {
    const view = { lon: 100, lat: 20, zoom: 2 };
    const before = pointAt(projectionFor(view, frame), 650, 150);
    expect(before).not.toBeNull();

    const zoomed = zoomAt(view, frame, 16, 650, 150);

    expect(zoomed.zoom).toBe(16);
    const after = projectionFor(zoomed, frame)(before as [number, number]);
    expect(after?.[0]).toBeCloseTo(650, 1);
    expect(after?.[1]).toBeCloseTo(150, 1);
  });

  it('zooms about the middle when the pointer is off the globe', () => {
    const view = { lon: 10, lat: 5, zoom: 1 };
    expect(zoomAt(view, frame, 2, 2, 2)).toEqual({ lon: 10, lat: 5, zoom: 2 });
  });

  it('stays within the zoom limits', () => {
    expect(zoomAt({ lon: 0, lat: 0, zoom: 100 }, frame, 1000, 400, 280).zoom).toBe(ZOOM_MAX);
  });
});

describe('pointAt', () => {
  it('is null off the globe', () => {
    expect(pointAt(projectionFor({ lon: 0, lat: 0, zoom: 1 }, frame), 1, 1)).toBeNull();
  });

  it('is the middle of the view at the middle of the frame', () => {
    const at = pointAt(projectionFor({ lon: 30, lat: -10, zoom: 3 }, frame), 400, 280);
    expect(at?.[0]).toBeCloseTo(30, 6);
    expect(at?.[1]).toBeCloseTo(-10, 6);
  });
});

describe('levelFor', () => {
  it('draws finer outlines as the globe comes closer', () => {
    expect(levelFor(1)).toBe(0);
    expect(levelFor(LEVEL_ZOOMS[0] - 0.01)).toBe(0);
    expect(levelFor(LEVEL_ZOOMS[0])).toBe(1);
    expect(levelFor(LEVEL_ZOOMS[1])).toBe(2);
    expect(levelFor(ZOOM_MAX)).toBe(2);
  });
});

describe('scaleBar', () => {
  it('shows a round distance no longer than its room', () => {
    for (const zoom of [1, 1.7, 3, 12, 40, 160]) {
      const view = { lon: 0, lat: 0, zoom };
      const { km, pixels } = scaleBar(view, frame, 96);
      const power = 10 ** Math.floor(Math.log10(km));
      expect([1, 2, 5]).toContain(Math.round(km / power));
      expect(pixels).toBeLessThanOrEqual(96 + 1e-9);
      // The next round distance up would not fit.
      expect(pixels * 2.5).toBeGreaterThan(96);
    }
  });

  it('measures at the scale of the globe', () => {
    const view = { lon: 0, lat: 0, zoom: 1 };
    const { km, pixels } = scaleBar(view, frame, 96);
    expect(pixels).toBeCloseTo((km * baseRadius(frame)) / EARTH_RADIUS_KM, 9);
  });
});

describe('cubicBezier', () => {
  it('starts at 0 and ends at 1', () => {
    expect(cubicBezier(0.45, 0, 0.55, 1, 0)).toBe(0);
    expect(cubicBezier(0.45, 0, 0.55, 1, 1)).toBe(1);
  });

  it('is the straight line for a linear curve', () => {
    for (const t of [0.1, 0.33, 0.5, 0.9]) expect(cubicBezier(0, 0, 1, 1, t)).toBeCloseTo(t, 6);
  });

  it('is symmetric for a symmetric ease-in-out', () => {
    expect(cubicBezier(0.45, 0, 0.55, 1, 0.5)).toBeCloseTo(0.5, 6);
    expect(cubicBezier(0.45, 0, 0.55, 1, 0.2) + cubicBezier(0.45, 0, 0.55, 1, 0.8)).toBeCloseTo(1, 6);
    expect(cubicBezier(0.45, 0, 0.55, 1, 0.2)).toBeLessThan(0.2);
  });
});

describe('parseCubicBezier', () => {
  it('reads the four numbers of a CSS curve', () => {
    expect(parseCubicBezier(' cubic-bezier(0.45, 0, 0.55, 1) ')).toEqual([0.45, 0, 0.55, 1]);
  });

  it.each(['ease', 'cubic-bezier(1, 2, 3)', 'cubic-bezier(a, 0, 0, 1)', ''])('refuses %j', (value) => {
    expect(parseCubicBezier(value)).toBeNull();
  });
});

describe('between', () => {
  it('moves the shorter way round', () => {
    const halfway = between({ lon: 170, lat: 0, zoom: 1 }, { lon: -170, lat: 10, zoom: 1 }, 0.5);
    expect(Math.abs(halfway.lon)).toBeCloseTo(180, 9);
    expect(halfway.lat).toBe(5);
  });

  it('zooms evenly on a logarithmic scale', () => {
    expect(between({ lon: 0, lat: 0, zoom: 1 }, { lon: 0, lat: 0, zoom: 16 }, 0.5).zoom).toBeCloseTo(4, 9);
  });

  it('ends where it was going', () => {
    expect(between({ lon: 0, lat: 0, zoom: 1 }, { lon: 77, lat: 13, zoom: 40 }, 1)).toEqual({ lon: 77, lat: 13, zoom: 40 });
  });
});

describe('zoomForSeparation', () => {
  it('is the zoom at which two points are that many pixels apart', () => {
    const guangzhou: [number, number] = [113.25, 23.117];
    const huangcun: [number, number] = [113.4, 23.1];
    const angle = geoDistance(guangzhou, huangcun);
    const zoom = zoomForSeparation(angle, 40, frame);

    const projection = projectionFor({ lon: 113.3, lat: 23.1, zoom }, frame);
    const [a, b] = [projection(guangzhou), projection(huangcun)];
    expect(Math.hypot((a?.[0] ?? 0) - (b?.[0] ?? 0), (a?.[1] ?? 0) - (b?.[1] ?? 0))).toBeCloseTo(40, 0);
  });

  it('is infinite for points at the same place', () => {
    expect(zoomForSeparation(0, 40, frame)).toBe(Infinity);
  });
});

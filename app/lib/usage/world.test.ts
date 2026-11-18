// SPDX-License-Identifier: MIT
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { geoDistance } from 'd3-geo';
import { describe, expect, it } from 'vitest';

import { MapDataError, TOWNS_PATH, WORLD_PATHS, locator, readTowns, readWorld } from './world';

const served = (path: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../../public${path}`, import.meta.url)), 'utf8'));

describe('the map the site serves', () => {
  const levels = WORLD_PATHS.map((path) => readWorld(served(path)));

  it('has the same countries at every level of detail', () => {
    const codes = levels.map((level) => [...new Set(level.countries.map((c) => c.properties.code))].sort());
    expect(codes[1]).toEqual(codes[0]);
    expect(codes[2]).toEqual(codes[0]);
    expect(codes[0]).toContain('IN');
  });

  it('keeps more detail at each finer level', () => {
    const points = levels.map((level) =>
      level.pieces.reduce((total, piece) => total + piece.geometry.coordinates.reduce((n, ring) => n + ring.length, 0), 0)
    );
    expect(points[1]).toBeGreaterThan(points[0] as number);
    expect(points[2]).toBeGreaterThan(points[1] as number);
  });

  it('holds every point of each piece of land within its circle', () => {
    // Every point is checked; one expectation at the end keeps a check of
    // some 270,000 points quick.
    const outside: string[] = [];
    WORLD_PATHS.forEach((path, i) => {
      for (const piece of levels[i]?.pieces ?? []) {
        for (const point of piece.geometry.coordinates[0] ?? []) {
          if (geoDistance(piece.centre, point as [number, number]) > piece.reach) {
            outside.push(`${path} ${piece.code} ${point.join(',')}`);
          }
        }
      }
    });
    expect(outside).toEqual([]);
  });

  it('finds the country at a point, as India recognises its borders', () => {
    const locate = locator(levels[0] as (typeof levels)[number]);
    expect(locate(77.594, 12.972)?.code).toBe('IN');
    // Leh, in Ladakh.
    expect(locate(77.58, 34.16)?.code).toBe('IN');
    expect(locate(70, 0)).toBeNull();
  });

  it('names towns from the largest down', () => {
    const towns = readTowns(served(TOWNS_PATH));
    expect(towns.length).toBeGreaterThan(1000);
    expect(towns.every((town, i) => i === 0 || (towns[i - 1] as (typeof towns)[number]).rank <= town.rank)).toBe(true);
    expect(towns.some((town) => town.name === 'Mysuru')).toBe(true);
  });
});

describe('readWorld', () => {
  it.each([null, [], { type: 'Topology' }, { type: 'FeatureCollection', features: [] }])('refuses %j', (value) => {
    expect(() => readWorld(value)).toThrow(MapDataError);
  });

  const square = (properties: Record<string, unknown>) => ({
    type: 'Topology',
    arcs: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    objects: { countries: { type: 'GeometryCollection', geometries: [{ type: 'Polygon', arcs: [[0]], properties }] } },
  });

  it('reads a country with its circle', () => {
    const level = readWorld(square({ code: 'XY', name: 'Square', circles: [[0.5, 0.5, 1]] }));
    expect(level.pieces).toHaveLength(1);
    expect(level.pieces[0]?.centre).toEqual([0.5, 0.5]);
    expect(level.pieces[0]?.reach).toBeCloseTo(Math.PI / 180, 12);
  });

  it.each([
    [{ code: 'XY', name: 'Square' }],
    [{ code: 'XY', name: 'Square', circles: [] }],
    [{ code: 'XY', name: 'Square', circles: [[0.5, 0.5]] }],
    [{ code: 'XY', name: 'Square', circles: [[0.5, 'a', 1]] }],
  ])('refuses a country without a circle for each polygon: %j', (properties) => {
    expect(() => readWorld(square(properties))).toThrow(MapDataError);
  });
});

describe('readTowns', () => {
  it('reads a town', () => {
    expect(readTowns([['Mysuru', 76.65, 12.3, 3]])).toEqual([{ name: 'Mysuru', lon: 76.65, lat: 12.3, rank: 3 }]);
  });

  it.each([
    [{}],
    [[['Mysuru', 76.65, 12.3]]],
    [[['', 76.65, 12.3, 3]]],
    [[['Mysuru', 200, 12.3, 3]]],
    [[['Mysuru', 76.65, Number.NaN, 3]]],
    [[['Mysuru', 76.65, 12.3, 1.5]]],
    [[['Mysuru', 76.65, 12.3, -1]]],
    [[[3, 76.65, 12.3, 3]]],
  ])('refuses %j', (value) => {
    expect(() => readTowns(value)).toThrow(MapDataError);
  });
});

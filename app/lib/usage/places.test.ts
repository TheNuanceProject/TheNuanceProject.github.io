// SPDX-License-Identifier: MIT
import { geoArea, geoContains } from 'd3-geo';
import { describe, expect, it } from 'vitest';

import type { UsagePlace } from '~/lib/build-data/usage-summary';
import { type Locate, areaPolygon, areaSquare, countOf, lastSeen, placeTitle } from './places';

const names = { IN: 'India', CN: 'China', GB: 'United Kingdom' };

function place(part: Partial<UsagePlace>): UsagePlace {
  return {
    kind: 'city',
    lat: 12.972,
    lon: 77.594,
    name: { name: 'Bengaluru', country: 'IN' },
    country: 'IN',
    installations: { count: 2, lastSeen: 20774 },
    legacy: null,
    ...part,
  };
}

/** India west of 80° east, the sea elsewhere. */
const locate: Locate = (lon) => (lon < 80 ? { code: 'IN', name: 'India' } : null);

describe('placeTitle', () => {
  it('names a city by its name, with its country', () => {
    expect(placeTitle(place({}), names, locate)).toEqual({ name: 'Bengaluru', country: 'India' });
  });

  it('names an area as around its named place', () => {
    expect(placeTitle(place({ kind: 'area', name: { name: 'Tumkūr', country: 'IN' } }), names, locate)).toEqual({
      name: 'Around Tumkūr',
      country: 'India',
    });
  });

  it('names a city with no name by its country', () => {
    expect(placeTitle(place({ name: null }), names, locate)).toEqual({ name: 'A place in India', country: null });
  });

  it('names a city of no known country by the country at its position', () => {
    expect(placeTitle(place({ name: null, country: 'XX' }), names, locate).name).toBe('A place in India');
    expect(placeTitle(place({ name: null, country: 'XX', lon: 90 }), names, locate).name).toBe('A place at sea');
  });

  it('names a place by its kind alone until the map is at hand', () => {
    expect(placeTitle(place({ name: null, country: 'XX' }), names, null).name).toBe('A place');
    expect(placeTitle(place({ name: null }), names, null).name).toBe('A place in India');
    expect(placeTitle(place({ kind: 'area', name: null }), names, null).name).toBe('An area');
  });

  it('names a country the map has no code for by the map name', () => {
    const disputed: Locate = () => ({ code: '', name: 'Somaliland' });
    expect(placeTitle(place({ name: null, country: 'XX' }), names, disputed).name).toBe('A place in Somaliland');
  });

  it('names an area with no named place by the country most of it lies in', () => {
    // Its marker is at sea, but most of its square, 79° to 80° east, is
    // in India.
    const coast: Locate = (lon) => (lon < 79.8 ? { code: 'IN', name: 'India' } : null);
    expect(placeTitle(place({ kind: 'area', name: null, lon: 79.9, lat: 10.5 }), names, coast).name).toBe('An area in India');
    expect(placeTitle(place({ kind: 'area', name: null, lon: 85.5, lat: 10.5 }), names, coast).name).toBe('An area at sea');
  });
});

describe('counts', () => {
  it('counts installations and 1.x checks apart', () => {
    const both = place({ installations: { count: 4, lastSeen: 20756 }, legacy: { count: 10, lastSeen: 20749 } });
    expect(countOf(both, 'installations')).toBe(4);
    expect(countOf(both, 'legacy')).toBe(10);
    expect(countOf(place({}), 'legacy')).toBe(0);
  });

  it('takes the later of the last days', () => {
    expect(lastSeen(place({ installations: { count: 1, lastSeen: 20750 }, legacy: { count: 1, lastSeen: 20760 } }))).toBe(20760);
    expect(lastSeen(place({ installations: null, legacy: { count: 1, lastSeen: 20746 } }))).toBe(20746);
  });
});

describe('areaPolygon', () => {
  const tumkur = place({ kind: 'area', lat: 13.341, lon: 77.102 });

  it('is the one-degree square that holds the marker', () => {
    expect(areaSquare(tumkur)).toEqual({ west: 77, south: 13 });
    const square = areaPolygon(tumkur);
    expect(geoContains(square, [77.5, 13.5])).toBe(true);
    expect(geoContains(square, [77.102, 13.341])).toBe(true);
    expect(geoContains(square, [78.2, 13.5])).toBe(false);
    expect(geoContains(square, [77.5, 12.8])).toBe(false);
  });

  it('is wound so the globe draws the square, not the world round it', () => {
    expect(geoArea(areaPolygon(tumkur))).toBeLessThan(0.001);
    expect(geoArea(areaPolygon(place({ kind: 'area', lat: -33.9, lon: 151.2 })))).toBeLessThan(0.001);
  });

  it('is closed', () => {
    const ring = areaPolygon(tumkur).coordinates[0] ?? [];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });
});

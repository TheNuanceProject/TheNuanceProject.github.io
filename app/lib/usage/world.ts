// SPDX-License-Identifier: MIT
/**
 * The map data of the usage globe, as this site serves it (made by
 * scripts/make-world.mjs), read and checked before anything is drawn
 * from it.
 */
import { geoContains } from 'd3-geo';
import type { Feature, MultiLineString, MultiPolygon, Polygon } from 'geojson';
import { feature as toFeatures, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import type { Locate } from './places';

/** The three levels of detail, coarse to fine. */
export const WORLD_PATHS = ['/data/world.json', '/data/world-medium.json', '/data/world-fine.json'] as const;
export const TOWNS_PATH = '/data/towns.json';
/** The most towns the globe takes from its file: more than the file
 *  holds today, so a file far larger than expected is refused. */
const TOWNS_MAX = 20_000;

interface CountryProperties {
  /** ISO 3166-1 alpha-2, or "" for a place that has none. */
  readonly code: string;
  readonly name: string;
  /** For each of its polygons in order, [longitude, latitude, radius] in
   *  degrees of a circle that holds it. */
  readonly circles: readonly (readonly [number, number, number])[];
}

export type Country = Feature<Polygon | MultiPolygon, CountryProperties>;

/** One piece of land: a country's polygon, with the circle round it that
 *  tells quickly whether it can be on screen. */
export interface Piece {
  readonly code: string;
  readonly geometry: Polygon;
  readonly centre: [number, number];
  /** The angle from `centre` to its farthest point, in radians. */
  readonly reach: number;
}

export interface WorldLevel {
  readonly countries: readonly Country[];
  readonly pieces: readonly Piece[];
  /** The borders between countries, drawn once each. */
  readonly borders: MultiLineString;
}

/** A town the globe can name: rank 0 is the largest. */
export interface Town {
  readonly name: string;
  readonly lon: number;
  readonly lat: number;
  readonly rank: number;
}

export class MapDataError extends Error {
  override readonly name = 'MapDataError';
}

type World = Topology<{ countries: GeometryCollection<CountryProperties> }>;

function isWorld(value: unknown): value is World {
  const topology = value as Partial<World> | null;
  return (
    typeof topology === 'object' &&
    topology !== null &&
    topology.type === 'Topology' &&
    typeof topology.objects?.countries === 'object' &&
    Array.isArray(topology.objects.countries.geometries) &&
    Array.isArray(topology.arcs)
  );
}

/** The land of one level of detail.
 *  @throws MapDataError when `value` is not the site's map. */
export function readWorld(value: unknown): WorldLevel {
  if (!isWorld(value)) throw new MapDataError('not the map of countries');
  const countries = toFeatures(value, value.objects.countries).features.filter(
    (country): country is Country =>
      (country.geometry?.type === 'Polygon' || country.geometry?.type === 'MultiPolygon') &&
      typeof country.properties?.code === 'string'
  );
  const pieces: Piece[] = [];
  for (const country of countries) {
    const polygons = country.geometry.type === 'Polygon' ? [country.geometry.coordinates] : country.geometry.coordinates;
    const circles: unknown = country.properties.circles;
    if (!Array.isArray(circles) || circles.length !== polygons.length) {
      throw new MapDataError('every polygon has its circle');
    }
    polygons.forEach((coordinates, i) => {
      const circle: unknown = circles[i];
      if (!Array.isArray(circle) || circle.length !== 3 || !circle.every((n) => typeof n === 'number' && Number.isFinite(n))) {
        throw new MapDataError('a circle is [longitude, latitude, radius]');
      }
      const [lon, lat, radius] = circle as [number, number, number];
      pieces.push({
        code: country.properties.code,
        geometry: { type: 'Polygon', coordinates },
        centre: [lon, lat],
        reach: (radius * Math.PI) / 180,
      });
    });
  }
  return { countries, pieces, borders: mesh(value, value.objects.countries, (a, b) => a !== b) };
}

/** The towns of the site's towns file, largest first.
 *  @throws MapDataError when `value` is not that file. */
export function readTowns(value: unknown): Town[] {
  if (!Array.isArray(value) || value.length > TOWNS_MAX) throw new MapDataError('not the list of towns');
  return value.map((row: unknown) => {
    if (!Array.isArray(row) || row.length !== 4) throw new MapDataError('a town is [name, longitude, latitude, rank]');
    const [name, lon, lat, rank] = row as unknown[];
    if (
      typeof name !== 'string' ||
      name === '' ||
      typeof lon !== 'number' ||
      typeof lat !== 'number' ||
      typeof rank !== 'number' ||
      !(Math.abs(lon) <= 180) ||
      !(Math.abs(lat) <= 90) ||
      !Number.isInteger(rank) ||
      rank < 0
    ) {
      throw new MapDataError('a town has a name, a position and a whole rank from 0');
    }
    return { name, lon, lat, rank };
  });
}

/** The country at a point, from a level's outlines. */
export function locator(level: WorldLevel): Locate {
  return (lon, lat) => {
    const country = level.countries.find((c) => geoContains(c, [lon, lat]));
    return country ? { code: country.properties.code, name: country.properties.name } : null;
  };
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok) throw new MapDataError(`${path} answered ${response.status}`);
  return response.json();
}

const levels = new Map<number, Promise<WorldLevel>>();
let towns: Promise<Town[]> | null = null;

/**
 * One level of detail, fetched from this site once per page and shared
 * by everything that draws or names from it. A level that failed stays
 * failed for the page, so a broken file is not asked for again and again.
 */
export function loadLevel(level: 0 | 1 | 2): Promise<WorldLevel> {
  let loading = levels.get(level);
  if (!loading) {
    loading = fetchJson(WORLD_PATHS[level]).then(readWorld);
    levels.set(level, loading);
  }
  return loading;
}

/** The towns, fetched once per page like the levels. */
export function loadTowns(): Promise<Town[]> {
  towns ??= fetchJson(TOWNS_PATH).then(readTowns);
  return towns;
}

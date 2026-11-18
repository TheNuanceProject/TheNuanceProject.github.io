// SPDX-License-Identifier: MIT
/**
 * The places of the usage summary as the usage page names, counts and
 * draws them.
 */
import { geoArea } from 'd3-geo';
import type { Polygon, Position } from 'geojson';

import { UNKNOWN_COUNTRY, type UsagePlace } from '~/lib/build-data/usage-summary';

/** What the page shows a count of: 2.x installations, or WireTrace 1.x
 *  update checks, which are never installations. */
export type CountKind = 'installations' | 'legacy';

/** The country at a point of the world, as the map names it: its
 *  ISO 3166-1 alpha-2 code, or "" for a place that has none, and its
 *  name. Null at sea. */
export type Locate = (lon: number, lat: number) => { readonly code: string; readonly name: string } | null;

/** A place's name, and its country's name when the name does not hold it. */
export interface PlaceTitle {
  readonly name: string;
  readonly country: string | null;
}

/** An area's marker sits on a place inside it; its one-degree square is
 *  sampled at this many points a side to find the country most of it is
 *  in, since its middle can fall in the sea off a coast. */
const AREA_SAMPLES = 5;
/** The edges of an area's square are drawn through a point every this
 *  many degrees, so its sides along parallels follow them on the globe. */
const AREA_EDGE_STEP = 0.1;

/** What a place counts of `kind`, or 0 when it has none. */
export function countOf(place: UsagePlace, kind: CountKind): number {
  return place[kind]?.count ?? 0;
}

/** The last day anything came from a place. */
export function lastSeen(place: UsagePlace): number {
  return Math.max(place.installations?.lastSeen ?? -Infinity, place.legacy?.lastSeen ?? -Infinity);
}

/** The one-degree square an area stands for: its marker sits on a place
 *  inside it, so the square is the one that holds the marker. */
export function areaSquare(place: UsagePlace): { west: number; south: number } {
  return { west: Math.floor(place.lon), south: Math.floor(place.lat) };
}

/** The name of the country most of an area's square lies in, if any. */
function areaCountry(place: UsagePlace, locate: Locate, nameOf: (found: ReturnType<Locate>) => string | null): string | null {
  const { west, south } = areaSquare(place);
  const votes = new Map<string, number>();
  for (let i = 0; i < AREA_SAMPLES; i += 1) {
    for (let j = 0; j < AREA_SAMPLES; j += 1) {
      const name = nameOf(locate(west + (j + 0.5) / AREA_SAMPLES, south + (i + 0.5) / AREA_SAMPLES));
      if (name !== null) votes.set(name, (votes.get(name) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  for (const [name, count] of votes) {
    if (best === null || count > (votes.get(best) ?? 0)) best = name;
  }
  return best;
}

/**
 * A place's name, so the two kinds read apart wherever they are listed:
 * a city by its name, an area as around its named place. A city with no
 * name is named by its country, and an area with no named place by the
 * country it lies in; a place whose country the checks did not give is
 * named by the country of its position. Until the map is at hand
 * (`locate` null), a place that needs it is named by its kind alone.
 */
export function placeTitle(place: UsagePlace, names: Readonly<Record<string, string>>, locate: Locate | null): PlaceTitle {
  const nameOf = (code: string) => names[code] ?? code;
  const found = (at: ReturnType<Locate>) => (at === null ? null : at.code === '' ? at.name : nameOf(at.code));
  if (place.name) {
    const name = place.kind === 'area' ? `Around ${place.name.name}` : place.name.name;
    return { name, country: nameOf(place.name.country) };
  }
  if (place.kind === 'city') {
    if (place.country !== UNKNOWN_COUNTRY) return { name: `A place in ${nameOf(place.country)}`, country: null };
    if (locate === null) return { name: 'A place', country: null };
    const country = found(locate(place.lon, place.lat));
    return { name: country === null ? 'A place at sea' : `A place in ${country}`, country: null };
  }
  if (locate === null) return { name: 'An area', country: null };
  const country = found(locate(place.lon, place.lat)) ?? areaCountry(place, locate, found);
  return { name: country === null ? 'An area at sea' : `An area in ${country}`, country: null };
}

/** An area's square as a polygon the globe can draw, with its sides
 *  along the parallels following them. */
export function areaPolygon(place: UsagePlace): Polygon {
  const { west, south } = areaSquare(place);
  const steps = Math.round(1 / AREA_EDGE_STEP);
  const along = (from: number) => Array.from({ length: steps }, (_, i) => from + i * AREA_EDGE_STEP);
  const ring: Position[] = [
    ...along(west).map((lon): Position => [lon, south]),
    ...along(south).map((lat): Position => [west + 1, lat]),
    ...along(west).map((lon): Position => [west + 1 - (lon - west), south + 1]),
    ...along(south).map((lat): Position => [west, south + 1 - (lat - south)]),
  ];
  ring.push([west, south]);
  const polygon: Polygon = { type: 'Polygon', coordinates: [ring] };
  // d3 reads a ring wound one way as the square, the other way as all of
  // the world but the square.
  if (geoArea(polygon) > 2 * Math.PI) ring.reverse();
  return polygon;
}

// SPDX-License-Identifier: MIT
/**
 * The markers the usage globe draws: a pin with its number for each
 * place, and places close together on the screen merged into one group
 * marker until zooming in leaves them room.
 *
 * The globe shows one count at a time: 2.x installations, or WireTrace
 * 1.x update checks, which are never installations. A marker's size grows
 * a little with the logarithm of its number, and a group is drawn larger
 * than a single place. Markers are merged while any two would come closer
 * than `MARKER_GAP`, so no two markers ever overlap, every count is in
 * exactly one marker, and places at the same position are always one
 * marker, at every zoom.
 */

/** The radius of a place's pin and of a group, for a count of one, in
 *  pixels: large enough to hold a number in the language's smallest
 *  figure size. */
export const PIN_RADIUS = 11;
export const GROUP_RADIUS = 14;
/** The radius a marker gains each time its number doubles, and the most
 *  it gains, in pixels. */
export const RADIUS_PER_DOUBLING = 1.5;
export const RADIUS_GROWTH_MAX = 6;
/** The least space between two markers, in pixels. */
export const MARKER_GAP = 4;

export interface MarkerPoint {
  /** Where the point is on the screen, in pixels. */
  readonly x: number;
  readonly y: number;
  /** What it counts: a whole number from 1. */
  readonly count: number;
}

export interface Marker {
  /** The centre of its points, weighted by their counts, in pixels. */
  readonly x: number;
  readonly y: number;
  readonly count: number;
  readonly radius: number;
  /** The indexes of its points in the list given, in that list's order. */
  readonly members: readonly number[];
}

/** How far a marker of `count`, holding `places` places, reaches. */
export function markerRadius(count: number, places: number): number {
  const growth = Math.min(RADIUS_GROWTH_MAX, RADIUS_PER_DOUBLING * Math.log2(count));
  return (places > 1 ? GROUP_RADIUS : PIN_RADIUS) + growth;
}

interface Building {
  x: number;
  y: number;
  count: number;
  members: number[];
  square: string;
}

/** The side of a grid square: two markers in squares that are not
 *  neighbours are too far apart to overlap. */
const SQUARE = 2 * (GROUP_RADIUS + RADIUS_GROWTH_MAX) + MARKER_GAP;

function squareOf(x: number, y: number): [number, number] {
  return [Math.floor(x / SQUARE), Math.floor(y / SQUARE)];
}

const reach = (m: Building) => markerRadius(m.count, m.members.length);

function tooClose(a: Building, b: Building): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < reach(a) + reach(b) + MARKER_GAP;
}

/**
 * The markers of `points`. Earlier points are taken first, so a point
 * joins the first marker it would overlap; give the largest first, so
 * they gather the smaller ones. Merging moves a marker and makes it
 * larger, so the points are merged again until no two markers overlap.
 *
 * @throws RangeError when a count is not a whole number from 1, or a
 *   point is not on the screen's plane.
 */
export function clusterMarkers(points: readonly MarkerPoint[]): Marker[] {
  for (const { x, y, count } of points) {
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new RangeError('the count of a point is a whole number from 1');
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new RangeError('a point has a finite position');
    }
  }
  let markers: Building[] = points.map(({ x, y, count }, i) => ({ x, y, count, members: [i], square: '' }));
  for (let merged = true; merged; ) {
    merged = false;
    const squares = new Map<string, Building[]>();
    const file = (marker: Building) => {
      const [column, row] = squareOf(marker.x, marker.y);
      marker.square = `${column},${row}`;
      const square = squares.get(marker.square);
      if (square) square.push(marker);
      else squares.set(marker.square, [marker]);
    };
    const unfile = (marker: Building) => {
      const square = squares.get(marker.square) ?? [];
      square.splice(square.indexOf(marker), 1);
    };
    const kept: Building[] = [];
    for (const marker of markers) {
      const [column, row] = squareOf(marker.x, marker.y);
      let into: Building | undefined;
      for (let dc = -1; dc <= 1 && !into; dc += 1) {
        for (let dr = -1; dr <= 1 && !into; dr += 1) {
          into = squares.get(`${column + dc},${row + dr}`)?.find((other) => tooClose(other, marker));
        }
      }
      if (!into) {
        file(marker);
        kept.push(marker);
        continue;
      }
      unfile(into);
      const total = into.count + marker.count;
      into.x = (into.x * into.count + marker.x * marker.count) / total;
      into.y = (into.y * into.count + marker.y * marker.count) / total;
      into.count = total;
      into.members.push(...marker.members);
      file(into);
      merged = true;
    }
    markers = kept;
  }
  return markers.map(({ x, y, count, members }) => ({
    x,
    y,
    count,
    radius: markerRadius(count, members.length),
    members: [...members].sort((a, b) => a - b),
  }));
}

// SPDX-License-Identifier: MIT
/**
 * The markers the usage globe draws: an area's installations as dots, or
 * as one bubble with their number, and areas close together on the
 * screen merged into one marker until zooming in leaves them room.
 *
 * A marker with fewer than `BUBBLE_FROM` installations is that many dots
 * (`~/lib/usage/dot-layout`); one with more is a bubble whose size grows
 * with the logarithm of its number. Markers are merged while any two
 * would come closer than `MARKER_GAP`, so no two markers ever overlap,
 * and every installation is in exactly one marker.
 */
import { type Dot, layoutDots } from './dot-layout';

/** The fewest installations a marker shows as a bubble with its number. */
export const BUBBLE_FROM = 5;
/** A dot's radius and the space between two dots, in pixels. */
export const DOT_RADIUS = 3.5;
export const DOT_GAP = 1.5;
export const DOT_SPACING = 2 * DOT_RADIUS + DOT_GAP;
/** A bubble's radius for `BUBBLE_FROM` installations, the radius it gains
 *  each time its number doubles, and the most it reaches, in pixels. */
export const BUBBLE_RADIUS_MIN = 11;
export const BUBBLE_RADIUS_PER_DOUBLING = 3;
export const BUBBLE_RADIUS_MAX = 30;
/** The least space between two markers, in pixels. */
export const MARKER_GAP = 2;

export interface MarkerPoint {
  /** Where the point is on the screen, in pixels. */
  readonly x: number;
  readonly y: number;
  /** Its installations: a whole number from 1. */
  readonly count: number;
}

export interface Marker {
  /** The installations-weighted centre of its points, in pixels. */
  readonly x: number;
  readonly y: number;
  readonly count: number;
  readonly radius: number;
  /** The indexes of its points in the list given, in that list's order. */
  readonly members: readonly number[];
}

const dotOffsets = new Map<number, readonly Dot[]>();

/** Where the dots of a marker of `count` dots sit, from its centre. */
export function dotsOf(count: number): readonly Dot[] {
  let offsets = dotOffsets.get(count);
  if (!offsets) {
    offsets = layoutDots([{ x: 0, y: 0, count }], DOT_SPACING)[0] ?? [];
    dotOffsets.set(count, offsets);
  }
  return offsets;
}

/** How far a marker of `count` installations reaches from its centre. */
export function markerRadius(count: number): number {
  if (count < BUBBLE_FROM) {
    return dotsOf(count).reduce((most, [x, y]) => Math.max(most, Math.hypot(x, y)), 0) + DOT_RADIUS;
  }
  const radius = BUBBLE_RADIUS_MIN + BUBBLE_RADIUS_PER_DOUBLING * Math.log2(count / BUBBLE_FROM);
  return Math.min(BUBBLE_RADIUS_MAX, radius);
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
const SQUARE = 2 * BUBBLE_RADIUS_MAX + MARKER_GAP;

function squareOf(x: number, y: number): [number, number] {
  return [Math.floor(x / SQUARE), Math.floor(y / SQUARE)];
}

function tooClose(a: { x: number; y: number; count: number }, b: { x: number; y: number; count: number }): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < markerRadius(a.count) + markerRadius(b.count) + MARKER_GAP;
}

/**
 * The markers of `points`. Earlier points are taken first, so a point
 * joins the first marker it would overlap. Merging moves a marker and
 * makes it larger, so the points are merged again until no two markers
 * overlap.
 *
 * @throws RangeError when a count is not a whole number from 1, or a
 *   point is not on the screen's plane.
 */
export function clusterMarkers(points: readonly MarkerPoint[]): Marker[] {
  for (const { x, y, count } of points) {
    if (!Number.isSafeInteger(count) || count < 1) {
      throw new RangeError('the installations of a point are a whole number from 1');
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
      const count = into.count + marker.count;
      into.x = (into.x * into.count + marker.x * marker.count) / count;
      into.y = (into.y * into.count + marker.y * marker.count) / count;
      into.count = count;
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
    radius: markerRadius(count),
    members: [...members].sort((a, b) => a - b),
  }));
}

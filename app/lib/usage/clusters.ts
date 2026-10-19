// SPDX-License-Identifier: MIT
/**
 * The markers the usage globe draws: an area's installations as dots, or
 * as one bubble with their number, and areas close together on the
 * screen merged into one marker until zooming in leaves them room.
 *
 * A marker counts two things apart: 2.x installations and WireTrace 1.x
 * update checks, which are never installations. Its body shows the
 * installations: fewer than `BUBBLE_FROM` are that many dots
 * (`~/lib/usage/dot-layout`), more are a bubble whose size grows with the
 * logarithm of its number. A marker with 1.x checks only shows those the
 * same way, drawn hollow; one with both has a ring round its body.
 * Markers are merged while any two would come closer than `MARKER_GAP`,
 * so no two markers ever overlap, and every installation and every check
 * is in exactly one marker.
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
/** The space between a body and the ring of 1.x checks round it, and the
 *  ring's width, in pixels. */
export const RING_GAP = 2;
export const RING_WIDTH = 1.5;

export interface MarkerPoint {
  /** Where the point is on the screen, in pixels. */
  readonly x: number;
  readonly y: number;
  /** Its 2.x installations and its 1.x checks: whole numbers from 0, not
   *  both 0. */
  readonly installations: number;
  readonly legacy: number;
}

export interface Marker {
  /** The centre of its points, weighted by installations and checks
   *  together, in pixels. */
  readonly x: number;
  readonly y: number;
  readonly installations: number;
  readonly legacy: number;
  /** The radius of its body: of its installations, or of its 1.x checks
   *  when it has no installations. */
  readonly body: number;
  /** How far it reaches from its centre, its ring included. */
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

/** How far a body of `count` dots, or a bubble of `count`, reaches. */
export function markerRadius(count: number): number {
  if (count < BUBBLE_FROM) {
    return dotsOf(count).reduce((most, [x, y]) => Math.max(most, Math.hypot(x, y)), 0) + DOT_RADIUS;
  }
  const radius = BUBBLE_RADIUS_MIN + BUBBLE_RADIUS_PER_DOUBLING * Math.log2(count / BUBBLE_FROM);
  return Math.min(BUBBLE_RADIUS_MAX, radius);
}

/** The radius of a marker's body, and how far the whole marker reaches. */
export function markerShape(installations: number, legacy: number): { body: number; radius: number } {
  if (installations === 0) {
    const body = markerRadius(legacy);
    return { body, radius: body };
  }
  const body = markerRadius(installations);
  return { body, radius: legacy === 0 ? body : body + RING_GAP + RING_WIDTH };
}

interface Building {
  x: number;
  y: number;
  installations: number;
  legacy: number;
  members: number[];
  square: string;
}

/** The side of a grid square: two markers in squares that are not
 *  neighbours are too far apart to overlap. */
const SQUARE = 2 * (BUBBLE_RADIUS_MAX + RING_GAP + RING_WIDTH) + MARKER_GAP;

function squareOf(x: number, y: number): [number, number] {
  return [Math.floor(x / SQUARE), Math.floor(y / SQUARE)];
}

type Counted = { x: number; y: number; installations: number; legacy: number };

function tooClose(a: Counted, b: Counted): boolean {
  const reach = (m: Counted) => markerShape(m.installations, m.legacy).radius;
  return Math.hypot(a.x - b.x, a.y - b.y) < reach(a) + reach(b) + MARKER_GAP;
}

/**
 * The markers of `points`. Earlier points are taken first, so a point
 * joins the first marker it would overlap. Merging moves a marker and
 * makes it larger, so the points are merged again until no two markers
 * overlap.
 *
 * @throws RangeError when a count is not a whole number from 0, both
 *   counts of a point are 0, or a point is not on the screen's plane.
 */
export function clusterMarkers(points: readonly MarkerPoint[]): Marker[] {
  for (const { x, y, installations, legacy } of points) {
    for (const n of [installations, legacy]) {
      if (!Number.isSafeInteger(n) || n < 0) {
        throw new RangeError('the counts of a point are whole numbers from 0');
      }
    }
    if (installations + legacy === 0) {
      throw new RangeError('a point has installations or checks');
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new RangeError('a point has a finite position');
    }
  }
  let markers: Building[] = points.map(({ x, y, installations, legacy }, i) => ({
    x, y, installations, legacy, members: [i], square: '',
  }));
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
      const weight = (m: Building) => m.installations + m.legacy;
      const total = weight(into) + weight(marker);
      into.x = (into.x * weight(into) + marker.x * weight(marker)) / total;
      into.y = (into.y * weight(into) + marker.y * weight(marker)) / total;
      into.installations += marker.installations;
      into.legacy += marker.legacy;
      into.members.push(...marker.members);
      file(into);
      merged = true;
    }
    markers = kept;
  }
  return markers.map(({ x, y, installations, legacy, members }) => ({
    x,
    y,
    installations,
    legacy,
    ...markerShape(installations, legacy),
    members: [...members].sort((a, b) => a - b),
  }));
}

// SPDX-License-Identifier: MIT
/**
 * Where the usage globe draws its dots: one for each installation, around
 * the point of the area it checked in from.
 *
 * The dots of an area are packed on a hexagonal grid centred on the
 * area's point, nearest first, and no dot is placed closer to any other
 * than `spacing`, whichever area it belongs to. Areas are laid out in the
 * order given, so the first keep their dots closest to their points;
 * a later area that meets them grows outward around them. Every dot is
 * placed, however many there are.
 */

export interface DotAnchor {
  /** The area's point on the screen, in pixels. */
  readonly x: number;
  readonly y: number;
  /** The number of dots to place around it: a whole number from 0. */
  readonly count: number;
}

export type Dot = readonly [x: number, y: number];

const ROW_HEIGHT = Math.sqrt(3) / 2;
/** Six steps that walk once round a hexagonal ring from its corner at
 *  (-k, k), in axial coordinates. */
const RING_STEPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];
/** Rounding allowed when two dots sit exactly `spacing` apart. */
const TOLERANCE = 1e-6;

/** The cells of hexagonal ring `k` around the centre, in axial
 *  coordinates: the centre itself for ring 0, else 6k cells. */
function ring(k: number): [number, number][] {
  if (k === 0) return [[0, 0]];
  const cells: [number, number][] = [];
  let q = -k;
  let r = k;
  for (const [dq, dr] of RING_STEPS) {
    for (let step = 0; step < k; step += 1) {
      cells.push([q, r]);
      q += dq;
      r += dr;
    }
  }
  return cells;
}

/** Dots already placed, filed by a grid of `spacing` squares, so that a
 *  free place is found by looking at nine squares only. */
class Placed {
  private readonly squares = new Map<string, Dot[]>();

  constructor(private readonly spacing: number) {}

  private key(column: number, row: number): string {
    return `${column},${row}`;
  }

  isFree(x: number, y: number): boolean {
    const column = Math.floor(x / this.spacing);
    const row = Math.floor(y / this.spacing);
    const least = this.spacing * this.spacing - TOLERANCE;
    for (let dc = -1; dc <= 1; dc += 1) {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (const [px, py] of this.squares.get(this.key(column + dc, row + dr)) ?? []) {
          if ((px - x) ** 2 + (py - y) ** 2 < least) return false;
        }
      }
    }
    return true;
  }

  add(dot: Dot): void {
    const key = this.key(Math.floor(dot[0] / this.spacing), Math.floor(dot[1] / this.spacing));
    const square = this.squares.get(key);
    if (square) square.push(dot);
    else this.squares.set(key, [dot]);
  }
}

/**
 * The dots of each anchor, in the order of `anchors`: `count` dots each,
 * none of them closer than `spacing` to any other.
 *
 * @throws RangeError when `spacing` is not a positive number or a count
 *   is not a whole number from 0.
 */
export function layoutDots(anchors: readonly DotAnchor[], spacing: number): Dot[][] {
  if (!Number.isFinite(spacing) || spacing <= 0) {
    throw new RangeError('the spacing of the dots is a positive number');
  }
  const placed = new Placed(spacing);
  return anchors.map(({ x, y, count }) => {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new RangeError('the number of dots of an area is a whole number from 0');
    }
    const dots: Dot[] = [];
    for (let k = 0; dots.length < count; k += 1) {
      for (const [q, r] of ring(k)) {
        const dot: Dot = [x + spacing * (q + r / 2), y + spacing * ROW_HEIGHT * r];
        if (!placed.isFree(dot[0], dot[1])) continue;
        placed.add(dot);
        dots.push(dot);
        if (dots.length === count) break;
      }
    }
    return dots;
  });
}

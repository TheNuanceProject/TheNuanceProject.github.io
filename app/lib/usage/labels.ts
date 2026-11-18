// SPDX-License-Identifier: MIT
/**
 * Room for the globe's labels: each label takes the first of its places
 * that is inside the frame and clear of every marker and label already
 * placed, or is left out. Markers are placed first, then the names of
 * the places they stand for, then the towns around them, so a name never
 * covers a marker and a town never covers a place's name.
 */

/** A rectangle on the screen, in pixels. */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

export function inside(box: Box, frame: Box): boolean {
  return (
    box.x >= frame.x &&
    box.y >= frame.y &&
    box.x + box.width <= frame.x + frame.width &&
    box.y + box.height <= frame.y + frame.height
  );
}

/** The labels placed so far, inside `frame` and clear of `keepOut`. */
export class LabelRoom {
  private readonly taken: Box[];

  constructor(
    private readonly frame: Box,
    keepOut: readonly Box[] = []
  ) {
    this.taken = [...keepOut];
  }

  /** Whether every one of `boxes` is inside the frame and clear of all
   *  taken so far. */
  fits(...boxes: readonly Box[]): boolean {
    return boxes.every((box) => inside(box, this.frame) && !this.taken.some((other) => overlaps(box, other)));
  }

  take(...boxes: readonly Box[]): void {
    this.taken.push(...boxes);
  }

  /** Takes the first of `choices` that fits, and gives it back, or null
   *  when none does. */
  place(choices: readonly Box[]): Box | null {
    const chosen = choices.find((box) => this.fits(box)) ?? null;
    if (chosen) this.take(chosen);
    return chosen;
  }
}

/**
 * Where a label of `width` by `height` can go beside a round marker of
 * `radius` at `(x, y)`, `gap` away from it: to its right, to its left,
 * then below it, in that order of preference.
 */
export function besideMarker(x: number, y: number, radius: number, width: number, height: number, gap: number): Box[] {
  return [
    { x: x + radius + gap, y: y - height / 2, width, height },
    { x: x - radius - gap - width, y: y - height / 2, width, height },
    { x: x - width / 2, y: y + radius + gap, width, height },
  ];
}

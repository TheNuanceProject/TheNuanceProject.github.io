// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import { LabelRoom, besideMarker, inside, overlaps } from './labels';

const frame = { x: 0, y: 0, width: 400, height: 300 };

describe('overlaps', () => {
  it('is true for boxes that share area, false for ones that only touch', () => {
    expect(overlaps({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toBe(true);
    expect(overlaps({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 10, height: 10 })).toBe(false);
  });
});

describe('inside', () => {
  it('is true only for a box wholly in the frame', () => {
    expect(inside({ x: 0, y: 0, width: 400, height: 300 }, frame)).toBe(true);
    expect(inside({ x: 390, y: 0, width: 20, height: 10 }, frame)).toBe(false);
  });
});

describe('LabelRoom', () => {
  it('places a label in the first spot that is clear', () => {
    const room = new LabelRoom(frame, [{ x: 100, y: 100, width: 20, height: 20 }]);
    const choices = besideMarker(110, 110, 10, 60, 20, 6);

    // To the right of the marker is clear.
    expect(room.place(choices)).toEqual(choices[0]);
  });

  it('moves a label to the left when the right is taken or outside the frame', () => {
    const room = new LabelRoom(frame);
    const choices = besideMarker(380, 150, 10, 60, 20, 6);
    expect(room.place(choices)).toEqual(choices[1]);
  });

  it('leaves out a label with no room', () => {
    const room = new LabelRoom(frame, [{ x: 0, y: 0, width: 400, height: 300 }]);
    expect(room.place(besideMarker(200, 150, 10, 60, 20, 6))).toBeNull();
  });

  it('keeps later labels clear of earlier ones', () => {
    const room = new LabelRoom(frame);
    const first = room.place([{ x: 10, y: 10, width: 100, height: 20 }]);
    expect(first).not.toBeNull();
    expect(room.fits({ x: 50, y: 15, width: 100, height: 20 })).toBe(false);
    expect(room.fits({ x: 10, y: 40, width: 100, height: 20 })).toBe(true);
  });
});

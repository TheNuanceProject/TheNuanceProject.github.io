// SPDX-License-Identifier: MIT
/**
 * Where the usage globe looks, and the arithmetic of moving it.
 *
 * The globe is an orthographic projection drawn on a canvas that fills
 * its frame. At the farthest zoom the whole globe is in view; zooming in
 * grows it past the edges of the frame, as a map does, so nothing is
 * ever cut to a square. Every zoom and every drag keeps the point of the
 * world under the pointer (or under the middle of two fingers) where it
 * is, the way map viewers do.
 *
 * Kept apart from the component so it can be tested without a browser.
 */
import { type GeoProjection, geoOrthographic } from 'd3-geo';

/** Where the globe is turned to and how close it is. */
export interface View {
  /** The longitude and latitude at the middle of the frame, in degrees. */
  readonly lon: number;
  readonly lat: number;
  /** 1 shows the whole globe; larger numbers are closer. */
  readonly zoom: number;
}

/** A frame's size in CSS pixels. */
export interface Frame {
  readonly width: number;
  readonly height: number;
}

export const ZOOM_MIN = 1;
/** Close enough for places 11 km apart, the precision of a city's
 *  position, to stand clearly apart. */
export const ZOOM_MAX = 160;
/** The farthest north or south the middle of the frame can be turned. */
export const LATITUDE_LIMIT = 85;
/** At the farthest zoom the globe's diameter is this share of the frame's
 *  shorter side, leaving a margin round it. */
export const GLOBE_SHARE = 0.88;
/** The zooms from which the medium and the fine outlines are drawn
 *  (scripts/make-world.mjs makes the three levels). */
export const LEVEL_ZOOMS = [4, 16] as const;
/** The mean radius of the Earth, in kilometres. */
export const EARTH_RADIUS_KM = 6371;
/** Correcting the view to keep a point under the pointer converges in a
 *  few steps; this many leaves an error far below a pixel. */
const ANCHOR_STEPS = 4;
/** A point a projection gives back this close to where it was asked is
 *  on the visible half of the globe, in pixels. */
const ON_GLOBE_TOLERANCE = 0.5;

export function clampZoom(zoom: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
}

export function clampLatitude(lat: number): number {
  return Math.max(-LATITUDE_LIMIT, Math.min(LATITUDE_LIMIT, lat));
}

/** A longitude, or a difference of longitudes, brought into -180 to 180. */
export function wrapLongitude(lon: number): number {
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 && lon > 0 ? 180 : wrapped;
}

/** The globe's radius in pixels at zoom 1. */
export function baseRadius(frame: Frame): number {
  return (Math.min(frame.width, frame.height) * GLOBE_SHARE) / 2;
}

/** The globe's radius in pixels for a view. */
export function globeRadius(view: View, frame: Frame): number {
  return baseRadius(frame) * view.zoom;
}

/** How many pixels a kilometre takes at the middle of the frame. */
export function pixelsPerKm(view: View, frame: Frame): number {
  return globeRadius(view, frame) / EARTH_RADIUS_KM;
}

/** Sets `projection` to show `view` in `frame`, and gives it back. */
export function project(projection: GeoProjection, view: View, frame: Frame): GeoProjection {
  return projection
    .scale(globeRadius(view, frame))
    .translate([frame.width / 2, frame.height / 2])
    .rotate([-view.lon, -view.lat, 0]);
}

/** A projection of its own for a view, for one-off questions. */
export function projectionFor(view: View, frame: Frame): GeoProjection {
  return project(geoOrthographic().clipAngle(90), view, frame);
}

/** The point of the world at a point of the frame, or null when that
 *  point is off the globe. */
export function pointAt(projection: GeoProjection, x: number, y: number): [number, number] | null {
  const at = projection.invert?.([x, y]);
  if (!at || !Number.isFinite(at[0]) || !Number.isFinite(at[1])) return null;
  const back = projection(at);
  if (!back || Math.hypot(back[0] - x, back[1] - y) > ON_GLOBE_TOLERANCE) return null;
  return at;
}

/**
 * `view`, turned so that the point of the world `geo` sits at the point
 * `(x, y)` of the frame. Used for dragging, for zooming at the pointer,
 * and for pinching. When `geo` cannot be brought there (a point beyond
 * the horizon at this zoom), the view turns as far towards it as it can.
 */
export function keepUnder(view: View, frame: Frame, geo: readonly [number, number], x: number, y: number): View {
  let lon = view.lon;
  let lat = view.lat;
  const projection = geoOrthographic().clipAngle(90);
  for (let step = 0; step < ANCHOR_STEPS; step += 1) {
    project(projection, { lon, lat, zoom: view.zoom }, frame);
    const now = projection.invert?.([x, y]);
    if (!now || !Number.isFinite(now[0]) || !Number.isFinite(now[1])) break;
    lon = wrapLongitude(lon - wrapLongitude(now[0] - geo[0]));
    lat = clampLatitude(lat - (now[1] - geo[1]));
  }
  return { lon, lat, zoom: view.zoom };
}

/** `view` at `zoom`, keeping the point of the world at `(x, y)` there
 *  when that point is on the globe. */
export function zoomAt(view: View, frame: Frame, zoom: number, x: number, y: number): View {
  const geo = pointAt(projectionFor(view, frame), x, y);
  const next = { ...view, zoom: clampZoom(zoom) };
  return geo ? keepUnder(next, frame, geo, x, y) : next;
}

/**
 * The angle, in radians from the middle of the frame, within which the
 * world can be on screen: the whole visible half while the globe fits,
 * less once it is larger than the frame. Drawing leaves out whatever is
 * farther, which keeps a close zoom fast.
 */
export function visibleAngle(view: View, frame: Frame): number {
  const radius = globeRadius(view, frame);
  const corner = Math.hypot(frame.width, frame.height) / 2;
  return corner >= radius ? Math.PI / 2 : Math.asin(corner / radius);
}

/** Which level of detail a zoom draws: 0 coarse, 1 medium, 2 fine. */
export function levelFor(zoom: number): 0 | 1 | 2 {
  if (zoom >= LEVEL_ZOOMS[1]) return 2;
  if (zoom >= LEVEL_ZOOMS[0]) return 1;
  return 0;
}

/** The steps a scale bar can show: 1, 2 or 5 times a power of ten. */
const SCALE_STEPS = [1, 2, 5] as const;

/**
 * The longest round distance a scale bar of at most `maxPixels` can show
 * at the middle of the frame, and its length in pixels.
 */
export function scaleBar(view: View, frame: Frame, maxPixels: number): { km: number; pixels: number } {
  const perKm = pixelsPerKm(view, frame);
  const most = maxPixels / perKm;
  const power = 10 ** Math.floor(Math.log10(most));
  const km = Math.max(...SCALE_STEPS.map((step) => step * power).filter((distance) => distance <= most));
  return { km, pixels: km * perKm };
}

/**
 * The value of the CSS easing curve cubic-bezier(x1, y1, x2, y2) at time
 * `t` from 0 to 1, as a browser computes it, so a camera move follows the
 * design language's own curve.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const curve = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  const slope = (a: number, b: number, s: number) => 3 * a * (1 - s) ** 2 + 6 * (b - a) * s * (1 - s) + 3 * (1 - b) * s * s;
  // Newton's method finds the curve's parameter for time t, with halving
  // as the fallback where the slope is too flat to divide by.
  let s = t;
  for (let i = 0; i < 8; i += 1) {
    const error = curve(x1, x2, s) - t;
    const d = slope(x1, x2, s);
    if (Math.abs(error) < 1e-7) return curve(y1, y2, s);
    if (Math.abs(d) < 1e-6) break;
    s = Math.max(0, Math.min(1, s - error / d));
  }
  let low = 0;
  let high = 1;
  s = t;
  for (let i = 0; i < 30; i += 1) {
    const x = curve(x1, x2, s);
    if (Math.abs(x - t) < 1e-7) break;
    if (x < t) low = s;
    else high = s;
    s = (low + high) / 2;
  }
  return curve(y1, y2, s);
}

/** A CSS cubic-bezier() value, as the four numbers it holds. */
export function parseCubicBezier(value: string): [number, number, number, number] | null {
  const match = /^cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/.exec(value.trim());
  if (!match) return null;
  const numbers = match.slice(1).map(Number) as [number, number, number, number];
  return numbers.every(Number.isFinite) ? numbers : null;
}

/**
 * The view part of the way through a move from `from` to `to`: the
 * position the shorter way round, and the zoom evenly on a logarithmic
 * scale, so every doubling takes the same time. `progress` runs from 0
 * to 1, already eased.
 */
export function between(from: View, to: View, progress: number): View {
  return {
    lon: wrapLongitude(from.lon + wrapLongitude(to.lon - from.lon) * progress),
    lat: from.lat + (to.lat - from.lat) * progress,
    zoom: Math.exp(Math.log(from.zoom) + (Math.log(to.zoom) - Math.log(from.zoom)) * progress),
  };
}

/**
 * The zoom at which two points of the world `angle` radians apart are
 * `pixels` apart on screen near the middle of the frame: what a place
 * needs to stand clear of its neighbour as a marker of its own.
 */
export function zoomForSeparation(angle: number, pixels: number, frame: Frame): number {
  const chord = 2 * Math.sin(Math.min(Math.PI, Math.max(0, angle)) / 2);
  return chord === 0 ? Infinity : pixels / (baseRadius(frame) * chord);
}

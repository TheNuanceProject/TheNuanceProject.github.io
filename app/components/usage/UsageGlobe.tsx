// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState } from 'react';
import {
  type GeoPermissibleObjects,
  geoCentroid,
  geoContains,
  geoDistance,
  geoGraticule10,
  geoOrthographic,
  geoPath,
} from 'd3-geo';
import type { Feature, Geometry, MultiLineString } from 'geojson';
import { feature as toFeatures, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

import { MAP_PERIOD_DAYS, type UsageCount, type UsagePlace, dayDate } from '~/lib/build-data/usage-summary';
import { formatIsoDate } from '~/lib/content/dates';
import { BUBBLE_FROM, RING_GAP, RING_WIDTH, type Marker, clusterMarkers } from '~/lib/usage/clusters';
import { Minus, Plus } from 'lucide-react';
import { Icon } from '~/components/icons/Icon';

/** The countries the globe draws: made by `scripts/make-world.mjs`. */
export const WORLD_PATH = '/data/world.json';

interface CountryProperties {
  /** ISO 3166-1 alpha-2, or "" for a place that has none. */
  readonly code: string;
  readonly name: string;
}

type Country = Feature<Geometry, CountryProperties>;
type World = Topology<{ countries: GeometryCollection<CountryProperties> }>;

interface UsageGlobeProps {
  readonly places: readonly UsagePlace[];
  /** The summary's day, the UTC day it was made: an area that checked in
   *  on it or the day before pulses. */
  readonly day: number;
  /** Installations active in the map period, by country code. */
  readonly installations: ReadonlyMap<string, number>;
  /** The English name of each country code. */
  readonly names: Readonly<Record<string, string>>;
  /** A country to turn the globe to and outline, or null. */
  readonly chosen: string | null;
}

const ZOOM_MIN = 1;
/** Close enough for neighbouring areas to show apart. A marker sits on
 *  its area's named place, so zooming shows nothing finer. */
const ZOOM_MAX = 8;
const ZOOM_STEP = 1.5;
const TILT_LIMIT = 80;
const SPIN_DEGREES_PER_FRAME = 0.05;
const TURN_EASING = 0.12;
const KEY_STEP_DEGREES = 10;
/** Wheel steps reported in lines are taken as this many pixels each. */
const WHEEL_LINE_PIXELS = 16;
/** Zoom changes by e^(-k·pixels) for a wheel turn of that many pixels. */
const WHEEL_ZOOM_PER_PIXEL = 0.002;
const PULSE_MS = 2400;
/** A marker pulses when something in it checked in on the summary's day
 *  or the days just before it, this many days in all. */
const RECENT_DAYS = 2;
const MARKER_OUTLINE = 1;
const MARKER_OUTLINE_HOVER = 1.5;
/** A bubble's number is set this high for each pixel of its radius, and
 *  smaller if it would not fit within its padding. */
const BUBBLE_FONT_PER_RADIUS = 0.95;
const BUBBLE_TEXT_PADDING = 3;
/** From this many installations, a bubble writes its number in short. */
const BUBBLE_SHORT_FROM = 1000;
/** The areas a merged marker names, largest first; the rest are counted. */
const MERGED_AREAS_LISTED = 5;
const PULSE_GROWTH = 14;
/** How far outside a marker the pointer still picks it, in pixels. */
const PICK_MARGIN = 6;
const EDGE_MARGIN = 2;
/** A mark this close to the edge of the visible half is left out. */
const HORIZON_MARGIN = 0.02;
const START_ROTATION: [number, number, number] = [-78, -20, 0];
/** A mark's area is sampled at this many points a side to name the
 *  country it lies in: the mark itself can fall in the sea off a coast. */
const AREA_SAMPLES = 5;

interface Hover {
  readonly x: number;
  readonly y: number;
  readonly title: string;
  readonly lines: readonly string[];
}

/** A marker as the globe draws it this frame, with its areas. */
interface Shown {
  readonly marker: Marker;
  /** Its areas, most installations first. */
  readonly places: readonly UsagePlace[];
  /** Whether an area in it checked in within the last `RECENT_DAYS`. */
  readonly recent: boolean;
  /** Names the marker by its areas, so a hovered one is found again. */
  readonly key: string;
}

const number = new Intl.NumberFormat('en-US');
const shortNumber = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

function installationsText(count: number): string {
  return `${number.format(count)} ${count === 1 ? 'installation' : 'installations'}`;
}

function checksText(count: number): string {
  return `${number.format(count)} update ${count === 1 ? 'check' : 'checks'}`;
}

const countOf = (part: UsageCount | null): number => part?.count ?? 0;

/** The last day anything came from an area. */
function lastSeen(place: UsagePlace): number {
  return Math.max(place.installations?.lastSeen ?? -Infinity, place.legacy?.lastSeen ?? -Infinity);
}

/** Most installations first, so a merged marker names its largest areas
 *  first and the largest areas gather the others; the rest in a fixed
 *  order. */
function layoutOrder(a: UsagePlace, b: UsagePlace): number {
  return (
    countOf(b.installations) - countOf(a.installations) ||
    countOf(b.legacy) - countOf(a.legacy) ||
    lastSeen(b) - lastSeen(a) ||
    a.lat - b.lat ||
    a.lon - b.lon
  );
}

function clampTilt(value: number): number {
  return Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, value));
}

function clampZoom(value: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
}

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * UsageGlobe: a globe drawn in the visitor's browser from public-domain
 * map data served by this site, with the installations of each area as a
 * dot, or as a bubble with their number, merged with nearby areas until
 * zooming in leaves them room (`~/lib/usage/clusters`). It can be turned
 * by dragging or with the arrow keys, zoomed with the mouse
 * wheel, its buttons or + and -, and gives the figures of an area or a
 * country under the pointer. Nothing is loaded from anywhere else.
 */
export function UsageGlobe({ places, day, installations, names, chosen }: UsageGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [countries, setCountries] = useState<Country[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);
  const borders = useRef<MultiLineString | null>(null);
  const view = useRef({
    rotation: [...START_ROTATION] as [number, number, number],
    zoom: ZOOM_MIN,
    dragging: null as { x: number; y: number } | null,
    target: null as [number, number] | null,
    hoverKey: null as string | null,
    hoverCountry: null as Country | null,
    chosen,
  });

  useEffect(() => {
    let alive = true;
    fetch(WORLD_PATH)
      .then((response) => {
        if (!response.ok) throw new Error(`the map answered ${response.status}`);
        return response.json() as Promise<World>;
      })
      .then((world) => {
        if (!alive) return;
        if (world?.type !== 'Topology' || !world.objects?.countries) throw new Error('not a map');
        setCountries(toFeatures(world, world.objects.countries).features as Country[]);
        borders.current = mesh(world, world.objects.countries, (a, b) => a !== b);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // A country chosen from the list: turn to it the shorter way round.
  useEffect(() => {
    const state = view.current;
    state.chosen = chosen;
    if (!chosen || !countries) return;
    const country = countries.find((c) => c.properties.code === chosen);
    if (!country) return;
    const [lon, lat] = geoCentroid(country);
    let target = -lon;
    while (target - state.rotation[0] > 180) target -= 360;
    while (state.rotation[0] - target > 180) target += 360;
    state.target = [target, clampTilt(-lat)];
  }, [chosen, countries]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !countries) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const state = view.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const projection = geoOrthographic().clipAngle(90).precision(0.3);
    const path = geoPath(projection, context);
    const sphere: GeoPermissibleObjects = { type: 'Sphere' };
    const graticule = geoGraticule10();
    const ordered = [...places].sort(layoutOrder);
    const recent = (place: UsagePlace) => lastSeen(place) > day - RECENT_DAYS;
    let size = 0;
    let frame = 0;
    /** The markers as last laid out, and the view they were laid out for. */
    let laidOut: Shown[] = [];
    let laidOutFor = '';

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      size = canvas.clientWidth;
      canvas.width = Math.round(size * ratio);
      canvas.height = Math.round(size * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      projection.translate([size / 2, size / 2]);
    };

    const visible = (place: UsagePlace) =>
      geoDistance([place.lon, place.lat], [-state.rotation[0], -state.rotation[1]]) < Math.PI / 2 - HORIZON_MARGIN;

    // The theme's colours, read again only when the theme changes.
    const readColours = () => ({
      ocean: token('--color-map-ocean'),
      land: token('--color-map-land'),
      used: token('--color-map-land-used'),
      line: token('--color-divider'),
      paper: token('--color-paper'),
      accent: token('--color-accent'),
      steady: token('--color-text-secondary'),
      text: token('--color-text'),
      font: token('--font-sans'),
    });
    let colours = readColours();
    let themeVersion = 0;
    const themeWatch = new MutationObserver(() => {
      colours = readColours();
      themeVersion += 1;
    });
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    /** Whether a point on the canvas lies on the globe's disc. */
    const onDisc = (x: number, y: number) => Math.hypot(x - size / 2, y - size / 2) <= size / 2 - EDGE_MARGIN;

    /** The markers of the areas on the visible half, for the current
     *  view. The projection must already be set for it. */
    const layout = (): Shown[] => {
      const key = [state.rotation.join(','), state.zoom, size].join('|');
      if (key === laidOutFor) return laidOut;
      const seen: { place: UsagePlace; x: number; y: number }[] = [];
      for (const place of ordered) {
        if (!visible(place)) continue;
        const point = projection([place.lon, place.lat]);
        if (point) seen.push({ place, x: point[0], y: point[1] });
      }
      const markers = clusterMarkers(
        seen.map(({ x, y, place }) => ({
          x,
          y,
          installations: countOf(place.installations),
          legacy: countOf(place.legacy),
        }))
      );
      laidOut = markers.map((marker) => {
        const members = marker.members.map((i) => (seen[i] as (typeof seen)[number]).place);
        return {
          marker,
          places: members,
          recent: members.some(recent),
          key: members.map((place) => places.indexOf(place)).join(','),
        };
      });
      laidOutFor = key;
      return laidOut;
    };

    /** A bubble's number, as large as fits inside it. */
    const bubbleText = (count: number, body: number) => {
      const text = count >= BUBBLE_SHORT_FROM ? shortNumber.format(count) : number.format(count);
      let fontSize = body * BUBBLE_FONT_PER_RADIUS;
      context.font = `500 ${fontSize}px ${colours.font}`;
      const room = 2 * (body - BUBBLE_TEXT_PADDING);
      const width = context.measureText(text).width;
      if (width > room) {
        fontSize *= room / width;
        context.font = `500 ${fontSize}px ${colours.font}`;
      }
      return text;
    };

    const draw = (time: number) => {
      const radius = size / 2 - EDGE_MARGIN;
      projection.rotate(state.rotation).scale(radius * state.zoom);
      context.clearRect(0, 0, size, size);
      context.save();
      context.beginPath();
      context.arc(size / 2, size / 2, radius, 0, 2 * Math.PI);
      context.clip();
      context.beginPath();
      path(sphere);
      context.fillStyle = colours.ocean;
      context.fill();
      context.beginPath();
      path(graticule);
      context.strokeStyle = colours.line;
      context.lineWidth = 0.5;
      context.stroke();
      for (const country of countries) {
        context.beginPath();
        path(country);
        context.fillStyle = installations.has(country.properties.code) ? colours.used : colours.land;
        context.fill();
        if (country === state.hoverCountry || (state.chosen && country.properties.code === state.chosen)) {
          context.strokeStyle = colours.accent;
          context.lineWidth = 1.5;
          context.stroke();
        }
      }
      if (borders.current) {
        context.beginPath();
        path(borders.current);
        context.strokeStyle = colours.paper;
        context.lineWidth = 0.6;
        context.stroke();
      }
      const phase = reduced.matches ? 0 : (time % PULSE_MS) / PULSE_MS;
      for (const shown of layout()) {
        const { marker } = shown;
        if (shown.recent && !reduced.matches) {
          context.beginPath();
          context.arc(marker.x, marker.y, marker.radius + phase * PULSE_GROWTH, 0, 2 * Math.PI);
          context.strokeStyle = colours.accent;
          context.globalAlpha = 1 - phase;
          context.lineWidth = 1.5;
          context.stroke();
          context.globalAlpha = 1;
        }
        const hovered = shown.key === state.hoverKey;
        const colour = shown.recent ? colours.accent : colours.steady;
        // The body: installations filled; 1.x checks alone hollow. One is
        // a dot; more are a bubble with their number.
        const hollow = marker.installations === 0;
        const count = hollow ? marker.legacy : marker.installations;
        context.beginPath();
        context.arc(marker.x, marker.y, marker.body, 0, 2 * Math.PI);
        context.fillStyle = hollow ? colours.paper : colour;
        context.fill();
        context.lineWidth = hollow ? RING_WIDTH : hovered ? MARKER_OUTLINE_HOVER : MARKER_OUTLINE;
        context.strokeStyle = hollow ? (hovered ? colours.text : colour) : hovered ? colours.text : colours.paper;
        context.stroke();
        if (count >= BUBBLE_FROM) {
          const text = bubbleText(count, marker.body);
          context.fillStyle = hollow ? colour : colours.paper;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(text, marker.x, marker.y);
        }
        // Installations with 1.x checks among them: a ring round the body.
        if (!hollow && marker.legacy > 0) {
          context.beginPath();
          context.arc(marker.x, marker.y, marker.body + RING_GAP + RING_WIDTH / 2, 0, 2 * Math.PI);
          context.lineWidth = RING_WIDTH;
          context.strokeStyle = hovered ? colours.text : colour;
          context.stroke();
        }
      }
      context.restore();
      context.beginPath();
      context.arc(size / 2, size / 2, radius, 0, 2 * Math.PI);
      context.strokeStyle = colours.line;
      context.lineWidth = 1;
      context.stroke();
    };

    // What the last frame showed. A frame is drawn only when something
    // changed or a mark is pulsing, and none while the globe is out of
    // sight, so an idle or hidden globe costs nothing.
    let shown = '';
    let onScreen = false;
    const pulsing = () => !reduced.matches && places.some((place) => recent(place) && visible(place));

    const tick = (time: number) => {
      if (state.target) {
        const [lon, lat] = state.target;
        state.rotation = [
          state.rotation[0] + (lon - state.rotation[0]) * TURN_EASING,
          state.rotation[1] + (lat - state.rotation[1]) * TURN_EASING,
          0,
        ];
        if (Math.abs(lon - state.rotation[0]) < 0.1 && Math.abs(lat - state.rotation[1]) < 0.1) state.target = null;
      } else if (!state.dragging && !state.hoverKey && !state.hoverCountry && !state.chosen && !reduced.matches) {
        state.rotation[0] += SPIN_DEGREES_PER_FRAME;
      }
      const view = [
        state.rotation.join(','), state.zoom, size, themeVersion, state.chosen,
        state.hoverKey ?? '', state.hoverCountry?.properties.name ?? '',
      ].join('|');
      if (view !== shown || pulsing()) {
        draw(time);
        shown = view;
      }
      frame = onScreen ? requestAnimationFrame(tick) : 0;
    };
    const sight = new IntersectionObserver(([entry]) => {
      const wasOnScreen = onScreen;
      onScreen = entry?.isIntersecting ?? false;
      if (onScreen && !wasOnScreen) frame = requestAnimationFrame(tick);
      if (!onScreen) cancelAnimationFrame(frame);
    });

    const nameOf = (country: Country) => names[country.properties.code] ?? country.properties.name;

    /** The country most of an area lies in, if any. */
    const countryOfArea = (place: UsagePlace): Country | undefined => {
      const south = Math.floor(place.lat);
      const west = Math.floor(place.lon);
      const votes = new Map<Country, number>();
      for (let i = 0; i < AREA_SAMPLES; i += 1) {
        for (let j = 0; j < AREA_SAMPLES; j += 1) {
          const point: [number, number] = [west + (j + 0.5) / AREA_SAMPLES, south + (i + 0.5) / AREA_SAMPLES];
          const country = countries.find((c) => geoContains(c, point));
          if (country) votes.set(country, (votes.get(country) ?? 0) + 1);
        }
      }
      let best: Country | undefined;
      for (const [country, count] of votes) {
        if (!best || count > (votes.get(best) ?? 0)) best = country;
      }
      return best;
    };

    /** An area's name: its largest place and country, else the country
     *  it lies in. */
    const areaName = (place: UsagePlace): { name: string; named: boolean } => {
      if (place.area) {
        return { name: `${place.area.name}, ${names[place.area.country] ?? place.area.country}`, named: true };
      }
      const home = countries.find((c) => geoContains(c, [place.lon, place.lat])) ?? countryOfArea(place);
      return { name: home ? `An area in ${nameOf(home)}` : 'An area at sea', named: false };
    };

    /** The day something was last seen, as the tooltip says it. */
    const onDay = (seen: number) => (seen === day ? 'today' : formatIsoDate(dayDate(seen)));
    const period = `in the last ${MAP_PERIOD_DAYS} days`;
    /** What came from one area, in short, for a merged marker's list. */
    const counts = (place: UsagePlace) =>
      [
        place.installations ? installationsText(place.installations.count) : null,
        place.legacy ? `1.x: ${checksText(place.legacy.count)}` : null,
      ]
        .filter((part) => part !== null)
        .join(', ');
    const describe = (shown: Shown): Omit<Hover, 'x' | 'y'> => {
      const [only] = shown.places;
      if (only && shown.places.length === 1) {
        const { name, named } = areaName(only);
        return {
          title: named ? `Around ${name}` : name,
          lines: [
            ...(only.installations
              ? [
                  `${installationsText(only.installations.count)} active ${period}`,
                  `Last check-in ${onDay(only.installations.lastSeen)}`,
                ]
              : []),
            ...(only.legacy
              ? [`WireTrace 1.x: ${checksText(only.legacy.count)} ${period}, the last ${onDay(only.legacy.lastSeen)}`]
              : []),
          ],
        };
      }
      const listed = shown.places.slice(0, MERGED_AREAS_LISTED);
      const rest = shown.places.length - listed.length;
      const { installations: total, legacy } = shown.marker;
      return {
        title: `${number.format(shown.places.length)} areas`,
        lines: [
          ...(total > 0 ? [`${installationsText(total)} active ${period}`] : []),
          ...(legacy > 0 ? [`WireTrace 1.x: ${checksText(legacy)} ${period}`] : []),
          ...listed.map((place) => `${areaName(place).name}: ${counts(place)}`),
          ...(rest > 0 ? [`and ${number.format(rest)} more ${rest === 1 ? 'area' : 'areas'}; zoom in to see them`] : []),
        ],
      };
    };

    const pick = (px: number, py: number) => {
      state.hoverKey = null;
      state.hoverCountry = null;
      projection.rotate(state.rotation).scale((size / 2 - EDGE_MARGIN) * state.zoom);
      let best: Shown | null = null;
      let distance = PICK_MARGIN;
      for (const shown of layout()) {
        const { marker } = shown;
        if (!onDisc(marker.x, marker.y)) continue;
        const d = Math.hypot(marker.x - px, marker.y - py) - marker.radius;
        if (d < distance) {
          best = shown;
          distance = d;
        }
      }
      if (best) {
        state.hoverKey = best.key;
        setHover({ x: best.marker.x, y: best.marker.y - best.marker.radius, ...describe(best) });
        return;
      }
      if (!onDisc(px, py)) {
        setHover(null);
        return;
      }
      const at = projection.invert?.([px, py]);
      const country = at ? countries.find((c) => geoContains(c, at)) : undefined;
      if (!country) {
        setHover(null);
        return;
      }
      state.hoverCountry = country;
      const active = installations.get(country.properties.code);
      setHover({
        x: px,
        y: py,
        title: nameOf(country),
        lines: [active ? `${installationsText(active)} active ${period}` : `No installation active ${period}`],
      });
    };

    const forget = () => {
      state.hoverKey = null;
      state.hoverCountry = null;
      setHover(null);
    };

    const local = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top] as const;
    };
    const onDown = (event: PointerEvent) => {
      state.dragging = { x: event.clientX, y: event.clientY };
      state.target = null;
      canvas.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (state.dragging) {
        const k = 70 / projection.scale();
        state.rotation = [
          state.rotation[0] + (event.clientX - state.dragging.x) * k,
          clampTilt(state.rotation[1] - (event.clientY - state.dragging.y) * k),
          0,
        ];
        state.dragging = { x: event.clientX, y: event.clientY };
        setHover(null);
        return;
      }
      pick(...local(event));
    };
    const onUp = (event: PointerEvent) => {
      const wasDragging = state.dragging;
      state.dragging = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      // A tap that did not move names what it touched.
      if (wasDragging && event.pointerType !== 'mouse') pick(...local(event));
    };
    // The browser took the gesture over, to scroll the page.
    const onCancel = () => {
      state.dragging = null;
    };
    const onLeave = (event: PointerEvent) => {
      // A finger lifted from a touch screen also leaves: what the tap
      // named stays until the next tap.
      if (state.dragging || event.pointerType !== 'mouse') return;
      forget();
    };
    // The wheel zooms. At the closest or farthest zoom it is left to the
    // page, which scrolls on.
    const onWheel = (event: WheelEvent) => {
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE ? WHEEL_LINE_PIXELS
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? size
        : 1;
      const next = clampZoom(state.zoom * Math.exp(-event.deltaY * unit * WHEEL_ZOOM_PER_PIXEL));
      if (next === state.zoom) return;
      event.preventDefault();
      state.zoom = next;
      forget();
    };
    const onKey = (event: KeyboardEvent) => {
      const steps: Record<string, [number, number]> = {
        ArrowLeft: [-KEY_STEP_DEGREES, 0],
        ArrowRight: [KEY_STEP_DEGREES, 0],
        ArrowUp: [0, KEY_STEP_DEGREES],
        ArrowDown: [0, -KEY_STEP_DEGREES],
      };
      if (event.key === '+' || event.key === '=') {
        state.zoom = clampZoom(state.zoom * ZOOM_STEP);
      } else if (event.key === '-') {
        state.zoom = clampZoom(state.zoom / ZOOM_STEP);
      } else if (steps[event.key]) {
        const [dLon, dLat] = steps[event.key] as [number, number];
        state.target = null;
        state.rotation = [state.rotation[0] + dLon, clampTilt(state.rotation[1] + dLat), 0];
      } else {
        return;
      }
      event.preventDefault();
      forget();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('keydown', onKey);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    sight.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      sight.disconnect();
      themeWatch.disconnect();
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('keydown', onKey);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [countries, places, day, installations, names]);

  const zoom = (factor: number) => {
    const state = view.current;
    state.zoom = clampZoom(state.zoom * factor);
    state.hoverKey = null;
    state.hoverCountry = null;
    setHover(null);
  };

  return (
    <div className="relative mx-auto w-full max-w-140 aspect-square touch-pan-y">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="A globe with the WireTrace installations active in the last 30 days in each area of about 100 km they checked in from, as a dot for one or a number for more, and, drawn hollow, the WireTrace 1.x update checks from each area. The countries and their installations are listed below."
        className="block h-full w-full cursor-grab rounded-full active:cursor-grabbing"
      />
      {failed && (
        <p className="absolute inset-0 flex items-center justify-center p-8 text-center font-sans text-ui-lg text-text-secondary">
          The map could not be loaded. The countries are listed below.
        </p>
      )}
      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -mt-3 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-divider bg-surface shadow-float px-3 py-2 font-sans text-ui text-text"
          style={{ left: hover.x, top: hover.y }}
        >
          {hover.title}
          {hover.lines.map((line, i) => (
            <span key={i} className="block text-ui text-text-secondary">
              {line}
            </span>
          ))}
        </div>
      )}
      <div className="absolute bottom-0 right-0 grid gap-2">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoom(ZOOM_STEP)}
          className="flex size-(--size-control-lg) items-center justify-center rounded-full border border-edge bg-paper text-text transition-colors hover:bg-divider"
        >
          <Icon icon={Plus} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoom(1 / ZOOM_STEP)}
          className="flex size-(--size-control-lg) items-center justify-center rounded-full border border-edge bg-paper text-text transition-colors hover:bg-divider"
        >
          <Icon icon={Minus} />
        </button>
      </div>
    </div>
  );
}

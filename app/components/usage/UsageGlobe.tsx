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

import type { UsagePlace } from '~/lib/build-data/usage-summary';
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
  /** Codes of the countries WireTrace is used in. */
  readonly used: ReadonlySet<string>;
  /** The English name of each country code. */
  readonly names: Readonly<Record<string, string>>;
  /** A country to turn the globe to and outline, or null. */
  readonly chosen: string | null;
}

const ZOOM_MIN = 1;
/** No closer than this, so a mark is never read as finer than its area. */
const ZOOM_MAX = 3;
const ZOOM_STEP = 1.5;
const TILT_LIMIT = 80;
const SPIN_DEGREES_PER_FRAME = 0.05;
const TURN_EASING = 0.12;
const KEY_STEP_DEGREES = 10;
const PULSE_MS = 2400;
const MARK_RADIUS = 4;
const MARK_RADIUS_HOVER = 6;
const PULSE_GROWTH = 14;
const PICK_DISTANCE = 12;
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
  readonly detail: string;
}

function clampTilt(value: number): number {
  return Math.max(-TILT_LIMIT, Math.min(TILT_LIMIT, value));
}

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * UsageGlobe: a globe drawn in the visitor's browser from public-domain
 * map data served by this site, with a mark for each area WireTrace was
 * used in. It can be turned by dragging or with the arrow keys, zoomed
 * with its buttons or + and -, and names a mark or a country under the
 * pointer. Nothing is loaded from anywhere else.
 */
export function UsageGlobe({ places, used, names, chosen }: UsageGlobeProps) {
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
    hoverMark: null as UsagePlace | null,
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
    let size = 0;
    let frame = 0;

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
        context.fillStyle = used.has(country.properties.code) ? colours.used : colours.land;
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
      for (const place of places) {
        if (!visible(place)) continue;
        const point = projection([place.lon, place.lat]);
        if (!point) continue;
        const [x, y] = point;
        if (place.pulse && !reduced.matches) {
          context.beginPath();
          context.arc(x, y, MARK_RADIUS + phase * PULSE_GROWTH, 0, 2 * Math.PI);
          context.strokeStyle = colours.accent;
          context.globalAlpha = 1 - phase;
          context.lineWidth = 1.5;
          context.stroke();
          context.globalAlpha = 1;
        }
        context.beginPath();
        context.arc(x, y, place === state.hoverMark ? MARK_RADIUS_HOVER : MARK_RADIUS, 0, 2 * Math.PI);
        context.fillStyle = place.pulse ? colours.accent : colours.steady;
        context.fill();
        context.lineWidth = 1.5;
        context.strokeStyle = colours.paper;
        context.stroke();
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
    const pulsing = () => !reduced.matches && places.some((place) => place.pulse && visible(place));

    const tick = (time: number) => {
      if (state.target) {
        const [lon, lat] = state.target;
        state.rotation = [
          state.rotation[0] + (lon - state.rotation[0]) * TURN_EASING,
          state.rotation[1] + (lat - state.rotation[1]) * TURN_EASING,
          0,
        ];
        if (Math.abs(lon - state.rotation[0]) < 0.1 && Math.abs(lat - state.rotation[1]) < 0.1) state.target = null;
      } else if (!state.dragging && !state.hoverMark && !state.hoverCountry && !state.chosen && !reduced.matches) {
        state.rotation[0] += SPIN_DEGREES_PER_FRAME;
      }
      const view = [
        state.rotation.join(','), state.zoom, size, themeVersion, state.chosen,
        places.indexOf(state.hoverMark as UsagePlace), state.hoverCountry?.properties.name ?? '',
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

    /** The country most of a mark's one-degree area lies in, if any. */
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

    const pick = (px: number, py: number) => {
      state.hoverMark = null;
      state.hoverCountry = null;
      let best: UsagePlace | null = null;
      let distance = PICK_DISTANCE;
      for (const place of places) {
        if (!visible(place)) continue;
        const point = projection([place.lon, place.lat]);
        if (!point || !onDisc(point[0], point[1])) continue;
        const d = Math.hypot(point[0] - px, point[1] - py);
        if (d < distance) {
          best = place;
          distance = d;
        }
      }
      if (best) {
        const point = projection([best.lon, best.lat]) as [number, number];
        const home = countries.find((c) => geoContains(c, [best.lon, best.lat])) ?? countryOfArea(best);
        state.hoverMark = best;
        setHover({
          x: point[0],
          y: point[1],
          title: home ? nameOf(home) : 'An area at sea',
          detail: best.pulse ? 'Checked in the last two days' : 'Checked within the last 30 days',
        });
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
      setHover({
        x: px,
        y: py,
        title: nameOf(country),
        detail: used.has(country.properties.code) ? 'WireTrace is used here' : 'No installation seen in 30 days',
      });
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
      state.hoverMark = null;
      state.hoverCountry = null;
      setHover(null);
    };
    const onKey = (event: KeyboardEvent) => {
      const steps: Record<string, [number, number]> = {
        ArrowLeft: [-KEY_STEP_DEGREES, 0],
        ArrowRight: [KEY_STEP_DEGREES, 0],
        ArrowUp: [0, KEY_STEP_DEGREES],
        ArrowDown: [0, -KEY_STEP_DEGREES],
      };
      if (event.key === '+' || event.key === '=') {
        state.zoom = Math.min(ZOOM_MAX, state.zoom * ZOOM_STEP);
      } else if (event.key === '-') {
        state.zoom = Math.max(ZOOM_MIN, state.zoom / ZOOM_STEP);
      } else if (steps[event.key]) {
        const [dLon, dLat] = steps[event.key] as [number, number];
        state.target = null;
        state.rotation = [state.rotation[0] + dLon, clampTilt(state.rotation[1] + dLat), 0];
      } else {
        return;
      }
      event.preventDefault();
      setHover(null);
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
    };
  }, [countries, places, used, names]);

  const zoom = (factor: number) => {
    const state = view.current;
    state.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.zoom * factor));
    setHover(null);
  };

  return (
    <div className="relative mx-auto w-full max-w-140 aspect-square touch-pan-y">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label="A globe with a mark for each area of about 100 km where WireTrace was used in the last 30 days. The same countries are listed below."
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
          <span className="block text-ui text-text-secondary">{hover.detail}</span>
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

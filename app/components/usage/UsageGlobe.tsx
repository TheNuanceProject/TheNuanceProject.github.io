// SPDX-License-Identifier: MIT
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from 'react';
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import { Globe, Minus, Plus } from 'lucide-react';

import { Icon } from '~/components/icons/Icon';
import { MAP_PERIOD_DAYS, type UsagePlace, dayDate } from '~/lib/build-data/usage-summary';
import { formatIsoDate } from '~/lib/content/dates';
import { MEASURES, TYPE } from '~/lib/design-tokens';
import { MARKER_GAP, type Marker, clusterMarkers, markerRadius } from '~/lib/usage/clusters';
import {
  type Frame,
  type View,
  EARTH_RADIUS_KM,
  ZOOM_MIN,
  between,
  clampLatitude,
  clampZoom,
  cubicBezier,
  keepUnder,
  levelFor,
  parseCubicBezier,
  pixelsPerKm,
  pointAt,
  project,
  scaleBar,
  visibleAngle,
  wrapLongitude,
  zoomAt,
  zoomForSeparation,
} from '~/lib/usage/globe-view';
import { type Box, LabelRoom, besideMarker } from '~/lib/usage/labels';
import { type CountKind, type PlaceTitle, areaPolygon, countOf, lastSeen } from '~/lib/usage/places';
import { type Town, type WorldLevel, loadLevel, loadTowns } from '~/lib/usage/world';

/** What the page can ask of the globe. */
export interface GlobeHandle {
  /** Turns and zooms to a place, and shows its figures. */
  flyTo(place: number): void;
  /** Marks a place, or none, as the one pointed at in the list. */
  highlight(place: number | null): void;
}

interface UsageGlobeProps {
  readonly places: readonly UsagePlace[];
  /** The name of each place, in the order of `places`. */
  readonly titles: readonly PlaceTitle[];
  /** What the markers count. */
  readonly kind: CountKind;
  /** The summary's day, the UTC day it was made. */
  readonly day: number;
  readonly ref?: Ref<GlobeHandle>;
}

// How the map is drawn. Line weights, dashes and shades of the drawing
// itself are the globe's own, as the design language leaves them.
const GRATICULE_WIDTH = 0.5;
const BORDER_WIDTH_FAR = 0.6;
/** The graticule fades out, and the globe's edge stops being drawn, as
 *  the globe grows past the frame. */
const GRATICULE_UNTIL = 2.5;
const SPHERE_EDGE_UNTIL = 3;
const SPHERE_EDGE_ALPHA = 0.5;
const AREA_FILL_ALPHA = 0.08;
const AREA_LINE_WIDTH = 1.5;
const AREA_DASH = [4, 3];
const AREA_PIN_DASH = [3, 2];
const GROUP_RING_GAP = 3;
const GROUP_RING_ALPHA = 0.4;
/** A marker pointed at grows by this many pixels. */
const HOT_GROWTH = 2;
const TOWN_DOT_RADIUS = 2.5;
/** The width of the paper-coloured line round a label's letters, which
 *  keeps it readable over land, borders and the marks of an area. */
const LABEL_HALO = 3;
/** Between a marker or a town's dot and its label, in pixels. */
const LABEL_GAP = 6;
/** The length of a degree of latitude, in kilometres. */
const KM_PER_DEGREE = (Math.PI * EARTH_RADIUS_KM) / 180;
/** A label of a place or a town takes this much height. */
const LABEL_HEIGHT = TYPE.ui.lineHeight;
/** From these zooms the places are named, and the towns around them. */
const PLACE_NAMES_FROM = 3;
const TOWNS_FROM = 5;
/** The smallest towns named at each zoom: rank 0 is the largest. */
const TOWN_RANKS: readonly (readonly [number, number])[] = [
  [10, 3],
  [20, 5],
  [40, 7],
  [Infinity, 10],
];
/** At most this many towns are named at once. */
const TOWNS_SHOWN_MAX = 60;
/** Labels and markers keep this clear of the frame's edge, and of the
 *  zoom buttons in its top right corner. */
const FRAME_MARGIN = MEASURES['space.1'];
const CONTROLS_ROOM = MEASURES['size.control.lg'] + 2 * MEASURES['space.3'];
/** A place's marker this close to the horizon is left out. */
const HORIZON_MARGIN = 0.02;
/** Markers this far outside the frame are still laid out, so one at the
 *  edge merges as it would on screen. */
const LAYOUT_MARGIN = MEASURES['space.16'];
/** How far outside a marker the pointer still picks it, in pixels. */
const PICK_MARGIN = MEASURES['space.1'];
/** A pointer that moves more than this between press and release drags. */
const DRAG_THRESHOLD = 3;
/** The scale bar is at most this long, in pixels. */
const SCALE_BAR_MAX = MEASURES['space.24'];

// How the globe moves.
const START: View = { lon: 78, lat: 20, zoom: ZOOM_MIN };
/** The farthest north or south the globe starts turned to. */
const START_LATITUDE_LIMIT = 30;
const BUTTON_ZOOM_STEP = 2;
const KEY_ZOOM_STEP = 2;
/** The arrow keys turn the globe this many degrees at zoom 1, and less
 *  as it comes closer. */
const KEY_STEP_DEGREES = 10;
/** A click on a place zooms to at least this, and further when a
 *  neighbour would still share its marker. */
const PLACE_ZOOM = 24;
/** Places parted by a zoom stand this much further apart than the least
 *  their markers need, leaving room for a name between them. */
const PART_ROOM = MEASURES['space.8'];
/** Wheel steps reported in lines are taken as this many pixels each. */
const WHEEL_LINE_PIXELS = 16;
/** Zoom changes by e^(-k·pixels) for a wheel turn of that many pixels. */
const WHEEL_ZOOM_PER_PIXEL = 0.0025;
/** Each frame, the zoom covers this share of what is left of a wheel
 *  turn, so turning the wheel glides instead of jumping. */
const WHEEL_EASING = 0.3;
/** A wheel glide ends when it is this close to its zoom, in log units. */
const WHEEL_SETTLED = 0.002;

const number = new Intl.NumberFormat('en-US');
const period = `${MAP_PERIOD_DAYS} days`;

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** A duration token in milliseconds, such as "320ms". */
function durationToken(name: string): number {
  const value = token(name);
  const ms = Number.parseFloat(value);
  return value.endsWith('ms') ? ms : value.endsWith('s') ? ms * 1000 : 0;
}

function onDay(seen: number, day: number): string {
  return seen === day ? 'Today' : formatIsoDate(dayDate(seen));
}

/** A marker as drawn this frame. */
interface Shown extends Marker {
  /** Its places, as indexes into `places`, largest first. */
  readonly places: readonly number[];
}

/** The figures card, where it is anchored, and what it holds. */
interface Card {
  /** The figures and the count it was made for: a card made for others
   *  is no longer shown. */
  readonly source: readonly UsagePlace[];
  readonly kind: CountKind;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly places: readonly number[];
}

/**
 * UsageGlobe: a globe of the places WireTrace is used, drawn in the
 * visitor's browser from public-domain map data served by this site.
 *
 * It fills its frame like a map. Dragging turns it; the wheel, a pinch,
 * a double click, the buttons and the + and - keys zoom it at the
 * pointer, from the whole globe down to places 11 km apart; the arrow
 * keys turn it. Coastlines and borders get finer as it comes closer, and
 * towns are named around the places. Places close together on the
 * screen are one marker until zooming leaves them room. Pointing at a
 * marker, or tapping it, shows its figures; clicking a group zooms in to
 * part it. Nothing is drawn while nothing changes, and nothing is loaded
 * from anywhere else.
 */
export function UsageGlobe({ places, titles, kind, day, ref }: UsageGlobeProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [scale, setScale] = useState<{ km: number; pixels: number; zoom: number } | null>(null);
  const [failed, setFailed] = useState(false);
  /** What the drawing loop reads: kept outside React so a frame never
   *  waits for a render. */
  const live = useRef({ places, titles, kind, highlight: null as number | null, hot: null as string | null });
  const api = useRef<GlobeHandle | null>(null);
  const zoomButtons = useRef<{ zoomIn(): void; zoomOut(): void; whole(): void; redraw(): void } | null>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (place) => api.current?.flyTo(place),
    highlight: (place) => api.current?.highlight(place),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const frameElement = frameRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !frameElement || !context) return;
    const state = live.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const projection = geoOrthographic().clipAngle(90).precision(0.3);
    const path = geoPath(projection, context);
    const graticule = geoGraticule10();
    const levels: (WorldLevel | null)[] = [null, null, null];
    let towns: readonly Town[] = [];
    let frame: Frame = { width: 0, height: 0 };
    let view: View = START;
    let shown: Shown[] = [];
    let drawQueued = 0;
    let motion = 0;
    let alive = true;

    // The theme's colours and fonts, read again only when the theme changes.
    const readStyle = () => ({
      ocean: token('--color-map-ocean'),
      land: token('--color-map-land'),
      used: token('--color-map-land-used'),
      paper: token('--color-paper'),
      edge: token('--color-edge'),
      divider: token('--color-divider'),
      text: token('--color-text'),
      secondary: token('--color-text-secondary'),
      mark: token('--color-accent-strong'),
      sans: token('--font-sans'),
      mono: token('--font-mono'),
      medium: token('--font-weight-medium'),
    });
    let style = readStyle();
    const ease = parseCubicBezier(token('--ease-in-out'));
    const slow = durationToken('--duration-slow');
    const flight = durationToken('--duration-reveal');

    const request = () => {
      if (!drawQueued) drawQueued = requestAnimationFrame(draw);
    };

    const usedCountries = () =>
      new Set(state.places.filter((place) => countOf(place, state.kind) > 0).map((place) => place.country));

    /** The markers of the places on the visible half, for the current view. */
    const layout = (): Shown[] => {
      const centre: [number, number] = [view.lon, view.lat];
      const seen: { index: number; x: number; y: number; count: number }[] = [];
      state.places.forEach((place, index) => {
        const count = countOf(place, state.kind);
        if (count === 0) return;
        if (geoDistance(centre, [place.lon, place.lat]) > Math.PI / 2 - HORIZON_MARGIN) return;
        const point = projection([place.lon, place.lat]);
        if (!point) return;
        const [x, y] = point;
        if (x < -LAYOUT_MARGIN || y < -LAYOUT_MARGIN || x > frame.width + LAYOUT_MARGIN || y > frame.height + LAYOUT_MARGIN) return;
        seen.push({ index, x, y, count });
      });
      // The largest first, so they gather the smaller ones near them.
      seen.sort((a, b) => b.count - a.count || a.index - b.index);
      return clusterMarkers(seen).map((marker) => ({
        ...marker,
        places: marker.members.map((member) => (seen[member] as (typeof seen)[number]).index),
      }));
    };

    const keyOf = (marker: Shown) => marker.places.join(',');

    function draw() {
      drawQueued = 0;
      if (!frame.width || !context || !canvas) return;
      project(projection, view, frame);
      const { width, height } = frame;
      // The canvas holds a pixel for each of the screen's: sized again here,
      // since the screen's density can change without the frame's size
      // changing (a window moved to another display).
      const ratio = window.devicePixelRatio || 1;
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      context.beginPath();
      path({ type: 'Sphere' });
      context.fillStyle = style.ocean;
      context.fill();

      if (view.zoom < GRATICULE_UNTIL) {
        context.beginPath();
        path(graticule);
        context.strokeStyle = style.divider;
        context.lineWidth = GRATICULE_WIDTH;
        context.globalAlpha = 1 - (view.zoom - ZOOM_MIN) / (GRATICULE_UNTIL - ZOOM_MIN);
        context.stroke();
        context.globalAlpha = 1;
      }

      // The finest level loaded that this zoom asks for, fetching it the
      // first time it is needed.
      const wanted = levelFor(view.zoom);
      for (let level = 1; level <= wanted; level += 1) {
        if (!levels[level]) {
          loadLevel(level as 1 | 2)
            .then((loaded) => {
              levels[level] = loaded;
              if (alive) request();
            })
            .catch(() => {
              // The coarser outlines go on being drawn.
            });
        }
      }
      const land = [levels[wanted], levels[1], levels[0]].find((level) => level !== null && level !== undefined) ?? null;
      if (land) {
        const used = usedCountries();
        const centre: [number, number] = [view.lon, view.lat];
        const reach = visibleAngle(view, frame) + HORIZON_MARGIN;
        const onScreen = land.pieces.filter((piece) => geoDistance(centre, piece.centre) - piece.reach < reach);
        for (const [fill, isUsed] of [[style.land, false], [style.used, true]] as const) {
          context.beginPath();
          for (const piece of onScreen) if (used.has(piece.code) === isUsed) path(piece.geometry);
          context.fillStyle = fill;
          context.fill();
        }
        context.beginPath();
        path(land.borders);
        context.strokeStyle = style.paper;
        context.lineWidth = view.zoom < PLACE_NAMES_FROM ? BORDER_WIDTH_FAR : MEASURES['border.hairline'];
        context.stroke();
      }

      if (view.zoom < SPHERE_EDGE_UNTIL) {
        context.beginPath();
        path({ type: 'Sphere' });
        context.strokeStyle = style.edge;
        context.lineWidth = MEASURES['border.hairline'];
        context.globalAlpha = SPHERE_EDGE_ALPHA;
        context.stroke();
        context.globalAlpha = 1;
      }

      shown = layout();
      const room = new LabelRoom(
        { x: FRAME_MARGIN, y: FRAME_MARGIN, width: width - 2 * FRAME_MARGIN, height: height - 2 * FRAME_MARGIN },
        [
          { x: width - CONTROLS_ROOM, y: 0, width: CONTROLS_ROOM, height: CONTROLS_ROOM * 2 },
          ...shown.map((m) => ({ x: m.x - m.radius, y: m.y - m.radius, width: 2 * m.radius, height: 2 * m.radius })),
        ]
      );

      // An area's square, drawn true to size once it is larger than its marker.
      const perKm = pixelsPerKm(view, frame);
      for (const marker of shown) {
        const [only] = marker.places;
        const place = marker.places.length === 1 && only !== undefined ? state.places[only] : undefined;
        if (!place || place.kind !== 'area') continue;
        if (KM_PER_DEGREE * perKm < 2 * (marker.radius + LABEL_GAP)) continue;
        context.beginPath();
        path(areaPolygon(place));
        context.fillStyle = style.mark;
        context.globalAlpha = AREA_FILL_ALPHA;
        context.fill();
        context.globalAlpha = 1;
        context.setLineDash(AREA_DASH);
        context.strokeStyle = style.mark;
        context.lineWidth = AREA_LINE_WIDTH;
        context.stroke();
        context.setLineDash([]);
      }

      // Names: the places first, then the towns around them.
      const labels: { text: string; box: Box; font: string; colour: string }[] = [];
      const placeFont = `${style.medium} ${TYPE.ui.size}px ${style.sans}`;
      const townFont = `${TYPE.caption.size}px ${style.sans}`;
      if (view.zoom >= PLACE_NAMES_FROM) {
        context.font = placeFont;
        for (const marker of shown) {
          const [only] = marker.places;
          if (marker.places.length !== 1 || only === undefined) continue;
          const text = state.titles[only]?.name;
          if (!text) continue;
          const textWidth = context.measureText(text).width;
          const box = room.place(besideMarker(marker.x, marker.y, marker.radius, textWidth, LABEL_HEIGHT, LABEL_GAP));
          if (box) labels.push({ text, box, font: placeFont, colour: style.text });
        }
      }
      if (view.zoom >= TOWNS_FROM && towns.length > 0) {
        context.font = townFont;
        const rankMax = (TOWN_RANKS.find(([below]) => view.zoom < below) ?? [0, 0])[1];
        const centre: [number, number] = [view.lon, view.lat];
        const reach = visibleAngle(view, frame);
        let named = 0;
        for (const town of towns) {
          if (town.rank > rankMax || named >= TOWNS_SHOWN_MAX) break;
          if (geoDistance(centre, [town.lon, town.lat]) > reach) continue;
          const point = projection([town.lon, town.lat]);
          if (!point) continue;
          const [x, y] = point;
          const dot = { x: x - TOWN_DOT_RADIUS, y: y - TOWN_DOT_RADIUS, width: 2 * TOWN_DOT_RADIUS, height: 2 * TOWN_DOT_RADIUS };
          const textWidth = context.measureText(town.name).width;
          const box = besideMarker(x, y, TOWN_DOT_RADIUS, textWidth, LABEL_HEIGHT, LABEL_GAP).find((choice) => room.fits(dot, choice));
          if (!box) continue;
          room.take(dot, box);
          context.beginPath();
          context.arc(x, y, TOWN_DOT_RADIUS, 0, 2 * Math.PI);
          context.fillStyle = style.secondary;
          context.fill();
          labels.push({ text: town.name, box, font: townFont, colour: style.secondary });
          named += 1;
        }
      }
      context.textBaseline = 'middle';
      context.textAlign = 'left';
      context.lineJoin = 'round';
      for (const label of labels) {
        context.font = label.font;
        const y = label.box.y + label.box.height / 2;
        context.lineWidth = LABEL_HALO;
        context.strokeStyle = style.paper;
        context.strokeText(label.text, label.box.x, y);
        context.fillStyle = label.colour;
        context.fillText(label.text, label.box.x, y);
      }

      // The markers, over everything else.
      context.textAlign = 'center';
      context.font = `${style.medium} ${TYPE['mono-sm'].size}px ${style.mono}`;
      for (const marker of shown) {
        const group = marker.places.length > 1;
        const [only] = marker.places;
        const area = !group && only !== undefined && state.places[only]?.kind === 'area';
        const hot =
          keyOf(marker) === state.hot || (state.highlight !== null && marker.places.includes(state.highlight));
        const radius = marker.radius + (hot ? HOT_GROWTH : 0);
        const body = radius - MEASURES['border.mark'];
        context.beginPath();
        context.arc(marker.x, marker.y, radius, 0, 2 * Math.PI);
        context.fillStyle = style.paper;
        context.fill();
        context.beginPath();
        context.arc(marker.x, marker.y, body, 0, 2 * Math.PI);
        if (area) {
          context.fillStyle = style.paper;
          context.fill();
          context.setLineDash(AREA_PIN_DASH);
          context.strokeStyle = style.mark;
          context.lineWidth = MEASURES['border.mark'];
          context.stroke();
          context.setLineDash([]);
        } else {
          context.fillStyle = style.mark;
          context.fill();
        }
        if (group) {
          context.beginPath();
          context.arc(marker.x, marker.y, radius + GROUP_RING_GAP, 0, 2 * Math.PI);
          context.strokeStyle = style.mark;
          context.lineWidth = MEASURES['border.hairline'];
          context.globalAlpha = GROUP_RING_ALPHA;
          context.stroke();
          context.globalAlpha = 1;
        }
        context.fillStyle = area ? style.mark : style.paper;
        context.fillText(number.format(marker.count), marker.x, marker.y);
      }

      const bar = scaleBar(view, frame, SCALE_BAR_MAX);
      setScale((last) =>
        last && last.km === bar.km && Math.abs(last.pixels - bar.pixels) < 0.5 && last.zoom === view.zoom
          ? last
          : { ...bar, zoom: view.zoom }
      );
    }

    const resize = () => {
      const rect = frameElement.getBoundingClientRect();
      frame = { width: rect.width, height: rect.height };
      hideCard();
      request();
    };

    // ---- The figures card ----

    function hideCard() {
      if (state.hot !== null) {
        state.hot = null;
        request();
      }
      setCard(null);
    }

    function showCard(marker: Shown) {
      state.hot = keyOf(marker);
      setCard({ source: state.places, kind: state.kind, x: marker.x, y: marker.y, radius: marker.radius, places: marker.places });
      request();
    }

    const pick = (x: number, y: number): Shown | null => {
      let best: Shown | null = null;
      let distance: number = PICK_MARGIN;
      for (const marker of shown) {
        const d = Math.hypot(marker.x - x, marker.y - y) - marker.radius;
        if (d < distance) {
          best = marker;
          distance = d;
        }
      }
      return best;
    };

    // ---- Moving the view ----

    const stop = () => {
      cancelAnimationFrame(motion);
      motion = 0;
      wheel = null;
    };

    const setView = (next: View) => {
      view = { lon: wrapLongitude(next.lon), lat: clampLatitude(next.lat), zoom: clampZoom(next.zoom) };
      request();
    };

    /** Moves to `to` over `duration`, on the language's ease-in-out curve,
     *  or at once when the visitor asks for reduced motion. */
    const moveTo = (to: View, duration: number, then?: () => void) => {
      stop();
      hideCard();
      if (reduced.matches || duration <= 0) {
        setView(to);
        if (then) requestAnimationFrame(then);
        return;
      }
      const from = view;
      const started = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - started) / duration);
        const eased = ease ? cubicBezier(...ease, t) : t;
        setView(between(from, to, eased));
        if (t < 1) motion = requestAnimationFrame(step);
        else {
          motion = 0;
          if (then) requestAnimationFrame(then);
        }
      };
      motion = requestAnimationFrame(step);
    };

    const zoomBy = (factor: number) => moveTo({ ...view, zoom: clampZoom(view.zoom * factor) }, slow);

    /** The zoom at which two places stand apart as markers of their own. */
    const apartAt = (a: UsagePlace, b: UsagePlace) =>
      zoomForSeparation(
        geoDistance([a.lon, a.lat], [b.lon, b.lat]),
        markerRadius(countOf(a, state.kind), 1) + markerRadius(countOf(b, state.kind), 1) + MARKER_GAP + PART_ROOM,
        frame
      );

    /** Turns and zooms to a place, close enough that it has a marker of
     *  its own unless a place shares its position, then shows its figures. */
    const flyTo = (index: number) => {
      const place = state.places[index];
      if (!place) return;
      let zoom = Math.max(view.zoom, PLACE_ZOOM);
      for (const other of state.places) {
        if (other !== place && countOf(other, state.kind) > 0) zoom = Math.max(zoom, apartAt(place, other));
      }
      moveTo({ lon: place.lon, lat: place.lat, zoom: clampZoom(zoom) }, flight, () => {
        const marker = shown.find((m) => m.places.includes(index));
        if (marker) showCard(marker);
      });
    };

    /** Zooms in on a group until the closest two of its places stand
     *  apart, so it parts into at least two markers. */
    const part = (marker: Shown) => {
      const points = marker.places.map((i) => state.places[i]).filter((p): p is UsagePlace => p !== undefined);
      let zoom = Infinity;
      points.forEach((a, i) => {
        for (const b of points.slice(i + 1)) zoom = Math.min(zoom, apartAt(a, b));
      });
      project(projection, view, frame);
      const centre = projection.invert?.([marker.x, marker.y]);
      moveTo(
        { lon: centre?.[0] ?? view.lon, lat: centre?.[1] ?? view.lat, zoom: clampZoom(Math.max(zoom, view.zoom * BUTTON_ZOOM_STEP)) },
        flight
      );
    };

    // The wheel: each turn adds to a target zoom, which the view glides to
    // at the pointer. At the closest or farthest zoom the wheel is left to
    // the page, which scrolls on.
    let wheel: { zoom: number; x: number; y: number } | null = null;
    const glide = () => {
      if (!wheel) return;
      const now = Math.log(view.zoom);
      const target = Math.log(wheel.zoom);
      const done = reduced.matches || Math.abs(target - now) < WHEEL_SETTLED;
      const zoom = done ? wheel.zoom : Math.exp(now + (target - now) * WHEEL_EASING);
      setView(zoomAt(view, frame, zoom, wheel.x, wheel.y));
      if (done) {
        wheel = null;
        motion = 0;
      } else motion = requestAnimationFrame(glide);
    };
    const onWheel = (event: WheelEvent) => {
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE ? WHEEL_LINE_PIXELS
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? frame.height
        : 1;
      const from = wheel?.zoom ?? view.zoom;
      const next = clampZoom(from * Math.exp(-event.deltaY * unit * WHEEL_ZOOM_PER_PIXEL));
      if (next === from && !wheel) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (!wheel) {
        stop();
        hideCard();
      }
      const gliding = wheel !== null;
      wheel = { zoom: next, x, y };
      if (!gliding) motion = requestAnimationFrame(glide);
    };

    // Pointers: one drags, two pinch. A press that does not move is a click.
    const pointers = new Map<number, { x: number; y: number }>();
    let drag: { geo: [number, number]; startX: number; startY: number; moved: boolean } | null = null;
    let pinch: { distance: number; zoom: number; geo: [number, number] | null } | null = null;

    const local = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const twoFingers = () => {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, distance: Math.hypot(a.x - b.x, a.y - b.y) };
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      stop();
      const at = local(event);
      pointers.set(event.pointerId, at);
      canvas.setPointerCapture(event.pointerId);
      project(projection, view, frame);
      if (pointers.size === 1) {
        const geo = pointAt(projection, at.x, at.y);
        drag = geo ? { geo, startX: at.x, startY: at.y, moved: false } : null;
      } else if (pointers.size === 2) {
        const middle = twoFingers();
        pinch = { distance: middle.distance, zoom: view.zoom, geo: pointAt(projection, middle.x, middle.y) };
        drag = null;
        hideCard();
      }
    };

    const onMove = (event: PointerEvent) => {
      const at = local(event);
      if (!pointers.has(event.pointerId)) {
        // Pointing without pressing: the figures of the marker under it.
        if (event.pointerType !== 'mouse') return;
        const marker = pick(at.x, at.y);
        canvas.style.cursor = marker ? 'pointer' : '';
        if ((marker ? keyOf(marker) : null) !== state.hot) {
          if (marker) showCard(marker);
          else hideCard();
        }
        return;
      }
      pointers.set(event.pointerId, at);
      if (pinch && pointers.size === 2) {
        const middle = twoFingers();
        const zoomed = { ...view, zoom: clampZoom((pinch.zoom * middle.distance) / Math.max(pinch.distance, 1)) };
        setView(pinch.geo ? keepUnder(zoomed, frame, pinch.geo, middle.x, middle.y) : zoomed);
        return;
      }
      if (!drag) return;
      if (!drag.moved && Math.hypot(at.x - drag.startX, at.y - drag.startY) <= DRAG_THRESHOLD) return;
      if (!drag.moved) {
        drag.moved = true;
        hideCard();
      }
      setView(keepUnder(view, frame, drag.geo, at.x, at.y));
    };

    const onUp = (event: PointerEvent) => {
      const at = local(event);
      const wasClick = pointers.size === 1 && (drag === null || !drag.moved) && pinch === null;
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size > 0) return;
      drag = null;
      if (!wasClick) return;
      const marker = pick(at.x, at.y);
      if (!marker) {
        hideCard();
        return;
      }
      // A tap shows the figures; a click on a group also parts it.
      if (marker.places.length > 1) part(marker);
      else if (event.pointerType === 'mouse') {
        const [only] = marker.places;
        if (only !== undefined) flyTo(only);
      } else showCard(marker);
    };

    // The browser took the gesture over, to scroll the page.
    const onCancel = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) drag = null;
    };

    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && pointers.size === 0) {
        canvas.style.cursor = '';
        hideCard();
      }
    };

    const onDoubleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (pick(x, y)) return;
      stop();
      hideCard();
      wheel = { zoom: clampZoom(view.zoom * BUTTON_ZOOM_STEP), x, y };
      motion = requestAnimationFrame(glide);
    };

    const onKey = (event: KeyboardEvent) => {
      const step = KEY_STEP_DEGREES / view.zoom;
      const turns: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      };
      const turn = turns[event.key];
      if (turn) {
        stop();
        hideCard();
        setView({ ...view, lon: view.lon + turn[0], lat: view.lat + turn[1] });
      } else if (event.key === '+' || event.key === '=') {
        zoomBy(KEY_ZOOM_STEP);
      } else if (event.key === '-' || event.key === '_') {
        zoomBy(1 / KEY_ZOOM_STEP);
      } else if (event.key === '0' || event.key === 'Home') {
        moveTo({ ...view, zoom: ZOOM_MIN }, slow);
      } else if (event.key === 'Escape') {
        hideCard();
      } else {
        return;
      }
      event.preventDefault();
    };

    api.current = {
      flyTo,
      highlight: (place) => {
        state.highlight = place;
        request();
      },
    };
    zoomButtons.current = {
      zoomIn: () => zoomBy(BUTTON_ZOOM_STEP),
      zoomOut: () => zoomBy(1 / BUTTON_ZOOM_STEP),
      whole: () => moveTo({ lon: view.lon, lat: Math.max(-START_LATITUDE_LIMIT, Math.min(START_LATITUDE_LIMIT, view.lat)), zoom: ZOOM_MIN }, flight),
      redraw: () => {
        state.hot = null;
        request();
      },
    };

    // Start turned to the places, at the whole globe.
    const counted = state.places.filter((place) => countOf(place, 'installations') > 0);
    if (counted.length > 0) {
      const lons = counted.map((place) => place.lon * (Math.PI / 180));
      const lon = (Math.atan2(
        lons.reduce((s, l) => s + Math.sin(l), 0),
        lons.reduce((s, l) => s + Math.cos(l), 0)
      ) * 180) / Math.PI;
      const lat = counted.reduce((s, place) => s + place.lat, 0) / counted.length;
      view = { lon, lat: Math.max(-START_LATITUDE_LIMIT, Math.min(START_LATITUDE_LIMIT, lat)), zoom: ZOOM_MIN };
    }

    loadLevel(0)
      .then((level) => {
        levels[0] = level;
        if (alive) request();
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    loadTowns()
      .then((loaded) => {
        towns = loaded;
        if (alive) request();
      })
      .catch(() => {
        // The globe is drawn without town names.
      });

    const themeWatch = new MutationObserver(() => {
      style = readStyle();
      request();
    });
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const sizeWatch = new ResizeObserver(resize);
    sizeWatch.observe(frameElement);
    // A change of the screen's density alone, which no size change reports.
    let density: MediaQueryList | null = null;
    const onDensity = () => {
      watchDensity();
      request();
    };
    function watchDensity() {
      density?.removeEventListener('change', onDensity);
      density = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      density.addEventListener('change', onDensity);
    }
    watchDensity();
    document.fonts?.ready.then(() => {
      if (alive) request();
    });

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('dblclick', onDoubleClick);
    canvas.addEventListener('keydown', onKey);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      alive = false;
      cancelAnimationFrame(drawQueued);
      cancelAnimationFrame(motion);
      themeWatch.disconnect();
      sizeWatch.disconnect();
      density?.removeEventListener('change', onDensity);
      api.current = null;
      zoomButtons.current = null;
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('dblclick', onDoubleClick);
      canvas.removeEventListener('keydown', onKey);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, []);

  // New figures or a different count: draw again, and close the card,
  // whose places may have changed.
  useEffect(() => {
    live.current.places = places;
    live.current.titles = titles;
    live.current.kind = kind;
    zoomButtons.current?.redraw();
  }, [places, titles, kind]);

  // The card sits beside its marker: to the right, else to the left, else
  // above or below, always inside the frame and clear of the buttons.
  useLayoutEffect(() => {
    const element = cardRef.current;
    const frameElement = frameRef.current;
    if (!card || !element || !frameElement) return;
    const width = frameElement.clientWidth;
    const height = frameElement.clientHeight;
    const cardWidth = element.offsetWidth;
    const cardHeight = element.offsetHeight;
    const gap = MEASURES['space.3'];
    const margin = MEASURES['space.2'];
    let x = card.x + card.radius + gap;
    let y = card.y - cardHeight / 2;
    if (x + cardWidth > width - CONTROLS_ROOM) x = card.x - card.radius - gap - cardWidth;
    if (x < margin) {
      x = card.x - cardWidth / 2;
      y = card.y - card.radius - gap - cardHeight;
      if (y < margin) y = card.y + card.radius + gap;
    }
    x = Math.max(margin, Math.min(width - cardWidth - margin, x));
    y = Math.max(margin, Math.min(height - cardHeight - margin, y));
    element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    element.style.visibility = 'visible';
  }, [card]);

  return (
    <div
      ref={frameRef}
      className="relative h-104 md:h-140 overflow-hidden rounded-md border border-divider bg-paper touch-pan-y"
    >
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={`A globe of the places WireTrace ${kind === 'installations' ? 'installations were active in' : '1.x checked for updates from'} in the last ${period}, with their numbers. The same places are listed beside it.`}
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + - 0 Escape"
        className="absolute inset-0 block h-full w-full cursor-grab rounded-md focus-visible:-outline-offset-4 active:cursor-grabbing"
      />
      <div className="absolute top-3 right-3 grid gap-1">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomButtons.current?.zoomIn()}
          className="flex size-(--size-control-lg) items-center justify-center rounded-sm border border-edge bg-paper text-text transition-colors duration-(--duration-fast) hover:bg-divider"
        >
          <Icon icon={Plus} />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomButtons.current?.zoomOut()}
          className="flex size-(--size-control-lg) items-center justify-center rounded-sm border border-edge bg-paper text-text transition-colors duration-(--duration-fast) hover:bg-divider"
        >
          <Icon icon={Minus} />
        </button>
        <button
          type="button"
          aria-label="Show the whole globe"
          onClick={() => zoomButtons.current?.whole()}
          className="flex size-(--size-control-lg) items-center justify-center rounded-sm border border-edge bg-paper text-text transition-colors duration-(--duration-fast) hover:bg-divider"
        >
          <Icon icon={Globe} />
        </button>
      </div>
      {scale && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-3 rounded-sm border border-divider bg-paper px-2 py-1 font-mono text-mono-sm text-text-secondary tabular-nums"
        >
          <span className="block h-1 border-x border-b border-text-secondary" style={{ width: scale.pixels }} />
          <span>{number.format(scale.km)} km</span>
          <span className="text-text-tertiary">
            {scale.zoom < 10 ? scale.zoom.toFixed(1) : Math.round(scale.zoom)}&times;
          </span>
        </div>
      )}
      {failed && (
        <p className="pointer-events-none absolute top-3 left-3 max-w-72 rounded-sm border border-divider bg-paper px-2 py-1 font-sans text-caption text-text-secondary">
          The outlines of the countries could not be loaded. The places are listed beside the globe.
        </p>
      )}
      {card && card.source === places && card.kind === kind && <FiguresCard key={card.places.join(',')} cardRef={cardRef} card={card} places={places} titles={titles} kind={kind} day={day} />}
    </div>
  );
}

interface FiguresCardProps {
  readonly cardRef: Ref<HTMLDivElement>;
  readonly card: Card;
  readonly places: readonly UsagePlace[];
  readonly titles: readonly PlaceTitle[];
  readonly kind: CountKind;
  readonly day: number;
}

/** The figures of a marker: one place's in rows, or a group's places in a
 *  short table with their total. */
function FiguresCard({ cardRef, card, places, titles, kind, day }: FiguresCardProps) {
  const members = card.places
    .map((index) => ({ place: places[index], title: titles[index] }))
    .filter((m): m is { place: UsagePlace; title: PlaceTitle } => m.place !== undefined && m.title !== undefined);
  const [only] = members;
  const counted = kind === 'installations' ? 'Installations' : '1.x checks';
  return (
    <div
      ref={cardRef}
      role="tooltip"
      className="pointer-events-none invisible absolute top-0 left-0 z-10 flex w-72 flex-col gap-3 rounded-md border border-divider bg-surface px-4 py-3 shadow-float"
    >
      {members.length === 1 && only ? (
        <>
          <div className="flex flex-col gap-0.5">
            <p className="font-sans text-ui-lg font-medium text-text">{only.title.name}</p>
            <p className="font-sans text-caption text-text-tertiary">
              {only.title.country ? `${only.title.country} · ` : ''}
              {only.place.kind === 'area' ? 'Area, about 100 km across' : 'City, placed to about 11 km'}
            </p>
          </div>
          <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-2 border-t border-divider pt-3">
            <dt className="font-sans text-caption text-text-secondary">Installations, {period}</dt>
            <dd className="m-0 text-right font-mono text-mono text-text tabular-nums">
              {only.place.installations ? number.format(only.place.installations.count) : '0'}
            </dd>
            <dt className="font-sans text-caption text-text-secondary">1.x checks, {period}</dt>
            <dd className="m-0 text-right font-mono text-mono text-text tabular-nums">
              {only.place.legacy ? number.format(only.place.legacy.count) : '0'}
            </dd>
            <dt className="font-sans text-caption text-text-secondary">Last check</dt>
            <dd className="m-0 text-right font-sans text-ui text-text">{onDay(lastSeen(only.place), day)}</dd>
          </dl>
          {only.place.kind === 'area' && (
            <p className="font-sans text-caption text-text-tertiary">
              Checked before places were named by city. Shown as an area until Dec 17, 2026.
            </p>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-0.5">
            <p className="font-sans text-ui-lg font-medium text-text">{number.format(members.length)} places</p>
            <p className="font-sans text-caption text-text-tertiary">
              {[...new Set(members.map((m) => m.title.country).filter((c): c is string => c !== null))].join(', ')}
            </p>
          </div>
          <table className="w-full border-collapse border-t border-divider">
            <thead>
              <tr>
                <th scope="col" className="pt-3 pb-1 text-left font-sans text-caption font-regular text-text-tertiary">Place</th>
                <th scope="col" className="pt-3 pb-1 text-right font-sans text-caption font-regular text-text-tertiary">{counted}</th>
              </tr>
            </thead>
            <tbody>
              {members.map(({ place, title }, i) => (
                <tr key={card.places[i]} className="border-b border-divider">
                  <td className="py-1 pr-3 font-sans text-ui text-text">{title.name}</td>
                  <td className="py-1 text-right font-mono text-mono text-text tabular-nums">{number.format(countOf(place, kind))}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-1 font-sans text-ui font-medium text-text">Total</td>
                <td className="pt-1 text-right font-mono text-mono font-medium text-text tabular-nums">
                  {number.format(members.reduce((total, m) => total + countOf(m.place, kind), 0))}
                </td>
              </tr>
            </tbody>
          </table>
          <p className="font-sans text-caption text-text-tertiary">Click or zoom in to part them.</p>
        </>
      )}
    </div>
  );
}


// SPDX-License-Identifier: MIT
/**
 * Writes the map the WireTrace usage page's globe draws, into
 * public/data/:
 *
 * - world.json, world-medium.json and world-fine.json: the countries as
 *   TopoJSON, at three levels of detail. The globe draws the first, and
 *   fetches the finer ones only when it is zoomed in far enough to show
 *   them. Each country keeps three properties: `code`, its ISO 3166-1
 *   alpha-2 code, or "" when it has none; `name`; and `circles`, for
 *   each of its polygons in order, [longitude, latitude, radius] in
 *   degrees of a circle on the globe that holds it, which tells the
 *   globe quickly whether the polygon can be on screen.
 * - towns.json: the populated places the globe names when zoomed in, as
 *   [name, longitude, latitude, rank] from the largest (rank 0) down.
 *
 * Source: Natural Earth 1:10m admin 0 countries, India point of view, and
 * 1:10m populated places (public domain), from the Natural Earth
 * repository at release v5.1.2. The files are fetched from that exact
 * commit and must match the SHA-256 values below, so the map can only
 * change by an edit to this script.
 *
 * Run by hand when the source changes: `npm run world`. The results are
 * committed; the build never fetches anything for the map.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { geoArea, geoCentroid, geoDistance } from 'd3-geo';
import shapefile from 'shapefile';
import { feature as toFeatures, quantize } from 'topojson-client';
import { topology } from 'topojson-server';
import { presimplify, quantile, simplify } from 'topojson-simplify';

const COMMIT = 'f1890d9f152c896d250a77557a5751a93d494776'; // v5.1.2
const BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${COMMIT}/10m_cultural`;
const COUNTRIES = {
  name: 'ne_10m_admin_0_countries_ind',
  shp: '1cad9b7b4cf8e4badd88f5950fe2e12e5b219bd99fe0434a5580ca20f8595776',
  dbf: '7d77db19ab0ee436f8e0f64593c1e748967c6da56194b98a346a1f3c1f916a5c',
};
const TOWNS = {
  name: 'ne_10m_populated_places_simple',
  shp: 'c613fb222b623b33abeaa2da835c05ee7c000bf0e573aeca399d4a32ba3b529b',
  dbf: 'db147a148f529ce783d2b839f1f81e71d501a11e63c2d01af128314cd6527654',
};
/**
 * The levels of detail: the share of the outline's points each keeps, and
 * how many steps across the world its coordinates are kept to. The globe
 * (`~/lib/usage/globe-view`, `LEVEL_ZOOMS`) moves to the next level at the
 * zoom where the one before starts to look coarse.
 */
const LEVELS = [
  { file: 'world.json', keptShare: 0.04, quantization: 1e5 },
  { file: 'world-medium.json', keptShare: 0.12, quantization: 1e5 },
  { file: 'world-fine.json', keptShare: 0.35, quantization: 1e6 },
];
/** Circles are written to this many decimal places of a degree, and
 *  grown by this much, which covers the rounding and the shift of every
 *  point when coordinates are kept to a level's steps. */
const CIRCLE_DECIMALS = 2;
const CIRCLE_MARGIN = 0.01;
/** Towns are kept to this rank: the smallest the globe names at its
 *  closest zoom. */
const TOWN_RANK_MAX = 10;
/** Town positions are kept to this many decimal places, about 110 m. */
const TOWN_DECIMALS = 3;
const TIMEOUT_MS = 120_000;
const DATA = fileURLToPath(new URL('../public/data/', import.meta.url));

async function fetchVerified(source, extension) {
  const response = await fetch(`${BASE}/${source.name}.${extension}`, {
    redirect: 'error',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${source.name}.${extension}: the source answered ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== source[extension]) {
    throw new Error(`${source.name}.${extension}: SHA-256 ${digest} is not the one this script pins`);
  }
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** A ring set that d3 would read as everything but the country (its
 *  area is more than half the sphere) is turned the other way round. */
function rightWayRound(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const rings of polygons) {
    if (geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI) {
      for (const ring of rings) ring.reverse();
    }
  }
  return geometry;
}

/** A text field as written in the table, without the padding (spaces
 *  and NUL bytes) that fills it to its fixed width. */
function text(value) {
  return typeof value === 'string' ? value.replace(/[\s\0]+$/u, '') : '';
}

function code(properties) {
  const value = text(properties.ISO_A2_EH);
  return /^[A-Z]{2}$/.test(value) ? value : '';
}

function round(value, decimals) {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

/** The circles round each polygon of a geometry, in its order. */
function circles(geometry) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  const scale = 10 ** CIRCLE_DECIMALS;
  return polygons.map((rings) => {
    const centre = geoCentroid({ type: 'Polygon', coordinates: rings });
    let reach = 0;
    for (const point of rings[0]) reach = Math.max(reach, geoDistance(centre, point));
    const degrees = (reach * 180) / Math.PI + CIRCLE_MARGIN;
    return [round(centre[0], CIRCLE_DECIMALS), round(centre[1], CIRCLE_DECIMALS), Math.ceil(degrees * scale) / scale];
  });
}

const [shp, dbf, townShp, townDbf] = await Promise.all([
  fetchVerified(COUNTRIES, 'shp'),
  fetchVerified(COUNTRIES, 'dbf'),
  fetchVerified(TOWNS, 'shp'),
  fetchVerified(TOWNS, 'dbf'),
]);
const source = await shapefile.read(shp, dbf, { encoding: 'utf-8' });
const features = source.features
  .filter((feature) => feature.geometry !== null)
  .map((feature) => ({
    type: 'Feature',
    properties: { code: code(feature.properties), name: text(feature.properties.NAME) },
    geometry: rightWayRound(feature.geometry),
  }));

mkdirSync(DATA, { recursive: true });
const full = presimplify(topology({ countries: { type: 'FeatureCollection', features } }));
for (const { file, keptShare, quantization } of LEVELS) {
  const reduced = simplify(full, quantile(full, keptShare));
  // Simplifying can turn a very small shape the wrong way round, or leave
  // it with nothing; each shape is checked again before it is kept.
  const kept = toFeatures(reduced, reduced.objects.countries).features
    .filter((feature) => feature.geometry !== null)
    .map((feature) => {
      const geometry = rightWayRound(feature.geometry);
      return { ...feature, properties: { ...feature.properties, circles: circles(geometry) }, geometry };
    });
  const level = JSON.stringify(quantize(topology({ countries: { type: 'FeatureCollection', features: kept } }), quantization));
  writeFileSync(join(DATA, file), level);
  console.log(`public/data/${file}: ${kept.length} countries, ${level.length} bytes`);
}

const places = await shapefile.read(townShp, townDbf, { encoding: 'utf-8' });
const towns = places.features
  .filter((feature) => feature.geometry?.type === 'Point')
  .map((feature) => {
    const [lon, lat] = feature.geometry.coordinates;
    return [text(feature.properties.name), round(lon, TOWN_DECIMALS), round(lat, TOWN_DECIMALS), Number(feature.properties.scalerank)];
  })
  .filter(([name, lon, lat, rank]) =>
    name !== '' && Number.isFinite(lon) && Number.isFinite(lat) && Number.isInteger(rank) && rank >= 0 && rank <= TOWN_RANK_MAX)
  .sort((a, b) => a[3] - b[3] || a[0].localeCompare(b[0], 'en') || a[1] - b[1] || a[2] - b[2]);
const townsJson = JSON.stringify(towns);
writeFileSync(join(DATA, 'towns.json'), townsJson);
console.log(`public/data/towns.json: ${towns.length} towns, ${townsJson.length} bytes`);

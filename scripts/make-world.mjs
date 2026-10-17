// SPDX-License-Identifier: MIT
/**
 * Writes public/data/world.json: the countries the WireTrace usage page's
 * globe draws, as TopoJSON.
 *
 * Source: Natural Earth 1:10m admin 0 countries, India point of view
 * (public domain), from the Natural Earth repository at release v5.1.2.
 * The files are fetched from that exact commit and must match the
 * SHA-256 values below, so the map can only change by an edit to this
 * script. The outlines are then simplified to the detail a globe can
 * show, and each country keeps two properties: `code`, its ISO 3166-1
 * alpha-2 code, or "" when it has none, and `name`.
 *
 * Run by hand when the source changes: `npm run world`. The result is
 * committed; the build never fetches anything for the map.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { geoArea } from 'd3-geo';
import shapefile from 'shapefile';
import { feature as toFeatures, quantize } from 'topojson-client';
import { topology } from 'topojson-server';
import { presimplify, quantile, simplify } from 'topojson-simplify';

const COMMIT = 'f1890d9f152c896d250a77557a5751a93d494776'; // v5.1.2
const BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${COMMIT}/10m_cultural/ne_10m_admin_0_countries_ind`;
const SOURCES = {
  shp: '1cad9b7b4cf8e4badd88f5950fe2e12e5b219bd99fe0434a5580ca20f8595776',
  dbf: '7d77db19ab0ee436f8e0f64593c1e748967c6da56194b98a346a1f3c1f916a5c',
};
/** The share of the outline's points kept: enough for a globe drawn at
 *  most a few hundred pixels across, at three times zoom. */
const KEPT_SHARE = 0.04;
/** Coordinates are kept to this many steps across the world. */
const QUANTIZATION = 1e5;
const TIMEOUT_MS = 60_000;
const OUTPUT = fileURLToPath(new URL('../public/data/world.json', import.meta.url));

async function fetchVerified(extension) {
  const response = await fetch(`${BASE}.${extension}`, {
    redirect: 'error',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${extension}: the source answered ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== SOURCES[extension]) {
    throw new Error(`${extension}: SHA-256 ${digest} is not the one this script pins`);
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

const [shp, dbf] = await Promise.all([fetchVerified('shp'), fetchVerified('dbf')]);
const source = await shapefile.read(shp, dbf, { encoding: 'utf-8' });
const features = source.features
  .filter((feature) => feature.geometry !== null)
  .map((feature) => ({
    type: 'Feature',
    properties: { code: code(feature.properties), name: text(feature.properties.NAME) },
    geometry: rightWayRound(feature.geometry),
  }));

const full = presimplify(topology({ countries: { type: 'FeatureCollection', features } }));
const reduced = simplify(full, quantile(full, KEPT_SHARE));
// Simplifying can turn a very small shape the wrong way round, or leave
// it with nothing; each shape is checked again before it is kept.
const kept = toFeatures(reduced, reduced.objects.countries).features
  .filter((feature) => feature.geometry !== null)
  .map((feature) => ({ ...feature, geometry: rightWayRound(feature.geometry) }));
const simplified = quantize(topology({ countries: { type: 'FeatureCollection', features: kept } }), QUANTIZATION);
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(simplified));
console.log(`public/data/world.json: ${kept.length} countries, ${JSON.stringify(simplified).length} bytes`);

// SPDX-License-Identifier: MIT
/**
 * The English name of every country the usage page can name: each one
 * on the globe's map, and each one in the update server's summary.
 *
 * Names come from the Unicode CLDR data built into Node (Intl), so they
 * are written the same way everywhere on the page. A place the map
 * knows but CLDR does not keeps the map's own name.
 */
import world from '../../../public/data/world.json';

interface MapCountry {
  readonly properties?: { readonly code?: unknown; readonly name?: unknown };
}

const regions = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });

const geometries = (world as { objects: { countries: { geometries: readonly MapCountry[] } } }).objects.countries
  .geometries;

/** The country codes the globe's map has an outline for. */
export function mapCodes(): string[] {
  const codes = new Set<string>();
  for (const { properties } of geometries) {
    if (typeof properties?.code === 'string' && properties.code !== '') codes.add(properties.code);
  }
  return [...codes].sort();
}

export function countryNames(extraCodes: readonly string[]): Record<string, string> {
  const names: Record<string, string> = {};
  for (const { properties } of geometries) {
    const code = typeof properties?.code === 'string' ? properties.code : '';
    if (code === '' || names[code]) continue;
    names[code] = regions.of(code) ?? (typeof properties?.name === 'string' ? properties.name : code);
  }
  for (const code of extraCodes) {
    names[code] ??= regions.of(code) ?? code;
  }
  return names;
}

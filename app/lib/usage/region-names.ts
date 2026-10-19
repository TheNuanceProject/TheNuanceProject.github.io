// SPDX-License-Identifier: MIT
/**
 * English names of countries, from the Unicode CLDR data built into
 * JavaScript (Intl). The same names are used when the site is built and
 * in the browser, so a country is written the same way on either side.
 */

const regions = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });

/** The English name of the country with ISO 3166-1 alpha-2 `code`, or
 *  undefined when CLDR has no name for it. */
export function regionName(code: string): string | undefined {
  return regions.of(code);
}

/**
 * `known`, with a name added for each of `codes` it does not hold yet:
 * CLDR's name, or the code itself when CLDR has none.
 */
export function withRegionNames(
  known: Readonly<Record<string, string>>,
  codes: readonly string[]
): Record<string, string> {
  const names: Record<string, string> = { ...known };
  for (const code of codes) {
    names[code] ??= regionName(code) ?? code;
  }
  return names;
}

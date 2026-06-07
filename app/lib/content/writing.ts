// SPDX-License-Identifier: MIT
import type { WritingMeta, ResolvedWriting } from './types';
import { deriveDates, isValidIsoDate } from './dates';

/**
 * Writing loader — auto-discovers writing pieces from their folders.
 *
 * Every folder under src/pages/writing/[slug]/ must export a `meta`
 * constant conforming to WritingMeta. The loader scans these files
 * at build time, validates them, and builds a sorted manifest.
 *
 * Sort order: by effective date (`updated` if present, else
 * `published`), newest first. This makes revised pieces resurface —
 * an update is not a hidden footnote, it's a reason to re-read.
 *
 * Folders starting with an underscore are ignored (use for drafts).
 */

interface MetaModule {
  meta: WritingMeta;
}

const metaModules = import.meta.glob<MetaModule>(
  '/content/writing/[!_]*/meta.ts',
  { eager: true }
);

/**
 * Validate a writing piece's metadata. Throws with a clear, file-named
 * error if anything is wrong — fails fast at module load (dev server
 * start or build time), never in production render.
 */
function validateWriting(filePath: string, mod: MetaModule): ResolvedWriting {
  if (!mod.meta || typeof mod.meta !== 'object') {
    throw new Error(
      `Writing piece ${filePath} does not export a \`meta\` constant. ` +
        `Add: \`export const meta: WritingMeta = { ... }\``
    );
  }

  const m = mod.meta;
  const errors: string[] = [];

  if (m.kind !== 'writing') {
    errors.push('`kind` must be "writing"');
  }
  if (typeof m.slug !== 'string' || m.slug.trim() === '') {
    errors.push('missing or empty `slug`');
  }
  if (typeof m.title !== 'string' || m.title.trim() === '') {
    errors.push('missing or empty `title`');
  }
  if (typeof m.description !== 'string' || m.description.trim() === '') {
    errors.push('missing or empty `description`');
  }
  if (!isValidIsoDate(m.published)) {
    errors.push('missing or invalid `published` (must be YYYY-MM-DD)');
  }
  if (m.updated !== undefined && !isValidIsoDate(m.updated)) {
    errors.push('`updated` must be YYYY-MM-DD if provided');
  }
  if (
    m.readingTime !== undefined &&
    (typeof m.readingTime !== 'number' ||
      !Number.isFinite(m.readingTime) ||
      m.readingTime <= 0)
  ) {
    errors.push('`readingTime` must be a positive number of minutes if provided');
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid writing meta in ${filePath}:\n  - ${errors.join('\n  - ')}`
    );
  }

  return {
    ...m,
    ...deriveDates(m.published, m.updated),
  };
}

/**
 * All published writing pieces, sorted newest first by effective date
 * (updated ?? published). Computed once at module load.
 */
export const allWriting: readonly ResolvedWriting[] = Object.entries(
  metaModules
)
  .map(([path, mod]) => validateWriting(path, mod))
  .sort((a, b) => (a.sortDate < b.sortDate ? 1 : -1));

/** Find a writing piece's metadata by slug. */
export function findWritingBySlug(
  slug: string
): ResolvedWriting | undefined {
  return allWriting.find((w) => w.slug === slug);
}

/** Latest N writing pieces, for the Home page. */
export function latestWriting(n: number): readonly ResolvedWriting[] {
  return allWriting.slice(0, n);
}

/** Neighbours of a piece within the newest-first list. */
export interface AdjacentWriting {
  /** The piece published just after this one (newer). */
  readonly newer?: ResolvedWriting;
  /** The piece published just before this one (older). */
  readonly older?: ResolvedWriting;
}

/**
 * Given the full newest-first list and a slug, return the newer and
 * older neighbouring pieces. Pure (takes the list as an argument) so
 * it is unit-testable without the build-time glob.
 */
export function adjacentWriting(
  all: readonly ResolvedWriting[],
  slug: string
): AdjacentWriting {
  const index = all.findIndex((w) => w.slug === slug);
  if (index === -1) return {};
  return {
    newer: index > 0 ? all[index - 1] : undefined,
    older: index < all.length - 1 ? all[index + 1] : undefined,
  };
}

/**
 * The most recent other pieces (excluding `slug`), up to `n`. Pure, for
 * the same testability reason as `adjacentWriting`.
 */
export function relatedWriting(
  all: readonly ResolvedWriting[],
  slug: string,
  n: number
): readonly ResolvedWriting[] {
  return all.filter((w) => w.slug !== slug).slice(0, n);
}

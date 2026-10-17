// SPDX-License-Identifier: MIT
import type { ResolvedProject, ResolvedWriting, WritingAbout, WritingMeta } from './types';
import { deriveDates, isValidIsoDate } from './dates';
import { allProjects } from './projects';
import { compareVersions, isVersion } from './versions';

/**
 * Writing loader: auto-discovers writing pieces from their folders.
 *
 * Every folder under src/pages/writing/[slug]/ must export a `meta`
 * constant conforming to WritingMeta. The loader scans these files
 * at build time, validates them, and builds a sorted manifest.
 *
 * Sort order: by effective date (`updated` if present, else
 * `published`), newest first. This makes revised pieces resurface:
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
 * error if anything is wrong; fails fast at module load (dev server
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
  if (m.about !== undefined) {
    errors.push(...aboutErrors(m.about, allProjects));
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
 * What is wrong with a piece's `about`, given the projects there are:
 * it must name a project there is, and a version of it written
 * major.minor.patch that is not later than the project's current one.
 */
export function aboutErrors(
  about: WritingAbout,
  projects: readonly ResolvedProject[]
): string[] {
  if (typeof about !== 'object' || about === null) {
    return ['`about` must be { project, version } if provided'];
  }
  const project = projects.find((p) => p.slug === about.project);
  if (!project) {
    return [`\`about.project\` must be the slug of a project; there is none called "${String(about.project)}"`];
  }
  if (!isVersion(about.version)) {
    return ['`about.version` must be major.minor.patch'];
  }
  if (compareVersions(about.version, project.version) > 0) {
    return [`\`about.version\` ${about.version} is later than ${project.title}'s current version, ${project.version}`];
  }
  return [];
}

/** A project's release that is later than the one a piece describes. */
export interface NewerRelease {
  /** Slug of the project, for the link to its page. */
  readonly slug: string;
  /** Display name of the project. */
  readonly title: string;
  /** The version the piece describes. */
  readonly described: string;
  /** The project's current version, later than `described`. */
  readonly latest: string;
}

/**
 * The project's current release when it is later than the one the piece
 * describes, else null: a piece about the current release, or about no
 * release, needs no notice. Pure, for testability.
 */
export function newerRelease(
  about: WritingAbout | undefined,
  projects: readonly ResolvedProject[]
): NewerRelease | null {
  if (!about) return null;
  const project = projects.find((p) => p.slug === about.project);
  if (!project || compareVersions(project.version, about.version) <= 0) {
    return null;
  }
  return {
    slug: project.slug,
    title: project.title,
    described: about.version,
    latest: project.version,
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

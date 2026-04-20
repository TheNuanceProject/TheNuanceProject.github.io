// SPDX-License-Identifier: MIT
import type { ProjectMeta, ResolvedProject } from './types';
import { deriveDates, isValidIsoDate } from './dates';

/**
 * Projects loader — auto-discovers projects from their folders.
 *
 * Every folder under src/pages/projects/[slug]/ must export a `meta`
 * constant conforming to ProjectMeta. The loader scans these files
 * at build time, validates them, and builds a sorted manifest.
 *
 * Sort order: by lifecycle status (Active → Maintained → Archived),
 * then by effective date within each tier (updated ?? published,
 * newest first).
 *
 * Folders starting with an underscore are ignored.
 */

interface MetaModule {
  meta: ProjectMeta;
}

const metaModules = import.meta.glob<MetaModule>(
  '/content/projects/[!_]*/meta.ts',
  { eager: true }
);

/** Status ordering for sort — Active first, Archived last. */
const STATUS_ORDER: Record<ProjectMeta['status'], number> = {
  Active: 0,
  Maintained: 1,
  Archived: 2,
};

function validateProject(
  filePath: string,
  mod: MetaModule
): ResolvedProject {
  if (!mod.meta || typeof mod.meta !== 'object') {
    throw new Error(
      `Project ${filePath} does not export a \`meta\` constant. ` +
        `Add: \`export const meta: ProjectMeta = { ... }\``
    );
  }

  const m = mod.meta;
  const errors: string[] = [];

  if (m.kind !== 'project') {
    errors.push('`kind` must be "project"');
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
  if (typeof m.version !== 'string' || m.version.trim() === '') {
    errors.push('missing or empty `version`');
  }
  if (
    m.status !== 'Active' &&
    m.status !== 'Maintained' &&
    m.status !== 'Archived'
  ) {
    errors.push('`status` must be Active, Maintained, or Archived');
  }
  if (!Array.isArray(m.platforms) || m.platforms.length === 0) {
    errors.push('`platforms` must be a non-empty array');
  }
  if (typeof m.tagline !== 'string' || m.tagline.trim() === '') {
    errors.push('missing or empty `tagline`');
  }
  if (
    typeof m.productTagline !== 'string' ||
    m.productTagline.trim() === ''
  ) {
    errors.push('missing or empty `productTagline`');
  }
  if (typeof m.downloadUrl !== 'string' || m.downloadUrl.trim() === '') {
    errors.push('missing or empty `downloadUrl`');
  }
  if (typeof m.githubUrl !== 'string' || m.githubUrl.trim() === '') {
    errors.push('missing or empty `githubUrl`');
  }
  if (typeof m.issuesUrl !== 'string' || m.issuesUrl.trim() === '') {
    errors.push('missing or empty `issuesUrl`');
  }
  if (typeof m.releasesUrl !== 'string' || m.releasesUrl.trim() === '') {
    errors.push('missing or empty `releasesUrl`');
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid project meta in ${filePath}:\n  - ${errors.join('\n  - ')}`
    );
  }

  return {
    ...m,
    ...deriveDates(m.published, m.updated),
  };
}

/**
 * All projects, sorted by status then by effective date.
 * Computed once at module load.
 */
export const allProjects: readonly ResolvedProject[] = Object.entries(
  metaModules
)
  .map(([path, mod]) => validateProject(path, mod))
  .sort((a, b) => {
    const statusDiff =
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    return a.sortDate < b.sortDate ? 1 : -1;
  });

/** Find a project by slug. */
export function findProjectBySlug(
  slug: string
): ResolvedProject | undefined {
  return allProjects.find((p) => p.slug === slug);
}

/** Latest N Active projects, for the Home page. */
export function latestActiveProjects(
  n: number
): readonly ResolvedProject[] {
  return allProjects.filter((p) => p.status === 'Active').slice(0, n);
}

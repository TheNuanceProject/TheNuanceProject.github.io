// SPDX-License-Identifier: MIT
/**
 * Content types — the unified metadata model.
 *
 * Writing pieces and projects are architecturally identical: both
 * live in folders under `src/pages/[kind]/[slug]/` with a `meta.ts`
 * file (auto-discovered) and an `index.tsx` file (the page).
 *
 * BaseMeta defines the fields common to both.
 * WritingMeta and ProjectMeta extend it with their kind-specific fields.
 *
 * Every item has:
 *   - `slug` — the URL segment, matches the folder name
 *   - `title` — the display name
 *   - `description` — a one-sentence summary for cards and meta tags
 *   - `published` — ISO date (YYYY-MM-DD), when first shipped
 *   - `updated` — optional ISO date, set when meaningfully revised
 *
 * Sorting uses `updated ?? published`, so recently-revised items
 * resurface at the top of index pages. This makes updates feel
 * first-class, not just a footnote.
 */

/** ISO date in YYYY-MM-DD format. Validated at build time. */
export type IsoDate = string;

/** Lifecycle status — drives sort order and home-page inclusion. */
export type LifecycleStatus = 'Active' | 'Maintained' | 'Archived';

/** Fields every piece of content carries, regardless of kind. */
export interface BaseMeta {
  /** URL slug — must match the folder name in src/pages/[kind]/[slug]/ */
  readonly slug: string;
  /** Display title */
  readonly title: string;
  /** One-sentence summary, used in cards, indexes, and meta tags */
  readonly description: string;
  /** When this was first published (YYYY-MM-DD) */
  readonly published: IsoDate;
  /** When this was last meaningfully revised (YYYY-MM-DD, optional) */
  readonly updated?: IsoDate;
}

/** Metadata for a writing piece (essay, note, article). */
export interface WritingMeta extends BaseMeta {
  readonly kind: 'writing';
}

/** Metadata for a project (software, tool, library). */
export interface ProjectMeta extends BaseMeta {
  readonly kind: 'project';
  /** Current version string (e.g., "1.0.0") */
  readonly version: string;
  /** Lifecycle status */
  readonly status: LifecycleStatus;
  /** Platforms the project ships on */
  readonly platforms: readonly string[];
  /** Short tagline shown on cards */
  readonly tagline: string;
  /** Fuller tagline shown on the product page itself */
  readonly productTagline: string;
  /** Primary download URL */
  readonly downloadUrl: string;
  /** Repository URL */
  readonly githubUrl: string;
  /** New-issue URL */
  readonly issuesUrl: string;
  /** Releases page URL */
  readonly releasesUrl: string;
}

/** Formatted date strings derived from ISO dates for display. */
export interface DerivedDates {
  /** "April 2026" — used as the small uppercase label on cards */
  readonly displayDate: string;
  /** "April 15, 2026" — used in article footers */
  readonly publishedDate: string;
  /** "April 22, 2026" — only present if `updated` was set */
  readonly updatedDate: string | null;
  /** ISO date used for sort order — `updated` if present, else `published` */
  readonly sortDate: IsoDate;
}

/** Writing metadata with its formatted dates resolved. */
export type ResolvedWriting = WritingMeta & DerivedDates;

/** Project metadata with its formatted dates resolved. */
export type ResolvedProject = ProjectMeta & DerivedDates;

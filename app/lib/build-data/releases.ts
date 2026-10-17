// SPDX-License-Identifier: MIT
/**
 * A project's published releases, read from the GitHub REST API when the
 * site is built, so the download card and the releases timeline are in
 * the page itself and a visitor's browser asks GitHub for nothing.
 *
 * Only published, stable releases with a `v1.2.3` tag are kept, and a
 * release's link is kept only if it is a page of that repository's
 * releases. Anything else in the answer is ignored.
 */

import { compareVersions } from '~/lib/content/versions';

export interface Release {
  /** `1.2.3`, without the `v`. */
  readonly version: string;
  /** The day it was published, `YYYY-MM-DD`, UTC. */
  readonly date: string;
  /** Its page on GitHub. */
  readonly url: string;
}

export class ReleasesError extends Error {
  override readonly name = 'ReleasesError';
}

const TAG = /^v(\d{1,4})\.(\d{1,4})\.(\d{1,4})$/;
const PUBLISHED = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
/** The most releases one answer can hold (GitHub's page size). */
export const RELEASES_PAGE_SIZE = 100;

/** `owner/name` of a `https://github.com/owner/name` address. */
export function repositoryOf(githubUrl: string): string {
  const match = /^https:\/\/github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})$/.exec(githubUrl);
  if (!match) {
    throw new ReleasesError(`${githubUrl} is not the address of a GitHub repository`);
  }
  return `${match[1]}/${match[2]}`;
}

/** The address of the API that lists `githubUrl`'s releases. */
export function releasesApi(githubUrl: string): string {
  return `https://api.github.com/repos/${repositoryOf(githubUrl)}/releases?per_page=${RELEASES_PAGE_SIZE}`;
}

/** Newest version first. */
function compare(a: Release, b: Release): number {
  return compareVersions(b.version, a.version);
}

/**
 * The stable releases in a GitHub answer, newest version first.
 *
 * @throws ReleasesError when the answer is not a list.
 */
export function readReleases(value: unknown, githubUrl: string): Release[] {
  if (!Array.isArray(value)) {
    throw new ReleasesError('the releases answer is not a list');
  }
  const pages = `https://github.com/${repositoryOf(githubUrl)}/releases/`;
  const releases: Release[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const release = item as Record<string, unknown>;
    if (release.draft !== false || release.prerelease !== false) continue;
    const tag = typeof release.tag_name === 'string' ? TAG.exec(release.tag_name) : null;
    const published = typeof release.published_at === 'string' && PUBLISHED.test(release.published_at)
      ? release.published_at
      : null;
    const url = typeof release.html_url === 'string' && release.html_url.startsWith(pages) ? release.html_url : null;
    if (!tag || !published || !url) continue;
    const version = `${Number(tag[1])}.${Number(tag[2])}.${Number(tag[3])}`;
    if (seen.has(version)) continue;
    seen.add(version);
    releases.push({ version, date: published.slice(0, 10), url });
  }
  return releases.sort(compare);
}

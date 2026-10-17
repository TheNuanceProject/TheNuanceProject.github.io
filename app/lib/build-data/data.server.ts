// SPDX-License-Identifier: MIT
/**
 * The data the site reads when it is built: a project's releases from
 * GitHub, and the public summary of WireTrace's update server.
 *
 * Each is fetched once per build, however many pages use it, and checked
 * before any page sees it. The site is built again every 12 hours, so the
 * pages show data at most that old.
 *
 * Building without the network: set `BUILD_DATA_DIR` to a folder holding
 * `releases/<owner>/<repository>.json` (GitHub's answer) for each project
 * and, once the update server has made one, `summary.json`. They are checked exactly as fetched data is. The
 * deploy workflow never sets it, and a build in CI refuses it.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BuildDataError, fetchJson } from './fetch-json.server';
import { type Release, readReleases, releasesApi, repositoryOf } from './releases';
import { type UsageSummary, readUsageSummary } from './usage-summary';

const TIMEOUT_MS = 30_000;
const RELEASES_MAX_BYTES = 4 * 1024 * 1024;
const SUMMARY_MAX_BYTES = 4 * 1024 * 1024;

/** The folder to read the data from instead of the network, if set. */
function localFolder(): string | null {
  const folder = process.env.BUILD_DATA_DIR;
  if (!folder) return null;
  if (process.env.CI === 'true') {
    throw new BuildDataError('BUILD_DATA_DIR is for building without the network, never for a build in CI');
  }
  return folder;
}

async function readLocal(name: string, missingIsNull: boolean): Promise<unknown> {
  const folder = localFolder() as string;
  let text: string;
  try {
    text = await readFile(join(folder, name), 'utf8');
  } catch (error) {
    if (missingIsNull && (error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new BuildDataError(`${name} could not be read from BUILD_DATA_DIR`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BuildDataError(`${name} in BUILD_DATA_DIR is not JSON`);
  }
}

const releases = new Map<string, Promise<Release[]>>();
const summaries = new Map<string, Promise<UsageSummary | null>>();

/** GitHub's API allows more requests to a token; the build is given the
 *  workflow's own read-only token when there is one. */
function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** The stable releases of the repository at `githubUrl`, newest first. */
export function getReleases(githubUrl: string): Promise<Release[]> {
  let pending = releases.get(githubUrl);
  if (!pending) {
    const answer = localFolder()
      ? readLocal(join('releases', `${repositoryOf(githubUrl)}.json`), false)
      : fetchJson(releasesApi(githubUrl), { maxBytes: RELEASES_MAX_BYTES, timeoutMs: TIMEOUT_MS, headers: githubHeaders() });
    pending = answer.then((value) => readReleases(value, githubUrl));
    releases.set(githubUrl, pending);
  }
  return pending;
}

/**
 * The stable releases of a project, newest first, once its latest is
 * confirmed to be the version its meta names. The site describes that
 * version, so it is never built before that version is released: the
 * page would otherwise describe one release and offer another.
 *
 * @throws BuildDataError when GitHub's latest release is another version.
 */
export async function getProjectReleases(project: { readonly githubUrl: string; readonly version: string }): Promise<Release[]> {
  const found = await getReleases(project.githubUrl);
  const latest = found[0]?.version ?? 'none';
  if (latest !== project.version) {
    throw new BuildDataError(
      `the site describes version ${project.version}, but the latest release on GitHub is ${latest}: ` +
        'publish the release first, then build the site',
    );
  }
  return found;
}

/**
 * The public summary at `url`, or null before the update server has
 * made its first one.
 */
export function getUsageSummary(url: string): Promise<UsageSummary | null> {
  let pending = summaries.get(url);
  if (!pending) {
    const answer = localFolder()
      ? readLocal('summary.json', true)
      : fetchJson(url, { maxBytes: SUMMARY_MAX_BYTES, timeoutMs: TIMEOUT_MS, missingIsNull: true });
    pending = answer.then((value) => (value === null ? null : readUsageSummary(value)));
    summaries.set(url, pending);
  }
  return pending;
}

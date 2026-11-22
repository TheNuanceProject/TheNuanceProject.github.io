// SPDX-License-Identifier: MIT
/**
 * The data the site reads when it is built: a project's releases from
 * GitHub, the privacy policy and the benchmarks of the WireTrace release
 * the site describes, and the public summary of WireTrace's update server.
 *
 * Each is fetched once per build, however many pages use it, and checked
 * before any page sees it. The site is built again every 12 hours, so the
 * data built into the pages is at most that old. The usage page also
 * reads the summary again when it opens in a browser
 * (`~/lib/usage/live-summary`), so the figures it shows are current.
 *
 * Building without the network: set `BUILD_DATA_DIR` to a folder holding
 * `releases/<owner>/<repository>.json` (GitHub's answer) for each project,
 * `policy/<owner>/<repository>/PRIVACY.md` and
 * `benchmarks/<owner>/<repository>.json` for WireTrace and, once the
 * update server has made one, `summary.json`. They are checked exactly as fetched data is. The
 * deploy workflow never sets it, and a build in CI refuses it.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { type Policy, PolicyError, parsePolicy } from '../privacy/policy';
import { BenchmarksError, type ReleaseBenchmarks, readBenchmarks } from './benchmarks';
import { BuildDataError, fetchJson, fetchText } from './fetch-json.server';
import { type Release, readReleases, releasesApi, repositoryOf } from './releases';
import { SUMMARY_MAX_BYTES, type UsageSummary, readUsageSummary } from './usage-summary';

const TIMEOUT_MS = 30_000;
const RELEASES_MAX_BYTES = 4 * 1024 * 1024;
/** The privacy policy's file, at the top of the repository it is kept in. */
const POLICY_FILE = 'PRIVACY.md';
const POLICY_MAX_BYTES = 256 * 1024;
/** The benchmarks' file, published with each release. */
const BENCHMARKS_FILE = 'benchmarks.json';
const BENCHMARKS_MAX_BYTES = 1024 * 1024;
/** Where GitHub sends a download of a release's file on to: its hosts
 *  for release files, the newer and the older. */
const RELEASE_ASSET_HOSTS = ['release-assets.githubusercontent.com', 'objects.githubusercontent.com'] as const;

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

const policies = new Map<string, Promise<Policy>>();

/**
 * The privacy policy as the release of `project` the site describes
 * holds it: `PRIVACY.md` at that release's tag, read by the policy's own
 * rules. The policy is kept in that one file only, so this page always
 * shows what the released WireTrace and its installer show.
 *
 * @throws BuildDataError when that release is not GitHub's latest, or its
 * policy cannot be fetched or read.
 */
export function getReleasedPolicy(project: { readonly githubUrl: string; readonly version: string }): Promise<Policy> {
  const key = `${project.githubUrl}@${project.version}`;
  let pending = policies.get(key);
  if (!pending) {
    pending = getProjectReleases(project).then(async () => {
      const repository = repositoryOf(project.githubUrl);
      let text: string | null;
      if (localFolder()) {
        const name = join('policy', repository, POLICY_FILE);
        try {
          text = await readFile(join(localFolder() as string, name), 'utf8');
        } catch {
          throw new BuildDataError(`${name} could not be read from BUILD_DATA_DIR`);
        }
      } else {
        const url = `https://api.github.com/repos/${repository}/contents/${POLICY_FILE}?ref=v${project.version}`;
        text = await fetchText(url, {
          maxBytes: POLICY_MAX_BYTES,
          timeoutMs: TIMEOUT_MS,
          headers: { ...githubHeaders(), Accept: 'application/vnd.github.raw' },
          missingIsNull: true,
        });
        if (text === null) {
          throw new BuildDataError(`WireTrace ${project.version} holds no ${POLICY_FILE}`);
        }
      }
      try {
        return parsePolicy(text);
      } catch (error) {
        if (error instanceof PolicyError) {
          throw new BuildDataError(`the ${POLICY_FILE} of version ${project.version} cannot be read: ${error.message}`);
        }
        throw error;
      }
    });
    policies.set(key, pending);
  }
  return pending;
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

const benchmarks = new Map<string, Promise<ReleaseBenchmarks>>();

/**
 * The benchmarks published with the release of `project` the site
 * describes: its `benchmarks.json`, read by the benchmarks' own rules.
 *
 * @throws BuildDataError when that release is not GitHub's latest, or its
 * benchmarks cannot be fetched, are of another version, or hold a failure.
 */
export function getReleaseBenchmarks(project: { readonly githubUrl: string; readonly version: string }): Promise<ReleaseBenchmarks> {
  const key = `${project.githubUrl}@${project.version}`;
  let pending = benchmarks.get(key);
  if (!pending) {
    pending = getProjectReleases(project).then(async () => {
      const repository = repositoryOf(project.githubUrl);
      const value = localFolder()
        ? await readLocal(join('benchmarks', `${repository}.json`), false)
        : await fetchJson(`https://github.com/${repository}/releases/download/v${project.version}/${BENCHMARKS_FILE}`, {
            maxBytes: BENCHMARKS_MAX_BYTES,
            timeoutMs: TIMEOUT_MS,
            missingIsNull: true,
            redirectHosts: RELEASE_ASSET_HOSTS,
          });
      if (value === null) {
        throw new BuildDataError(`WireTrace ${project.version} was published without ${BENCHMARKS_FILE}`);
      }
      try {
        return readBenchmarks(value, project.version);
      } catch (error) {
        if (error instanceof BenchmarksError) {
          throw new BuildDataError(`the ${BENCHMARKS_FILE} of version ${project.version} cannot be read: ${error.message}`);
        }
        throw error;
      }
    });
    benchmarks.set(key, pending);
  }
  return pending;
}

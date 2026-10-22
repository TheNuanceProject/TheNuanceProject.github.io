// SPDX-License-Identifier: MIT
/**
 * The usage page's current figures.
 *
 * The page is built with the update server's public summary as it was at
 * build time, so it shows figures at once and without JavaScript. When it
 * opens in a browser it reads the summary again from the update server,
 * which makes a new one every 15 minutes, and shows that one instead. The
 * summary read in the browser is checked exactly as the build checks it
 * (`readUsageSummary`). If it cannot be read, or is not exactly a
 * summary, or was made before the one the page was built with, the page
 * keeps the figures it has.
 */
import { useEffect, useState } from 'react';

import { SUMMARY_MAX_BYTES, type UsageSummary, readUsageSummary } from '~/lib/build-data/usage-summary';

/** The part of `fetch` this module uses, so it can be given another. */
export type SummaryFetch = (url: string, init: RequestInit) => Promise<Response>;

export class LiveSummaryError extends Error {
  override readonly name = 'LiveSummaryError';
}

const HTTP_NOT_FOUND = 404;

/**
 * The summary at `url`, read past any cached copy, or null when the
 * update server has not made one yet.
 *
 * @throws LiveSummaryError when the server answers with anything else
 *   than a summary or "not found", or the answer is larger than any
 *   summary.
 * @throws UsageSummaryError when the answer is not exactly a summary.
 */
export async function fetchLiveSummary(
  url: string,
  fetcher: SummaryFetch,
  signal?: AbortSignal
): Promise<UsageSummary | null> {
  const response = await fetcher(url, {
    cache: 'no-cache',
    credentials: 'omit',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (response.status === HTTP_NOT_FOUND) {
    return null;
  }
  if (!response.ok) {
    throw new LiveSummaryError(`the update server answered ${response.status}`);
  }
  const declared = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > SUMMARY_MAX_BYTES) {
    throw new LiveSummaryError(`the summary is ${declared} bytes, more than ${SUMMARY_MAX_BYTES}`);
  }
  const body = await response.text();
  const size = new TextEncoder().encode(body).length;
  if (size > SUMMARY_MAX_BYTES) {
    throw new LiveSummaryError(`the summary is ${size} bytes, more than ${SUMMARY_MAX_BYTES}`);
  }
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    throw new LiveSummaryError('the summary is not JSON');
  }
  return readUsageSummary(value);
}

/**
 * The summary to show: `next` unless it was made before `current`. The
 * server makes one every 15 minutes, each later than the last.
 */
export function laterSummary(current: UsageSummary | null, next: UsageSummary): UsageSummary {
  return current === null || next.madeAt >= current.madeAt ? next : current;
}

/**
 * `built` until the current summary at `url` has been read in the
 * browser, then the later of the two. Rendered on the server and at
 * hydration as `built`, so both render the same page.
 */
export function useLiveSummary(built: UsageSummary | null, url: string): UsageSummary | null {
  const [summary, setSummary] = useState(built);

  useEffect(() => {
    const controller = new AbortController();
    fetchLiveSummary(url, (input, init) => fetch(input, init), controller.signal)
      .then((live) => {
        if (live !== null) {
          setSummary((current) => laterSummary(current, live));
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn(
          'The current usage figures could not be read; the page shows the figures it was built with:',
          error instanceof Error ? error.message : String(error)
        );
      });
    return () => controller.abort();
  }, [url]);

  return summary;
}

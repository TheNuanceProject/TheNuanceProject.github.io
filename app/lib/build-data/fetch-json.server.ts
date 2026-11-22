// SPDX-License-Identifier: MIT
/**
 * Fetching JSON and text while the site is built.
 *
 * Only ever runs in Node, at build time (`.server` keeps it out of the
 * browser's code). Addresses must be https, redirects are refused unless
 * the request names the hosts it may be sent on to (one step, https
 * only), the answer is read only up to a size limit, and the request is
 * given a time limit. A failure throws, which stops the build: a page is
 * never published with data that could not be read.
 */

export class BuildDataError extends Error {
  override readonly name = 'BuildDataError';
}

export interface FetchJsonOptions {
  /** The most bytes of the answer read. */
  readonly maxBytes: number;
  readonly timeoutMs: number;
  readonly headers?: Readonly<Record<string, string>>;
  /** When true, an answer of 404 gives null instead of an error. */
  readonly missingIsNull?: boolean;
  /** Hosts a redirect may send the request on to, once, over https.
   *  Without them every redirect is refused. */
  readonly redirectHosts?: readonly string[];
}

const HTTP_NOT_FOUND = 404;
const REDIRECTS: readonly number[] = [301, 302, 303, 307, 308];

/** The address a redirect sends `url` on to, if it is allowed: https, on
 *  one of `hosts`. */
function redirectTarget(url: string, response: Response, hosts: readonly string[]): string {
  const location = response.headers.get('Location');
  let target: URL;
  try {
    target = new URL(location ?? '', url);
  } catch {
    throw new BuildDataError(`${url}: the server sent the request on to an address that is not one`);
  }
  if (location === null || target.protocol !== 'https:' || !hosts.includes(target.hostname)) {
    throw new BuildDataError(`${url}: the server sent the request on to ${target.protocol}//${target.hostname}, which is not allowed`);
  }
  return target.href;
}

async function request(url: string, options: FetchJsonOptions, redirect: RequestRedirect): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json', ...options.headers },
      redirect,
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch (error) {
    throw new BuildDataError(`${url}: could not be fetched (${error instanceof Error ? error.message : 'unknown error'})`);
  }
}

async function readLimited(response: Response, maxBytes: number, url: string): Promise<string> {
  const declared = Number(response.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new BuildDataError(`${url}: the answer is larger than ${maxBytes} bytes`);
  }
  if (!response.body) {
    return '';
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new BuildDataError(`${url}: the answer is larger than ${maxBytes} bytes`);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new BuildDataError(`${url}: the answer is not UTF-8 text`);
  }
}

/**
 * The text at `url`, as the server sent it: refused unless it is UTF-8
 * and within `maxBytes`. `Accept` may be set in the options' headers.
 *
 * @throws BuildDataError when it cannot be fetched.
 */
export async function fetchText(url: string, options: FetchJsonOptions): Promise<string | null> {
  if (!url.startsWith('https://')) {
    throw new BuildDataError(`${url}: only https addresses are fetched`);
  }
  const hosts = options.redirectHosts ?? [];
  let response = await request(url, options, hosts.length > 0 ? 'manual' : 'error');
  if (REDIRECTS.includes(response.status) && hosts.length > 0) {
    await response.body?.cancel();
    // Nothing of the first request's own headers (a token, say) is sent to
    // the host it was sent on to.
    response = await request(redirectTarget(url, response, hosts), { ...options, headers: {} }, 'error');
  }
  if (response.status === HTTP_NOT_FOUND && options.missingIsNull) {
    return null;
  }
  if (!response.ok) {
    throw new BuildDataError(`${url}: the server answered ${response.status}`);
  }
  return readLimited(response, options.maxBytes, url);
}

/**
 * The JSON at `url`, parsed but not yet checked.
 *
 * @throws BuildDataError when it cannot be fetched or parsed.
 */
export async function fetchJson(url: string, options: FetchJsonOptions): Promise<unknown> {
  const text = await fetchText(url, options);
  if (text === null) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BuildDataError(`${url}: the answer is not JSON`);
  }
}

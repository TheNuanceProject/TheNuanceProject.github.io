// SPDX-License-Identifier: MIT
/**
 * Fetching JSON while the site is built.
 *
 * Only ever runs in Node, at build time (`.server` keeps it out of the
 * browser's code). Addresses must be https, redirects are refused, the
 * answer is read only up to a size limit, and the request is given a
 * time limit. A failure throws, which stops the build: a page is never
 * published with data that could not be read.
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
}

const HTTP_NOT_FOUND = 404;

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
 * The JSON at `url`, parsed but not yet checked.
 *
 * @throws BuildDataError when it cannot be fetched or parsed.
 */
export async function fetchJson(url: string, options: FetchJsonOptions): Promise<unknown> {
  if (!url.startsWith('https://')) {
    throw new BuildDataError(`${url}: only https addresses are fetched`);
  }
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json', ...options.headers },
      redirect: 'error',
      signal: AbortSignal.timeout(options.timeoutMs),
    });
  } catch (error) {
    throw new BuildDataError(`${url}: could not be fetched (${error instanceof Error ? error.message : 'unknown error'})`);
  }
  if (response.status === HTTP_NOT_FOUND && options.missingIsNull) {
    return null;
  }
  if (!response.ok) {
    throw new BuildDataError(`${url}: the server answered ${response.status}`);
  }
  const text = await readLimited(response, options.maxBytes, url);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BuildDataError(`${url}: the answer is not JSON`);
  }
}

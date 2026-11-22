// SPDX-License-Identifier: MIT
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BuildDataError, fetchText } from './fetch-json.server';

const FILE = 'https://github.com/owner/repo/releases/download/v1.0.0/file.json';
const ASSET = 'https://release-assets.githubusercontent.com/github-production-release-asset/1/2?sig=abc';
const OPTIONS = { maxBytes: 1024, timeoutMs: 1000, redirectHosts: ['release-assets.githubusercontent.com'] };

function redirectTo(location: string, status = 302): Response {
  return new Response(null, { status, headers: { Location: location } });
}

/** A stand-in for the network: each address answers as given, and every
 *  request is kept. */
function network(answers: Record<string, () => Response>) {
  const asked: { url: string; redirect: RequestRedirect | undefined }[] = [];
  sentHeaders.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    asked.push({ url: input, redirect: init?.redirect });
    sentHeaders.push({ ...(init?.headers as Record<string, string>) });
    const answer = answers[input];
    if (answer === undefined) throw new TypeError('no such address');
    return answer();
  }));
  return asked;
}

/** The headers of each request made through `network`, in order. */
const sentHeaders: Record<string, string>[] = [];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchText', () => {
  it('follows one redirect to a host it was given, over https', async () => {
    const asked = network({ [FILE]: () => redirectTo(ASSET), [ASSET]: () => new Response('{"a":1}') });

    await expect(fetchText(FILE, OPTIONS)).resolves.toBe('{"a":1}');
    expect(asked).toEqual([
      { url: FILE, redirect: 'manual' },
      { url: ASSET, redirect: 'error' },
    ]);
  });

  it.each([
    ['another host', 'https://example.com/file.json'],
    ['plain http', 'http://release-assets.githubusercontent.com/file.json'],
  ])('refuses a redirect to %s', async (_what, location) => {
    network({ [FILE]: () => redirectTo(location) });

    await expect(fetchText(FILE, OPTIONS)).rejects.toThrow(BuildDataError);
  });

  it('sends none of its own headers to the host it is sent on to', async () => {
    network({ [FILE]: () => redirectTo(ASSET), [ASSET]: () => new Response('{}') });

    await fetchText(FILE, { ...OPTIONS, headers: { Authorization: 'Bearer secret' } });
    expect(sentHeaders[0]?.Authorization).toBe('Bearer secret');
    expect(sentHeaders[1]?.Authorization).toBeUndefined();
  });

  it('refuses a redirect with no address', async () => {
    network({ [FILE]: () => new Response(null, { status: 302 }) });

    await expect(fetchText(FILE, OPTIONS)).rejects.toThrow(BuildDataError);
  });

  it('follows no second redirect', async () => {
    network({
      [FILE]: () => redirectTo(ASSET),
      [ASSET]: () => {
        throw new TypeError('unexpected redirect');
      },
    });

    await expect(fetchText(FILE, OPTIONS)).rejects.toThrow(BuildDataError);
  });

  it('refuses every redirect when no host was given', async () => {
    const asked = network({ [FILE]: () => new Response('{}') });

    await fetchText(FILE, { maxBytes: 1024, timeoutMs: 1000 });
    expect(asked).toEqual([{ url: FILE, redirect: 'error' }]);
  });

  it('keeps the size limit after a redirect', async () => {
    network({ [FILE]: () => redirectTo(ASSET), [ASSET]: () => new Response('x'.repeat(2048)) });

    await expect(fetchText(FILE, OPTIONS)).rejects.toThrow('larger than 1024 bytes');
  });

  it('gives null for a file that is not there', async () => {
    network({ [FILE]: () => new Response('Not Found', { status: 404 }) });

    await expect(fetchText(FILE, { ...OPTIONS, missingIsNull: true })).resolves.toBeNull();
  });
});

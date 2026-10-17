// SPDX-License-Identifier: MIT
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { inlineScripts, policyFor, scriptHash, withPolicy } from './csp.mjs';

const PAGE =
  '<!DOCTYPE html><html><head><meta charSet="utf-8"/><script>theme()</script>' +
  '<script type="application/ld+json">{"@type":"Thing"}</script></head><body>' +
  '<script type="module" async="">import "/a.js";</script>' +
  '<script defer src="https://static.cloudflareinsights.com/beacon.min.js"></script></body></html>';

describe('inlineScripts', () => {
  it('finds the inline scripts a browser runs, and no data or loaded script', () => {
    expect(inlineScripts(PAGE)).toEqual(['theme()', 'import "/a.js";']);
  });
});

describe('scriptHash', () => {
  it('is the base64 SHA-256 of the exact text', () => {
    const digest = createHash('sha256').update('theme()').digest('base64');
    expect(scriptHash('theme()')).toBe(`'sha256-${digest}'`);
  });
});

describe('policyFor', () => {
  it('allows the page’s own scripts and nothing else inline', () => {
    const policy = policyFor(['theme()']);
    expect(policy).toContain(`script-src 'self' ${scriptHash('theme()')} https://static.cloudflareinsights.com`);
    expect(policy).not.toContain("'unsafe-inline' https");
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(policy).toContain("object-src 'none'");
  });
});

describe('withPolicy', () => {
  it('puts the policy straight after the charset, before any script', () => {
    const html = withPolicy(PAGE);
    const policyAt = html.indexOf('Content-Security-Policy');
    expect(policyAt).toBeGreaterThan(html.indexOf('charSet'));
    expect(policyAt).toBeLessThan(html.indexOf('<script'));
    expect(html).toContain(scriptHash('import "/a.js";'));
  });

  it('replaces a policy already there instead of adding a second', () => {
    const once = withPolicy(PAGE);
    expect(withPolicy(once)).toBe(once);
  });

  it('refuses a page without a charset to follow', () => {
    expect(() => withPolicy('<html><head></head></html>')).toThrow();
  });
});

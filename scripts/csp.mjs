// SPDX-License-Identifier: MIT
/**
 * The Content Security Policy of each built page.
 *
 * A page may run only the scripts it was built with: every inline script
 * in the page is allowed by the SHA-256 of its own text, and nothing
 * inline is allowed otherwise. Scripts and every other resource come
 * from this site, except Cloudflare Web Analytics, the one outside
 * service the privacy policy names for visitors. Styles may be inline,
 * because pages set sizes in style attributes; a style cannot run code.
 *
 * The policy is written into each page as a `<meta>` element, because
 * GitHub Pages sets no headers. What a `<meta>` policy cannot carry
 * (frame-ancestors, and the other security headers) is set by a
 * Cloudflare response header rule: see the release runbook.
 */
import { createHash } from 'node:crypto';

/** The one outside service a page may load a script from and report to. */
export const ANALYTICS_SCRIPT_ORIGIN = 'https://static.cloudflareinsights.com';
export const ANALYTICS_REPORT_ORIGIN = 'https://cloudflareinsights.com';

const SCRIPT = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
const TYPE = /\btype\s*=\s*["']?([^"'\s>]+)/i;
const SOURCE = /\bsrc\s*=/i;
/** Script types a browser runs; any other (JSON-LD, for one) is data. */
const RUN_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript']);
const CHARSET_META = /<meta charSet="utf-8"\s*\/?>/i;
const POLICY_META = /<meta http-equiv="Content-Security-Policy" content="[^"]*"\s*\/?>/i;

/** The text of each inline script a browser would run in `html`. */
export function inlineScripts(html) {
  const scripts = [];
  for (const [, attributes = '', body] of html.matchAll(SCRIPT)) {
    if (SOURCE.test(attributes)) continue;
    const type = (TYPE.exec(attributes)?.[1] ?? '').toLowerCase();
    if (!RUN_TYPES.has(type)) continue;
    scripts.push(body);
  }
  return scripts;
}

/** The CSP source that allows exactly `script`. */
export function scriptHash(script) {
  return `'sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}'`;
}

/** The policy for a page whose inline scripts are `scripts`. */
export function policyFor(scripts) {
  const hashes = [...new Set(scripts.map(scriptHash))].sort();
  return [
    "default-src 'self'",
    `script-src 'self' ${[...hashes, ANALYTICS_SCRIPT_ORIGIN].join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${ANALYTICS_REPORT_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/**
 * `html` with its policy as the first element after its charset, where
 * the browser reads it before any script. A policy already there is
 * replaced.
 *
 * @throws Error when the page has no `<meta charSet="utf-8">` to follow.
 */
export function withPolicy(html) {
  const without = html.replace(POLICY_META, '');
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policyFor(inlineScripts(without))}"/>`;
  const charset = CHARSET_META.exec(without);
  if (!charset) {
    throw new Error('the page has no <meta charSet="utf-8"> to put its policy after');
  }
  const at = charset.index + charset[0].length;
  return without.slice(0, at) + meta + without.slice(at);
}

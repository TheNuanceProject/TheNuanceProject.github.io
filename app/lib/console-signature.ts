// SPDX-License-Identifier: MIT

let logged = false;

/**
 * Console signature (D-10) — a quiet greeting for anyone who opens dev tools.
 *
 * Logged once per page load (guarded against React's double-invoke in
 * development) and a no-op on the server. Purely decorative: nothing here
 * affects rendering or behaviour.
 */
export function logConsoleSignature() {
  if (logged || typeof window === 'undefined') return;
  logged = true;

  const accent = 'color:#d97757;font:600 15px ui-monospace,monospace';
  const muted = 'color:#8a8a8a;font:13px ui-monospace,monospace';

  console.log('%c/ the nuance project', accent);
  console.log(
    '%cBuilt by Shahin. The site is open source \u2014 github.com/TheNuanceProject',
    muted,
  );
}

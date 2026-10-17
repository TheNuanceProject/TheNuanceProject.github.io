// SPDX-License-Identifier: MIT

import { COLOURS, FONT_FAMILIES, TYPE } from '~/lib/design-tokens';

let logged = false;

/**
 * Console signature (D-10): a quiet greeting for anyone who opens dev tools.
 *
 * Logged once per page load (guarded against React's double-invoke in
 * development) and a no-op on the server. Purely decorative: nothing here
 * affects rendering or behaviour.
 */
export function logConsoleSignature() {
  if (logged || typeof window === 'undefined') return;
  logged = true;

  // In the language's mono type; the accent and the meta colour read on a
  // light or a dark console alike.
  const mono = FONT_FAMILIES.mono.map((family) => (family.includes(' ') ? `'${family}'` : family)).join(',');
  const font = (style: keyof typeof TYPE) => `font:${TYPE[style].weight} ${TYPE[style].size}px ${mono}`;
  const accent = `color:${COLOURS.light.accent};${font('mono-lg')}`;
  const muted = `color:${COLOURS.dark['text-tertiary']};${font('mono')}`;

  console.log('%c/ the nuance project', accent);
  console.log(
    '%cBuilt by Shahin. The site is open source: github.com/TheNuanceProject',
    muted,
  );
}

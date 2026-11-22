// SPDX-License-Identifier: MIT
/**
 * The classes of a link in running text, the same on every page: the
 * text's own colour over a hairline, which turns to the accent on hover
 * (`claude/NUANCE_DESIGN_LANGUAGE.md`, section 13, Link).
 */
export const PROSE_LINK = 'text-text border-b border-divider hover:border-accent-strong transition-colors duration-(--duration-fast) no-underline';

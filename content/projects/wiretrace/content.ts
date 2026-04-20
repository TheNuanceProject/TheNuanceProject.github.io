// SPDX-License-Identifier: MIT
/**
 * WireTrace — page-specific content.
 *
 * This file holds content that appears ONLY on the WireTrace page:
 * features, specifications, keyboard shortcuts. Co-located with the
 * page itself so updates stay in one folder.
 *
 * Cross-page metadata (name, version, URLs, taglines) lives in
 * src/config/site.config.ts because it appears in multiple places.
 */

export interface FeatureItem {
  readonly title: string;
  readonly description: string;
}

export interface SpecRow {
  readonly property: string;
  readonly value: string;
}

export interface ShortcutRow {
  readonly action: string;
  readonly keys: string;
}

export const features: readonly FeatureItem[] = [
  {
    title: 'Multi-device tabs',
    description:
      'Each connected device runs in its own tab, isolated from the others. Switching between tabs does not interrupt data capture on any of them.',
  },
  {
    title: 'Buffered logging',
    description:
      'A separate thread writes to disk on a schedule. The read path is never blocked. The disk log captures every line received, regardless of what is shown in the live view.',
  },
  {
    title: 'Search and live filter',
    description:
      'Search captured data with forward and backward navigation. Filter the live view by substring without affecting what is written to disk.',
  },
  {
    title: 'Structured CSV export',
    description:
      'Two modes. Auto-detect identifies common patterns in the data — key:value pairs and JSON-shaped lines — and pivots them into named columns. Raw mode writes a two-column file with timestamps and lines.',
  },
  {
    title: 'Severity tagging',
    description:
      'Each line is automatically tagged based on its content as one of CRITICAL, ERROR, WARNING, INFO, DEBUG, COMMAND, or DATA. Tags are color-coded in the console.',
  },
  {
    title: 'Command console',
    description:
      'Send commands back to the connected device, with a recallable command history.',
  },
  {
    title: 'Two themes',
    description:
      'Studio Light and Midnight Dark, switchable from preferences.',
  },
];

export const specs: readonly SpecRow[] = [
  { property: 'Sustained throughput', value: '10,000+ lines per second' },
  { property: 'Cold startup', value: 'Under 2 seconds' },
  { property: 'Memory per tab (idle)', value: 'Under 15 MB' },
  {
    property: 'Supported baud rates',
    value: '50 to 4,000,000 (custom values typed)',
  },
  { property: 'Display modes', value: 'Text, hex' },
  {
    property: 'Export formats',
    value: 'Plain text, CSV (auto-detect or raw)',
  },
  { property: 'Themes', value: 'Studio Light, Midnight Dark' },
  { property: 'Platforms', value: 'Windows 10+ (64-bit)' },
];

export const shortcuts: readonly ShortcutRow[] = [
  { action: 'New tab', keys: 'Ctrl+T' },
  { action: 'Close tab', keys: 'Ctrl+W' },
  { action: 'Start logging', keys: 'Ctrl+N' },
  { action: 'Quick save', keys: 'Ctrl+S' },
  { action: 'Export', keys: 'Ctrl+E' },
  { action: 'Search', keys: 'Ctrl+F' },
  { action: 'Filter', keys: 'Ctrl+L' },
  { action: 'Next match', keys: 'F3' },
  { action: 'Previous match', keys: 'Shift+F3' },
  { action: 'Clear search', keys: 'Escape' },
  { action: 'Preferences', keys: 'Ctrl+,' },
];

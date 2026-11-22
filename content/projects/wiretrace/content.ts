// SPDX-License-Identifier: MIT
/**
 * WireTrace: page-specific content.
 *
 * What appears only on the WireTrace pages: how it works, features,
 * specifications, keyboard shortcuts, the pictures, the one-line summary
 * of each release, and where the usage page reads its figures. Every
 * value is read from the WireTrace 2.1 code (`app/constants.py`,
 * `ui/shortcuts.py`) and every claim is held by one of its tests.
 *
 * Cross-page metadata (name, version, links, taglines) lives in
 * `meta.ts` beside this file.
 */
import { siteConfig } from '~/config/site.config';

export interface FeatureItem {
  readonly title: string;
  readonly description: string;
  /** A picture shown after this feature. */
  readonly screenshot?: ScreenshotName;
}

export interface SpecRow {
  readonly property: string;
  readonly value: string;
}

export interface ShortcutRow {
  readonly action: string;
  readonly keys: string;
}

export interface HowItWorksItem {
  readonly title: string;
  readonly text: string;
  /** A page of the site that shows what the text says, linked after it. */
  readonly link?: { readonly label: string; readonly path: string };
}

/**
 * The pictures of WireTrace, each made in a light and a dark version
 * by WireTrace's own `tools/make_site_screenshots.py`, and shown in the
 * version that matches the site's theme.
 */
export const screenshots = {
  session: {
    alt: 'WireTrace with three device tabs. The motor controller tab is logging, and its console shows timestamped lines with warning and error levels in colour.',
  },
  'first-screen': {
    alt: 'A new WireTrace tab listing three serial ports it found, with a baud rate and a Connect button.',
  },
  plot: {
    alt: 'The live plot under the console: four values in panels by scale, with cursors A and B measuring a load step.',
  },
  'connection-lost': {
    alt: 'A bar across the tab says the connection to COM7 was lost and the log was closed, with buttons to open the log folder, export the session and connect again.',
  },
} as const;

export type ScreenshotName = keyof typeof screenshots;

/** The width and height every picture is made at. */
export const SCREENSHOT_SIZE = { width: 1280, height: 760 } as const;

/** Where a picture is served, in the given theme. */
export function screenshotPath(name: ScreenshotName, theme: 'light' | 'dark'): string {
  return `/images/wiretrace/wiretrace-${name}-${theme}.png`;
}

export const howItWorks: readonly HowItWorksItem[] = [
  {
    title: 'The log comes first',
    text: 'Every line goes from the port to the log without waiting for the screen, so a busy window never slows a capture.',
  },
  {
    title: 'One timestamp',
    text: 'A line is stamped once, when it arrives. The console, the log, the CSV and the plot all use that stamp.',
  },
  {
    title: 'The session is always recorded',
    text: 'From the moment a device connects, everything it sends is recorded, and the most recent 1 GB of each tab is kept. It can be exported at any time, whether or not a log was running.',
  },
  {
    title: 'Nothing is lost quietly',
    text: 'On disconnect, on an unplugged device and on closing, everything waiting is written before the result is reported. If a disk cannot keep up or fails, WireTrace states how many lines were not written and marks the place in the file.',
  },
  {
    title: 'Measured on every release',
    text: "Each release is measured on GitHub's machines as it is built, and on a test computer through two joined serial ports: how many lines a second WireTrace takes in, the processor and memory it uses, and how long it takes to start. Every line sent is checked to arrive, in order, once.",
    link: { label: 'The benchmarks', path: '/projects/wiretrace/benchmarks/' },
  },
];

export const features: readonly FeatureItem[] = [
  {
    title: 'Multi-device tabs',
    description:
      'One tab per device, each with its own connection, console, log and plot. Switching tabs interrupts nothing. Each port remembers its baud rate, line settings, line ending, plot profile, where its plot window was and its tab name.',
  },
  {
    title: 'Automatic port list',
    description:
      'A new tab opens on a list of serial ports that updates by itself. Plug a device in and it appears.',
    screenshot: 'first-screen',
  },
  {
    title: 'Reconnect',
    description:
      'When a board is unplugged or resets its USB connection, the tab waits for the same board and carries on with the same session and the same log once it is back.',
  },
  {
    title: 'Port settings and control lines',
    description:
      'Data bits, parity, stop bits and flow control for each port, used each time it connects. While connected, set DTR and RTS, send a break, and watch CTS, DSR, DCD and RI in the status bar.',
  },
  {
    title: 'Reliable logging',
    description:
      'Plain-text logs, with a CSV file beside them when you want one. Pause and resume in the same file. The end of a log is never dropped.',
  },
  {
    title: 'Export session',
    description:
      'Save what was received since you connected, up to the most recent 1 GB, as text, CSV or both. It works without a log running, and after the device has gone.',
  },
  {
    title: 'Remembered log folder',
    description:
      'A new log is offered the folder you last logged to, in every tab, so a log is always where you expect it.',
  },
  {
    title: 'Maximum log file size',
    description:
      'A log that reaches the size you set continues in a new file, numbered _002, _003 and so on. A line is never cut, so a capture of any length stays easy to open.',
  },
  {
    title: 'Levels and colours',
    description:
      'Every line is given a level: Critical, Error, Warning, Info, Debug, Command or Data. ESP-IDF, Zephyr and bracketed level markers are recognised exactly. One click filters by level, with a count on each.',
  },
  {
    title: 'Highlights and ANSI colours',
    description:
      "Draw the lines you are watching for in a colour of their own, and show text the device colours with ANSI codes in the theme's own colours. Logs stay plain.",
  },
  {
    title: 'Filter and find',
    description:
      'Show only the lines that contain a text, or search and step through the matches. Neither changes what is written to disk.',
  },
  {
    title: 'Timestamps',
    description:
      'Each line shows the date and time it arrived, to the millisecond, exactly as the log writes it; or the time of day, or the time since the previous line.',
  },
  {
    title: 'Text and HEX',
    description:
      'View received data as lines of text, or as bytes laid out as hexdump -C lays them out: the offset, sixteen bytes in two groups of eight, and the printable characters. Every character is shown exactly as the device sent it.',
  },
  {
    title: 'Live plot',
    description:
      'WireTrace finds the numbers in JSON, key: value pairs and delimited values and draws them as they arrive, in a window of its own or under the console. For any other format, describe the line with a pattern and save it as a profile. The plot holds the whole session. Measure between two cursors that stop on samples, group values into panels by scale, and save the chart as PNG or SVG or its values as CSV.',
    screenshot: 'plot',
  },
  {
    title: 'Restart detection and the session report',
    description:
      "ESP32 resets and Zephyr boot banners are recognised and marked in the console, the log and exports. The session report counts a session's lines, errors, lost connections and restarts exactly.",
  },
  {
    title: 'Alerts',
    description:
      "A banner, the system's sound and, if you choose, a desktop notification on new error lines, a lost connection or a board gone quiet. Alerts from several tabs at once give one sound.",
  },
  {
    title: 'Commands',
    description:
      'Send commands to the device with the line ending it expects. A history and up to 20 saved commands, the first nine on shortcuts.',
  },
  {
    title: 'Clear messages',
    description:
      'A lost connection or a disk problem is reported in a bar across the tab that stays until it is dealt with.',
    screenshot: 'connection-lost',
  },
  {
    title: 'Features you choose',
    description:
      'The live plot, restart detection, the session report, alerts, highlights and ANSI colours can each be switched off in Preferences. A feature that is off adds nothing to the window.',
  },
  {
    title: 'Light, Dark and System themes',
    description: 'System follows your computer and is the default.',
  },
  {
    title: 'Verified updates',
    description:
      "WireTrace checks for a new version when it starts and every 12 hours while it is open. A new version is accepted only if it carries a valid signature, and installed only when you choose; until then it stays offered in the status bar. Help returns to the previous version, verified the same way.",
  },
  {
    title: 'Diagnostic log',
    description:
      "WireTrace keeps a log of its own events, never device data, on your computer and never sends it. Help copies a summary to paste into a report.",
  },
];

export const specs: readonly SpecRow[] = [
  { property: 'Baud rates', value: '50 to 4,000,000, any whole number' },
  {
    property: 'Connection',
    value:
      '5 to 8 data bits; no, even or odd parity (mark and space on Windows and Linux); 1 or 2 stop bits (1.5 on Windows); no flow control, RTS/CTS or XON/XOFF. 8N1 by default',
  },
  { property: 'Display modes', value: 'Text, HEX' },
  { property: 'Log and export formats', value: 'Text, CSV' },
  { property: 'Plot export', value: 'PNG, SVG, CSV' },
  { property: 'Session recording', value: 'Up to 1 GB a tab' },
  { property: 'Maximum log file size', value: '100 MB by default, up to 4,096 MB, or off' },
  {
    property: 'Console',
    value: 'The most recent 100,000 lines by default; older lines stay in the session recording, and in the log while one is running',
  },
  { property: 'Themes', value: 'Light, Dark, System' },
  { property: 'Windows', value: 'Windows 10 version 1809 and later, 64-bit' },
  { property: 'Linux', value: 'x86-64, glibc 2.35 and later (Ubuntu 22.04 and later)' },
  { property: 'macOS', value: 'From source' },
];

export const shortcuts: readonly ShortcutRow[] = [
  { action: 'New tab', keys: 'Ctrl+T' },
  { action: 'Close tab', keys: 'Ctrl+W' },
  { action: 'Rename tab', keys: 'F2' },
  { action: 'Refresh ports', keys: 'F5' },
  { action: 'Start log', keys: 'Ctrl+N' },
  { action: 'Export session', keys: 'Ctrl+S' },
  { action: 'Copy', keys: 'Ctrl+C' },
  { action: 'Copy without timestamps', keys: 'Ctrl+Shift+C' },
  { action: 'Select all', keys: 'Ctrl+A' },
  { action: 'Find', keys: 'Ctrl+F' },
  { action: 'Find next / previous', keys: 'F3 / Shift+F3' },
  { action: 'Filter lines', keys: 'Ctrl+L' },
  { action: 'Close Find and clear the filter', keys: 'Esc' },
  { action: 'Live plot', keys: 'Ctrl+P' },
  { action: 'Larger / smaller / reset text', keys: 'Ctrl++ / Ctrl+- / Ctrl+0' },
  { action: 'Saved commands 1 to 9', keys: 'Ctrl+1 to Ctrl+9' },
  { action: 'Preferences', keys: 'Ctrl+,' },
  { action: 'User guide', keys: 'F1' },
  { action: 'Exit', keys: 'Ctrl+Q' },
];

/** One line on each release, shown in the releases timeline beside the
 *  date GitHub gives. A release without one shows its date alone. */
export const releaseSummaries: Readonly<Record<string, string>> = {
  '2.1.0':
    'Reconnect to the same board, the whole session in the plot, alerts, restart detection and the session report, line settings. Every new feature can be switched off.',
  '2.0.0':
    'Rebuilt from the port to the disk. Nothing lost on disconnect, sessions that can always be exported, a new interface, verified updates.',
  '1.2.0': 'Linux builds, safer saving of preferences, disconnect fixes.',
  '1.1.0': 'The live plotter.',
  '1.0.0': 'First release.',
};

/** The usage page: where it is, and the update server's public summary
 *  it is built from. */
export const usage = {
  path: '/projects/wiretrace/usage',
  summaryUrl: `${siteConfig.identity.url}/updates/wiretrace/summary.json`,
} as const;

/** The benchmarks page: where it is, and the tool, as a path in
 *  WireTrace's repository, linked at the release the page describes. The
 *  test computer's own report is kept beside this file
 *  (`RELEASE_RUNBOOK.md`, stage 3). */
export const benchmarks = {
  path: '/projects/wiretrace/benchmarks',
  script: 'tools/benchmark.py',
} as const;

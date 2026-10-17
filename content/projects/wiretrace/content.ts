// SPDX-License-Identifier: MIT
/**
 * WireTrace: page-specific content.
 *
 * What appears only on the WireTrace pages: how it works, features,
 * specifications, keyboard shortcuts, the pictures, the one-line summary
 * of each release, and where the usage page reads its figures. Every
 * value is read from the WireTrace 2.0 code (`app/constants.py`,
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
}

/**
 * The pictures of WireTrace 2.0, each made in a light and a dark version
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
    title: 'Three jobs, kept apart',
    text: 'Reading the port, writing the log and drawing the window run separately. The log goes straight from the port to the disk and never waits for the screen.',
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
    title: 'Proven on every change',
    text: 'A test sends 200,000 lines from port to log file and requires all of them, in order, at ten thousand lines a second or faster. More than 2,700 automated tests run before anything is released.',
  },
];

export const features: readonly FeatureItem[] = [
  {
    title: 'Multi-device tabs',
    description:
      'One tab per device, each with its own connection, console, log and plot. Switching tabs interrupts nothing. Each port remembers its baud rate, line ending, plot profile and tab name.',
  },
  {
    title: 'Automatic port list',
    description:
      'A new tab opens on a list of serial ports that updates by itself. Plug a device in and it appears.',
    screenshot: 'first-screen',
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
    title: 'Filter and find',
    description:
      'Show only the lines that contain a text, or search and step through the matches. Neither changes what is written to disk.',
  },
  {
    title: 'Text and HEX',
    description:
      'View received data as lines of text, or as bytes laid out as hexdump -C lays them out: the offset, sixteen bytes in two groups of eight, and the printable characters. Every character is shown exactly as the device sent it.',
  },
  {
    title: 'Live plot',
    description:
      'WireTrace finds the numbers in JSON, key: value pairs and delimited values and draws them as they arrive. For any other format, describe the line with a pattern and save it as a profile. Point at a chart to read the values at that moment. Measure between two cursors that stop on samples, with the time between them and the change in each value; group values into panels by scale, or move the plot to its own window.',
    screenshot: 'plot',
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
    title: 'Light, Dark and System themes',
    description: 'System follows your computer and is the default.',
  },
  {
    title: 'Verified updates',
    description:
      "WireTrace checks for a new version when it starts and every 12 hours while it is open. A new version is accepted only if it carries a valid signature, and installed only when you choose.",
  },
];

export const specs: readonly SpecRow[] = [
  { property: 'Throughput, port to log file', value: '10,000 lines per second, held by test' },
  { property: 'Baud rates', value: '50 to 4,000,000, any whole number' },
  { property: 'Connection', value: '8 data bits, no parity, 1 stop bit' },
  { property: 'Display modes', value: 'Text, HEX' },
  { property: 'Log and export formats', value: 'Text, CSV' },
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

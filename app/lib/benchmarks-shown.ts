// SPDX-License-Identifier: MIT
/**
 * How the benchmarks page writes a measurement: its median, and its
 * lowest and highest only when the runs differ as written, so that a
 * range never reads "160 MB to 160 MB".
 */
import { type LoadKind, type Measurement, type MeasurementKey } from './build-data/benchmarks';

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const twoDecimals = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A megabyte, as the page writes sizes: a million bytes. */
const MEGABYTE = 1_000_000;

const lines = (v: number): string => number.format(v);
const rate = (v: number): string => `${oneDecimal.format(v / MEGABYTE)} MB/s`;
const share = (v: number): string => `${oneDecimal.format(v)} %`;
const memory = (v: number): string => `${number.format(v / MEGABYTE)} MB`;
const seconds = (v: number): string => `${twoDecimals.format(v)} s`;

const FIXED: Readonly<Record<string, (value: number) => string>> = {
  capacity_lines: lines,
  pty_lines: lines,
  pair_lines: lines,
  capacity_bytes: rate,
  pty_bytes: rate,
  pair_bytes: rate,
  idle_processor: share,
  idle_memory: memory,
  console_full_memory: memory,
  start: seconds,
};

const LOAD: Readonly<Record<LoadKind, (value: number) => string>> = {
  processor: share,
  memory,
  sent: lines,
};

const LOAD_KEY = /^load_\d+_(processor|memory|sent)$/;

/** How a value of the measurement `key` is written. */
export function shownOf(key: MeasurementKey): (value: number) => string {
  const kind = LOAD_KEY.exec(key)?.[1] as LoadKind | undefined;
  if (kind !== undefined) return LOAD[kind];
  const shown = FIXED[key];
  if (shown === undefined) {
    throw new RangeError(`the measurement ${key} has no way to be written`);
  }
  return shown;
}

/** A measurement as written: its median, and its lowest and highest when
 *  they differ as written, or null. */
export function shownMeasurement(
  key: MeasurementKey, value: Measurement,
): { median: string; range: { lowest: string; highest: string } | null } {
  const shown = shownOf(key);
  const lowest = shown(value.lowest);
  const highest = shown(value.highest);
  return { median: shown(value.median), range: lowest === highest ? null : { lowest, highest } };
}

// SPDX-License-Identifier: MIT
/**
 * WireTrace's benchmarks, as the benchmarks page reads them.
 *
 * WireTrace's benchmark tool (`tools/benchmark.py` in its repository)
 * writes one file per machine; the release workflow joins the files of
 * GitHub's machines into the `benchmarks.json` it publishes with each
 * release, and the test computer's file is kept in this repository.
 * Nothing in them is trusted: `readBenchmarks` and `readMachineReport`
 * accept only exactly the fields and values the tool writes, for the
 * version and commit given, with no failed measurement, and refuse the
 * whole file otherwise, so the build stops instead of publishing
 * anything unexpected.
 */

/** The file format the tool writes. */
export const BENCHMARK_FORMAT = 1;

/** How each measurement is written: its unit, as the tool names it. The
 *  load's measurements are named by the rates of the report's method
 *  (`loadKeys`). */
const FIXED_UNITS = {
  capacity_lines: 'lines/s',
  capacity_bytes: 'bytes/s',
  pty_lines: 'lines/s',
  pty_bytes: 'bytes/s',
  pair_lines: 'lines/s',
  pair_bytes: 'bytes/s',
  idle_processor: '% of one processor',
  idle_memory: 'bytes',
  console_full_memory: 'bytes',
  start: 's',
} as const;

const LOAD_UNITS = {
  processor: '% of one processor',
  memory: 'bytes',
  sent: 'lines/s',
} as const;

export type FixedKey = keyof typeof FIXED_UNITS;
export type LoadKind = keyof typeof LOAD_UNITS;
/** A measurement's name in a report: one of the fixed ones, or one of the
 *  load at a rate of the method, `load_<rate>_<kind>`. */
export type MeasurementKey = FixedKey | `load_${number}_${LoadKind}`;

/** The name of the load's measurement of `kind` at `rate` lines a second. */
export function loadKey(rate: number, kind: LoadKind): MeasurementKey {
  return `load_${rate}_${kind}`;
}

/** What every run of the tool does, as the report states it. */
export interface BenchmarkMethod {
  /** Lines fed straight into a tab. */
  readonly capacityLines: number;
  /** Lines sent through a pseudo-terminal or two joined ports. */
  readonly linesThrough: number;
  /** Tabs connected during the load, and each tab's rates, in lines a second. */
  readonly loadTabs: number;
  readonly loadRates: readonly number[];
  /** How long processor and memory use are measured, in seconds. */
  readonly measureSeconds: number;
  /** The off-screen display drawn on, in pixels. */
  readonly display: { readonly width: number; readonly height: number };
}

/** One measurement on one machine, over every run. */
export interface Measurement {
  readonly median: number;
  readonly lowest: number;
  readonly highest: number;
}

/** The computer a report was measured on, as the tool describes it. */
export interface BenchmarkMachine {
  readonly name: string;
  readonly system: string;
  readonly processor: string;
  readonly processorsSeen: number;
  /** The processors the process may use, when the system says. */
  readonly processorsUsable: number | null;
  /** A container's limit on processors, when there is one. */
  readonly containerProcessorLimit: number | null;
  readonly memoryBytes: number;
  readonly containerMemoryLimit: number | null;
  /** GitHub's runner image and its version, on GitHub's machines. */
  readonly runnerImage: string | null;
  readonly runnerImageVersion: string | null;
  readonly python: string;
  readonly pyside6: string;
  readonly qt: string;
}

/** What one machine measured. */
export interface MachineReport {
  readonly machine: BenchmarkMachine;
  /** When the measuring finished, ISO 8601 in UTC. */
  readonly measuredAt: string;
  readonly runs: number;
  /** One line the measurements send, as an example. */
  readonly lineExample: string;
  readonly method: BenchmarkMethod;
  readonly measurements: Readonly<Partial<Record<MeasurementKey, Measurement>>>;
}

export class BenchmarksError extends Error {
  override readonly name = 'BenchmarksError';
}

type Fields = Record<string, unknown>;

function fields(value: unknown, what: string, keys: readonly string[]): Fields {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BenchmarksError(`${what} is not an object`);
  }
  const found = Object.keys(value).sort();
  const wanted = [...keys].sort();
  if (found.length !== wanted.length || found.some((key, index) => key !== wanted[index])) {
    throw new BenchmarksError(`${what} holds ${found.join(', ')}, not ${wanted.join(', ')}`);
  }
  return value as Fields;
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 200) {
    throw new BenchmarksError(`${what} is not a short text`);
  }
  return value;
}

function textOrNull(value: unknown, what: string): string | null {
  return value === null ? null : text(value, what);
}

/** A name the machine itself gives, which it may leave empty: the tool
 *  writes the runner's `ImageOS` and `ImageVersion` as the machine sets
 *  them, and GitHub's ubuntu-slim machine sets both to an empty text. An
 *  empty text names nothing, as null does. */
function givenNameOrNull(value: unknown, what: string): string | null {
  return value === '' ? null : textOrNull(value, what);
}

function count(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new BenchmarksError(`${what} is not a whole number from 1`);
  }
  return value;
}

function countOrNull(value: unknown, what: string): number | null {
  return value === null ? null : count(value, what);
}

function amount(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new BenchmarksError(`${what} is not a number from 0`);
  }
  return value;
}

/** Any positive number: a container may allow part of a processor. */
function limitOrNull(value: unknown, what: string): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new BenchmarksError(`${what} is not a number above 0`);
  }
  return value;
}

const MACHINE_KEYS = [
  'name', 'system', 'processor', 'processors_seen', 'processors_usable', 'container_processor_limit',
  'memory_bytes', 'container_memory_limit', 'runner_image', 'runner_image_version', 'python', 'pyside6', 'qt',
] as const;

function readMachine(value: unknown): BenchmarkMachine {
  const m = fields(value, 'the machine', MACHINE_KEYS);
  return {
    name: text(m.name, 'the machine name'),
    system: text(m.system, 'the system'),
    processor: text(m.processor, 'the processor'),
    processorsSeen: count(m.processors_seen, 'the processors seen'),
    processorsUsable: countOrNull(m.processors_usable, 'the processors usable'),
    containerProcessorLimit: limitOrNull(m.container_processor_limit, 'the container processor limit'),
    memoryBytes: count(m.memory_bytes, 'the memory'),
    containerMemoryLimit: limitOrNull(m.container_memory_limit, 'the container memory limit'),
    runnerImage: givenNameOrNull(m.runner_image, 'the runner image'),
    runnerImageVersion: givenNameOrNull(m.runner_image_version, 'the runner image version'),
    python: text(m.python, 'the Python version'),
    pyside6: text(m.pyside6, 'the PySide6 version'),
    qt: text(m.qt, 'the Qt version'),
  };
}

/** The unit of the measurement `key` in a report of `method`, or null
 *  for a measurement the page does not show. */
function unitOf(key: string, method: BenchmarkMethod): string | null {
  if (Object.hasOwn(FIXED_UNITS, key)) {
    return FIXED_UNITS[key as FixedKey];
  }
  for (const rate of method.loadRates) {
    for (const kind of Object.keys(LOAD_UNITS) as LoadKind[]) {
      if (key === loadKey(rate, kind)) return LOAD_UNITS[kind];
    }
  }
  return null;
}

function readMeasurement(key: string, unit: string, value: unknown, runs: number): Measurement {
  const what = `the measurement ${key}`;
  const m = fields(value, what, ['title', 'unit', 'values', 'median', 'lowest', 'highest']);
  text(m.title, `${what}'s title`);
  if (m.unit !== unit) {
    throw new BenchmarksError(`${what} is in ${String(m.unit)}, not ${unit}`);
  }
  if (!Array.isArray(m.values) || m.values.length !== runs) {
    throw new BenchmarksError(`${what} does not hold one value for each of the ${runs} runs`);
  }
  const values = m.values.map((each, index) => amount(each, `${what}, run ${index + 1}`));
  const sorted = [...values].sort((a, b) => a - b);
  const at = (index: number): number => sorted[index] as number;
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? at(middle) : (at(middle - 1) + at(middle)) / 2;
  const measurement = {
    median: amount(m.median, `${what}'s median`),
    lowest: amount(m.lowest, `${what}'s lowest`),
    highest: amount(m.highest, `${what}'s highest`),
  };
  if (measurement.median !== median || measurement.lowest !== at(0) || measurement.highest !== at(sorted.length - 1)) {
    throw new BenchmarksError(`${what}'s median, lowest and highest are not those of its values`);
  }
  return measurement;
}

const REPORT_KEYS = [
  'format', 'wiretrace', 'commit', 'measured_at', 'runs', 'line', 'machine', 'method', 'measurements', 'not_measured',
  'failures',
] as const;

function readMethod(value: unknown): BenchmarkMethod {
  const m = fields(value, 'the method', [
    'capacity_lines', 'lines_through', 'load_tabs', 'load_rates', 'measure_seconds', 'display',
  ]);
  if (!Array.isArray(m.load_rates) || m.load_rates.length === 0) {
    throw new BenchmarksError('the method names no load rate');
  }
  const loadRates = m.load_rates.map((rate, index) => count(rate, `the load rate ${index + 1}`));
  if (loadRates.some((rate, index) => index > 0 && rate <= (loadRates[index - 1] as number))) {
    throw new BenchmarksError('the load rates are not in rising order');
  }
  const measureSeconds = amount(m.measure_seconds, 'the seconds measured');
  if (measureSeconds === 0) {
    throw new BenchmarksError('the seconds measured are none');
  }
  const display = fields(m.display, 'the display', ['width', 'height']);
  return {
    capacityLines: count(m.capacity_lines, 'the lines fed into a tab'),
    linesThrough: count(m.lines_through, 'the lines sent through'),
    loadTabs: count(m.load_tabs, 'the tabs of the load'),
    loadRates,
    measureSeconds,
    display: { width: count(display.width, "the display's width"), height: count(display.height, "the display's height") },
  };
}

/** Whether two reports describe the same method. */
export function sameMethod(a: BenchmarkMethod, b: BenchmarkMethod): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
const MEASURED_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$/;
const COMMIT = /^[0-9a-f]{40}$/;

function readHeader(value: Fields, what: string, version: string, commit: string | null): string {
  if (value.format !== BENCHMARK_FORMAT) {
    throw new BenchmarksError(`${what} is not in format ${BENCHMARK_FORMAT}`);
  }
  if (value.wiretrace !== version) {
    throw new BenchmarksError(`${what} measured WireTrace ${String(value.wiretrace)}, not ${version}`);
  }
  if (typeof value.commit !== 'string' || !COMMIT.test(value.commit)) {
    throw new BenchmarksError(`${what} names no commit`);
  }
  if (commit !== null && value.commit !== commit) {
    throw new BenchmarksError(`${what} measured commit ${value.commit}, not ${commit}`);
  }
  return value.commit;
}

/**
 * One machine's report, as the tool writes it with `--output`.
 *
 * @param commit The commit it must have measured; null to accept the
 *   report's own.
 * @throws BenchmarksError for anything the tool does not write, another
 *   version or commit, or a failed measurement.
 */
export function readMachineReport(value: unknown, version: string, commit: string | null): MachineReport {
  const r = fields(value, 'the report', REPORT_KEYS);
  readHeader(r, 'the report', version, commit);
  if (typeof r.measured_at !== 'string' || !MEASURED_AT.test(r.measured_at) || Number.isNaN(Date.parse(r.measured_at))) {
    throw new BenchmarksError('the report names no time it was measured');
  }
  const runs = count(r.runs, 'the runs');
  const line = fields(r.line, 'the line', ['example', 'format']);
  text(line.format, "the line's format");
  if (!Array.isArray(r.failures)) {
    throw new BenchmarksError('the failures are not a list');
  }
  if (r.failures.length > 0) {
    throw new BenchmarksError(`the report of ${String((r.machine as Fields | null)?.name)} holds failures: ${r.failures.join('; ')}`);
  }
  const machine = readMachine(r.machine);
  const method = readMethod(r.method);
  const given = r.measurements;
  if (typeof given !== 'object' || given === null || Array.isArray(given)) {
    throw new BenchmarksError('the measurements are not an object');
  }
  const measurements: Partial<Record<MeasurementKey, Measurement>> = {};
  for (const [key, entry] of Object.entries(given)) {
    const unit = unitOf(key, method);
    if (unit === null) {
      throw new BenchmarksError(`the measurement ${key} is not one the page shows`);
    }
    measurements[key as MeasurementKey] = readMeasurement(key, unit, entry, runs);
  }
  const notMeasured = r.not_measured;
  if (typeof notMeasured !== 'object' || notMeasured === null || Array.isArray(notMeasured)) {
    throw new BenchmarksError('the measurements not made are not an object');
  }
  for (const [key, reason] of Object.entries(notMeasured)) {
    text(reason, `the reason ${key} was not measured`);
  }
  return {
    machine,
    measuredAt: r.measured_at,
    runs,
    lineExample: text(line.example, "the line's example"),
    method,
    measurements,
  };
}

/** A release's `benchmarks.json`: every machine's report, for one
 *  version and commit. */
export interface ReleaseBenchmarks {
  readonly commit: string;
  /** GitHub's machines, at least one. */
  readonly machines: readonly [MachineReport, ...MachineReport[]];
}

/**
 * The `benchmarks.json` of a release, as the release workflow joins it.
 *
 * @throws BenchmarksError as `readMachineReport` does, for an empty file,
 *   for two machines of one name, or for machines measured in different
 *   ways.
 */
export function readBenchmarks(value: unknown, version: string): ReleaseBenchmarks {
  const b = fields(value, 'benchmarks.json', ['format', 'wiretrace', 'commit', 'machines']);
  const commit = readHeader(b, 'benchmarks.json', version, null);
  if (!Array.isArray(b.machines) || b.machines.length === 0) {
    throw new BenchmarksError('benchmarks.json holds no machine');
  }
  const [head, ...rest] = b.machines.map((each) => readMachineReport(each, version, commit)) as [MachineReport, ...MachineReport[]];
  const machines: [MachineReport, ...MachineReport[]] = [head, ...rest];
  const names = new Set(machines.map((each) => each.machine.name));
  if (names.size !== machines.length) {
    throw new BenchmarksError('benchmarks.json names a machine twice');
  }
  if (rest.some((each) => !sameMethod(each.method, head.method))) {
    throw new BenchmarksError('the machines of benchmarks.json were measured in different ways');
  }
  return { commit, machines };
}

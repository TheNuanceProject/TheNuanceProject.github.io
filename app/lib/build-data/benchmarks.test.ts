// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';

import { BenchmarksError, readBenchmarks, readMachineReport } from './benchmarks';
import fromTheTool from './fixtures/benchmarks-from-the-tool.json';
import ofTheRelease from './fixtures/benchmarks-of-wiretrace-2.2.0.json';

const VERSION = '2.2.0';
const COMMIT = 'b87cd947c843c566c6b84e2c2eb29afa7a65c7b8';

const UNITS: Record<string, string> = {
  capacity_lines: 'lines/s',
  idle_processor: '% of one processor',
  start: 's',
  load_1000_sent: 'lines/s',
  load_1000_processor: '% of one processor',
};

const METHOD = {
  capacity_lines: 200_000,
  lines_through: 100_000,
  load_tabs: 2,
  load_rates: [1000, 10_000],
  measure_seconds: 10,
  display: { width: 2560, height: 1440 },
};

function measurement(key: string, values: number[]): Record<string, unknown> {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    title: key,
    unit: UNITS[key],
    values,
    median: sorted.length % 2 ? sorted[middle] : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2,
    lowest: sorted[0],
    highest: sorted[sorted.length - 1],
  };
}

/** A machine's report as the tool writes it, with `changes` over it. */
function report(changes: Record<string, unknown> = {}, name = 'GitHub ubuntu-24.04'): Record<string, unknown> {
  return {
    format: 1,
    wiretrace: VERSION,
    commit: COMMIT,
    measured_at: '2026-11-20T15:48:26+00:00',
    runs: 3,
    line: { example: 'I (0) sensor: temp=20.0 rpm=0 status=ok', format: 'I ({number}) sensor: temp={temp:.1f} rpm={rpm} status=ok' },
    machine: {
      name,
      system: 'Linux-6.11.0-1018-azure-x86_64-with-glibc2.39',
      processor: 'AMD EPYC 7763 64-Core Processor',
      processors_seen: 4,
      processors_usable: 4,
      container_processor_limit: null,
      memory_bytes: 16_772_538_368,
      container_memory_limit: null,
      runner_image: 'ubuntu24',
      runner_image_version: '20261116.1.0',
      python: '3.12.10',
      pyside6: '6.11.2',
      qt: '6.11.2',
    },
    method: METHOD,
    measurements: {
      capacity_lines: measurement('capacity_lines', [180_000, 190_000, 185_000]),
      idle_processor: measurement('idle_processor', [2.5, 2.4, 2.6]),
      start: measurement('start', [1.5, 1.6, 1.55]),
    },
    not_measured: {},
    failures: [],
    ...changes,
  };
}

describe('readMachineReport', () => {
  it('reads a report the tool writes', () => {
    const read = readMachineReport(report(), VERSION, COMMIT);

    expect(read.machine.name).toBe('GitHub ubuntu-24.04');
    expect(read.runs).toBe(3);
    expect(read.measurements.capacity_lines).toEqual({ median: 185_000, lowest: 180_000, highest: 190_000 });
    expect(read.measurements.pty_lines).toBeUndefined();
  });

  it("reads a runner image and its version left empty, as GitHub's ubuntu-slim machine leaves them, as naming none", () => {
    const machine = { ...(report().machine as object), runner_image: '', runner_image_version: '' };
    const read = readMachineReport(report({ machine }), VERSION, COMMIT);

    expect(read.machine.runnerImage).toBeNull();
    expect(read.machine.runnerImageVersion).toBeNull();
  });

  it('reads a measurement that was not made, with its reason', () => {
    const read = readMachineReport(report({ not_measured: { pseudo_terminal: 'this system has no pseudo-terminals' } }), VERSION, COMMIT);

    expect(read.measurements.pty_lines).toBeUndefined();
  });

  it("names the load's measurements by the rates of its method", () => {
    const read = readMachineReport(
      report({ measurements: { load_1000_sent: measurement('load_1000_sent', [2000, 2001, 2000]) } }), VERSION, COMMIT,
    );

    expect(read.method.loadRates).toEqual([1000, 10_000]);
    expect(read.measurements.load_1000_sent?.median).toBe(2000);
    expect(() => readMachineReport(
      report({ measurements: { load_500_sent: measurement('load_1000_sent', [1, 2, 3]) } }), VERSION, COMMIT,
    )).toThrow('is not one the page shows');
  });

  it.each([
    ['another version', { wiretrace: '2.1.0' }],
    ['another format', { format: 2 }],
    ['a failed measurement', { failures: ['run 2, capacity: line 1201 arrived twice'] }],
    ['a field it does not write', { extra: true }],
    ['a measurement the page does not show', { measurements: { made_up: measurement('start', [1]) } }],
    ['a measurement in another unit', { measurements: { start: { ...measurement('start', [1, 2, 3]), unit: 'ms' } } }],
    ['a median that is not its values', { measurements: { start: { ...measurement('start', [1, 2, 3]), median: 1 } } }],
    ['a value short of a run', { measurements: { start: measurement('start', [1, 2]) } }],
    ['no time measured', { measured_at: 'yesterday' }],
    ['no method', { method: undefined }],
    ['a method with no load rate', { method: { ...METHOD, load_rates: [] } }],
    ['load rates out of order', { method: { ...METHOD, load_rates: [10_000, 1000] } }],
    ['a method that measured for no time', { method: { ...METHOD, measure_seconds: 0 } }],
    ['a container limit as the system writes it', { machine: { ...(report().machine as object), container_processor_limit: '100000 100000' } }],
    ['an unlimited container as the system writes it', { machine: { ...(report().machine as object), container_memory_limit: 'max' } }],
    ['an empty machine name', { machine: { ...(report().machine as object), name: '' } }],
    ['a runner image of spaces', { machine: { ...(report().machine as object), runner_image: '  ' } }],
  ])('refuses %s', (_, changes) => {
    expect(() => readMachineReport(report(changes), VERSION, COMMIT)).toThrow(BenchmarksError);
  });

  it('refuses a report of another commit', () => {
    expect(() => readMachineReport(report({ commit: 'a'.repeat(40) }), VERSION, COMMIT)).toThrow(BenchmarksError);
  });
});

describe('readBenchmarks', () => {
  const file = (machines: unknown[]) => ({ format: 1, wiretrace: VERSION, commit: COMMIT, machines });

  it("reads every machine of a release's file", () => {
    const read = readBenchmarks(file([report(), report({}, 'GitHub windows-2022')]), VERSION);

    expect(read.commit).toBe(COMMIT);
    expect(read.machines.map((each) => each.machine.name)).toEqual(['GitHub ubuntu-24.04', 'GitHub windows-2022']);
  });

  it('refuses a file with no machine', () => {
    expect(() => readBenchmarks(file([]), VERSION)).toThrow(BenchmarksError);
  });

  it('refuses a machine named twice', () => {
    expect(() => readBenchmarks(file([report(), report()]), VERSION)).toThrow(BenchmarksError);
  });

  it('refuses a machine of another commit than the file', () => {
    expect(() => readBenchmarks(file([report({ commit: 'a'.repeat(40) })]), VERSION)).toThrow(BenchmarksError);
  });

  it('refuses a file of another version', () => {
    expect(() => readBenchmarks({ ...file([report()]), wiretrace: '2.1.0' }, VERSION)).toThrow(BenchmarksError);
  });

  it('refuses machines measured in different ways', () => {
    const other = report({ method: { ...METHOD, capacity_lines: 1000 } }, 'GitHub windows-2022');

    expect(() => readBenchmarks(file([report(), other]), VERSION)).toThrow('measured in different ways');
  });
});

describe('a file the benchmark tool wrote', () => {
  // Made by WireTrace's own tools/benchmark.py, run small (2 runs) on a
  // machine and, with cgroup v2's files as a container has them, as a
  // container; joined with its --merge as the release workflow joins
  // them. Its version and commit are set to this test's.
  it('reads, the container limits as numbers', () => {
    const read = readBenchmarks(fromTheTool, VERSION);

    expect(read.machines.map((each) => each.machine.name)).toEqual(['GitHub ubuntu-slim', 'GitHub ubuntu-24.04']);
    expect(read.machines[0].machine.containerProcessorLimit).toBe(1);
    expect(read.machines[0].machine.containerMemoryLimit).toBe(5_368_709_120);
    expect(read.machines[1]?.machine.containerProcessorLimit).toBeNull();
    expect(Object.keys(read.machines[0].measurements)).toContain('load_10000_sent');
  });
});

describe("a release's own file", () => {
  // benchmarks.json as published with WireTrace 2.2.0, measured by the
  // release workflow on GitHub's machines, byte for byte.
  it('reads, the machine that names no runner image included', () => {
    const read = readBenchmarks(ofTheRelease, '2.2.0');

    expect(read.commit).toBe('a57a209b9429a4e383f80c43e414286bd90e48ed');
    expect(read.machines.map((each) => each.machine.name)).toEqual(['GitHub ubuntu-24.04', 'GitHub ubuntu-slim', 'GitHub windows-2022']);
    expect(read.machines[1]?.machine.runnerImage).toBeNull();
    expect(read.machines[2]?.machine.runnerImage).toBe('win22');
  });
});

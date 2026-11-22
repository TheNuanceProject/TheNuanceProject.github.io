// SPDX-License-Identifier: MIT
/**
 * The test computer's benchmark report: measured through two joined
 * serial ports on the computer each release is tested on, from the
 * release's own commit, and kept in this repository beside the
 * WireTrace page's content (`RELEASE_RUNBOOK.md`, stage 3). Read when
 * the site is built, by the benchmarks' own rules, against the commit of
 * the release's `benchmarks.json`.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { type BenchmarkMethod, BenchmarksError, type MachineReport, readMachineReport, sameMethod } from './benchmarks';
import { BuildDataError } from './fetch-json.server';

/** Where the report is kept, from the top of the repository. */
export const TEST_COMPUTER_FILE = 'content/projects/wiretrace/benchmarks-test-computer.json';

/** @throws BuildDataError when the report is missing, is not JSON, is of
 *  another version or commit, was measured in another way than
 *  `method`, the release's, or does not read. */
export async function testComputerReport(version: string, commit: string, method: BenchmarkMethod): Promise<MachineReport> {
  let text: string;
  try {
    text = await readFile(join(process.cwd(), TEST_COMPUTER_FILE), 'utf8');
  } catch {
    throw new BuildDataError(
      `${TEST_COMPUTER_FILE} could not be read: the test computer's benchmarks of WireTrace ${version} come first`,
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new BuildDataError(`${TEST_COMPUTER_FILE} is not JSON`);
  }
  let report: MachineReport;
  try {
    report = readMachineReport(value, version, commit);
  } catch (error) {
    if (error instanceof BenchmarksError) {
      throw new BuildDataError(`the test computer's benchmarks cannot be read: ${error.message}`);
    }
    throw error;
  }
  if (!sameMethod(report.method, method)) {
    throw new BuildDataError("the test computer's benchmarks were measured in another way than the release's");
  }
  return report;
}

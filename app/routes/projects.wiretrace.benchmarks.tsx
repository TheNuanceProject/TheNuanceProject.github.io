// SPDX-License-Identifier: MIT
import { type ReactNode } from 'react';
import { Container } from '~/components/Container';
import { Prose } from '~/components/Prose';
import { Breadcrumbs } from '~/components/Breadcrumbs';
import { type MachineReport, type Measurement, type MeasurementKey, loadKey } from '~/lib/build-data/benchmarks';
import { shownMeasurement, shownOf } from '~/lib/benchmarks-shown';
import { PROSE_LINK } from '~/lib/prose-link';
import { getReleaseBenchmarks } from '~/lib/build-data/data.server';
import { testComputerReport } from '~/lib/build-data/test-computer.server';
import { pageMeta } from '~/lib/page-meta';
import { breadcrumbSchema } from '~/lib/structured-data';
import type { Route } from './+types/projects.wiretrace.benchmarks';

import { meta as wtMeta } from '../../content/projects/wiretrace/meta';
import { benchmarks } from '../../content/projects/wiretrace/content';

/**
 * WireTrace's benchmarks: the page.
 *
 * Built from the `benchmarks.json` published with the release the site
 * describes, measured on GitHub's machines as that release was built,
 * and from the test computer's own report of the same commit. Nothing
 * here is typed in: the build refuses a file that is missing, of another
 * version or commit, or that holds a failed measurement.
 */

const TITLE = 'WireTrace benchmarks';
const DESCRIPTION =
  'How many lines a second WireTrace takes in, the processor and memory it uses, and how long it takes to start, measured for each release.';
const PATH = `${benchmarks.path}/`;

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const upToOneDecimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const oneDecimal = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const measuredDay = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const GIGABYTE = 1_000_000_000;
export async function loader() {
  const release = await getReleaseBenchmarks(wtMeta);
  const testComputer = await testComputerReport(wtMeta.version, release.commit, release.machines[0].method);
  return { commit: release.commit, first: release.machines[0], machines: [...release.machines, testComputer] };
}

export const meta = () =>
  pageMeta({
    title: TITLE,
    description: DESCRIPTION,
    path: PATH,
    structuredData: [
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Projects', url: '/projects/' },
        { name: wtMeta.title, url: `/projects/${wtMeta.slug}/` },
        { name: TITLE, url: PATH },
      ]),
    ],
  });

function Card({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-5 rounded-lg border border-divider bg-surface p-5 md:p-6">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-sans text-title-sm text-text">{title}</h2>
        <p className="font-sans text-caption text-text-tertiary">{note}</p>
      </div>
      {children}
    </section>
  );
}

/** A measurement in a cell: its median, and the lowest and highest
 *  under it when the runs differed as written. */
function Value({ keyName, value }: { keyName: MeasurementKey; value: Measurement | undefined }) {
  if (value === undefined) {
    return <span className="font-sans text-caption text-text-tertiary whitespace-nowrap">Not measured</span>;
  }
  const { median, range } = shownMeasurement(keyName, value);
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span className="font-mono text-mono text-text tabular-nums">
        {median}
        {range !== null && <span className="sr-only">, the median;</span>}
      </span>
      {range !== null && (
        <span className="font-mono text-caption text-text-tertiary tabular-nums text-right">
          <span className="sr-only">lowest </span>
          <span className="whitespace-nowrap">{range.lowest}</span> to <span className="whitespace-nowrap">{range.highest}</span>
          <span className="sr-only">;</span>
        </span>
      )}
    </span>
  );
}

/** The second measurement of a cell, quieter, when there is one. */
function Under({ keyName, report }: { keyName: MeasurementKey | undefined; report: MachineReport }) {
  const value = keyName === undefined ? undefined : report.measurements[keyName];
  if (keyName === undefined || value === undefined) return null;
  return <span className="font-mono text-caption text-text-secondary tabular-nums">{shownOf(keyName)(value.median)}</span>;
}

interface Column {
  readonly heading: string;
  readonly key: MeasurementKey;
  /** A second measurement under the first, in the same cell. */
  readonly under?: MeasurementKey;
}

/** The same figures on a narrow screen: each machine, then each figure
 *  under its heading, so nothing has to be scrolled sideways. */
function MeasurementList({ columns, machines }: { columns: readonly Column[]; machines: readonly MachineReport[] }) {
  return (
    <div className="flex flex-col md:hidden">
      {machines.map((report) => (
        <div key={report.machine.name} className="flex flex-col gap-2 border-b border-divider py-3">
          <h3 className="font-sans text-ui text-text">{report.machine.name}</h3>
          <dl className="m-0 flex flex-col gap-2">
            {columns.map((column) => (
              <div key={column.key} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <dt className="font-sans text-caption text-text-tertiary">{column.heading}</dt>
                <dd className="m-0 ml-auto">
                  <span className="flex flex-col items-end gap-2">
                    <Value keyName={column.key} value={report.measurements[column.key]} />
                    <Under keyName={column.under} report={report} />
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function MeasurementTable({ caption, columns, machines }: { caption: string; columns: readonly Column[]; machines: readonly MachineReport[] }) {
  return (
    <>
      <MeasurementList columns={columns} machines={machines} />
      {/* Scrolled sideways only when the text is very large; named, and
          reachable from the keyboard, for that case. */}
      <div role="region" aria-label={caption} tabIndex={0} className="hidden min-w-0 overflow-x-auto md:block">
        <table aria-label={caption} className="w-full border-collapse font-sans text-ui">
          <thead>
            <tr className="border-b border-divider">
              <th scope="col" className="pb-2 text-left text-caption font-medium text-text-tertiary">Machine</th>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="pb-2 pl-6 text-right text-caption font-medium text-text-tertiary">
                  {column.heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {machines.map((report) => (
              <tr key={report.machine.name} className="border-b border-divider align-top">
                <th scope="row" className="py-3 pr-4 text-left font-regular text-text whitespace-nowrap">{report.machine.name}</th>
                {columns.map((column) => (
                  <td key={column.key} className="py-3 pl-6 text-right">
                    <span className="flex flex-col items-end gap-2">
                      <Value keyName={column.key} value={report.measurements[column.key]} />
                      <Under keyName={column.under} report={report} />
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function processors(report: MachineReport): string {
  const { processorsSeen, processorsUsable, containerProcessorLimit } = report.machine;
  const usable = containerProcessorLimit ?? processorsUsable ?? processorsSeen;
  return usable === processorsSeen ? number.format(processorsSeen) : `${oneDecimal.format(usable)} of ${number.format(processorsSeen)}`;
}

function memory(report: MachineReport): string {
  const { memoryBytes, containerMemoryLimit } = report.machine;
  const bytes = containerMemoryLimit !== null && containerMemoryLimit < memoryBytes ? containerMemoryLimit : memoryBytes;
  return `${oneDecimal.format(bytes / GIGABYTE)} GB`;
}

function system(report: MachineReport): string {
  const { runnerImage, runnerImageVersion, system: name } = report.machine;
  return runnerImage === null ? name : `${runnerImage} ${runnerImageVersion ?? ''}`.trim();
}

export default function WireTraceBenchmarks({ loaderData }: Route.ComponentProps) {
  // Every machine measured the same commit; GitHub's first machine gives
  // the day the release was measured and the runs of each measurement.
  const { commit, first, machines } = loaderData;
  const { runs, method } = first;
  const rates = method.loadRates.map((rate) => ({ rate, heading: `${number.format(rate)} lines a second a tab` }));
  const tabs = `${number.format(method.loadTabs)} ${method.loadTabs === 1 ? 'tab' : 'tabs'}`;
  const secondsShown = upToOneDecimal.format(method.measureSeconds);
  const seconds = `${secondsShown} ${secondsShown === '1' ? 'second' : 'seconds'}`;
  const releaseUrl = `${wtMeta.githubUrl}/releases/tag/v${wtMeta.version}`;
  const fileUrl = `${wtMeta.githubUrl}/releases/download/v${wtMeta.version}/benchmarks.json`;
  const scriptUrl = `${wtMeta.githubUrl}/blob/v${wtMeta.version}/${benchmarks.script}`;

  return (
    <Container width="default">
      <section className="pt-12 md:pt-16 pb-10">
        <Breadcrumbs
          crumbs={[
            { name: 'Home', href: '/' },
            { name: 'Projects', href: '/projects/' },
            { name: wtMeta.title, href: `/projects/${wtMeta.slug}/` },
            { name: TITLE, href: PATH },
          ]}
        />
        <h1 className="font-sans font-regular text-display-sm md:text-display text-text">{TITLE}</h1>
        <p className="mt-6 md:mt-8 font-serif text-lead text-text-secondary max-w-narrow">
          {wtMeta.title} {wtMeta.version}, measured on GitHub&apos;s machines as the release was built, and on a test
          computer through two joined serial ports.
        </p>
        <p className="mt-4 font-sans text-caption text-text-tertiary">
          Measured {measuredDay.format(new Date(first.measuredAt))} from commit{' '}
          <a href={`${wtMeta.githubUrl}/commit/${commit}`} className={`font-mono ${PROSE_LINK}`}>{commit.slice(0, 7)}</a>.{' '}
          {runs === 1 ? 'Each figure is from one run.' : `Each figure is the median of ${runs} runs; the lowest and highest are under it when the runs differed.`}
        </p>
      </section>

      <div className="flex flex-col gap-8 pb-16 md:pb-20">
        <Card title="Lines taken in" note="Lines a second into the log file, every line checked">
          <MeasurementTable
            caption="Lines a second each machine took in"
            machines={machines}
            columns={[
              { heading: 'Straight into a tab', key: 'capacity_lines', under: 'capacity_bytes' },
              { heading: 'Through a pseudo-terminal', key: 'pty_lines', under: 'pty_bytes' },
              { heading: 'Through two joined serial ports', key: 'pair_lines', under: 'pair_bytes' },
            ]}
          />
        </Card>

        <Card title="Processor" note={`${tabs} connected and logging, every feature on, every plot open; share of one processor`}>
          <MeasurementTable
            caption={`Processor use with ${tabs}`}
            machines={machines}
            columns={[
              { heading: 'Nothing arriving', key: 'idle_processor' },
              ...rates.map(({ rate, heading }) => ({ heading, key: loadKey(rate, 'processor') })),
            ]}
          />
        </Card>

        <Card title="Memory" note={`The same ${tabs}, and one tab whose console is full`}>
          <MeasurementTable
            caption="Memory use"
            machines={machines}
            columns={[
              { heading: 'Nothing arriving', key: 'idle_memory' },
              ...rates.map(({ rate, heading }) => ({ heading, key: loadKey(rate, 'memory') })),
              { heading: 'Console full', key: 'console_full_memory' },
            ]}
          />
        </Card>

        <Card title="Start" note="From starting the program to its window, with its settings already in place">
          <MeasurementTable caption="Time to start" machines={machines} columns={[{ heading: 'Seconds', key: 'start' }]} />
        </Card>

        <Card title="Machines" note="As each machine described itself">
          <div className="flex flex-col md:hidden">
            {machines.map((report) => (
              <div key={report.machine.name} className="flex flex-col gap-1 border-b border-divider py-3">
                <h3 className="font-sans text-ui text-text">{report.machine.name}</h3>
                <p className="m-0 font-sans text-caption text-text-secondary">
                  {report.machine.processor}, {processors(report)} {report.machine.processorsSeen === 1 ? 'processor' : 'processors'},{' '}
                  {memory(report)}
                </p>
                <p className="m-0 font-sans text-caption text-text-tertiary">{system(report)}</p>
              </div>
            ))}
          </div>
          <div className="hidden min-w-0 overflow-x-auto md:block">
            <table aria-label="The machines measured" className="w-full border-collapse font-sans text-ui">
              <thead>
                <tr className="border-b border-divider">
                  {['Machine', 'Processor', 'Processors', 'Memory', 'System'].map((heading) => (
                    <th key={heading} scope="col" className="pb-2 pr-6 text-left text-caption font-medium text-text-tertiary">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {machines.map((report) => (
                  <tr key={report.machine.name} className="border-b border-divider align-top">
                    <th scope="row" className="py-3 pr-6 text-left font-regular text-text whitespace-nowrap">{report.machine.name}</th>
                    <td className="py-3 pr-6 text-text-secondary">{report.machine.processor}</td>
                    <td className="py-3 pr-6 font-mono text-mono text-text-secondary tabular-nums">{processors(report)}</td>
                    <td className="py-3 pr-6 font-mono text-mono text-text-secondary tabular-nums whitespace-nowrap">{memory(report)}</td>
                    <td className="py-3 pr-6 text-text-secondary">{system(report)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <section aria-labelledby="benchmarks-method" className="max-w-narrow pb-24 md:pb-32">
        <h2 id="benchmarks-method" className="mb-4 font-sans text-label uppercase text-accent-strong">How these are measured</h2>
        <Prose className="text-ui-lg text-text-secondary">
          <p>
            Every figure comes from {wtMeta.title}&apos;s own benchmark tool, run on each machine. The lines it sends
            look like <code>{first.lineExample}</code>, each with its own number, and every run checks that each line
            reached the log, in order, once; a run that loses or repeats a line fails, and a release with a failed
            measurement is not published here. Lines taken in are {number.format(method.capacityLines)} lines fed
            into a tab as fast as it takes them, and {number.format(method.linesThrough)} sent through a pseudo-terminal
            (Linux and macOS) or through two serial ports joined to each other, which {wtMeta.title} opens as it opens
            any port. Processor use is read from outside {wtMeta.title}, as a share of one processor&apos;s time, and
            memory is what it holds in use, over {seconds} at a steady rate. {wtMeta.title} runs in a home folder of its
            own, with update checks and usage statistics off, and draws to an off-screen display of {method.display.width}{' '}
            by {method.display.height} pixels.
          </p>
          <p>
            To measure your own computer, take the release&apos;s source code, install what it uses with{' '}
            <code>pip install --require-hashes -r requirements-release.txt -r requirements-benchmark.txt</code>, and run{' '}
            <code>python tools/benchmark.py --machine &quot;My computer&quot;</code>. For two serial ports joined to each
            other, add <code>--pair</code> with the port to send on and the port {wtMeta.title} reads. The tool is{' '}
            <a href={scriptUrl} className={PROSE_LINK}>benchmark.py</a>; these figures are{' '}
            <a href={fileUrl} className={PROSE_LINK}>benchmarks.json</a> on the{' '}
            <a href={releaseUrl} className={PROSE_LINK}>release</a>.
          </p>
        </Prose>
      </section>
    </Container>
  );
}

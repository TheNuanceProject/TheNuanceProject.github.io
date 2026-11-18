// SPDX-License-Identifier: MIT
import { useState, type PointerEvent } from 'react';

import { dayDate } from '~/lib/build-data/usage-summary';

interface UsageTrendProps {
  /** The day number of the first count. */
  readonly start: number;
  /** Installations active on each day from `start`. */
  readonly counts: readonly number[];
  /** The id of the heading that names the chart. */
  readonly labelledBy: string;
}

/** Gridlines are drawn at about this many steps. */
const STEPS = 2;
const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
/** "Wednesday, October 14, 2026", as dates are written across the site. */
const longDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const number = new Intl.NumberFormat('en-US');
const MS_PER_DAY = 86_400_000;
/** A month label this close to the right edge, in percent, is kept inside it. */
const LABEL_EDGE = 6;

/** A round top for the scale and its step: 1, 2 or 5 times a power of ten. */
function niceScale(most: number): { top: number; step: number } {
  if (most <= 0) return { top: STEPS, step: 1 };
  const rough = most / STEPS;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
  const whole = Math.max(1, Math.round(step));
  return { top: Math.ceil(most / whole) * whole, step: whole };
}

function at(day: number): Date {
  return new Date(day * MS_PER_DAY);
}

/**
 * UsageTrend: installations active each day, one bar a day, today's in
 * the stronger accent.
 *
 * The whole chart is in the page as built, and its figures are in a
 * table for assistive technology. Pointing at a day, or touching it,
 * shows its date and count.
 */
export function UsageTrend({ start, counts, labelledBy }: UsageTrendProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  const last = counts.length - 1;
  const { top, step } = niceScale(Math.max(...counts));
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
  const share = (n: number) => (n / top) * 100;
  const left = (i: number) => (i / counts.length) * 100;
  // The first day of each month in the range.
  const months = counts.map((_, i) => i).filter((i) => at(start + i).getUTCDate() === 1);

  const choose = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const i = Math.floor(((event.clientX - rect.left) / rect.width) * counts.length);
    setChosen(Math.max(0, Math.min(last, i)));
  };
  const chosenCount = chosen === null ? undefined : counts[chosen];

  return (
    <figure className="m-0" aria-labelledby={labelledBy}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        <div className="relative h-44 font-mono text-mono-sm text-text-tertiary tabular-nums" aria-hidden="true">
          {ticks.map((n) => (
            <span key={n} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - share(n)}%` }}>
              {number.format(n)}
            </span>
          ))}
        </div>
        <div
          className="relative h-44 touch-pan-y"
          onPointerMove={choose}
          onPointerDown={choose}
          onPointerLeave={() => setChosen(null)}
          aria-hidden="true"
        >
          {ticks.map((n) => (
            <span key={n} className="absolute inset-x-0 border-t border-divider" style={{ top: `${100 - share(n)}%` }} />
          ))}
          {chosen !== null && (
            <span
              className="absolute inset-y-0 bg-divider"
              style={{ left: `${left(chosen)}%`, width: `${100 / counts.length}%` }}
            />
          )}
          <div className="absolute inset-0 flex items-end gap-px">
            {counts.map((n, i) => (
              <span
                key={i}
                className={`block min-w-0 flex-1 rounded-t-xs ${i === last ? 'bg-accent-strong' : 'bg-accent'}`}
                style={{ height: `${share(n)}%` }}
              />
            ))}
          </div>
          {chosen !== null && chosenCount !== undefined && (
            <div
              className="pointer-events-none absolute z-10 flex flex-col gap-0.5 whitespace-nowrap rounded-md border border-divider bg-surface px-3 py-2 shadow-float"
              style={{
                left: `${left(chosen)}%`,
                top: `${100 - share(chosenCount)}%`,
                transform: `translate(${chosen > counts.length / 2 ? '-100%' : '0'}, calc(-100% - var(--spacing) * 2))`,
              }}
            >
              <span className="font-sans text-caption text-text-tertiary">{longDate.format(at(start + chosen))}</span>
              <span className="font-mono text-mono text-text tabular-nums">{number.format(chosenCount)} active</span>
            </div>
          )}
        </div>
        <div />
        <div className="relative mt-2 h-4 font-sans text-caption text-text-tertiary" aria-hidden="true">
          {months.map((i) => (
            <span
              key={i}
              className={`absolute whitespace-nowrap border-l border-edge pl-1 ${left(i) > 100 - LABEL_EDGE ? '-translate-x-full' : ''}`}
              style={{ left: `${left(i)}%` }}
            >
              {month.format(at(start + i))}
            </span>
          ))}
        </div>
      </div>
      {/* Hidden by its wrapper: a table grows to fit its rows whatever its
          own height, so hidden itself it would still take room below. */}
      <div className="sr-only">
        <table>
          <caption>Installations active each day, {dayDate(start)} to {dayDate(start + last)}</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Active installations</th>
            </tr>
          </thead>
          <tbody>
            {counts.map((n, i) => (
              <tr key={i}>
                <th scope="row">{dayDate(start + i)}</th>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

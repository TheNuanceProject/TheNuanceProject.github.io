// SPDX-License-Identifier: MIT
import { useId, useState, type PointerEvent } from 'react';

import { dayDate } from '~/lib/build-data/usage-summary';
import { MEASURES } from '~/lib/design-tokens';

interface UsageTrendProps {
  /** The day number of the first count. */
  readonly start: number;
  /** Installations active on each day from `start`. */
  readonly counts: readonly number[];
}

/** The height of the drawing, in its own units; it stretches to fit. */
const HEIGHT = 100;
/** Gridlines are drawn at about this many steps. */
const STEPS = 4;
/** "Oct 14" and "Wednesday, October 14, 2026", as dates are written
 *  across the site. */
const shortDate = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const MS_PER_DAY = 86_400_000;
/** A month label this close to an edge, in percent, is kept inside it. */
const LABEL_EDGE = 8;

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
 * UsageTrend: installations active each day, as a line over an area.
 *
 * The whole chart is in the page as built. The drawing stretches to the
 * width it is given while its text stays at its size, because the labels
 * are text beside the drawing, not inside it. Pointing at the chart reads
 * out one day.
 */
export function UsageTrend({ start, counts }: UsageTrendProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  const titleId = useId();
  const last = counts.length - 1;
  const { top, step } = niceScale(Math.max(...counts));
  const x = (i: number) => (last === 0 ? 50 : (i / last) * 100);
  const y = (n: number) => HEIGHT - (n / top) * HEIGHT;
  const line = counts.map((n, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(n)}`).join('');
  const area = `${line}L${x(last)} ${HEIGHT}L${x(0)} ${HEIGHT}Z`;
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);
  // The first day of each month in the range.
  const months = counts
    .map((_, i) => i)
    .filter((i) => at(start + i).getUTCDate() === 1);

  const choose = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const share = (event.clientX - rect.left) / rect.width;
    setChosen(Math.max(0, Math.min(last, Math.round(share * last))));
  };

  const today = counts[last] ?? 0;
  const chosenCount = chosen === null ? null : counts[chosen];

  return (
    <figure className="max-w-narrow" aria-labelledby={titleId}>
      <p id={titleId} className="min-h-(--text-ui-lg--line-height) font-sans text-ui-lg text-text-secondary tabular-nums">
        {chosen === null || chosenCount === undefined ? (
          <>
            <span className="text-text font-medium">{today} active</span> on{' '}
            {longDate.format(at(start + last))}. Point at the chart to read another day.
          </>
        ) : (
          <>
            <span className="text-text font-medium">{chosenCount} active</span> on{' '}
            {longDate.format(at(start + chosen))}
          </>
        )}
      </p>
      <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        <div className="relative h-44 font-sans text-caption text-text-tertiary tabular-nums" aria-hidden="true">
          {ticks.map((n) => (
            <span key={n} className="absolute right-0 -translate-y-1/2" style={{ top: `${(y(n) / HEIGHT) * 100}%` }}>
              {n}
            </span>
          ))}
        </div>
        <div
          className="relative h-44 touch-pan-y"
          onPointerMove={choose}
          onPointerDown={choose}
          onPointerLeave={() => setChosen(null)}
        >
          <svg viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {ticks.map((n) => (
              <line key={n} x1={0} x2={100} y1={y(n)} y2={y(n)} stroke="var(--color-divider)" strokeWidth={MEASURES['border.hairline']} vectorEffect="non-scaling-stroke" />
            ))}
            <path d={area} fill="var(--color-chart-area)" />
            <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth={MEASURES['border.mark']} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {chosen !== null && (
              <line x1={x(chosen)} x2={x(chosen)} y1={0} y2={HEIGHT} stroke="var(--color-text-tertiary)" strokeWidth={MEASURES['border.hairline']} vectorEffect="non-scaling-stroke" />
            )}
          </svg>
          <span
            aria-hidden="true"
            className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-accent"
            style={{
              left: `${x(chosen ?? last)}%`,
              top: `${(y(counts[chosen ?? last] ?? 0) / HEIGHT) * 100}%`,
            }}
          />
        </div>
        <div />
        <div className="relative mt-2 h-4 font-sans text-caption text-text-tertiary" aria-hidden="true">
          {months.map((i) => (
            <span
              key={i}
              className={`absolute whitespace-nowrap ${
                x(i) < LABEL_EDGE ? '' : x(i) > 100 - LABEL_EDGE ? '-translate-x-full' : '-translate-x-1/2'
              }`}
              style={{ left: `${x(i)}%` }}
            >
              {shortDate.format(at(start + i))}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
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
    </figure>
  );
}

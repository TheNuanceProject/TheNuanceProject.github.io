// SPDX-License-Identifier: MIT
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Container } from '~/components/Container';
import { Prose } from '~/components/Prose';
import { Breadcrumbs } from '~/components/Breadcrumbs';
import { type GlobeHandle, UsageGlobe } from '~/components/usage/UsageGlobe';
import { UsageTrend } from '~/components/usage/UsageTrend';
import { countryNames } from '~/lib/build-data/country-names.server';
import { getUsageSummary } from '~/lib/build-data/data.server';
import {
  MAP_PERIOD_DAYS,
  type PackageFormat,
  UNKNOWN_COUNTRY,
  type UsageShare,
  type UsageSummary,
  countryCodes,
  dayDate,
} from '~/lib/build-data/usage-summary';
import { useLiveSummary } from '~/lib/usage/live-summary';
import { type CountKind, type Locate, countOf, lastSeen, placeTitle } from '~/lib/usage/places';
import { withRegionNames } from '~/lib/usage/region-names';
import { loadLevel, locator } from '~/lib/usage/world';
import { pageMeta } from '~/lib/page-meta';
import { breadcrumbSchema } from '~/lib/structured-data';
import type { Route } from './+types/projects.wiretrace.usage';

import { meta as wtMeta } from '../../content/projects/wiretrace/meta';
import { usage } from '../../content/projects/wiretrace/content';

/**
 * Where WireTrace is used: the public usage page.
 *
 * Made from the update server's public summary. The page is built with
 * the summary of that moment, and when it opens in a browser it reads the
 * current one, which the server makes every 15 minutes (`useLiveSummary`).
 * It holds totals only. Every figure covers a period ending with the UTC
 * day the summary was made, and counts each installation once in it, so
 * the places add up to their countries and the countries to the total.
 * Until the server has made its first summary the page says so, and shows
 * no figures.
 */

const TITLE = 'Where WireTrace is used';
const DESCRIPTION =
  'Active WireTrace installations, the countries and cities they are in, and the versions and systems they run, from the update checks.';
const PATH = `${usage.path}/`;
const period = `${MAP_PERIOD_DAYS} days`;

/** How the summary names systems, and how the page writes them. */
const SYSTEM_NAMES: Readonly<Record<string, string>> = {
  windows: 'Windows',
  linux: 'Linux',
  macos: 'macOS',
  other: 'Other',
};

/** How the page names each of WireTrace's packages. */
const PACKAGE_NAMES: Readonly<Record<PackageFormat, string>> = {
  exe: 'Windows installer',
  appimage: 'AppImage',
  deb: 'Debian package',
};

/** When a summary was made, in UTC, as the page writes it: the same in
 *  every time zone, like every date on the site. */
const madeAtFormat = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});
const shortDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const number = new Intl.NumberFormat('en-US');
const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });

function madeAtText(summary: UsageSummary): string {
  return `${madeAtFormat.format(summary.madeAt)} UTC`;
}

function dayText(seen: number, today: number): string {
  return seen === today ? 'Today' : shortDay.format(new Date(`${dayDate(seen)}T12:00:00Z`));
}

export async function loader() {
  const summary = await getUsageSummary(usage.summaryUrl);
  return { summary, names: countryNames(summary === null ? [] : countryCodes(summary)) };
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

function Card({ children, labelledBy, label }: { children: ReactNode; labelledBy?: string; label?: string }) {
  return (
    <section
      aria-labelledby={labelledBy}
      aria-label={label}
      className="flex min-w-0 flex-col gap-6 rounded-lg border border-divider bg-surface p-5 md:p-6"
    >
      {children}
    </section>
  );
}

function CardHeading({ id, title, note }: { id: string; title: string; note: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 id={id} className="font-sans text-title-sm text-text">
        {title}
      </h2>
      <p className="font-sans text-caption text-text-tertiary">{note}</p>
    </div>
  );
}

function Figure({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 py-5">
      <dt className="font-sans text-label uppercase text-text-tertiary">{label}</dt>
      <dd className="m-0 font-sans text-title text-text tabular-nums">{number.format(value)}</dd>
      <dd className="m-0 font-sans text-caption text-text-tertiary">{note}</dd>
    </div>
  );
}

/** A bar of a share of something, in the language's progress bar. */
function Bar({ share }: { share: number }) {
  return (
    <span className="block h-(--size-progress) min-w-0 rounded-xs bg-divider" aria-hidden="true">
      <span className="block h-(--size-progress) rounded-xs bg-accent" style={{ width: `${share * 100}%` }} />
    </span>
  );
}

/** A count that may be none: written as 0, quieter than the others. */
function Count({ value }: { value: number }) {
  return <span className={value === 0 ? 'text-text-tertiary' : undefined}>{number.format(value)}</span>;
}

function Shares({ title, rows, name }: { title: string; rows: readonly UsageShare[]; name: (value: string) => string }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h3 className="font-sans text-label uppercase text-text-tertiary">{title}</h3>
      {rows.length === 0 ? (
        <p className="font-sans text-ui-lg text-text-secondary">None in the last {period}.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {rows.map((row) => (
            <li key={row.name} className="grid grid-cols-[minmax(0,18ch)_minmax(0,1fr)_5ch] items-center gap-3 font-sans text-ui-lg">
              <span className="truncate text-text">{name(row.name)}</span>
              <Bar share={row.share} />
              <span className="text-right font-mono text-mono text-text-secondary tabular-nums">{percent.format(row.share)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TOGGLE: readonly { kind: CountKind; label: string }[] = [
  { kind: 'installations', label: 'Installations' },
  { kind: 'legacy', label: '1.x checks' },
];

export default function WireTraceUsage({ loaderData }: Route.ComponentProps) {
  const summary = useLiveSummary(loaderData.summary, usage.summaryUrl);
  // The built names cover every country on the map and in the built
  // summary; one that only the current summary holds is named here.
  const names = useMemo(
    () => withRegionNames(loaderData.names, summary === null ? [] : countryCodes(summary)),
    [loaderData.names, summary]
  );
  const [kind, setKind] = useState<CountKind>('installations');
  const [locate, setLocate] = useState<Locate | null>(null);
  const globe = useRef<GlobeHandle>(null);
  const globeFrame = useRef<HTMLDivElement>(null);
  const ids = { places: useId(), trend: useId(), countries: useId(), versions: useId() };

  // Places without a name are named by the country at their position,
  // from the globe's coarse map, once it is here.
  useEffect(() => {
    let alive = true;
    loadLevel(0)
      .then((level) => {
        if (alive) setLocate(() => locator(level));
      })
      .catch(() => {
        // Such places keep the name of their kind.
      });
    return () => {
      alive = false;
    };
  }, []);

  const places = useMemo(() => summary?.places ?? [], [summary]);
  const titles = useMemo(() => places.map((place) => placeTitle(place, names, locate)), [places, names, locate]);
  const listed = useMemo(
    () =>
      places
        .map((place, index) => ({ place, index, title: titles[index] }))
        .filter((row) => countOf(row.place, kind) > 0)
        .sort(
          (a, b) =>
            countOf(b.place, kind) - countOf(a.place, kind) ||
            lastSeen(b.place) - lastSeen(a.place) ||
            (a.title?.name ?? '').localeCompare(b.title?.name ?? '', 'en')
        ),
    [places, titles, kind]
  );
  const countries = useMemo(() => {
    if (!summary) return [];
    const legacy = new Map<string, number>();
    const placeCount = new Map<string, number>();
    for (const place of summary.places) {
      if (place.legacy) legacy.set(place.country, (legacy.get(place.country) ?? 0) + place.legacy.count);
      if (place.installations) placeCount.set(place.country, (placeCount.get(place.country) ?? 0) + 1);
    }
    const rows = summary.countries.map(({ code, installations }) => ({ code, installations }));
    for (const code of legacy.keys()) {
      if (code !== UNKNOWN_COUNTRY && !rows.some((row) => row.code === code)) rows.push({ code, installations: 0 });
    }
    return rows
      .map((row) => ({
        ...row,
        name: names[row.code] ?? row.code,
        places: placeCount.get(row.code) ?? 0,
        legacy: legacy.get(row.code) ?? 0,
      }))
      .sort((a, b) => b.installations - a.installations || b.legacy - a.legacy || a.name.localeCompare(b.name, 'en'));
  }, [summary, names]);

  const show = (index: number) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    globeFrame.current?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    globe.current?.flyTo(index);
  };

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
          Installations of {wtMeta.title} that checked for updates, and the places they checked from.
        </p>
        {summary !== null && (
          <p className="mt-4 font-sans text-caption text-text-tertiary">
            Updated {madeAtText(summary)}, every 15 minutes. Days are UTC.
          </p>
        )}
      </section>

      {summary === null ? (
        <section className="border-t border-divider py-16 md:py-20">
          <Prose>
            <p>
              The figures appear here once the update server has counted its first full day of update checks
              from {wtMeta.title} 2.0.
            </p>
          </Prose>
        </section>
      ) : (
        <div className="flex flex-col gap-8 pb-24 md:pb-32">
          <Card label="Figures">
            <dl className="-mt-5 mb-0 grid grid-cols-2 gap-x-6 sm:grid-cols-4">
              <Figure label="Today" value={summary.active.today} note="Installations active today" />
              <Figure label="This week" value={summary.active.week} note="Active in the last 7 days" />
              <Figure label="This month" value={summary.active.month} note={`Active in the last ${period}`} />
              <Figure label="Six months" value={summary.active.halfYear} note="Active in the last 180 days" />
            </dl>
            <dl className="-mt-6 -mb-5 grid grid-cols-2 gap-x-6 border-t border-divider sm:grid-cols-4">
              <Figure label="Countries" value={summary.countries.length} note={`With an active installation, ${period}`} />
              <Figure
                label="Places"
                value={places.filter((place) => place.installations).length}
                note={`Cities and areas, ${period}`}
              />
              <Figure label="1.x checks" value={summary.legacyChecks} note={`From WireTrace 1.x, ${period}`} />
              <Figure label="Downloads" value={summary.downloads.total} note="All packages, as GitHub counts them" />
            </dl>
          </Card>

          <Card labelledBy={ids.places}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <CardHeading
                id={ids.places}
                title="Places"
                note={
                  kind === 'installations'
                    ? `Installations active in the last ${period}, at the place of their update checks`
                    : `Update checks from WireTrace 1.x in the last ${period}, at the place they came from`
                }
              />
              <div role="group" aria-label="Count" className="inline-flex gap-1 rounded-md border border-edge p-1">
                {TOGGLE.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    aria-pressed={kind === option.kind}
                    onClick={() => setKind(option.kind)}
                    className="min-h-(--size-control-lg) rounded-sm px-(--size-control-padding-md) font-sans text-ui font-medium text-text-secondary transition-colors duration-(--duration-fast) hover:bg-divider aria-pressed:bg-text aria-pressed:text-paper"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-stretch gap-6">
              <div ref={globeFrame} className="flex min-w-0 grow-[999] basis-128 flex-col gap-3">
                <UsageGlobe ref={globe} places={places} titles={titles} kind={kind} day={summary.day} />
                <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 font-sans text-caption text-text-secondary">
                  <li className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="size-3 rounded-full bg-accent-strong" />
                    City, placed to about 11 km
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="size-3 rounded-full border border-dashed border-accent-strong" />
                    Area, about 100 km across, until Dec 17, 2026
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <span aria-hidden="true" className="h-3 w-4 rounded-xs bg-map-land-used" />
                    {kind === 'installations' ? 'Country with installations' : 'Country with 1.x checks'}
                  </li>
                  <li className="text-text-tertiary">
                    Drag to turn; scroll, pinch or double-click to zoom; arrow keys, + and &minus; work too.
                  </li>
                </ul>
              </div>
              <div className="min-w-0 grow basis-88 overflow-x-auto">
                <table className="w-full border-collapse font-sans text-ui">
                  <caption className="pb-2 text-left font-sans text-caption text-text-tertiary">
                    {number.format(listed.length)} {listed.length === 1 ? 'place' : 'places'}, last {period}
                  </caption>
                  <thead>
                    <tr className="border-b border-divider">
                      <th scope="col" className="pb-2 text-left text-caption font-medium text-text-tertiary">Place</th>
                      <th scope="col" className="pb-2 pl-4 text-right text-caption font-medium text-text-tertiary whitespace-nowrap">
                        {kind === 'installations' ? 'Installations' : '1.x checks'}
                      </th>
                      <th scope="col" className="pb-2 pl-4 text-right text-caption font-medium text-text-tertiary whitespace-nowrap">Last seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listed.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-3 text-text-secondary">None in the last {period}.</td>
                      </tr>
                    ) : (
                      listed.map(({ place, index, title }) => (
                        <tr
                          key={index}
                          className="border-b border-divider align-top"
                          onMouseEnter={() => globe.current?.highlight(index)}
                          onMouseLeave={() => globe.current?.highlight(null)}
                        >
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => show(index)}
                              onFocus={() => globe.current?.highlight(index)}
                              onBlur={() => globe.current?.highlight(null)}
                              aria-label={`Show ${title?.name ?? 'this place'} on the globe`}
                              className="flex min-h-(--size-target-min) cursor-pointer flex-col items-start gap-0.5 text-left"
                            >
                              <span className="text-text whitespace-nowrap">{title?.name}</span>
                              <span className="text-caption text-text-tertiary">
                                {[title?.country, place.kind === 'area' ? 'Area' : 'City'].filter(Boolean).join(' · ')}
                              </span>
                            </button>
                          </td>
                          <td className="py-2 pl-4 text-right font-mono text-mono tabular-nums">
                            <Count value={countOf(place, kind)} />
                          </td>
                          <td className="py-2 pl-4 text-right whitespace-nowrap text-text-secondary">{dayText(lastSeen(place), summary.day)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {summary.trend.counts.length > 1 && (
            <Card labelledBy={ids.trend}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <CardHeading
                  id={ids.trend}
                  title="Active installations, day by day"
                  note={`The last ${number.format(summary.trend.counts.length)} days. An installation counts once a day.`}
                />
                <p className="flex items-baseline gap-2">
                  <span className="font-sans text-caption text-text-tertiary">Today</span>
                  <span className="font-sans text-title-sm text-text tabular-nums">
                    {number.format(summary.trend.counts[summary.trend.counts.length - 1] ?? 0)}
                  </span>
                </p>
              </div>
              <UsageTrend start={summary.trend.start} counts={summary.trend.counts} labelledBy={ids.trend} />
            </Card>
          )}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card labelledBy={ids.countries}>
              <CardHeading id={ids.countries} title="Countries" note={`The last ${period}`} />
              {countries.length === 0 && summary.withoutCountry === 0 ? (
                <p className="font-sans text-ui-lg text-text-secondary">None in the last {period}.</p>
              ) : (
                <div className="min-w-0 overflow-x-auto">
                  <table className="w-full border-collapse font-sans text-ui">
                    <thead>
                      <tr className="border-b border-divider">
                        <th scope="col" className="pb-2 text-left text-caption font-medium text-text-tertiary">Country</th>
                        <th scope="col" className="pb-2 pl-4 text-right text-caption font-medium text-text-tertiary">Installations</th>
                        <th scope="col" className="hidden pb-2 pl-4 text-left text-caption font-medium text-text-tertiary sm:table-cell">Share</th>
                        <th scope="col" className="pb-2 pl-4 text-right text-caption font-medium text-text-tertiary">Places</th>
                        <th scope="col" className="pb-2 pl-4 text-right text-caption font-medium text-text-tertiary whitespace-nowrap">1.x</th>
                      </tr>
                    </thead>
                    <tbody>
                      {countries.map((row) => (
                        <tr key={row.code} className="border-b border-divider">
                          <td className="py-2 text-text whitespace-nowrap">{row.name}</td>
                          <td className="py-2 pl-4 text-right font-mono text-mono tabular-nums"><Count value={row.installations} /></td>
                          <td className="hidden w-2/5 py-2 pl-4 sm:table-cell">
                            <span className="grid grid-cols-[minmax(0,1fr)_5ch] items-center gap-2">
                              <Bar share={row.installations / Math.max(summary.active.month, 1)} />
                              <span className="text-right font-mono text-mono text-text-secondary tabular-nums">
                                {percent.format(row.installations / Math.max(summary.active.month, 1))}
                              </span>
                            </span>
                          </td>
                          <td className="py-2 pl-4 text-right font-mono text-mono tabular-nums"><Count value={row.places} /></td>
                          <td className="py-2 pl-4 text-right font-mono text-mono tabular-nums"><Count value={row.legacy} /></td>
                        </tr>
                      ))}
                      {summary.withoutCountry > 0 && (
                        <tr className="border-b border-divider">
                          <td className="py-2 text-text-secondary">Location unknown</td>
                          <td className="py-2 pl-4 text-right font-mono text-mono tabular-nums">{number.format(summary.withoutCountry)}</td>
                          <td className="hidden w-2/5 py-2 pl-4 sm:table-cell">
                            <span className="grid grid-cols-[minmax(0,1fr)_5ch] items-center gap-2">
                              <Bar share={summary.withoutCountry / Math.max(summary.active.month, 1)} />
                              <span className="text-right font-mono text-mono text-text-secondary tabular-nums">
                                {percent.format(summary.withoutCountry / Math.max(summary.active.month, 1))}
                              </span>
                            </span>
                          </td>
                          <td className="py-2 pl-4" />
                          <td className="py-2 pl-4" />
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card labelledBy={ids.versions}>
              <CardHeading id={ids.versions} title="Versions and systems" note={`Share of installations, the last ${period}`} />
              <Shares title="Version" rows={summary.versions} name={(value) => (value === 'other' ? 'Other' : `${wtMeta.title} ${value}`)} />
              <Shares title="System" rows={summary.systems} name={(value) => SYSTEM_NAMES[value] ?? value} />
              <div className="flex flex-col gap-3 border-t border-divider pt-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-sans text-label uppercase text-text-tertiary">Downloads by package</h3>
                  <span className="font-sans text-caption text-text-tertiary">All releases</span>
                </div>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {summary.downloads.packages.map((item) => (
                    <li key={item.format} className="grid grid-cols-[minmax(0,18ch)_minmax(0,1fr)_5ch] items-center gap-3 font-sans text-ui-lg">
                      <span className="truncate text-text">{PACKAGE_NAMES[item.format]}</span>
                      <Bar share={item.count / Math.max(...summary.downloads.packages.map((p) => p.count), 1)} />
                      <span className="text-right font-mono text-mono text-text-secondary tabular-nums">{number.format(item.count)}</span>
                    </li>
                  ))}
                </ul>
                <p className="font-sans text-caption text-text-tertiary">
                  GitHub&rsquo;s count of package downloads for every release, updates included. A download is not an installation.
                </p>
              </div>
            </Card>
          </div>

          <section aria-labelledby="usage-method" className="max-w-narrow">
            <h2 id="usage-method" className="mb-4 font-sans text-label uppercase text-accent-strong">
              How these are counted
            </h2>
            <Prose className="text-ui-lg text-text-secondary">
              <p>
                Made from the update checks of {wtMeta.title} 2.x, as of {madeAtText(summary)}. The update server
                makes them every 15 minutes, and this page reads them when it opens. Every period ends with the
                current day (UTC) and counts each installation once, in the place it first checked in from in that
                period. A place is the city Cloudflare gives for the address of a check; its marker sits on that
                city, rounded to about 11 km, never where a computer is. Checks counted before places were named by
                city stay in their area of about 100 km, a square of one degree of latitude and longitude, whose
                marker sits on its largest place and is named after it, from{' '}
                <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" className="border-b border-divider text-text no-underline hover:border-accent-strong">
                  GeoNames
                </a>{' '}
                (
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="border-b border-divider text-text no-underline hover:border-accent-strong">
                  CC BY 4.0
                </a>
                ). Update checks from {wtMeta.title} 1.x are counted apart, as checks, since they cannot be counted
                as installations. The map and its town names are drawn in your browser from{' '}
                <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer" className="border-b border-divider text-text no-underline hover:border-accent-strong">
                  Natural Earth
                </a>{' '}
                data served by this site. How the figures are made is on the{' '}
                <Link to="/privacy/" className="border-b border-divider text-text no-underline hover:border-accent-strong">
                  privacy page
                </Link>
                .
              </p>
            </Prose>
          </section>
        </div>
      )}
    </Container>
  );
}

// SPDX-License-Identifier: MIT
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Container } from '~/components/Container';
import { Section } from '~/components/Section';
import { Prose } from '~/components/Prose';
import { Breadcrumbs } from '~/components/Breadcrumbs';
import { UsageGlobe } from '~/components/usage/UsageGlobe';
import { UsageTrend } from '~/components/usage/UsageTrend';
import { countryNames, mapCodes } from '~/lib/build-data/country-names.server';
import { getUsageSummary } from '~/lib/build-data/data.server';
import { type UsageShare, countryCodes, dayDate } from '~/lib/build-data/usage-summary';
import { BUBBLE_FROM } from '~/lib/usage/clusters';
import { useLiveSummary } from '~/lib/usage/live-summary';
import { withRegionNames } from '~/lib/usage/region-names';
import { formatIsoDate } from '~/lib/content/dates';
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
 * current one, which the server makes every hour (`useLiveSummary`). It
 * holds totals only: the installations of each country, and of each area
 * of about 100 km on the last day it was seen. Until the server has made
 * its first summary the page says so, and shows no figures.
 */

const TITLE = 'Where WireTrace is used';
const DESCRIPTION =
  'Active WireTrace installations, the countries and areas they are in, and the versions and systems they run, from the update checks.';
const PATH = `${usage.path}/`;

/** How the summary names systems, and how the page writes them. */
const SYSTEM_NAMES: Readonly<Record<string, string>> = {
  windows: 'Windows',
  linux: 'Linux',
  macos: 'macOS',
  other: 'Other',
};

export async function loader() {
  const summary = await getUsageSummary(usage.summaryUrl);
  return { summary, names: countryNames(summary === null ? [] : countryCodes(summary)), onMap: mapCodes() };
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

const number = new Intl.NumberFormat('en-US');

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 py-5 pr-4 sm:[&:not(:first-child)]:pl-4 sm:[&:not(:first-child)]:border-l border-divider">
      <p className="font-serif text-title text-text tabular-nums">{number.format(value)}</p>
      <p className="mt-1 font-sans text-ui-lg text-text-secondary">{label}</p>
    </div>
  );
}

function Shares({ title, rows, name }: { title: string; rows: readonly UsageShare[]; name: (value: string) => string }) {
  return (
    <div className="min-w-0">
      <h2 className="mb-4 font-serif text-title-sm text-text">{title}</h2>
      {rows.length === 0 ? (
        <p className="font-sans text-ui-lg text-text-secondary">None in the last 30 days.</p>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {rows.map((row) => (
            <li key={row.name} className="grid grid-cols-[14ch_minmax(0,1fr)_5ch] items-center gap-3 font-sans text-ui-lg">
              <span className="truncate text-text">{name(row.name)}</span>
              <span className="h-(--size-progress) rounded-xs bg-divider">
                <span
                  className={`block h-(--size-progress) rounded-xs ${row.name === 'other' ? 'bg-muted' : 'bg-accent'}`}
                  style={{ width: `${row.share * 100}%` }}
                />
              </span>
              <span className="text-right font-mono text-ui text-text-secondary tabular-nums">
                {Math.round(row.share * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function WireTraceUsage({ loaderData }: Route.ComponentProps) {
  const { onMap } = loaderData;
  const summary = useLiveSummary(loaderData.summary, usage.summaryUrl);
  // The built names cover every country on the map and in the built
  // summary; one that only the current summary holds is named here.
  const names = useMemo(
    () => withRegionNames(loaderData.names, summary === null ? [] : countryCodes(summary)),
    [loaderData.names, summary]
  );
  const outlined = useMemo(() => new Set(onMap), [onMap]);
  const [chosen, setChosen] = useState<string | null>(null);
  const installations = useMemo(
    () => new Map((summary?.countries ?? []).map((country) => [country.code, country.installations])),
    [summary]
  );
  const countries = useMemo(
    () =>
      (summary?.countries ?? [])
        .map(({ code, installations }) => ({ code, installations, name: names[code] ?? code }))
        .sort((a, b) => b.installations - a.installations || a.name.localeCompare(b.name, 'en')),
    [summary, names]
  );

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
        <h1 className="font-sans font-regular text-display-sm md:text-display text-text">
          {TITLE}
        </h1>
        <p className="mt-6 md:mt-8 font-serif text-lead text-text-secondary max-w-narrow">
          Installations of {wtMeta.title} that checked for updates, and the areas of about 100 km
          they checked from. Each dot is an installation; where an area has {BUBBLE_FROM} or more, or
          areas lie close together, one marker gives their number, and zooming in shows them apart.
          Drag the globe to turn it, scroll or use the buttons to zoom, and point at a marker or a
          country to see its figures. Markers that pulse checked in today or yesterday; steady ones
          within the last 30 days. Hollow markers are update checks from {wtMeta.title} 1.x, which
          cannot be counted as installations.
        </p>
      </section>

      {summary === null ? (
        <Section divided>
          <Prose>
            <p>
              The figures appear here once the update server has counted its first full day of
              update checks from {wtMeta.title} 2.0.
            </p>
          </Prose>
        </Section>
      ) : (
        <>
          <section aria-label="Active installations" className="grid grid-cols-2 sm:grid-cols-4 border-y border-divider">
            <Figure value={summary.active.day} label={`active on ${formatIsoDate(dayDate(summary.day))}`} />
            <Figure value={summary.active.week} label="in the last 7 days" />
            <Figure value={summary.active.month} label="in the last 30 days" />
            <Figure value={summary.countries.length} label={summary.countries.length === 1 ? 'country' : 'countries'} />
          </section>

          <section className="py-14 md:py-16">
            <UsageGlobe
              places={summary.places}
              day={summary.day}
              installations={installations}
              names={names}
              chosen={chosen}
            />
            <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 font-sans text-ui text-text-secondary">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
                Checked in today or yesterday
              </span>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-text-secondary" />
                Within the last 30 days
              </span>
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 rounded-full border border-text-secondary" />
                {wtMeta.title} 1.x update checks
              </span>
              <span>Arrow keys turn it; scroll, + and &minus; zoom</span>
            </div>
            {/* The dots come from the server's places, which run to today;
                the other counts from complete days only (the summary's day). */}
            <p className="mt-3 mx-auto max-w-narrow text-center font-sans text-ui text-text-secondary">
              An area shows the installations that checked in from it on the last day they did, and
              the 1.x update checks from it on the last day they came, today included. The other counts cover complete days (UTC), up to{' '}
              {formatIsoDate(dayDate(summary.day))}.
            </p>
          </section>

          {summary.trend.counts.length > 1 && (
            <Section label="Active installations, day by day" divided>
              <UsageTrend start={summary.trend.start} counts={summary.trend.counts} />
            </Section>
          )}

          <Section label="Versions and systems" divided>
            <div className="grid gap-10 sm:grid-cols-2 sm:gap-16">
              <Shares title="Versions" rows={summary.versions} name={(value) => (value === 'other' ? 'Other' : value)} />
              <Shares title="Systems" rows={summary.systems} name={(value) => SYSTEM_NAMES[value] ?? value} />
            </div>
            <p className="mt-8 font-sans text-ui-lg text-text-secondary max-w-narrow">
              Shares of the installations active in the last 30 days. {wtMeta.title} 1.x made{' '}
              {number.format(summary.legacyChecks)} update {summary.legacyChecks === 1 ? 'check' : 'checks'} on{' '}
              {formatIsoDate(dayDate(summary.day))}; 1.x does not say when it last checked, so it is not counted as
              installations.
            </p>
          </Section>

          <Section label="Countries" divided>
            {countries.length === 0 ? (
              <p className="font-sans text-ui-lg text-text-secondary">None in the last 30 days.</p>
            ) : (
              <>
                <ul className="m-0 grid list-none gap-x-8 gap-y-2 p-0 sm:grid-cols-2 md:grid-cols-3 font-sans text-ui-lg">
                  {countries.map(({ code, name, installations: count }) => (
                    <li key={code} className="flex min-w-0 items-baseline justify-between gap-3">
                      {/* A country too small for the map's outlines is named, not chosen. */}
                      {!outlined.has(code) ? (
                        <span className="min-w-0 truncate text-text-secondary">{name}</span>
                      ) : (
                        <button
                          type="button"
                          aria-pressed={chosen === code}
                          onClick={() => setChosen(chosen === code ? null : code)}
                          className="min-w-0 truncate cursor-pointer border-b border-transparent text-left text-text-secondary hover:text-text aria-pressed:border-accent-strong aria-pressed:text-text"
                        >
                          {name}
                        </button>
                      )}
                      <span className="shrink-0 font-mono text-ui text-text-secondary tabular-nums">
                        {number.format(count)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 font-sans text-ui-lg text-text-secondary max-w-narrow">
                  Installations active in each country in the last 30 days, each counted once.
                </p>
              </>
            )}
          </Section>

          <Section divided className="pb-24 md:pb-32">
            <Prose className="text-ui-lg text-text-secondary">
              <p>
                Totals up to {formatIsoDate(dayDate(summary.day))}, made from the update checks of{' '}
                {wtMeta.title} 2.x. The update server makes them every hour, and this page reads them
                when it opens. The marker of an area is drawn at a fixed point inside its
                one-degree area, never where a computer is. An area is named after its largest place,
                from{' '}
                <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" className="border-b border-divider text-text no-underline hover:border-accent-strong">
                  GeoNames
                </a>{' '}
                (
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="border-b border-divider text-text no-underline hover:border-accent-strong">
                  CC BY 4.0
                </a>
                ). The map is drawn in your browser from{' '}
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
          </Section>
        </>
      )}
    </Container>
  );
}

// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { Container } from '~/components/Container';
import { Section } from '~/components/Section';
import { Prose } from '~/components/Prose';
import { Button } from '~/components/Button';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '~/components/icons/Icon';
import { Breadcrumbs } from '~/components/Breadcrumbs';
import { ReleaseCard } from '~/components/ReleaseCard';
import { ReleasesTimeline } from '~/components/ReleasesTimeline';
import { ThemedScreenshot } from '~/components/ThemedScreenshot';
import { getProjectReleases } from '~/lib/build-data/data.server';
import { deriveDates } from '~/lib/content/dates';
import { pageMeta } from '~/lib/page-meta';
import { softwareApplicationSchema, breadcrumbSchema } from '~/lib/structured-data';
import type { Route } from './+types/projects.wiretrace';

import { meta as wtMeta } from '../../content/projects/wiretrace/meta';
import {
  SCREENSHOT_SIZE,
  type ScreenshotName,
  features,
  howItWorks,
  releaseSummaries,
  screenshotPath,
  screenshots,
  shortcuts,
  specs,
  usage,
} from '../../content/projects/wiretrace/content';
import { meta as storyMeta } from '../../content/writing/the-road-to-wiretrace-2/meta';

const wt = { ...wtMeta, ...deriveDates(wtMeta.published, wtMeta.updated) };

/**
 * WireTrace: the product page.
 *
 * Content sources:
 *   - Project metadata: `content/projects/wiretrace/meta.ts`
 *   - Features, specifications, shortcuts, pictures and release summaries:
 *     `content/projects/wiretrace/content.ts`
 *   - Releases: GitHub, read when the site is built (the loader below)
 *   - Long-form prose: inline below
 */

export async function loader() {
  return { releases: await getProjectReleases(wt) };
}

export const meta = () =>
  pageMeta({
    title: wt.title,
    description: wt.description,
    path: `/projects/${wt.slug}/`,
    structuredData: [
      softwareApplicationSchema({
        name: wt.title,
        description: wt.description,
        pageUrl: `/projects/${wt.slug}`,
        version: wt.version,
        operatingSystems: wt.platforms,
        downloadUrl: wt.downloadUrl,
      }),
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Projects', url: '/projects/' },
        { name: wt.title, url: `/projects/${wt.slug}/` },
      ]),
    ],
  });

const LINK = `
  text-text-secondary
  hover:text-text
  transition-colors
  no-underline
  border-b border-transparent hover:border-accent-strong
`;

const PROSE_LINK = `
  text-text
  border-b border-divider
  hover:border-accent-strong
  transition-colors
  no-underline
`;

function Screenshot({ name, wide, className }: { name: ScreenshotName; wide?: boolean; className?: string }) {
  return (
    <ThemedScreenshot
      light={screenshotPath(name, 'light')}
      dark={screenshotPath(name, 'dark')}
      alt={screenshots[name].alt}
      width={SCREENSHOT_SIZE.width}
      height={SCREENSHOT_SIZE.height}
      wide={wide}
      className={className}
    />
  );
}

function Table({ rows, mono }: { rows: readonly (readonly [string, string])[]; mono?: boolean }) {
  return (
    <div className="max-w-narrow">
      <table className="w-full">
        <tbody>
          {rows.map(([name, value], index) => (
            <tr key={name} className={index > 0 ? 'border-t border-divider' : ''}>
              <th
                scope="row"
                className={
                  mono
                    ? 'font-serif font-regular text-reading text-text text-left align-top py-3 pr-6'
                    : 'font-sans font-regular text-ui-lg text-text-secondary text-left align-top py-3 pr-6 w-[40%]'
                }
              >
                {name}
              </th>
              <td
                className={
                  mono
                    ? 'font-mono text-ui-lg text-text-secondary py-3 align-top'
                    : 'font-serif text-reading text-text py-3 align-top'
                }
              >
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProjectWireTrace({ loaderData }: Route.ComponentProps) {
  const { releases } = loaderData;
  return (
    <Container width="default">
      <section className="pt-12 md:pt-16 pb-12 md:pb-16">
        <Breadcrumbs
          crumbs={[
            { name: 'Home', href: '/' },
            { name: 'Projects', href: '/projects/' },
            { name: wt.title, href: `/projects/${wt.slug}/` },
          ]}
        />

        <h1 className="font-sans font-regular text-display-sm md:text-display text-text">
          {wt.title}
        </h1>

        <p className="mt-6 md:mt-8 font-serif text-lead text-text-secondary max-w-narrow">
          {wt.productTagline}
        </p>

        <p className="mt-6 font-sans text-ui-lg text-text-tertiary">
          v{wt.version} · {wt.platforms.join(' · ')} · Open source · {wt.license}
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Button href={wt.downloadUrl} external>
            Download
          </Button>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-ui-lg">
            <a href={wt.githubUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
              View on GitHub
            </a>
            <span aria-hidden="true" className="text-text-tertiary">·</span>
            <Link to={`${usage.path}/`} className={LINK}>
              Where it is used
            </Link>
            <span aria-hidden="true" className="text-text-tertiary">·</span>
            <a href={wt.issuesUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
              Report an issue
            </a>
          </div>
        </div>
      </section>

      <Screenshot name="session" wide className="mb-16 md:mb-20" />

      <Section label="Why this exists" divided>
        <Prose>
          <p>
            {wt.title} was built for a real need on my team. I am a software engineer in a research
            and development lab, where we build industrial devices, and serial monitoring is part of
            almost everything we do: bringing up new hardware, capturing data from a device for
            later analysis, and working out what a board is reporting.
          </p>
          <p>
            The serial tools we had each left a gap. {wt.title} was written to close those gaps, and
            it has been used on our bench since its first release.
          </p>
        </Prose>
      </Section>

      <Section label="Where it came from" divided>
        <Prose>
          <p>
            It began as SerialLoggerPro, a single Python file written at a colleague&rsquo;s
            request: one port, one device, one log file. When the team needed several devices at
            once, it was rewritten from the start and released in April 2026 as {wt.title} 1.0.
          </p>
          <p>
            Versions 1.1 and 1.2 followed within three months, each shaped by feedback from the
            lab: a live plotter, fixes, and Linux builds. They remain available on GitHub under the
            MIT License.
          </p>
        </Prose>
      </Section>

      <Section label="Why 2.0" divided>
        <Prose>
          <p>
            Months of real use showed where 1.x reached its limits: sessions that nobody had thought
            to log, the last lines missing after a disconnect, logs too large to work with, and long
            sessions that slowed down.
          </p>
          <p>
            These shared one cause, so 2.0 does not patch them. The path from the serial port to the
            disk is rebuilt, and the interface, the updater and the release process are rebuilt
            with it.
          </p>
          <p>
            <Link to={`/writing/${storyMeta.slug}/`} className={PROSE_LINK}>
              Read the full story
            </Link>
          </p>
        </Prose>
      </Section>

      <Section label="How it works" divided>
        <div className="space-y-6 max-w-narrow">
          {howItWorks.map((item) => (
            <p key={item.title} className="font-serif text-reading text-text">
              <strong className="font-semibold">{item.title}.</strong> {item.text}
            </p>
          ))}
        </div>
      </Section>

      <Section label="Features" divided>
        <div className="space-y-6">
          {features.map((feature) => (
            <div key={feature.title} className="space-y-10">
              <p className="font-serif text-reading text-text max-w-narrow">
                <strong className="font-semibold">{feature.title}.</strong> {feature.description}
              </p>
              {feature.screenshot && <Screenshot name={feature.screenshot} className="pb-4" />}
            </div>
          ))}
        </div>
      </Section>

      <Section label="Specifications" divided>
        <Table rows={specs.map((row) => [row.property, row.value] as const)} />
      </Section>

      <Section label="System requirements" divided>
        <Prose>
          <p>
            {wt.title} runs on 64-bit Windows 10 (version 1809) and later, and on 64-bit Linux with
            glibc 2.35 or later, which includes Ubuntu 22.04 and later. On macOS it runs from source.
          </p>
          <p>
            It draws in software and does not need a graphics card, so it also runs in remote
            desktop sessions and virtual machines.
          </p>
          <p>Windows 7, 8 and 8.1 are not supported.</p>
        </Prose>
      </Section>

      <Section label="Keyboard shortcuts" divided>
        <Table rows={shortcuts.map((row) => [row.action, row.keys] as const)} mono />
      </Section>

      <Section label="Download and install" divided>
        <Prose>
          <p>
            <strong className="font-semibold">Windows.</strong> Download the installer from GitHub
            Releases and run it. It installs for you alone, without administrator rights, or for all
            users.
          </p>
          <p>
            <strong className="font-semibold">Linux.</strong> Download the AppImage, make it
            executable and run it. It updates itself when you choose. For Debian and Ubuntu there is
            also a <code className="font-mono text-mono">.deb</code>.
          </p>
          <p>
            <strong className="font-semibold">macOS.</strong> Clone the repository and run from
            source.
          </p>
        </Prose>
        <div className="mt-10 max-w-narrow">
          <ReleaseCard
            name={wt.title}
            release={releases[0] ?? null}
            version={wt.version}
            downloadUrl={wt.downloadUrl}
            releasesUrl={wt.releasesUrl}
          />
          <div className="mt-6">
            <a href={wt.githubUrl} target="_blank" rel="noopener noreferrer" className={`font-sans text-ui-lg ${LINK}`}>
              View the source on GitHub
            </a>
          </div>
        </div>
      </Section>

      <Section label="Open source" divided>
        <Prose>
          <p>
            {wt.title} is free and open source under the GNU General Public License, version 3 or
            later. Use it, study it, change it and share it. Versions 1.0 to 1.2 remain available
            under the MIT License.
          </p>
        </Prose>
      </Section>

      <Section label="Privacy" divided>
        <Prose>
          <p>
            What your devices send stays on your computer. {wt.title} checks for a new version when
            it starts and every 12 hours, and you can turn the check off. Usage statistics are off
            unless you switch them on; they never include anything a device sent, and switching
            them off deletes them. Everything {wt.title} sends is set out on the{' '}
            <Link to="/privacy/" className={PROSE_LINK}>privacy page</Link>, and the totals are on{' '}
            <Link to={`${usage.path}/`} className={PROSE_LINK}>where it is used</Link>.
          </p>
        </Prose>
      </Section>

      {releases.length > 0 && (
        <Section label="Releases" divided>
          <ReleasesTimeline releases={releases} summaries={releaseSummaries} />
        </Section>
      )}

      <footer className="pb-24 md:pb-32 pt-12 mt-8 border-t border-divider max-w-narrow">
        <p className="font-serif text-ui-lg text-text-tertiary mb-6">
          WireTrace, as used here, is an independent open-source serial data monitor by The Nuance
          Project. It is not affiliated with, sponsored by, or endorsed by any other product or
          company that may use a similar name in a different category.
        </p>
        <p className="font-sans text-ui-lg text-text-tertiary mb-6">
          {wt.updatedDate ? (
            <>
              Released {wt.publishedDate}
              <span className="mx-2">·</span>
              Updated {wt.updatedDate}
            </>
          ) : (
            <>Released {wt.publishedDate}</>
          )}
        </p>
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 font-sans text-ui-lg text-text-tertiary hover:text-text transition-colors duration-(--duration-fast) no-underline"
        >
          <Icon icon={ArrowLeft} />
          <span>Back to projects</span>
        </Link>
      </footer>
    </Container>
  );
}

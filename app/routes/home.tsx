// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { siteConfig } from '~/config/site.config';
import { latestActiveProjects } from '~/lib/content/projects';
import { latestWriting } from '~/lib/content/writing';
import { Container } from '~/components/Container';
import { Section } from '~/components/Section';
import { RevealHeading } from '~/components/RevealHeading';
import { ProjectCard } from '~/components/ProjectCard';
import { ReleaseCard } from '~/components/ReleaseCard';
import { getProjectReleases } from '~/lib/build-data/data.server';
import { ArrowRight } from 'lucide-react';
import { Icon } from '~/components/icons/Icon';
import { pageMeta } from '~/lib/page-meta';
import {
  organizationSchema,
  websiteSchema,
} from '~/lib/structured-data';
import type { Route } from './+types/home';

/**
 * Home: the studio's front door.
 *
 * The Work and Writing sections each show the latest three entries,
 * sourced from the auto-discovery loaders. Drop a folder into
 * `content/projects/` or `content/writing/` and it appears here
 * without code changes.
 *
 * Structure:
 *   1. Hero           : headline and lead paragraph
 *   2. Work section   : latest 3 active projects, each with its latest
 *                        release (read from GitHub at build), + "All projects"
 *   3. Writing section: latest 3 essays or an empty state
 *   4. About section  : short blurb linking to /about
 */

export const meta = () =>
  pageMeta({
    title: siteConfig.identity.name,
    titleAsIs: true,
    description: siteConfig.identity.tagline,
    path: '/',
    structuredData: [organizationSchema(), websiteSchema()],
  });

const HOME_PROJECTS = 3;

export async function loader() {
  const projects = latestActiveProjects(HOME_PROJECTS);
  const releases = await Promise.all(projects.map((project) => getProjectReleases(project)));
  return { latest: Object.fromEntries(projects.map((project, i) => [project.slug, releases[i]?.[0] ?? null])) };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const projects = latestActiveProjects(HOME_PROJECTS);
  const writing = latestWriting(3);

  return (
    <Container width="default">
      {/* Hero */}
      <section className="pt-20 md:pt-32 pb-20 md:pb-28">
        <RevealHeading
          className="
            font-sans font-regular
            text-display-sm md:text-display lg:text-display-lg
            text-text
            max-w-[18ch]
          "
          text="A small studio for software, writing, and the work that lives outside of working hours."
        />

        <p
          className="
            mt-8 md:mt-10
            font-serif text-lead
            text-text-secondary
            max-w-narrow
          "
        >
          {siteConfig.identity.name} is where I keep the things I build on
          my own time. The software, the writing, the occasional note on
          something I&rsquo;ve been thinking about. It is mine, and it
          grows when there is something worth adding to it.
        </p>
      </section>

      {/* Work */}
      <Section label="Work" divided>
        {projects.length === 0 ? (
          <p
            className="
              font-serif text-reading
              text-text-secondary
              max-w-narrow
            "
          >
            Nothing here yet.
          </p>
        ) : (
          <>
            {projects.map((project) => (
              <div key={project.slug}>
                <ProjectCard
                  name={project.title}
                  meta={`v${project.version} · ${project.status}`}
                  availability={`Available for ${project.platforms.join(', ')}`}
                  description={project.tagline}
                  href={`/projects/${project.slug}`}
                />
                <div className="mt-6 max-w-narrow">
                  <ReleaseCard
                    name={project.title}
                    release={loaderData.latest[project.slug] ?? null}
                    version={project.version}
                    downloadUrl={project.downloadUrl}
                    releasesUrl={project.releasesUrl}
                  />
                </div>
              </div>
            ))}

            <div className="pt-8">
              <Link
                to="/projects"
                className="
                  inline-flex items-center gap-2
                  font-sans text-ui-lg
                  text-text-tertiary
                  hover:text-text
                  transition-colors duration-(--duration-fast)
                  no-underline
                "
              >
                <span>All projects</span>
                <Icon icon={ArrowRight} />
              </Link>
            </div>
          </>
        )}
      </Section>

      {/* Writing */}
      <Section label="Writing" divided>
        {writing.length === 0 ? (
          <p
            className="
              font-serif text-reading
              text-text-secondary
              max-w-narrow
            "
          >
            Nothing here yet. When I write something worth sharing, it
            will appear here.
          </p>
        ) : (
          <>
            <ul className="-mt-2">
              {writing.map((piece) => (
                <li
                  key={piece.slug}
                  className="
                    border-b border-divider
                    first:border-t
                  "
                >
                  <Link
                    to={`/writing/${piece.slug}`}
                    className="
                      group block
                      py-6 md:py-8
                      transition-colors duration-(--duration-fast)
                      hover:bg-surface
                      no-underline
                      -mx-(--web-gutter-phone) md:-mx-(--web-gutter-tablet) lg:-mx-(--web-gutter-desktop)
                      px-(--web-gutter-phone) md:px-(--web-gutter-tablet) lg:px-(--web-gutter-desktop)
                    "
                  >
                    <p
                      className="
                        text-label font-sans font-medium
                        uppercase
                        text-text-tertiary
                        mb-2
                      "
                    >
                      {piece.displayDate}
                    </p>
                    <h3
                      className="
                        font-sans text-title-sm
                        text-text
                        font-regular
                        mb-2
                      "
                    >
                      {piece.title}
                    </h3>
                    <p
                      className="
                        font-serif text-body
                        text-text-secondary
                        max-w-narrow
                      "
                    >
                      {piece.description}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="pt-8">
              <Link
                to="/writing"
                className="
                  inline-flex items-center gap-2
                  font-sans text-ui-lg
                  text-text-tertiary
                  hover:text-text
                  transition-colors duration-(--duration-fast)
                  no-underline
                "
              >
                <span>All writing</span>
                <Icon icon={ArrowRight} />
              </Link>
            </div>
          </>
        )}
      </Section>

      {/* About */}
      <Section label="About" divided className="pb-24 md:pb-32">
        <p
          className="
            font-serif text-reading
            text-text
            max-w-narrow
          "
        >
          I&rsquo;m {siteConfig.author.shortName}. I&rsquo;m a software
          engineer in Bangalore. I currently work in research and
          development at a company in the electrical safety and
          reliability space. My team builds Industrial IoT (IIoT)
          products in that space, and I work on the software side.
          {' '}{siteConfig.identity.name} is what I do with the rest of
          my time and attention.
        </p>

        <div className="mt-8">
          <Link
            to="/about"
            className="
              inline-flex items-center gap-2
              font-sans text-ui-lg
              text-text
              no-underline
              border-b border-transparent hover:border-accent-strong
              transition-colors duration-(--duration-fast)
            "
          >
            <span>More about me</span>
            <Icon icon={ArrowRight} />
          </Link>
        </div>
      </Section>
    </Container>
  );
}

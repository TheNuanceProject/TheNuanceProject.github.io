// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { siteConfig } from '~/config/site.config';
import { latestActiveProjects } from '~/lib/content/projects';
import { latestWriting } from '~/lib/content/writing';
import { Container } from '~/components/Container';
import { Section } from '~/components/Section';
import { ProjectCard } from '~/components/ProjectCard';
import { ArrowIcon } from '~/components/icons/ArrowIcon';
import { pageMeta } from '~/lib/page-meta';
import {
  organizationSchema,
  websiteSchema,
} from '~/lib/structured-data';

/**
 * Home — the studio's front door.
 *
 * The Work and Writing sections each show the latest three entries,
 * sourced from the auto-discovery loaders. Drop a folder into
 * `content/projects/` or `content/writing/` and it appears here
 * without code changes.
 *
 * Structure:
 *   1. Hero            — headline and lead paragraph
 *   2. Work section    — latest 3 active projects + "All projects"
 *   3. Writing section — latest 3 essays or an empty state
 *   4. About section   — short blurb linking to /about
 */

export const meta = () =>
  pageMeta({
    title: siteConfig.identity.name,
    titleAsIs: true,
    description: siteConfig.identity.tagline,
    path: '/',
    structuredData: [organizationSchema(), websiteSchema()],
  });

export default function Home() {
  const projects = latestActiveProjects(3);
  const writing = latestWriting(3);

  return (
    <Container width="default">
      {/* Hero */}
      <section className="pt-20 md:pt-32 pb-20 md:pb-28">
        <h1
          className="
            font-display font-normal
            text-[2.5rem] md:text-[3.75rem] lg:text-[4.5rem]
            leading-[1.05] tracking-[-0.02em]
            text-[var(--color-text-primary)]
            max-w-[18ch]
          "
        >
          A small studio for software, writing, and the work that lives
          outside of working hours.
        </h1>

        <p
          className="
            mt-8 md:mt-10
            font-body text-[19px] md:text-xl
            leading-[1.65]
            text-[var(--color-text-secondary)]
            max-w-[var(--container-narrow)]
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
              font-body text-[17px] leading-[1.75]
              text-[var(--color-text-secondary)]
              max-w-[var(--container-narrow)]
            "
          >
            Nothing here yet.
          </p>
        ) : (
          <>
            {projects.map((project) => (
              <ProjectCard
                key={project.slug}
                name={project.title}
                availability={`Available for ${project.platforms.join(', ')}`}
                description={project.tagline}
                href={`/projects/${project.slug}`}
              />
            ))}

            <div className="pt-8">
              <Link
                to="/projects"
                className="
                  inline-flex items-center gap-2
                  font-display text-sm
                  text-[var(--color-text-mid)]
                  hover:text-[var(--color-text-primary)]
                  transition-colors duration-150
                  no-underline
                "
              >
                <span>All projects</span>
                <ArrowIcon />
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
              font-body text-[17px] leading-[1.75]
              text-[var(--color-text-secondary)]
              max-w-[var(--container-narrow)]
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
                    border-b border-[var(--color-border)]
                    first:border-t
                  "
                >
                  <Link
                    to={`/writing/${piece.slug}`}
                    className="
                      group block
                      py-6 md:py-8
                      transition-colors duration-150
                      hover:bg-[var(--color-surface)]
                      no-underline
                      -mx-6 md:-mx-12 lg:-mx-16
                      px-6 md:px-12 lg:px-16
                    "
                  >
                    <p
                      className="
                        text-xs font-display font-medium
                        uppercase tracking-[0.08em]
                        text-[var(--color-text-mid)]
                        mb-2
                      "
                    >
                      {piece.displayDate}
                    </p>
                    <h3
                      className="
                        font-display text-lg md:text-xl
                        text-[var(--color-text-primary)]
                        font-normal tracking-[-0.01em]
                        mb-2
                      "
                    >
                      {piece.title}
                    </h3>
                    <p
                      className="
                        font-body text-[16px] leading-[1.55]
                        text-[var(--color-text-secondary)]
                        max-w-[var(--container-narrow)]
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
                  font-display text-sm
                  text-[var(--color-text-mid)]
                  hover:text-[var(--color-text-primary)]
                  transition-colors duration-150
                  no-underline
                "
              >
                <span>All writing</span>
                <ArrowIcon />
              </Link>
            </div>
          </>
        )}
      </Section>

      {/* About */}
      <Section label="About" divided className="pb-24 md:pb-32">
        <p
          className="
            font-body text-[17px] leading-[1.75]
            text-[var(--color-text-primary)]
            max-w-[var(--container-narrow)]
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
              font-display text-sm
              text-[var(--color-text-primary)]
              no-underline
              border-b border-transparent hover:border-[var(--color-accent)]
              transition-colors duration-150
            "
          >
            <span>More about me</span>
            <ArrowIcon />
          </Link>
        </div>
      </Section>
    </Container>
  );
}

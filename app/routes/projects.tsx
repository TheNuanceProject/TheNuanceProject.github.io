// SPDX-License-Identifier: MIT
import { siteConfig } from '~/config/site.config';
import { allProjects } from '~/lib/content/projects';
import { Container } from '~/components/Container';
import { ProjectCard } from '~/components/ProjectCard';
import { pageMeta } from '~/lib/page-meta';
import { breadcrumbSchema } from '~/lib/structured-data';

/**
 * Projects — index page listing every project under the studio.
 *
 * Auto-discovered from `content/projects/[slug]/meta.ts`. Sort
 * order: lifecycle status (Active → Maintained → Archived), then
 * effective date within each tier.
 */

export const meta = () =>
  pageMeta({
    title: 'Projects',
    description: `The software built and shipped under ${siteConfig.identity.name}.`,
    path: '/projects',
    structuredData: [
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Projects', url: '/projects' },
      ]),
    ],
  });

export default function Projects() {
  const projects = allProjects;
  const isEmpty = projects.length === 0;

  return (
    <Container width="default">
      <section className="pt-20 md:pt-28 pb-12 md:pb-16">
        <h1
          className="
            font-display font-normal
            text-3xl md:text-[2.75rem]
            leading-[1.15] tracking-[-0.02em]
            text-[var(--color-text-primary)]
          "
        >
          Projects
        </h1>

        <p
          className="
            mt-6 md:mt-8
            font-body text-[19px] md:text-xl
            leading-[1.55]
            text-[var(--color-text-secondary)]
            max-w-[var(--container-narrow)]
          "
        >
          The software I&rsquo;ve built and shipped under{' '}
          {siteConfig.identity.name}. New work appears here as it becomes
          available.
        </p>
      </section>

      <section className="pb-24 md:pb-32">
        {isEmpty ? (
          <p
            className="
              border-t border-[var(--color-border)]
              pt-12
              font-body text-[17px] leading-[1.75]
              text-[var(--color-text-secondary)]
              max-w-[var(--container-narrow)]
            "
          >
            Nothing here yet.
          </p>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.slug}
              name={project.title}
              description={project.tagline}
              meta={`v${project.version} · ${project.status}`}
              tags={project.platforms}
              href={`/projects/${project.slug}`}
            />
          ))
        )}
      </section>
    </Container>
  );
}

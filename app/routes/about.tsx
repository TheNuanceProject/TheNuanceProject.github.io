// SPDX-License-Identifier: MIT
import { siteConfig } from '~/config/site.config';
import { Container } from '~/components/Container';
import { Section } from '~/components/Section';
import { P, A } from '~/components/writing-prose';
import { pageMeta } from '~/lib/page-meta';
import { personSchema, breadcrumbSchema } from '~/lib/structured-data';

/**
 * About — the studio's "who and why" page.
 *
 * First-person throughout, factual and restrained. The Person
 * JSON-LD schema on this page consolidates the author's identity
 * across every platform listed in `siteConfig.author.sameAs` so
 * search engines resolve them as one entity.
 *
 * Structure:
 *   1. Page header
 *   2. The Nuance Project — what the studio is and why
 *   3. About me           — brief factual bio
 *   4. Get in touch       — email and LinkedIn
 */

export const meta = () =>
  pageMeta({
    title: 'About',
    description: `About ${siteConfig.identity.name} and its author, ${siteConfig.author.shortName}.`,
    path: '/about',
    ogType: 'profile',
    structuredData: [
      personSchema(),
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'About', url: '/about' },
      ]),
    ],
  });

export default function About() {
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
          About
        </h1>
      </section>

      <Section label="The Nuance Project" divided>
        <div className="max-w-[var(--container-narrow)]">
          <P>
            {siteConfig.identity.name} is a small, independent studio.
            It is a single place to keep the work that comes out of my
            own hours — the software I build for myself or for people
            who need it, the writing I publish when I have something
            worth saying, and the occasional note on something
            I&rsquo;ve been working through.
          </P>

          <P>
            The work here is shipped under the studio&rsquo;s name
            rather than my own because I want it to stand on its own. A
            piece of software is a piece of software. Whether the
            person behind it is a company of one or a company of one
            hundred shouldn&rsquo;t change what the software does or
            how reliably it does it. The studio is the home for that
            work, the website is its front door, and the name on the
            door is {siteConfig.identity.name}.
          </P>

          <P>
            What you&rsquo;ll find here is intentionally narrow. There
            won&rsquo;t be dozens of projects. The plan is to put out a
            small number of things that are actually finished, that
            are maintained over time, and that hold up to use — not a
            long list of half-built experiments. The same goes for the
            writing. When there is something to share, it appears here.
            When there isn&rsquo;t, the page stays quiet.
          </P>

          <P>
            Updates to anything on this site happen on the studio&rsquo;s
            own pace. No newsletter. No social feed. The work is the
            signal — when something new is here, you&rsquo;ll see it on
            the page.
          </P>
        </div>
      </Section>

      <Section label="About me" divided>
        <div className="max-w-[var(--container-narrow)]">
          <P>
            I&rsquo;m {siteConfig.author.fullName}. Most people call me{' '}
            {siteConfig.author.shortName}.
          </P>

          <P>
            I&rsquo;m a software engineer in Bangalore. I currently
            work in research and development at a company in the
            electrical safety and reliability space. My team builds
            Industrial IoT (IIoT) products in that space, and I work on
            the software side. {siteConfig.identity.name} is what I do
            with the rest of my time and attention.
          </P>

          <P>
            I have a master&rsquo;s degree in computer science from
            Northumbria University, Newcastle.
          </P>
        </div>
      </Section>

      <Section label="Get in touch" divided className="pb-24 md:pb-32">
        <div className="max-w-[var(--container-narrow)]">
          <P>The best way to reach me is by email.</P>

          <p
            className="
              font-mono text-[17px]
              text-[var(--color-text-primary)]
              mb-6
            "
          >
            <a
              href={`mailto:${siteConfig.author.email}`}
              className="
                text-[var(--color-text-primary)]
                border-b border-[var(--color-border)]
                hover:border-[var(--color-accent)]
                transition-colors duration-150
                no-underline
              "
            >
              {siteConfig.author.email}
            </a>
          </p>

          <P>
            I&rsquo;m also on{' '}
            <A href={siteConfig.links.linkedin}>LinkedIn</A>.
          </P>
        </div>
      </Section>
    </Container>
  );
}

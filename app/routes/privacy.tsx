// SPDX-License-Identifier: MIT
import { siteConfig } from '~/config/site.config';
import { Container } from '~/components/Container';
import { Section } from '~/components/Section';
import { P, A, UL } from '~/components/writing-prose';
import { pageMeta } from '~/lib/page-meta';
import { breadcrumbSchema } from '~/lib/structured-data';

/**
 * Privacy — the /privacy page.
 *
 * First-person, conversational. Describes what the site records
 * when someone visits, what it does not, and who sees the data.
 * Linked from the footer on every page.
 */

export const meta = () =>
  pageMeta({
    title: 'Privacy',
    description:
      'A short, plain explanation of what this site records when you visit and what it does not.',
    path: '/privacy',
    structuredData: [
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Privacy', url: '/privacy' },
      ]),
    ],
  });

export default function Privacy() {
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
          Privacy
        </h1>
      </section>

      <Section label="The short version" divided>
        <div className="max-w-[var(--container-narrow)]">
          <P>
            I use Cloudflare Web Analytics to get a rough sense of how
            many people visit and which pages they read. It&rsquo;s
            cookieless, it doesn&rsquo;t follow you around the web, and
            it doesn&rsquo;t know who you are. It just counts visits.
          </P>
          <P>
            If you&rsquo;d rather not be counted, any browser extension
            that blocks analytics will skip it. The site works exactly
            the same either way.
          </P>
        </div>
      </Section>

      <Section label="What gets recorded" divided>
        <div className="max-w-[var(--container-narrow)]">
          <P>When you load a page, Cloudflare sees:</P>
          <UL>
            <li>Which page you opened</li>
            <li>The site you came from, if any</li>
            <li>Your country (nothing more specific than that)</li>
            <li>Your browser and operating system, in general terms</li>
            <li>Whether you&rsquo;re on a phone, tablet, or desktop</li>
            <li>How long the page took to load</li>
          </UL>
          <P>
            That&rsquo;s really all of it. It&rsquo;s the kind of thing
            that helps me notice &ldquo;a lot of people are reading the
            WireTrace page this week&rdquo; without ever having to know
            who those people are.
          </P>
        </div>
      </Section>

      <Section label="What doesn't get recorded" divided>
        <div className="max-w-[var(--container-narrow)]">
          <P>
            No name, no email, no precise IP, no cookies. Nothing that
            lets me (or Cloudflare) recognise you from one visit to the
            next. If you come back tomorrow, as far as the system is
            concerned you&rsquo;re a new visitor.
          </P>
          <P>
            If that ever changes &mdash; say, if I add a newsletter
            signup and you choose to share your email &mdash; this is
            the page where I&rsquo;ll write about it first.
          </P>
        </div>
      </Section>

      <Section label="Who sees the numbers" divided>
        <div className="max-w-[var(--container-narrow)]">
          <P>
            Just me. The dashboard lives inside my Cloudflare account.
            It&rsquo;s not embedded on the site, not linked from
            anywhere public, and not shared with anyone else.
          </P>
          <P>
            Cloudflare is a US-based company with servers around the
            world. If you want to read their side of this, their
            privacy policy is at{' '}
            <A href="https://www.cloudflare.com/privacypolicy/">
              cloudflare.com/privacypolicy
            </A>
            , and the page for the analytics product itself is at{' '}
            <A href="https://www.cloudflare.com/web-analytics/">
              cloudflare.com/web-analytics
            </A>
            .
          </P>
        </div>
      </Section>

      <Section label="Questions" divided className="pb-24 md:pb-32">
        <div className="max-w-[var(--container-narrow)]">
          <P>
            If anything here feels unclear, or if you want to ask about
            your visit specifically, drop me a line at{' '}
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
            . I&rsquo;m happy to talk through it.
          </P>
          <P>
            If I ever change how any of this works, I&rsquo;ll update
            this page before the change goes live.
          </P>
        </div>
      </Section>
    </Container>
  );
}

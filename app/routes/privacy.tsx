// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';

import { siteConfig } from '~/config/site.config';
import { Container } from '~/components/Container';
import { Section } from '~/components/Section';
import { P, A, B, UL, LI } from '~/components/writing-prose';
import { pageMeta } from '~/lib/page-meta';
import { breadcrumbSchema } from '~/lib/structured-data';

/**
 * Privacy, the /privacy page: the privacy policy of this website and
 * of WireTrace.
 *
 * It is the full policy that WireTrace's own privacy statement
 * (updater/privacy.py in the WireTrace repository, shown by the
 * Windows installer and in the application) refers to. What it says
 * about the update check and usage statistics must match that
 * statement, the code that sends them, and the update server
 * (wiretrace-updates) that receives them. Change all of them together.
 */

/** When this policy last changed. Updated with every change to it. */
const LAST_UPDATED = '22 October 2026';

/** How long the update server keeps what it keeps. They match the
 *  update server (wiretrace-updates/src/fold.ts) and WireTrace. */
const REPORTS_KEPT_MONTHS = 14;
const CHECKS_KEPT_YEARS = 2;
const DELETION_COMPLETE_DAYS = 30;
const UPDATE_CHECK_INTERVAL_HOURS = 12;

export const meta = () =>
  pageMeta({
    title: 'Privacy policy',
    description:
      'What this website and the WireTrace application collect, why, for how long, who handles it, and your rights.',
    path: '/privacy/',
    structuredData: [
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Privacy', url: '/privacy/' },
      ]),
    ],
  });

function Mail() {
  return (
    <a
      href={`mailto:${siteConfig.author.email}`}
      className="
        text-text
        border-b border-divider
        hover:border-accent-strong
        transition-colors duration-(--duration-fast)
        no-underline
      "
    >
      {siteConfig.author.email}
    </a>
  );
}

function Part({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <Section label={label} divided className={last ? 'pb-24 md:pb-32' : undefined}>
      <div className="max-w-narrow">{children}</div>
    </Section>
  );
}

export default function Privacy() {
  const site = siteConfig.identity.domain;
  return (
    <Container width="default">
      <section className="pt-20 md:pt-28 pb-12 md:pb-16">
        <h1
          className="
            font-sans font-regular
            text-display-sm
            text-text
          "
        >
          Privacy policy
        </h1>
        <p className="mt-4 font-sans text-ui-lg text-text-secondary">
          Last updated {LAST_UPDATED}
        </p>
      </section>

      <Part label="1. Who we are">
        <P>
          This website, {site}, and the WireTrace application are published by{' '}
          {siteConfig.author.fullName}, an individual in Bengaluru, India, trading as{' '}
          {siteConfig.identity.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
        </P>
        <P>
          We are the controller of the personal data described in this policy under the EU and UK
          General Data Protection Regulation (GDPR), and the data fiduciary under India&rsquo;s
          Digital Personal Data Protection Act, 2023.
        </P>
        <P>
          Contact: <Mail />
        </P>
      </Part>

      <Part label="2. Summary">
        <UL>
          <LI>What your devices send to WireTrace stays on your computer. WireTrace never transmits it.</LI>
          <LI>This website uses no cookies, no advertising and no cross-site tracking.</LI>
          <LI>WireTrace&rsquo;s update check carries no identifier.</LI>
          <LI>Usage statistics are off unless you switch them on, and switching them off deletes them.</LI>
          <LI>We do not store IP addresses, and we never sell personal data or use it for advertising or profiling.</LI>
        </UL>
      </Part>

      <Part label="3. Information we collect">
        <P>
          <B>When you visit this website.</B> Our hosting providers receive your IP address and
          browser details to deliver each page, as every website does. We count visits with
          Cloudflare Web Analytics, which sets no cookie. It records the page visited, the
          referring page, your country, your browser, operating system and device type, and page
          load time. We see totals only.
        </P>
        <P>
          <B>WireTrace: the update check.</B> While the update check is on, WireTrace contacts our
          update server when it starts and every {UPDATE_CHECK_INTERVAL_HOURS} hours to find out
          whether a new version is available. Each check states the WireTrace version, operating
          system, processor type, how WireTrace was installed, and the date of its previous check.
          It contains no identifier and no information about you, your devices or your data.
        </P>
        <P>
          From the IP address of the check, our server derives your country and an approximate
          area of about 100 km. The IP address is used only briefly to protect the service against
          abuse and is never stored. Checks are kept only as daily totals; no record of an
          individual check is kept. You can turn the update check off in the installer, or at any
          time in WireTrace&rsquo;s Preferences.
        </P>
        <P>
          <B>WireTrace: usage statistics (optional).</B> Usage statistics are off by default. If you
          switch them on, WireTrace creates a random identifier on your computer and sends one
          report for each day it is used. A report states the WireTrace version, operating system,
          processor type and installation type; which features were used; whether certain problems
          occurred, such as lost lines or a lost connection; general usage ranges, such as how long
          a window stayed open; and the theme and display scale. The full list is shown in
          WireTrace before you switch them on.
        </P>
        <P>
          A report never contains port or device names, file names, commands, or any data from your
          devices. We store reports under a pseudonymised form of the identifier and never with
          your IP address. When you switch usage statistics off, WireTrace deletes the identifier
          from your computer and asks our server to delete every report sent under it.
        </P>
        <P>
          <B>When you contact us.</B> If you email us, we receive your email address and whatever
          your message contains, and use it only to reply.
        </P>
      </Part>

      <Part label="4. What we publish">
        <P>
          The WireTrace usage page shows totals only: the number of active installations over
          recent periods, the countries and areas of about 100 km they are in, the versions and
          operating systems in use, update checks from WireTrace 1.x, and the number of downloads.
          No figure identifies an installation or a person, and a map marker is placed at the
          largest town of its area, never at the location a check came from.
        </P>
      </Part>

      <Part label="5. How we use information, and our legal basis">
        <UL>
          <LI>
            <B>Delivering and securing this website, and counting visits:</B> our legitimate
            interest in operating and improving the website (GDPR Art. 6(1)(f)).
          </LI>
          <LI>
            <B>The update check:</B> offering updates, and understanding which versions and systems
            are in use and where; our legitimate interest in keeping WireTrace secure and up to
            date (GDPR Art. 6(1)(f)).
          </LI>
          <LI>
            <B>Usage statistics:</B> improving WireTrace; your consent (GDPR Art. 6(1)(a); Digital
            Personal Data Protection Act, 2023, Section 6), which you can withdraw at any time.
          </LI>
          <LI>
            <B>Replying to your email:</B> our legitimate interest in answering you (GDPR Art.
            6(1)(f)).
          </LI>
        </UL>
        <P>
          You may object to processing based on legitimate interest, for example by blocking
          analytics in your browser or turning the update check off. We make no automated decisions
          about anyone.
        </P>
      </Part>

      <Part label="6. Who receives information">
        <P>We do not sell or share personal data. These service providers process it on our behalf:</P>
        <UL>
          <LI>
            <B>Cloudflare, Inc.:</B> content delivery, the update server and its database, and visit
            statistics.{' '}
            <A href="https://www.cloudflare.com/privacypolicy/">Privacy policy</A>
          </LI>
          <LI>
            <B>GitHub, Inc.:</B> hosting of this website, including the file the update check reads,
            and of WireTrace downloads. Usage statistics never reach GitHub.{' '}
            <A href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">Privacy statement</A>
          </LI>
          <LI>
            <B>Zoho Corporation:</B> email.{' '}
            <A href="https://www.zoho.com/privacy.html">Privacy policy</A>
          </LI>
        </UL>
        <P>We may disclose information where the law requires it.</P>
      </Part>

      <Part label="7. International transfers">
        <P>
          Our service providers process data in the countries where they operate, including the
          United States. They protect transfers out of the European Economic Area, the United
          Kingdom and India with recognised safeguards, such as Standard Contractual Clauses, as
          described in their own policies.
        </P>
      </Part>

      <Part label="8. How long we keep information">
        <UL>
          <LI><B>IP addresses:</B> not stored by us.</LI>
          <LI>
            <B>Update checks, as daily totals by country and area:</B> {CHECKS_KEPT_YEARS} years; after
            that only totals without the area remain.
          </LI>
          <LI>
            <B>Usage statistics reports:</B> {REPORTS_KEPT_MONTHS} months; after that only totals that
            identify no installation remain.
          </LI>
          <LI>
            <B>Reports you ask us to delete, by switching usage statistics off:</B> deleted when the
            request arrives, and from all backups within {DELETION_COMPLETE_DAYS} days.
          </LI>
          <LI>
            <B>Email:</B> for as long as needed to respond to you and to keep a record of our
            correspondence.
          </LI>
        </UL>
      </Part>

      <Part label="9. Security">
        <P>
          We protect information with industry-standard safeguards: data is encrypted in transit,
          access to our figures is restricted to us, and identifiers are stored only in
          pseudonymised form. WireTrace installs only updates that are verified by digital
          signature.
        </P>
      </Part>

      <Part label="10. Your rights">
        <P>
          Depending on where you live, you have the right to access your personal data and receive a
          copy; have it corrected or deleted; restrict or object to its use; withdraw consent at any
          time; nominate someone to exercise your rights on your behalf; and have a grievance
          addressed by us.
        </P>
        <P>
          To exercise a right, email <Mail />. We reply within one month. Usage statistics are linked
          only to an identifier on your own computer, so we cannot find them from your name or
          email; switching usage statistics off in WireTrace deletes them, and we will help if you
          need it.
        </P>
        <P>
          You also have the right to complain to a data protection authority: in the EU, the
          authority in your country; in the UK, the Information Commissioner&rsquo;s Office; in
          India, the Data Protection Board of India.
        </P>
      </Part>

      <Part label="11. Children">
        <P>
          This website and WireTrace are not directed at children, and we do not knowingly collect
          personal data from anyone under 18.
        </P>
      </Part>

      <Part label="12. Changes to this policy">
        <P>
          We will update this page and its date before any change takes effect. Changes to what
          WireTrace sends are also announced in its release notes.
        </P>
      </Part>

      <Part label="13. Contact" last>
        <P>
          {siteConfig.identity.name}, Bengaluru, India
          <br />
          <Mail />
        </P>
      </Part>
    </Container>
  );
}

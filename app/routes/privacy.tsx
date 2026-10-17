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
const LAST_UPDATED = '18 October 2026';

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

      <Part label="1. Who is responsible">
        <P>
          This website, {site}, and the WireTrace application are published by{' '}
          {siteConfig.author.fullName}, an individual in Bengaluru, India, under the name{' '}
          {siteConfig.identity.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We are responsible
          for the personal data described in this policy, as the controller under the
          European Union&rsquo;s General Data Protection Regulation (GDPR) and as the data
          fiduciary under India&rsquo;s Digital Personal Data Protection Act, 2023.
        </P>
        <P>
          For any question or request about your data, write to <Mail />. We answer within
          one month.
        </P>
      </Part>

      <Part label="2. In short">
        <UL>
          <LI>What your devices send to WireTrace stays on your computer. WireTrace never sends it anywhere.</LI>
          <LI>This website uses no cookies, no advertising and no tracking across other websites.</LI>
          <LI>
            WireTrace&rsquo;s update check carries no identifier. Usage statistics are off unless
            you switch them on, and you can switch them off at any time, which deletes them.
          </LI>
          <LI>No network address is stored by us. Nothing is sold, shared for advertising or used to profile anyone.</LI>
        </UL>
      </Part>

      <Part label="3. Visiting this website">
        <P>
          <B>Hosting.</B> The website is hosted on GitHub Pages and delivered through
          Cloudflare. To deliver each page, both receive the request from your browser,
          including your network (IP) address. GitHub logs the address of every visit for
          security purposes. We do not receive or keep these records.
        </P>
        <P>
          <B>Visit statistics.</B> We use Cloudflare Web Analytics to count visits. It sets
          no cookie and does not follow you to other websites. For each page loaded it records
          the page, the page you came from, your country, your browser and operating system in
          general terms, the kind of device, and how long the page took to load. We see only
          totals.
        </P>
        <P>
          <B>Everything else.</B> The fonts, the pictures and the map on the WireTrace usage page
          are served from this website itself. No page loads anything from another website,
          apart from the visit statistics.
        </P>
        <P>
          If you block analytics in your browser, the website works the same.
        </P>
      </Part>

      <Part label="4. WireTrace: the update check">
        <P>
          While the update check is on, WireTrace asks {site} for the latest version when it
          starts and every {UPDATE_CHECK_INTERVAL_HOURS} hours while it stays open. Each request
          states the version of WireTrace, the operating system, the processor type, how
          WireTrace was installed, and the date of its previous check. It carries no identifier
          and nothing about you, your devices or your data.
        </P>
        <P>
          The request reaches our update server, which runs on Cloudflare, from your network
          address. The server derives from it the country and an approximate area of about one
          degree of latitude and longitude (roughly 100 km). It uses the address itself for no
          more than one minute, to limit abuse, and never stores it.
        </P>
        <P>
          The answer to the check, a description of the latest version, is a file on this
          website. The update server fetches it from GitHub Pages, which hosts the website, by
          passing the request on. GitHub therefore receives each update check, with your network
          address, as it receives every visit to this website (see section 3).
        </P>
        <P>
          The server adds each check to daily totals, by what it stated, the country, the area
          and the number of days since the previous check. It keeps no record of a single
          request. These totals are kept for {CHECKS_KEPT_YEARS} years. After that only
          daily totals remain, without the area: by version, operating system, processor type,
          how WireTrace was installed, country, and how long installations had been away (in
          ranges), and the number of installations active over periods of up to a year.
        </P>
        <P>
          You can turn the update check off in the Windows installer and at any time in
          WireTrace&rsquo;s Preferences, under Updates and privacy. WireTrace then checks only
          when you ask it to.
        </P>
      </Part>

      <Part label="5. WireTrace: usage statistics">
        <P>
          Usage statistics are off unless you switch them on. WireTrace asks you once whether
          you want to share them, and the setting stays in Preferences.
        </P>
        <P>
          If you switch them on, WireTrace creates a random installation identifier on your
          computer: 128 random bits from the operating system&rsquo;s secure generator, not
          derived from your computer, your name or your network. For each day on which
          WireTrace is used, it then sends one report, which states:
        </P>
        <UL>
          <LI>the installation identifier, and the date of the day the report describes;</LI>
          <LI>the version of WireTrace, the operating system, the processor type, and how WireTrace was installed;</LI>
          <LI>which features were used: logging, CSV logging, export, the plot, a plot pattern, the HEX view, saved commands, more than one tab, the filter, and find;</LI>
          <LI>whether lines were lost, a log could not be written, a connection was lost, or WireTrace closed unexpectedly;</LI>
          <LI>as ranges: the highest line rate, the number of connections opened, the longest time one window stayed open, and the number of times WireTrace was started;</LI>
          <LI>the theme and the display scale.</LI>
        </UL>
        <P>
          A report never contains a port or device name, a file name, a command, or anything a
          device sent. A report that cannot be sent is tried again for up to seven days and
          then discarded.
        </P>
        <P>
          <B>How reports are kept.</B> The server stores each report under a one-way keyed hash
          of the identifier, never the identifier itself, and never your network address. Each
          report is kept for {REPORTS_KEPT_MONTHS} months from the day it describes. After that
          only totals remain, which identify no installation.
        </P>
        <P>
          <B>Switching them off.</B> When you switch usage statistics off in Preferences,
          WireTrace deletes the identifier and everything it was keeping for usage statistics on
          your computer, and asks the server to delete every report sent under that identifier.
          It keeps asking until the request is delivered. The server deletes the reports as soon
          as the request arrives, and they are gone from every copy, including backups, within{' '}
          {DELETION_COMPLETE_DAYS} days. Totals already made from them identify no installation
          and remain. Switching usage statistics on again creates a new identifier.
        </P>
        <P>
          Uninstalling WireTrace does not send this request. If you uninstall without first
          switching usage statistics off, the reports already sent are deleted when they reach{' '}
          {REPORTS_KEPT_MONTHS} months.
        </P>
      </Part>

      <Part label="6. What is published">
        <P>
          The WireTrace usage page of this website shows totals made from the update checks: the
          number of installations active in the last day, week and 30 days, and on each of the
          last 90 days; the countries they
          are in; the shares of versions and operating systems; the number of update checks
          made on the latest day by WireTrace 1.x, which cannot be counted as installations; and
          a map with a mark for each area of about 100 km from which an update check came in the
          last 30 days, highlighted when one came in the last two days. Each mark is placed at a
          fixed point inside its area, never at the place a check came from, and no count is
          shown for any area. Nothing else is published.
        </P>
      </Part>

      <Part label="7. Why, and on what legal basis">
        <UL>
          <LI>
            <B>Visit statistics and the update check:</B> our legitimate interest in keeping the
            website and WireTrace working, secure and up to date, and in knowing which versions
            and systems are in use (GDPR Article 6(1)(f)). You can object at any time by
            blocking analytics in your browser or turning the update check off.
          </LI>
          <LI>
            <B>Usage statistics:</B> your consent (GDPR Article 6(1)(a); Section 6 of the
            Digital Personal Data Protection Act, 2023). You can withdraw it at any time by
            switching usage statistics off, which deletes them as described above. Withdrawing
            consent does not affect what was done before.
          </LI>
        </UL>
        <P>We use none of this information to make decisions about any person.</P>
      </Part>

      <Part label="8. Who handles the information">
        <P>We do not sell or share personal data. These companies process it on our behalf, or as needed to deliver what you asked for:</P>
        <UL>
          <LI>
            <B>Cloudflare, Inc.</B> delivers this website, runs the update server and its
            database, and provides the visit statistics.{' '}
            <A href="https://www.cloudflare.com/privacypolicy/">Cloudflare&rsquo;s privacy policy</A>
          </LI>
          <LI>
            <B>GitHub, Inc.</B> hosts this website, including the file WireTrace&rsquo;s update
            check reads, and WireTrace&rsquo;s releases. Downloading WireTrace or an update
            fetches the file from GitHub. Usage reports and deletion requests never reach
            GitHub.{' '}
            <A href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub&rsquo;s privacy statement</A>
          </LI>
        </UL>
        <P>
          These companies are based in the United States and process data in the countries where
          they operate. Each describes in its own policy how it protects data transferred out of
          the European Economic Area, the United Kingdom and India.
        </P>
      </Part>

      <Part label="9. Your rights">
        <P>Depending on where you live, you have the right to:</P>
        <UL>
          <LI>know what personal data we hold about you, and receive a copy;</LI>
          <LI>have it corrected or completed;</LI>
          <LI>have it deleted;</LI>
          <LI>restrict or object to how it is used;</LI>
          <LI>withdraw consent at any time;</LI>
          <LI>nominate another person to exercise your rights if you cannot;</LI>
          <LI>have a grievance addressed by us, and complain to a data protection authority, such as the one in your country or, in India, the Data Protection Board of India.</LI>
        </UL>
        <P>
          To exercise a right, write to <Mail />. Because we store usage statistics only under a
          hash of an identifier that exists on your computer alone, and keep no network
          addresses, we cannot find your data from your name or email address. The setting in
          WireTrace&rsquo;s Preferences is therefore the way to delete your usage statistics;
          if you need help with it, write to us.
        </P>
      </Part>

      <Part label="10. Security">
        <P>
          The update server accepts only the exact fields listed above and refuses anything
          else. Identifiers are stored only as keyed hashes, under a key held in
          Cloudflare&rsquo;s secret store. The figures are visible only to us, through a
          dashboard protected by Cloudflare Access. WireTrace installs only updates that carry
          a valid signature.
        </P>
      </Part>

      <Part label="11. Children">
        <P>
          This website and WireTrace are not directed at children, and we do not knowingly
          collect personal data from anyone under 18.
        </P>
      </Part>

      <Part label="12. Changes to this policy" last>
        <P>
          When this policy changes, we update this page and the date at the top before the
          change takes effect. A change to what WireTrace sends is also stated in WireTrace&rsquo;s
          release notes and in the privacy statement it shows.
        </P>
        <P>
          Questions: <Mail />.
        </P>
      </Part>
    </Container>
  );
}

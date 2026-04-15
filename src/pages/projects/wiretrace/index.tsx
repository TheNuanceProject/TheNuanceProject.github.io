// SPDX-License-Identifier: MIT
import { Link } from 'react-router-dom';
import { Container } from '@/components/Container';
import { Section } from '@/components/Section';
import { Prose } from '@/components/Prose';
import { Button } from '@/components/Button';
import { ArrowIcon } from '@/components/icons/ArrowIcon';
import { deriveDates } from '@/lib/content/dates';
import { usePageMeta } from '@/lib/use-page-meta';
import { features, specs, shortcuts } from './content';
import { meta } from './meta';

const wt = { ...meta, ...deriveDates(meta.published, meta.updated) };

/**
 * ProjectWireTrace — the WireTrace product detail page.
 *
 * Content sources:
 *   - Project metadata (name, version, URLs, taglines)
 *     → ./meta.ts (auto-discovered by the project loader)
 *   - Page-specific data (features, specs, shortcuts)
 *     → ./content.ts (co-located with this page)
 *   - Long-form prose (story sections)
 *     → inline in this component (single consumer)
 *
 * Page structure:
 *   1. Article header — back link, title, taglines, meta, primary CTA, secondary links
 *   2. Why this exists — story prose
 *   3. What came before — story prose (mentions SerialLoggerPro by name)
 *   4. What it is now — story prose (mentions WireTrace v1.0.0 in context)
 *   5. Features — list from content.ts
 *   6. Specifications — table from content.ts
 *   7. System requirements — short paragraph
 *   8. Keyboard shortcuts — table from content.ts
 *   9. Download and install — final paragraph + CTA
 */
export default function ProjectWireTrace() {
  usePageMeta({
    title: wt.title,
    description: wt.description,
  });

  return (
    <Container width="default">
      {/* ─── Article header ──────────────────────────────────────────── */}
      <section className="pt-12 md:pt-16 pb-12 md:pb-16">
        <Link
          to="/projects"
          className="
            inline-flex items-center gap-2
            font-display text-sm
            text-[var(--color-text-mid)]
            hover:text-[var(--color-text-primary)]
            transition-colors duration-150
            no-underline
            mb-10
          "
        >
          <ArrowIcon className="rotate-180" />
          <span>Projects</span>
        </Link>

        <h1
          className="
            font-display font-normal
            text-[2.5rem] md:text-[3.5rem]
            leading-[1.05] tracking-[-0.02em]
            text-[var(--color-text-primary)]
          "
        >
          {wt.title}
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
          {wt.productTagline}
        </p>

        <p
          className="
            mt-6
            font-display text-sm
            text-[var(--color-text-mid)]
          "
        >
          v{wt.version} · {wt.platforms.join(', ')} · Open source · MIT
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Button href={wt.downloadUrl} external>
            Download for {wt.platforms[0]}
          </Button>

          <div className="flex items-center gap-6 font-display text-sm">
            <a
              href={wt.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-[var(--color-text-secondary)]
                hover:text-[var(--color-text-primary)]
                transition-colors duration-150
                no-underline
                border-b border-transparent hover:border-[var(--color-accent)]
              "
            >
              View on GitHub
            </a>
            <span className="text-[var(--color-text-mid)]">·</span>
            <a
              href={wt.issuesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="
                text-[var(--color-text-secondary)]
                hover:text-[var(--color-text-primary)]
                transition-colors duration-150
                no-underline
                border-b border-transparent hover:border-[var(--color-accent)]
              "
            >
              Report an issue
            </a>
          </div>
        </div>
      </section>

      {/* ─── Why this exists ─────────────────────────────────────────── */}
      <Section label="Why this exists" divided>
        <Prose>
          <p>
            {wt.title} was built for an internal need on my team. We work
            across a range of problems in research and development, and
            serial monitoring is one of the things that comes up often
            — when we are bringing up new hardware, capturing data from
            a device for later analysis, or trying to make sense of
            what a board is reporting.
          </p>
          <p>
            We had been using whatever serial tools were already
            available, and over time the gaps in those tools started to
            add up. {wt.title} started as something to fill those gaps,
            and grew from there.
          </p>
        </Prose>
      </Section>

      {/* ─── What came before ────────────────────────────────────────── */}
      <Section label="What came before" divided>
        <Prose>
          <p>
            The first version (called SerialLoggerPro) was a single
            Python file built on Tkinter. It worked for the original use
            case — one port, one device, one log file — but the way it
            was structured made it hard to extend. Threading was managed
            manually with locks. The dependency list grew as each new
            feature pulled in something else.
          </p>
          <p>
            Adding multi-device support would have meant rewriting the
            threading model. Adding cleaner exports would have meant
            replacing the export pipeline. Each new addition would have
            made the next one harder to add cleanly.
          </p>
          <p>
            At that point, continuing to patch the existing code stopped
            making sense. The decision was to start over with an
            architecture that could support what the application needed
            to become.
          </p>
        </Prose>
      </Section>

      {/* ─── What it is now ──────────────────────────────────────────── */}
      <Section label="What it is now" divided>
        <Prose>
          <p>
            The current version, {wt.title} v{wt.version}, is built on
            PySide6 (Qt6 for Python) and organized into modules with
            single responsibilities. The serial reader handles only
            serial I/O. The disk writer handles only disk I/O. The
            component that filters the on-screen view does not interact
            with the disk log. These boundaries make it possible for the
            application to do several things at once without one part
            interfering with another.
          </p>
          <p>
            Each connected device opens in its own tab with its own
            thread, reading from its own port into its own buffer, and
            writing to its own log file. Multiple USB-to-serial adapters
            can be connected simultaneously without one device&rsquo;s
            data interfering with another&rsquo;s.
          </p>
          <p>
            Logging uses a buffered write model. Incoming data is
            appended to an in-memory buffer with a hard size cap, and a
            separate thread flushes that buffer to disk on a timer. The
            read path is never blocked by disk I/O. If the application
            exits or crashes, the buffer is flushed before shutdown. The
            log file on disk is the source of truth — it contains every
            line received, regardless of what the on-screen view is
            showing at any moment.
          </p>
          <p>
            The source is available on GitHub under the MIT license. The
            tool is designed to be installed from a binary, but you can
            clone the repository and build it yourself if you prefer.
          </p>
        </Prose>
      </Section>

      {/* ─── Features ────────────────────────────────────────────────── */}
      <Section label="Features" divided>
        <div className="space-y-6 max-w-[var(--container-narrow)]">
          {features.map((feature) => (
            <p
              key={feature.title}
              className="font-body text-[17px] leading-[1.75] text-[var(--color-text-primary)]"
            >
              <strong className="font-semibold">{feature.title}.</strong>{' '}
              {feature.description}
            </p>
          ))}
        </div>
      </Section>

      {/* ─── Specifications ──────────────────────────────────────────── */}
      <Section label="Specifications" divided>
        <div className="max-w-[var(--container-narrow)]">
          <table className="w-full">
            <tbody>
              {specs.map((row, idx) => (
                <tr
                  key={row.property}
                  className={
                    idx > 0
                      ? 'border-t border-[var(--color-border)]'
                      : ''
                  }
                >
                  <th
                    scope="row"
                    className="
                      font-display font-normal text-sm
                      text-[var(--color-text-secondary)]
                      text-left align-top
                      py-3 pr-6
                      w-[40%]
                    "
                  >
                    {row.property}
                  </th>
                  <td className="font-body text-[17px] text-[var(--color-text-primary)] py-3 align-top">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ─── System requirements ─────────────────────────────────────── */}
      <Section label="System requirements" divided>
        <Prose>
          <p>
            {wt.title} is designed to run on Windows, macOS, and Linux.
            The codebase is cross-platform — it uses Qt for the UI,
            QSerialPort for serial I/O, and a build pipeline that
            produces native binaries for all three operating systems.
          </p>
          <p>
            Pre-built binaries are currently published for Windows
            only. This is a practical limitation of who maintains the
            project, not a design limitation of the software. If you
            want {wt.title} on macOS or Linux, you can build it from
            source using the included build scripts — the build guide
            in the repository covers all three platforms. If there is
            enough interest, pre-built macOS and Linux binaries become
            a realistic priority.
          </p>
          <p>
            {wt.title} uses CPU-only software rendering, which means
            it works in remote desktop sessions, virtual machines, and
            hardware without dedicated graphics.
          </p>
        </Prose>
      </Section>

      {/* ─── Keyboard shortcuts ──────────────────────────────────────── */}
      <Section label="Keyboard shortcuts" divided>
        <div className="max-w-[var(--container-narrow)]">
          <table className="w-full">
            <tbody>
              {shortcuts.map((row, idx) => (
                <tr
                  key={row.action}
                  className={
                    idx > 0
                      ? 'border-t border-[var(--color-border)]'
                      : ''
                  }
                >
                  <th
                    scope="row"
                    className="
                      font-body font-normal text-[17px]
                      text-[var(--color-text-primary)]
                      text-left align-top
                      py-3 pr-6
                    "
                  >
                    {row.action}
                  </th>
                  <td className="font-mono text-sm text-[var(--color-text-secondary)] py-3 align-top">
                    {row.keys}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ─── Download and install ────────────────────────────────────── */}
      <Section
        label="Download and install"
        divided
      >
        <Prose>
          <p>
            Download the Windows installer from the GitHub Releases
            page. Run the installer and follow the prompts. The
            application launches from the Start menu. On first launch,
            the welcome screen prompts for a device connection — the
            rest of the interface appears once a device is connected.
          </p>
          <p>
            For macOS or Linux, clone the repository and build from
            source. Instructions are in the repository&rsquo;s build
            guide.
          </p>
        </Prose>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Button href={wt.releasesUrl} external>
            Download from GitHub Releases
            <ArrowIcon />
          </Button>

          <a
            href={wt.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
              font-display text-sm
              text-[var(--color-text-secondary)]
              hover:text-[var(--color-text-primary)]
              transition-colors duration-150
              no-underline
              border-b border-transparent hover:border-[var(--color-accent)]
            "
          >
            Build from source on GitHub
          </a>
        </div>
      </Section>

      {/* ─── Footer with published/updated dates ─────────────────────── */}
      <footer className="pb-24 md:pb-32 pt-12 mt-8 border-t border-[var(--color-border)] max-w-[var(--container-narrow)]">
        <p className="font-display text-sm text-[var(--color-text-mid)] mb-6">
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
          className="
            inline-flex items-center gap-2
            font-display text-sm
            text-[var(--color-text-mid)]
            hover:text-[var(--color-text-primary)]
            transition-colors duration-150
            no-underline
          "
        >
          <ArrowIcon className="rotate-180" />
          <span>Back to projects</span>
        </Link>
      </footer>
    </Container>
  );
}

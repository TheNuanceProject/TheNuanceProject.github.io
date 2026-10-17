// SPDX-License-Identifier: MIT
import {
  H2,
  H3,
  P,
  Lead,
  B,
  A,
  Quote,
  Code,
  Divider,
} from '~/components/writing-prose';

/**
 * WireTrace live plotter, and where it came from.
 *
 * The v1.1.0 release essay. Inline screenshots reference files in
 * `public/images/` so they can be served from the static site root.
 * The piece links the original r/embedded thread, the GitHub Issue,
 * and the v1.1.0 GitHub Release so the trail back is intact.
 */
export default function Article() {
  return (
    <>
      <Lead>
        A stranger on Reddit designed part of WireTrace&rsquo;s new
        plotter before I did.
      </Lead>

      <figure className="my-10 -mx-4 md:mx-0">
        <img
          src="/images/wiretrace-plot-dark.png"
          alt="WireTrace v1.1.0 with the live plot panel showing four traces (RPM, Current, Voltage, MotorTemp) below the console"
          className="
            w-full h-auto
            border border-divider
            rounded-lg
          "
          loading="eager"
        />
      </figure>

      <H2>The plotter, and how it knows what to plot</H2>

      <P>
        WireTrace v1.0.0 shipped in April with multi-device tabs,
        structured CSV export, severity tagging, and the buffered
        logging path that does not block on disk I/O. It did not
        have a plotter. If an engineer wanted to see their RPM or
        temperature trace over time, they exported the log and
        opened it somewhere else.
      </P>

      <P>
        The plotter was the obvious next thing to build. The data
        pipeline already fans out the parsed line signal to multiple
        subscribers (the console view and the log engine are two
        of those today), so adding a third subscriber that draws a
        chart did not require restructuring the data flow. The
        actual question was always how the plotter would know which
        numbers in a line are the ones to plot, and what to name
        them on the axes.
      </P>

      <P>
        Two mechanisms ship in v1.1.0. The default is{' '}
        <B>auto-detection</B>: WireTrace samples the first fifty
        DATA-tagged lines on a tab, infers structure (JSON objects,{' '}
        <Code>key:value</Code> pairs, or positional values with an
        auto-detected delimiter), and accepts a column only if it
        appears in at least seventy percent of the sample lines.
        The threshold filters out boot banners, debug spam, and the
        occasional stray colon from a free-text log line that
        otherwise would corrupt the detected schema.
      </P>

      <P>
        The second mechanism is a <B>prefix protocol</B>:{' '}
        <Code>plt:</Code>, <Code>plt0:</Code>, <Code>plt1:</Code>,
        and so on. A line that starts with one of these prefixes is
        plotted; everything else is treated as ordinary log output
        and ignored by the plotter. Engineers who want explicit
        control, or who emit mixed traffic where auto-detect would
        guess wrong, mark their plot lines at the source and
        WireTrace does the rest. The prefix protocol came from
        somebody else.
      </P>

      <H2>Where the prefix protocol came from</H2>

      <P>
        WireTrace v1.0.0 launched on{' '}
        <A href="https://www.reddit.com/r/embedded/comments/1sozi08/i_built_a_serial_data_monitor_open_source_looking/">
          r/embedded
        </A>{' '}
        in April. One of the comments was from{' '}
        <A
          href="https://www.reddit.com/r/embedded/comments/1sozi08/comment/ogzmh05/"
        >
          u/Stromi1011
        </A>
        , who pointed out that there was no plotter and proposed a
        specific way to add one:
      </P>

      <Quote>
        Ideally i can specify a prefix in the software, say{' '}
        &ldquo;plt*&rdquo; and afterwards i can send csv line style
        data like &ldquo;plt0:x,y,z&rdquo;, &ldquo;plt0:10,4,6&rdquo;,
        &ldquo;plt0:9,4,7&rdquo; ... and the software associates all
        of this to a plot 0, allowing for multiple plots like
        &ldquo;plt1:&rdquo; in like tabs or something.
      </Quote>

      <P>
        Two things about this comment made it stick. First, the
        proposal was complete: prefix, payload format, and the
        multi-plot extension via the trailing digit. There was no
        ambiguity about what the engineer was asking for. Second,
        the framing acknowledged something true about the problem
        space: engineers are the ones who design their firmware&rsquo;s
        output format, so an explicit marker they put in their own
        protocol is more reliable than any amount of clever
        guessing on the receiver&rsquo;s side.
      </P>

      <P>
        At that point a plotter was on my list of next things to
        build, with auto-detection from <Code>key:value</Code> and
        JSON as the leading approach since the CSV export engine
        already did similar pattern recognition. The prefix idea
        was not in my plan. It got added.
      </P>

      <P>
        I replied on the thread saying both approaches were worth
        building, and opened a GitHub Issue to track it:{' '}
        <A
          href="https://github.com/TheNuanceProject/WireTrace/issues/1"
        >
          Feature: live data plotter
        </A>
        . The issue references the original comment so the trail
        back is intact.
      </P>

      <H2>What shipped</H2>

      <P>
        Auto-detection runs by default on every new tab. When it
        works (and on key:value or JSON traffic it usually does),
        the user sees a plot panel populate within a couple of
        seconds of the data starting to flow, with sensible column
        names taken directly from the keys. No configuration step,
        no first-run dialog, no setup screen between the user and
        their data.
      </P>

      <P>
        When auto-detection cannot make sense of a line, the panel
        shows a small placeholder with a single call to action:{' '}
        <B>Configure manually</B>. That opens a dialog where an
        engineer declares a regex with named groups: each{' '}
        <Code>(?P&lt;name&gt;...)</Code> becomes a plot column with
        that name on the axis. Patterns can be saved as named
        profiles, applied to a tab as a default, and reused across
        sessions.
      </P>

      <figure className="my-10 -mx-4 md:mx-0">
        <img
          src="/images/wiretrace-configure-plot-regex.png"
          alt="The Configure Plot dialog in manual regex mode, with a four-column pattern, a named profile selector, and a green test result reading Matched 200 of 200 lines"
          className="
            w-full h-auto
            border border-divider
            rounded-lg
          "
          loading="lazy"
        />
      </figure>

      <P>
        The Test result is tiered rather than binary. Green means
        the pattern matched recent lines; amber means the pattern
        compiles and is structurally valid but no current line
        matches (the firmware may simply be quiet on that data path
        right now); red means the regex is broken. Apply is enabled
        for green and amber, disabled for red. There is no
        intermediate &ldquo;the regex is sort of OK but trust me
        anyway&rdquo; state.
      </P>

      <H3>Capture from sample</H3>

      <P>
        Writing regexes by hand is one of those tasks that engineers
        either enjoy or actively avoid; there is rarely a middle.
        For the half who avoid it, the Configure Plot dialog has a{' '}
        <B>Capture from sample</B> assistant. Pick a recent line
        from the session, click each number you want to plot, give
        it a name, and the dialog scaffolds the regex for you.
      </P>

      <figure className="my-10 -mx-4 md:mx-0">
        <img
          src="/images/wiretrace-capture-from-sample.png"
          alt="The Capture from sample dialog showing a source line with four numeric chips selected and named RPM, Current, Voltage, MotorTemp, and the generated regex below"
          className="
            w-full h-auto
            border border-divider
            rounded-lg
          "
          loading="lazy"
        />
      </figure>

      <P>
        The chip-based capture step also handles the part of regex
        authoring that catches even experienced engineers (escaping
        decimals, allowing optional signs, allowing scientific
        notation), so the generated pattern is correct against the
        actual data, not a transcription of what the engineer
        thinks the data looks like.
      </P>

      <H2>A small thing about credit</H2>

      <P>
        v1.1.0 ships <Code>plt0:x,y,z</Code> as u/Stromi1011
        described it. There is one extension, a{' '}
        <Code>plt!Name1,Name2,...</Code> form that lets engineers
        name the columns explicitly when their payload values do
        not have keys, but the prefix routing, the multi-plot
        grouping via trailing digits, and the CSV-shaped payload
        are his proposal verbatim. The GitHub Issue and the User
        Guide both link the original comment.
      </P>

      <P>
        I do not have a tidy moral about open-source feedback to
        offer here. The thing that happened is the thing that
        happened: a stranger on Reddit read the v1.0.0 announcement,
        thought about a feature that was not there, wrote down a
        concrete proposal for it, and the proposal was good enough
        that it shipped. The plotter is a better feature for
        including both auto-detect and the prefix protocol than it
        would have been with either alone. Crediting the source
        seems like the unremarkable correct thing to do.
      </P>

      <Divider />

      <footer
        className="
          font-sans text-ui-lg
          text-text-tertiary
          max-w-narrow
          space-y-2
        "
      >
        <p className="text-text-secondary font-medium">
          About this release
        </p>
        <p>
          v1.1.0 is on{' '}
          <A href="https://github.com/TheNuanceProject/WireTrace/releases/tag/v1.1.0">
            GitHub Releases
          </A>{' '}
          as a Windows installer. v1.0.0 installs will auto-update
          within twenty-four hours. Project page, full feature list,
          and build-from-source instructions:{' '}
          <A href="/projects/wiretrace">WireTrace</A>.
        </p>
        <p>
          WireTrace 2.0 has since been released. The{' '}
          <A href="/projects/wiretrace">project page</A> describes the
          current version.
        </p>
      </footer>
    </>
  );
}

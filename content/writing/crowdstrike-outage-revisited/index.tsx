// SPDX-License-Identifier: MIT
import { H2, P, Lead, B, I, A, Quote, Divider } from '~/components/writing-prose';
import { Timeline, TimelineItem } from '~/components/Timeline';
import { Sources, Source } from '~/components/Sources';

/**
 * Twenty fields, twenty-one inputs: revisiting the CrowdStrike outage.
 *
 * A revisit of a LinkedIn post the author wrote in July 2024, days after
 * the outage. The piece links that original post and the primary-source
 * record that emerged since — CrowdStrike's Root Cause Analysis, the
 * September 2024 congressional testimony, the Delta ruling, and
 * Microsoft's Windows kernel changes — so the trail back is intact.
 *
 * The timeline uses the reusable <Timeline> component; the primary-sources
 * block uses the reusable <Sources> component. Both are general-purpose and
 * shared, not specific to this piece.
 */
export default function Article() {
  return (
    <>
      <Lead>
        In July 2024, a few days after what many called the largest IT
        outage in history, I wrote a short post about it. I want to come
        back to that post, because the full account that has emerged since
        has changed how I read what happened.
      </Lead>

      <P>
        At the time, the{' '}
        <A href="https://www.linkedin.com/posts/mohamad-shahin-ambalatha-kandy_techresilience-appreciationpost-windowsoutage-activity-7220751203503128576-NJm5">
          post
        </A>{' '}
        read like an appreciation note. I called CrowdStrike&rsquo;s
        response &ldquo;swift and transparent,&rdquo; and spent most of it
        on a point I still partly believe: that we only notice
        infrastructure when it breaks, and the people keeping it running
        rarely get the credit. What I did not have then was the root-cause
        analysis, the congressional testimony, the lawsuits, or the year of
        platform changes that followed. With those in hand, the story is
        less about resilient systems holding the line and more about a
        plain failure of release discipline. That is the more useful thing
        to write about, and it is the part my first take got wrong.
      </P>

      <H2>What actually broke</H2>

      <P>
        CrowdStrike sells security software called Falcon. Its working part
        is the <I>sensor</I> &mdash; not a piece of hardware, despite the
        name, but a software agent that installs on each machine and runs
        deep inside Windows, in the <I>kernel</I>: the privileged core of
        the operating system, where code can watch everything, but where a
        crash takes down the whole machine rather than a single program. To
        keep up with new attack techniques without shipping a whole new
        sensor each time, Falcon pulls down small configuration files
        &mdash; CrowdStrike calls them Rapid Response Content &mdash; that
        tell the sensor already on the machine what to look for. In February
        2024 the company added a capability of this kind aimed at a
        particular Windows mechanism (named pipes, one of the ways programs
        talk to each other), governed by a configuration called Channel File
        291. Its first content shipped in March and behaved as expected
        through the spring.
      </P>

      <P>
        On the morning of <B>19 July 2024, at 04:09 UTC</B>, a new Rapid
        Response update to Channel File 291 went out to Windows hosts.
        Per CrowdStrike&rsquo;s own{' '}
        <A href="https://www.crowdstrike.com/wp-content/uploads/2024/08/Channel-File-291-Incident-Root-Cause-Analysis-08.06.2024.pdf">
          root-cause analysis
        </A>
        , the sensor on those machines expected twenty input fields, while
        this update referenced a twenty-first. When the sensor&rsquo;s
        interpreter went to read that twenty-first value, it was reading
        past the end of an array that only held twenty &mdash; an
        out-of-bounds memory read, a read of memory that was never there to
        be read. In kernel code there is no quiet recovery from that: the
        read crashed the sensor, and the sensor took Windows down with it,
        into the blue screen of death &mdash; the full-stop crash screen
        &mdash; on repeat.
      </P>

      <P>
        The twenty-first field had never been used in production before
        this update, so the case that would have exposed it had never run.
        CrowdStrike&rsquo;s content checker, the Validator, did not catch
        the mismatch; a separate runtime bounds check that might have
        contained it was absent. Both gaps were documented and fixed
        afterwards. The company reverted the bad file at <B>05:27 UTC</B>,
        about seventy-eight minutes later, but reversion does not un-crash a
        machine that already pulled the file &mdash; recovery meant
        touching devices, often by hand, often booting into safe mode to
        delete a single file.
      </P>

      <P>
        The blast radius is the part worth sitting with. The update reached
        roughly <B>8.5 million</B> Windows devices &mdash; well under one
        percent of all Windows machines, but concentrated in exactly the
        places that cannot absorb it: airlines grounded flights, hospitals
        postponed procedures, banks and broadcasters and payment systems
        stalled. A configuration file with a counting error became a global
        event because of where the code that read it was allowed to sit.
      </P>

      <H2>A timeline</H2>

      <P>
        The dates matter, because the public understanding of this incident
        arrived in stages: the crash first, the cause weeks later, and the
        accountability and platform changes across the year that followed.
      </P>

      <Timeline>
        <TimelineItem date="February 2024">
          CrowdStrike ships the new sensor capability behind Channel File
          291.
        </TimelineItem>
        <TimelineItem date="5 March 2024">
          The first Rapid Response Content for it goes to production after a
          stress test; later spring updates behave normally.
        </TimelineItem>
        <TimelineItem date="19 July 2024, 04:09 UTC">
          The faulty update ships; the twenty-versus-twenty-one mismatch
          triggers an out-of-bounds read and mass crashes.
        </TimelineItem>
        <TimelineItem date="19 July 2024, 05:27 UTC">
          CrowdStrike reverts the file, about seventy-eight minutes later.
          Roughly 8.5 million devices are affected.
        </TimelineItem>
        <TimelineItem date="22 July 2024">
          CrowdStrike introduces automated techniques to speed up
          remediation.
        </TimelineItem>
        <TimelineItem date="24 July 2024">
          A preliminary review is published, in which the company
          acknowledges it had over-relied on past success.
        </TimelineItem>
        <TimelineItem date="29 July 2024">
          About 99% of Windows sensors are back online.
        </TimelineItem>
        <TimelineItem date="6 August 2024">
          CrowdStrike publishes the full twelve-page root-cause analysis.
        </TimelineItem>
        <TimelineItem date="24 September 2024">
          CrowdStrike testifies before a US House Homeland Security
          subcommittee.
        </TimelineItem>
        <TimelineItem date="25 October 2024">
          Delta Air Lines sues CrowdStrike over roughly $500 million in
          losses; CrowdStrike countersues.
        </TimelineItem>
        <TimelineItem date="May 2025">
          A Georgia judge lets most of Delta&rsquo;s suit proceed, including
          gross-negligence claims.
        </TimelineItem>
        <TimelineItem date="2025">
          Microsoft begins moving third-party security software out of the
          Windows kernel.
        </TimelineItem>
      </Timeline>

      <H2>Where my first read was too generous</H2>

      <P>
        &ldquo;Swift and transparent&rdquo; was not wrong, exactly.
        CrowdStrike did revert quickly, and it did publish an unusually
        detailed analysis. But framing the response as the story let the
        company off the hook for the cause, and the cause was not bad luck.
        It was a content update that reached millions of production machines
        at once, with no staged rollout to catch it on a few first, a
        validation step that tested content but missed this class of error,
        and no safe fallback once the machines were down.
      </P>

      <P>
        CrowdStrike said as much itself. Testifying before Congress that
        September, the company&rsquo;s representative told the subcommittee
        that its checks had tested content files individually but not
        together, and that the new process would test updates internally
        before sending them to anyone. He also offered a line that has
        stuck with me: <Quote>Trust takes years to make and seconds to break.</Quote>
        The{' '}
        <A href="https://homeland.house.gov/wp-content/uploads/2024/09/2024-09-24-HRG-CIP-Testimony-Meyers.pdf">
          written testimony
        </A>{' '}
        is on the record, and it reads less like an accident report than a
        description of process that had been trusted because it had always
        worked before.
      </P>

      <P>
        The legal read sharpened the point. When Delta sued, its argument
        was not that software has bugs &mdash; everyone&rsquo;s does &mdash;
        but that this was a breakdown of basic practice:{' '}
        <A href="https://www.bankinfosecurity.com/judge-lets-deltas-cyber-failure-suit-vs-crowdstrike-proceed-a-28443">
          no testing, no staging, no rollback
        </A>
        . In May 2025 a judge found that argument credible enough to let
        most of the case, including gross negligence, go forward. You can
        disagree with Delta about damages and still notice that a court
        looked at the same facts I had waved past and saw a discipline
        problem, not an act of God.
      </P>

      <H2>The year after</H2>

      <P>
        Two things changed that make the incident more than a bad day.
        The first is accountability that outlived the news cycle: the
        congressional hearing, the still-running Delta litigation, and an
        industry that now reaches for this outage as the standard example
        of concentration risk &mdash; one vendor, one file, a meaningful
        slice of the world&rsquo;s computers.
      </P>

      <P>
        The second is structural, and it is the most interesting outcome.
        The reason a sensor crash became a Windows crash is that the sensor
        lived in the kernel, where a fault has nowhere to fall but the whole
        machine. Following the outage, Microsoft started{' '}
        <A href="https://www.securityweek.com/microsoft-to-preview-new-windows-endpoint-security-platform-after-crowdstrike-outage/">
          building a way for security vendors to run outside the kernel
        </A>
        , in the same user space as ordinary applications, where a crash
        stays contained. It also began requiring partners to ship updates
        gradually, through deployment rings, with monitoring &mdash; the
        staged rollout whose absence caused this. The platform is being
        reshaped around the lesson.
      </P>

      <H2>What it actually teaches</H2>

      <P>
        Strip away the scale and the failure is ordinary, which is exactly
        why it is worth keeping. Ship a change to everything at once and a
        small mistake becomes a large one. Test the parts but never the
        whole, and the gap between them is where the outage lives. Trust a
        process because it has never failed, and you have stopped checking
        whether it still works. None of this is specific to kernel drivers
        or to security software; it is true of anything that updates itself
        on other people&rsquo;s machines, and the cost stays invisible right
        up until the moment it is enormous.
      </P>

      <P>
        So this is the correction to my July 2024 post. The instinct in it
        was not wrong &mdash; reliable systems really are the work of people
        you never hear about, and that is worth saying. But the
        appreciation belongs to the discipline that prevents these events,
        not to the speed of the apology after one. A year of record turned
        an appreciation note into something more precise, and I would rather
        be precise.
      </P>

      <Divider />

      <H2>Primary sources</H2>

      <P>
        Everything above traces back to documents you can read yourself.
        The dates and figures are from these:
      </P>

      <Sources>
        <Source
          href="https://www.crowdstrike.com/wp-content/uploads/2024/08/Channel-File-291-Incident-Root-Cause-Analysis-08.06.2024.pdf"
          label="CrowdStrike — Channel File 291 Root Cause Analysis (PDF)"
        >
          The full technical account of the field-count mismatch and the
          validation gaps.
        </Source>
        <Source
          href="https://www.crowdstrike.com/en-us/blog/channel-file-291-rca-available/"
          label="CrowdStrike — RCA announcement and recovery figures"
        >
          The timeline, the revert, and the ~99% recovery by 29 July.
        </Source>
        <Source
          href="https://homeland.house.gov/hearing/an-outage-strikes-assessing-the-global-impact-of-crowdstrikes-faulty-software-update/"
          label="US House Homeland Security — the 24 September 2024 hearing"
        >
          The subcommittee hearing, with the witness testimony linked from
          the page.
        </Source>
        <Source
          href="https://www.bankinfosecurity.com/judge-lets-deltas-cyber-failure-suit-vs-crowdstrike-proceed-a-28443"
          label="Coverage of the May 2025 Delta ruling"
        >
          The Georgia court allowing most of Delta&rsquo;s suit, including
          gross negligence, to proceed.
        </Source>
        <Source
          href="https://www.securityweek.com/microsoft-to-preview-new-windows-endpoint-security-platform-after-crowdstrike-outage/"
          label="Microsoft’s Windows endpoint-security changes"
        >
          Moving security vendors out of the kernel after the outage.
        </Source>
        <Source
          href="https://www.linkedin.com/posts/mohamad-shahin-ambalatha-kandy_techresilience-appreciationpost-windowsoutage-activity-7220751203503128576-NJm5"
          label="My original July 2024 post"
        >
          The take this piece revisits.
        </Source>
      </Sources>
    </>
  );
}

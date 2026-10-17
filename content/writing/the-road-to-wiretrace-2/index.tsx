// SPDX-License-Identifier: MIT
import { H2, P, Lead, B, Divider } from '~/components/writing-prose';
import { ThemedScreenshot } from '~/components/ThemedScreenshot';

import {
  SCREENSHOT_SIZE,
  type ScreenshotName,
  screenshotPath,
  screenshots,
} from '../../projects/wiretrace/content';

/**
 * The road to WireTrace 2.0: the release essay.
 *
 * Every event in it is one Shahin described or one recorded during the
 * revamp, and every figure was measured: the sources are listed in the
 * project's `WIRETRACE_V2_STORY_DRAFT.md`.
 */

function Screenshot({ name }: { name: ScreenshotName }) {
  return (
    <ThemedScreenshot
      light={screenshotPath(name, 'light')}
      dark={screenshotPath(name, 'dark')}
      alt={screenshots[name].alt}
      width={SCREENSHOT_SIZE.width}
      height={SCREENSHOT_SIZE.height}
      className="my-10"
    />
  );
}

export default function Article() {
  return (
    <>
      <Lead>The worst thing a logging tool can do is make you run the test again.</Lead>

      <P>
        Not crash. Not freeze. A crash you notice. The worst thing is to sit there looking healthy,
        lines scrolling past, while the record you will need tomorrow is quietly not being kept.
        You find out at the end of the day, when the hardware is cold and the moment is gone, and
        there is only one thing left to do. Set it all up again. Start from zero.
      </P>
      <P>
        That happened in my lab, with a tool I wrote. This is the story of how it got there, and
        what I did about it.
      </P>

      <H2>Where it started</H2>
      <P>
        I am a software engineer in a research and development lab. My team builds industrial
        devices, and a large part of that work is listening to them. A board under test talks over
        a serial port, line after line, and somewhere in those lines is the reason it misbehaved.
        If nobody was recording, the reason is gone.
      </P>
      <P>
        We used whatever serial tools were around. They worked, mostly. But each of them had a gap
        somewhere, and over time the gaps added up.
      </P>
      <P>
        Then a colleague asked. The need was real, the gap was real, and nothing on hand filled it.
        So an internal tool was born: a single Python file with a plain window, called
        SerialLoggerPro. One port, one device, one log file. It did that job, and for a while that
        was enough.
      </P>

      <H2>The first rewrite</H2>
      <P>It stopped being enough the day we needed two devices at once. Then three.</P>
      <P>
        The little file could not stretch. Every new feature had to be squeezed in beside the
        others, and each one made the next one harder. I could keep patching it, or I could admit
        it had reached its limit.
      </P>
      <P>
        I started again, this time with a proper structure, and in April 2026 it went out as
        WireTrace 1.0. Each device got its own tab. Logs were written in the background. Lines were
        coloured by severity, so an error stood out from the noise.
      </P>
      <figure className="my-10 max-w-narrow">
        <img
          src="/images/wiretrace-demo-board-multi-tab-dark.png"
          alt="WireTrace 1.x with three device tabs, before the rebuild"
          className="w-full h-auto border border-divider rounded-lg"
          loading="lazy"
          decoding="async"
        />
        <figcaption className="mt-3 font-sans text-caption text-text-tertiary">WireTrace 1.x.</figcaption>
      </figure>

      <H2>On the bench from day one</H2>
      <P>
        WireTrace did not wait for a quiet moment to be tested. From the first release it was on the
        bench in our lab, beside real boards, in my colleagues&rsquo; hands. Not for a demo and not
        for ten minutes. On the long tests that our work depends on.
      </P>
      <P>
        This is the part no amount of testing at my own desk could replace. I know how WireTrace is
        supposed to be used, so I use it that way without thinking. My colleagues use it the way a
        busy engineer uses any tool: quickly, in the middle of something else, with their mind on
        the hardware and not on the software.
      </P>
      <P>
        So the feedback started at once, and the early releases were shaped by it. Bugs were found
        and fixed. Version 1.1 in May brought a live plotter, built partly on an idea a stranger on
        Reddit had described in a couple of lines. Version 1.2 in June fixed how disconnects were
        handled, made saving settings safer, and added Linux.
      </P>
      <P>
        Three releases in three months, each one answering what the bench had said. I thought I was
        keeping up.
      </P>

      <H2>What came back</H2>
      <P>
        None of it arrived as a formal bug report. It came the way feedback comes in a lab where
        people work side by side: in passing, across the bench, in the middle of other work.
      </P>
      <P>
        <B>The log nobody started.</B> A colleague connects a board in a hurry and gets pulled into
        the problem in front of them. Later they want the record of what the device said, and there
        is none, because nobody pressed Start. Version 1 could save what was still on the screen,
        but that was never the whole session. So they did the only thing left: set everything up
        and ran it again from the start. This happened more than once.
      </P>
      <P>
        <B>The port that was not in the list.</B> One of our hardware engineers would plug in a
        board, open the list of ports, and not find it. Then he would remember that the list does
        not refresh by itself, press refresh, and open it again. It costs a few seconds. It also
        happened every time, and he asked, reasonably, why the list could not simply know.
      </P>
      <P>
        <B>The file too big to use.</B> Our long tests produce long logs. Some grew past a gigabyte,
        and a few towards ten. A file like that is slow to open, slow to search, and sometimes too
        much for the editor altogether. The data was all there and it was out of reach.
      </P>
      <P>
        <B>The slow afternoon.</B> Speed has always been what the lab cares about most. A fresh
        session felt quick. Deep into a long one, on the ordinary laptops that live on a bench, it
        began to drag.
      </P>
      <P>
        <B>The connection nobody saw drop.</B> This one worried me the most. Sometimes a connection
        would falter and come back, and the screen gave no clear sign that anything had happened.
        People believed they were logging. Later they found the file did not hold what they had
        watched go by.
      </P>
      <P>
        <B>The log that was somewhere else.</B> People save their logs in a folder they know. But if
        they forgot to pick it, the log went to the default folder instead. It was saved. It was
        just not where they looked, and a log you cannot find feels exactly like a log that was
        never written.
      </P>
      <P>
        <B>The last lines.</B> And the one I heard again and again: after a disconnect, the end of
        the log was missing. The end is usually the part you wanted.
      </P>

      <H2>The test</H2>
      <P>
        I had already patched the disconnect handling once, in June. The reports kept coming. For a
        while I still treated all of these as separate small problems. Then I sat down and tested
        the last one properly, and that changed everything.
      </P>
      <P>
        I sent a burst of 20,100 lines through WireTrace and ended the connection while they were
        still on their way. Every one of them appeared on the screen. Then I opened the log file.
      </P>
      <P>One hundred lines.</P>
      <P>
        Twenty thousand lines had been shown and never written. And the message on the screen said
        the log was saved.
      </P>
      <P>The log said it was saved. It was not.</P>
      <P>
        I want to be exact about how that felt, because it is why this article exists. A logging
        tool has one promise. Mine had broken it and then told the user everything was fine. My
        colleagues had been reporting exactly this, again and again, and it was worse than any of
        them had described.
      </P>

      <H2>One cause</H2>
      <P>
        So I stopped fixing symptoms and went looking for the cause. I measured each stage on its
        own, and the answer was almost embarrassing in how simple it was.
      </P>
      <P>
        The part of WireTrace that reads the serial port was fast. On its own it could handle around
        65,000 lines a second. Yet the tool as a whole could not keep up with a fraction of that.
      </P>
      <P>
        The reason: every single line passed through the window on its way to the disk. Before a
        line could be saved, the screen had to deal with it first. If the window was busy drawing,
        the disk waited. If the disk was slow, the window froze. The record of the test was
        standing in a queue behind the picture of the test.
      </P>
      <P>Once I saw that, the hardest half of the list from the bench turned out to be one problem.</P>
      <P>
        The missing last lines? They were still waiting in that queue when the log was closed. The
        slow afternoon? The screen kept every line it had ever shown and went back through all of
        them each time someone typed in the filter box. With ten thousand lines on screen, one
        keystroke took about two seconds. Even the clock was affected: a line was stamped with the
        time the screen got round to it, not the time it arrived. In one test, the last lines of a
        burst were stamped more than a minute late.
      </P>
      <P>Three complaints. One cause.</P>

      <H2>The second rewrite</H2>
      <P>
        I had been here before. It was the same feeling as with that first small file: every patch
        would make the next one harder, and none of them would touch the real problem.
      </P>
      <P>
        So for the second time, I went back to the beginning. But this time the question was
        different. With version 1 I had asked what the tool should do. Now I asked what it must
        never do.
      </P>
      <P>
        It must never lose a line and stay quiet about it.
        <br />
        It must never make someone run a test again.
        <br />
        It must never slow down because the day was long.
      </P>
      <P>Everything in WireTrace 2.0 follows from those three.</P>

      <H2>What changed</H2>
      <P>
        <B>Saving no longer waits for the screen.</B> Reading the port, writing the file and drawing
        the window are now three separate jobs. The log goes straight from the port to the disk. The
        screen can be as busy as it likes; it cannot cost a single line.
      </P>
      <P>
        <B>The last lines are kept.</B> When a device is unplugged, or the connection is lost, or you
        close the tab, WireTrace first writes down everything that was on its way. Only then does it
        report that it is done.
      </P>
      <P>
        <B>The session records itself.</B> From the moment a device connects, everything it sends is
        kept, whether or not anyone pressed a button. Forget to start a log, and the session can
        still be saved afterwards, up to its most recent gigabyte. Nobody has to run a test twice for that
        reason again.
      </P>
      <P>
        <B>The list of ports looks for itself.</B> Plug a board in and it appears, marked as new.
      </P>
      <P>
        <B>The log is where you expect it.</B> WireTrace remembers the folder you last logged to and
        offers it again, in every tab.
      </P>
      <P>
        <B>Long logs come in files you can open.</B> You set a maximum size. When a log reaches it,
        WireTrace carries on in a new file, and a line is never cut in two.
      </P>
      <P>
        <B>A lost connection is impossible to miss.</B> A bar appears across the tab with the time
        it happened, and it stays there. Everything received is still on screen, and the log has
        been closed properly.
      </P>
      <Screenshot name="connection-lost" />
      <P>
        <B>It tells the truth about itself.</B> If the disk cannot keep up, or fails, WireTrace says
        how many lines could not be written and marks the exact place in the file where they would
        have been. This is the change I care about most. A log with a gap you know about is still
        evidence. A log with a gap you do not know about is worse than no log.
      </P>
      <P>
        <B>One clock.</B> A line is stamped once, at the moment it arrives. The screen, the log, the
        spreadsheet file and the plot all show that same time.
      </P>
      <P>
        <B>It holds its speed.</B> The screen now keeps only the most recent lines, so a long session
        does not grow heavier as the hours go by.
      </P>
      <Screenshot name="plot" />

      <H2>Proof, not promises</H2>
      <P>
        Version 1 claimed more than ten thousand lines a second. I had written that sentence in good
        faith. After that test with the missing lines, good faith was no longer enough for me.
      </P>
      <P>
        So in 2.0 the claim is a test. Every time the code changes, 200,000 lines are sent through
        the real reader and the real writer. Every one of them must arrive in the file, in order, at
        ten thousand lines a second or faster. If one line is missing, the change is rejected.
      </P>
      <P>
        The same goes for the rest. The disconnect that lost twenty thousand lines is now a test. So
        is the forgotten log, the oversized file, the lost connection, the remembered folder.
        Version 1.2 had 444 automated tests. Version 2.0 has more than 2,700, and nothing is
        released unless all of them pass.
      </P>
      <P>I did not want to say &ldquo;trust me&rdquo; a second time.</P>

      <H2>Whose version this is</H2>
      <P>
        I wrote the code. But I did not write the list of what to build. That came from the bench,
        from people who trusted the first version with their work and took the trouble to tell me
        where it let them down.
      </P>
      <P>
        That is the thing I understand now and did not understand in April. A tool like this is not
        finished at a desk. It is finished in a lab, by the people who lean on it when they are busy
        and tired and thinking about something else.
      </P>
      <P>
        Which also means it is not finished now. WireTrace 2.0 is going back onto the same bench. My
        colleagues will use it hard, and they will find something. They always do. Something that
        takes one click too many, or something I never imagined anyone would try. And I will hear
        about it across the bench, in the middle of other work.
      </P>
      <P>Good. That is how this one got made, and it is how the next one will be.</P>

      <Divider />

      <P>
        WireTrace is free and open source. There are installers for Windows and Linux, and it runs
        from source on macOS. If you work with hardware, try it on your own bench. And when it gets
        in your way, tell me.
      </P>
    </>
  );
}

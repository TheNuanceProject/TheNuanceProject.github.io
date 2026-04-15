// SPDX-License-Identifier: MIT
import { ArticleLayout } from '@/components/ArticleLayout';
import { P, H2, H3, B, A, Quote, UL, LI, Code, Divider } from '@/components/writing-prose';
import { deriveDates } from '@/lib/content/dates';
import { meta } from './meta';

/**
 * EXAMPLE WRITING PIECE — reference template for real pieces.
 *
 * This page is in src/pages/writing/_example/ — the underscore prefix
 * means the writing loader ignores it (so it never appears on the
 * index or Home page) but the file itself is preserved as a working
 * example to copy from.
 *
 * Pattern for a real writing piece:
 *
 *   1. Wrap the body in <ArticleLayout meta={resolved}>
 *      — provides back link, date label, title, description, and
 *      footer with published/updated dates.
 *
 *   2. Use prose components for the body:
 *      - <P>           paragraphs
 *      - <H2>, <H3>    section headings
 *      - <B>, <I>      bold and italic
 *      - <A href>      links (auto-detects external)
 *      - <Quote>       block quotes
 *      - <UL>, <OL>    lists with <LI> items
 *      - <Code>        inline code
 *      - <CodeBlock>   multi-line code
 *      - <Divider>     horizontal rule between major sections
 *
 *   3. The footer shows "Published [date]" automatically. If you
 *      revise the piece, set `updated` in meta.ts and the footer
 *      will show "Published X · Updated Y" — and the piece will
 *      resurface to the top of index pages.
 */
const resolved = { ...meta, ...deriveDates(meta.published, meta.updated) };

export default function ExampleWriting() {
  return (
    <ArticleLayout meta={resolved}>
      <P>
        This is the opening paragraph of an example writing piece. It
        sets up what the piece is about and pulls the reader in. Use{' '}
        <B>plain prose</B>, with emphasis where it earns the weight.
      </P>

      <P>
        A writing piece is a sequence of paragraphs, headings, and
        occasional structural elements. The components in{' '}
        <Code>@/components/writing-prose</Code> provide everything most pieces
        need without leaving the design system.
      </P>

      <H2>The first major section</H2>

      <P>
        Section headings use <Code>&lt;H2&gt;</Code>. They give the
        piece its skeleton — the reader can scan the headings to see
        the shape of the argument before reading the prose.
      </P>

      <P>
        Within a section, paragraphs flow naturally. Each{' '}
        <Code>&lt;P&gt;</Code> gets the proper Lora 17px body type
        with comfortable line height and spacing below it.
      </P>

      <H3>A subsection</H3>

      <P>
        Use <Code>&lt;H3&gt;</Code> for finer divisions inside an H2
        section. Don&rsquo;t skip levels — go H2, then H3, then back
        to H2 for the next major part.
      </P>

      <Quote>
        A pulled-out passage uses the Quote component. It sits with a
        thin left border and italic body type, lightly muted.
      </Quote>

      <H2>Lists and other elements</H2>

      <P>An unordered list:</P>

      <UL>
        <LI>List items use the <Code>&lt;LI&gt;</Code> component.</LI>
        <LI>They render with proper spacing and muted markers.</LI>
        <LI>
          Use <A href="https://example.com">links</A> inside list items
          the same way as in paragraphs.
        </LI>
      </UL>

      <P>
        For longer code samples, use <Code>&lt;CodeBlock&gt;</Code>{' '}
        which provides horizontal scrolling and a subtle background.
      </P>

      <Divider />

      <H2>Closing thoughts</H2>

      <P>
        A horizontal divider marks a shift before the closing section.
        End the piece naturally — no formulaic conclusion. The footer
        below shows the published date (and updated date, when set).
      </P>
    </ArticleLayout>
  );
}

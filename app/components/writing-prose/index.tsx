// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import type { ReactNode, AnchorHTMLAttributes } from 'react';
import { highlightCode } from '~/lib/highlight';
import { CopyButton } from '~/components/CopyButton';

/**
 * Prose components: pre-styled typographic building blocks.
 *
 * Use these when writing an article or any long-form prose page.
 * Each one encodes the site's reading typography (Lora body,
 * Poppins headings, generous spacing) so individual pieces stay
 * visually consistent without a Markdown pipeline.
 *
 * A piece looks like:
 *
 *   <H2>The decision point</H2>
 *   <P>There was no single moment, but there was a pattern...</P>
 *   <H3>What stayed</H3>
 *   <P>The behaviour stayed...</P>
 *
 * Each piece can still embed custom components (images, figures,
 * interactive demos) alongside these.
 */

interface HeadingProps {
  children: ReactNode;
  id?: string;
}

/** Section heading: use for the main divisions of an article. */
export function H2({ children, id }: HeadingProps) {
  return (
    <h2
      id={id}
      className="
        font-sans font-regular
        text-title
        text-text
        mt-16 mb-4
      "
    >
      {children}
    </h2>
  );
}

/** Subsection heading: use under an H2 for finer divisions. */
export function H3({ children, id }: HeadingProps) {
  return (
    <h3
      id={id}
      className="
        font-sans font-regular
        text-title-sm
        text-text
        mt-12 mb-3
      "
    >
      {children}
    </h3>
  );
}

/** Paragraph: the workhorse. Use for all body copy. */
export function P({ children }: { children: ReactNode }) {
  return (
    <p
      className="
        font-serif text-reading
        text-text
        mb-6
      "
    >
      {children}
    </p>
  );
}

/** Lead paragraph: slightly larger, muted, for an essay's opener. */
export function Lead({ children }: { children: ReactNode }) {
  return (
    <p
      className="
        font-serif text-lead
        text-text-secondary
        mb-8
      "
    >
      {children}
    </p>
  );
}

/** Bold emphasis inside body text. */
export function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold">{children}</strong>;
}

/** Italic emphasis. */
export function I({ children }: { children: ReactNode }) {
  return <em className="italic">{children}</em>;
}

/** Inline link. Automatically opens external links in a new tab. */
export function A(
  props: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }
) {
  const { href, children, ...rest } = props;
  const isExternal =
    typeof href === 'string' && /^https?:\/\//.test(href);

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      className="
        text-text
        border-b border-divider
        hover:border-accent-strong
        transition-colors duration-(--duration-fast)
        no-underline
      "
      {...rest}
    >
      {children}
    </a>
  );
}

/** Block quote: pulled-out passage, italic, subtle left border. */
export function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote
      className="
        my-8 pl-6
        border-l border-divider
        italic
        text-text-secondary
        font-serif text-reading
      "
    >
      {children}
    </blockquote>
  );
}

/** Unordered list. */
export function UL({ children }: { children: ReactNode }) {
  return (
    <ul
      className="
        font-serif text-reading
        text-text
        list-disc pl-6 mb-6
        space-y-2
        marker:text-text-tertiary
      "
    >
      {children}
    </ul>
  );
}

/** Ordered list. */
export function OL({ children }: { children: ReactNode }) {
  return (
    <ol
      className="
        font-serif text-reading
        text-text
        list-decimal pl-6 mb-6
        space-y-2
        marker:text-text-tertiary
      "
    >
      {children}
    </ol>
  );
}

/** List item. */
export function LI({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

/** Inline code span. */
export function Code({ children }: { children: ReactNode }) {
  return (
    <code
      className="
        font-mono text-mono
        bg-surface
        px-1 rounded-sm
        text-text
      "
    >
      {children}
    </code>
  );
}

/** Code block: multi-line code, scrolls horizontally if needed. */
const PLAIN_PRE =
  'font-mono text-mono-lg bg-surface ' +
  'text-text p-6 rounded-md overflow-x-auto';

export function CodeBlock({
  children,
  lang,
}: {
  children: ReactNode;
  /** Language hint enabling syntax highlighting, e.g. "typescript". */
  lang?: string;
}) {
  const code = typeof children === 'string' ? children : null;
  const [html, setHtml] = useState<string | null>(null);

  // Progressive enhancement: ships plain, upgrades to highlighted HTML
  // after mount once the lazy Shiki chunk loads. No hydration mismatch
  // because the first client render matches the server (plain).
  useEffect(() => {
    if (!code || !lang) return;
    let alive = true;
    void highlightCode(code, lang).then((result) => {
      if (alive && result) setHtml(result);
    });
    return () => {
      alive = false;
    };
  }, [code, lang]);

  if (code) {
    return (
      <div className="relative group my-8">
        <CopyButton value={code} />
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className={PLAIN_PRE}>
            <code>{code}</code>
          </pre>
        )}
      </div>
    );
  }

  // Non-string children: render plainly.
  return (
    <pre className={`${PLAIN_PRE} my-8`}>
      <code>{children}</code>
    </pre>
  );
}

/** Horizontal rule: marks a shift in the piece. */
/**
 * Sidenote: an auto-numbered note. On wide screens (>= xl) it floats
 * into the right margin beside its marker; below xl it renders inline as
 * a small numbered aside. Numbering is automatic via a CSS counter
 * scoped to the article body (see `.article-body` in globals.css), so
 * notes number themselves in document order. The note text is always in
 * the DOM, so it stays accessible to screen readers at every width.
 */
export function Sidenote({ children }: { children: ReactNode }) {
  return (
    <>
      <sup className="sidenote-marker" aria-hidden="true" />
      <small className="sidenote">{children}</small>
    </>
  );
}

export function Divider() {
  return (
    <hr
      className="my-12 border-0 border-t border-divider"
    />
  );
}

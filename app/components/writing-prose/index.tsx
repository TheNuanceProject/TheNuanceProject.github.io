// SPDX-License-Identifier: MIT
import { useEffect, useState } from 'react';
import type { ReactNode, AnchorHTMLAttributes } from 'react';
import { highlightCode } from '~/lib/highlight';
import { CopyButton } from '~/components/CopyButton';

/**
 * Prose components — pre-styled typographic building blocks.
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

/** Section heading — use for the main divisions of an article. */
export function H2({ children, id }: HeadingProps) {
  return (
    <h2
      id={id}
      className="
        font-display font-normal
        text-2xl md:text-[28px]
        leading-[1.25] tracking-[-0.01em]
        text-[var(--color-text-primary)]
        mt-16 mb-4
      "
    >
      {children}
    </h2>
  );
}

/** Subsection heading — use under an H2 for finer divisions. */
export function H3({ children, id }: HeadingProps) {
  return (
    <h3
      id={id}
      className="
        font-display font-normal
        text-xl
        leading-[1.4]
        text-[var(--color-text-primary)]
        mt-12 mb-3
      "
    >
      {children}
    </h3>
  );
}

/** Paragraph — the workhorse. Use for all body copy. */
export function P({ children }: { children: ReactNode }) {
  return (
    <p
      className="
        font-body text-[17px] leading-[1.75]
        text-[var(--color-text-primary)]
        mb-6
      "
    >
      {children}
    </p>
  );
}

/** Lead paragraph — slightly larger, muted, for an essay's opener. */
export function Lead({ children }: { children: ReactNode }) {
  return (
    <p
      className="
        font-body text-[19px] md:text-xl
        leading-[1.55]
        text-[var(--color-text-secondary)]
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
        text-[var(--color-text-primary)]
        border-b border-[var(--color-border)]
        hover:border-[var(--color-accent)]
        transition-colors duration-150
        no-underline
      "
      {...rest}
    >
      {children}
    </a>
  );
}

/** Block quote — pulled-out passage, italic, subtle left border. */
export function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote
      className="
        my-8 pl-6
        border-l border-[var(--color-border)]
        italic
        text-[var(--color-text-secondary)]
        font-body text-[17px] leading-[1.75]
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
        font-body text-[17px] leading-[1.75]
        text-[var(--color-text-primary)]
        list-disc pl-6 mb-6
        space-y-2
        marker:text-[var(--color-text-mid)]
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
        font-body text-[17px] leading-[1.75]
        text-[var(--color-text-primary)]
        list-decimal pl-6 mb-6
        space-y-2
        marker:text-[var(--color-text-mid)]
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
        font-mono text-[0.9em]
        bg-[var(--color-surface)]
        px-1.5 py-0.5 rounded
        text-[var(--color-text-primary)]
      "
    >
      {children}
    </code>
  );
}

/** Code block — multi-line code, scrolls horizontally if needed. */
const PLAIN_PRE =
  'font-mono text-[14px] leading-[1.6] bg-[var(--color-surface)] ' +
  'text-[var(--color-text-primary)] p-6 rounded overflow-x-auto';

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

/** Horizontal rule — marks a shift in the piece. */
/**
 * Sidenote — an auto-numbered note. On wide screens (>= xl) it floats
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
      className="my-12 border-0 border-t border-[var(--color-border)]"
    />
  );
}

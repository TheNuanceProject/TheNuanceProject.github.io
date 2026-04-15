// SPDX-License-Identifier: MIT
import type { ReactNode, AnchorHTMLAttributes } from 'react';

/**
 * Prose components — pre-styled typographic building blocks.
 *
 * Use these when writing an article or any long-form prose page.
 * Each matches the typography rules in DESIGN_SYSTEM.md section 6
 * (Lora 17px body, Poppins headings, generous spacing, proper
 * vertical rhythm).
 *
 * Writing a piece looks like:
 *   <H2>The decision point</H2>
 *   <P>There was no single moment, but there was a pattern...</P>
 *   <P>By the third round...</P>
 *   <H3>What stayed</H3>
 *   <P>The behaviour stayed...</P>
 *
 * Keeps writing pieces visually consistent without a markdown
 * pipeline, and lets each piece still embed custom components
 * (images, figures, interactive demos) when it wants to.
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
export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre
      className="
        font-mono text-[14px] leading-[1.6]
        bg-[var(--color-surface)]
        text-[var(--color-text-primary)]
        p-6 rounded
        my-8
        overflow-x-auto
      "
    >
      <code>{children}</code>
    </pre>
  );
}

/** Horizontal rule — marks a shift in the piece. */
export function Divider() {
  return (
    <hr
      className="my-12 border-0 border-t border-[var(--color-border)]"
    />
  );
}

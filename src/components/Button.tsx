// SPDX-License-Identifier: MIT
import type { ReactNode, AnchorHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'ghost';

interface BaseButtonProps {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

interface InternalButtonProps extends BaseButtonProps {
  /** Internal route — uses React Router <Link> */
  to: string;
  href?: never;
  external?: never;
}

interface ExternalButtonProps extends BaseButtonProps {
  /** External URL — uses <a> with target="_blank" */
  href: string;
  to?: never;
  external: true;
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>['rel'];
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target'];
}

type ButtonProps = InternalButtonProps | ExternalButtonProps;

/**
 * Button — primary call-to-action, also available as ghost variant.
 *
 * Per DESIGN_SYSTEM.md section 6:
 *   Primary:
 *     - Background: text-primary (#141413)
 *     - Text: bg-paper
 *     - Padding: 12px 24px, border-radius: 4px
 *     - Font: Poppins 500, 14px
 *     - Hover: background shifts slightly
 *
 *   Ghost:
 *     - Background: transparent
 *     - Border: 1px border-soft
 *     - Hover: border becomes text-primary
 *
 * Renders either as a React Router <Link> (for internal navigation)
 * or as an <a> (for external URLs). The discriminated union prop type
 * forces the caller to choose explicitly — no accidental mix-ups.
 */
export function Button(props: ButtonProps) {
  const variant: Variant = props.variant ?? 'primary';

  const classes = cn(
    // Base
    'inline-flex items-center justify-center gap-2',
    'font-display font-medium text-sm',
    'px-6 py-3 rounded',
    'transition-all duration-150',
    'no-underline',

    // Variant
    variant === 'primary' && [
      'bg-[var(--color-text-primary)]',
      'text-[var(--color-paper)]',
      'hover:opacity-90',
    ],
    variant === 'ghost' && [
      'bg-transparent',
      'border border-[var(--color-border)]',
      'text-[var(--color-text-primary)]',
      'hover:border-[var(--color-text-primary)]',
    ],

    props.className
  );

  if ('to' in props && props.to !== undefined) {
    return (
      <Link to={props.to} className={classes}>
        {props.children}
      </Link>
    );
  }

  // After the guard above, TypeScript still sees the union; we narrow
  // explicitly by destructuring the external props out.
  const { href, target, rel, children } = props as ExternalButtonProps;

  return (
    <a
      href={href}
      target={target ?? '_blank'}
      rel={rel ?? 'noopener noreferrer'}
      className={classes}
    >
      {children}
    </a>
  );
}

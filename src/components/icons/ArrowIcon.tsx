// SPDX-License-Identifier: MIT
interface ArrowIconProps {
  className?: string;
  size?: number;
}

/**
 * ArrowIcon — small right-pointing arrow used in "Read more →" CTAs.
 *
 * Follows the iconography rules from DESIGN_SYSTEM.md section 8:
 *   - Stroke width 1.5
 *   - Color inherits from parent (currentColor)
 *   - Outlined, not filled
 *
 * The arrow is intentionally a separate component so spacing and stroke
 * stay consistent across every "Read more" link on the site.
 */
export function ArrowIcon({ className, size = 14 }: ArrowIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}

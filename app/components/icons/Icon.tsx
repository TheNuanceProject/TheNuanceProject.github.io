// SPDX-License-Identifier: MIT
import type { LucideIcon } from 'lucide-react';
import { MEASURES } from '~/lib/design-tokens';

/** The icon sizes of the design language. */
export type IconSize = 'sm' | 'md' | 'lg';

interface IconProps {
  /** The Lucide icon to draw. */
  icon: LucideIcon;
  /** `sm` inside controls and rows, `md` standalone, `lg` for large marks. */
  size?: IconSize;
  className?: string;
}

/**
 * Icon: a Lucide icon, the icon set of the Nuance Design Language, which
 * WireTrace uses too.
 *
 * Drawn at one of the language's icon sizes, with a line of one pixel at
 * any size (the weight of every line of the language), in the colour of
 * the text beside it. Icons are never coloured for decoration, and are
 * hidden from assistive technology: the control or text they sit in
 * carries the name.
 */
export function Icon({ icon: Drawn, size = 'sm', className }: IconProps) {
  return (
    <Drawn
      size={MEASURES[`size.icon.${size}`]}
      strokeWidth={MEASURES['border.hairline']}
      absoluteStrokeWidth
      className={className}
      aria-hidden="true"
      focusable="false"
    />
  );
}

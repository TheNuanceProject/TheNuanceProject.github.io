// SPDX-License-Identifier: MIT
import { cn } from '~/lib/cn';

interface ThemedScreenshotProps {
  /** The picture in the light theme. */
  readonly light: string;
  /** The picture in the dark theme. */
  readonly dark: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly caption?: string;
  /** Across the whole content width, not the reading width. */
  readonly wide?: boolean;
  readonly className?: string;
}

const IMAGE = 'w-full h-auto border border-divider rounded-lg';

/**
 * ThemedScreenshot: a picture of an application, in the version that
 * matches the site's theme. Both are in the page; CSS shows one. The
 * hidden one is never displayed, so a browser does not load it.
 */
export function ThemedScreenshot({ light, dark, alt, width, height, caption, wide, className }: ThemedScreenshotProps) {
  return (
    <figure className={cn(!wide && 'max-w-narrow', className)}>
      <img src={light} alt={alt} width={width} height={height} loading="lazy" decoding="async" className={cn(IMAGE, 'block dark:hidden')} />
      <img src={dark} alt={alt} width={width} height={height} loading="lazy" decoding="async" className={cn(IMAGE, 'hidden dark:block')} />
      {caption && (
        <figcaption className="mt-3 font-sans text-caption text-text-tertiary">{caption}</figcaption>
      )}
    </figure>
  );
}

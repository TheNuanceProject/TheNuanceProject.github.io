// SPDX-License-Identifier: MIT
import { useState } from 'react';

/**
 * CopyButton — copies the given text to the clipboard and shows a brief
 * confirmation. Sits in the top-right of a code block; revealed on
 * hover/focus of the block on pointer devices, always present for
 * keyboard and touch.
 */
export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — fail silently.
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? 'Copied' : 'Copy code'}
      className="
        absolute top-3 right-3 z-10
        font-display text-xs
        px-2.5 py-1 rounded
        border border-[var(--color-border)]
        bg-[var(--color-paper)] text-[var(--color-text-mid)]
        hover:text-[var(--color-text-primary)]
        transition-opacity duration-150
        opacity-0 focus-visible:opacity-100
        group-hover:opacity-100
      "
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

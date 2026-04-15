// SPDX-License-Identifier: MIT
import { siteConfig } from '@/config/site.config';

/**
 * Footer — minimal site footer.
 *
 * Per DESIGN_SYSTEM.md section 6:
 *   - Top: 96px padding, Bottom: 48px
 *   - Border-top: 1px border-soft
 *   - Left: copyright + author name
 *   - Right: 2-3 small links
 *   - Font: text-sm (14px), color text-mid
 *
 * Per the execution plan, the year is dynamic — reads current year
 * at runtime so the site never looks abandoned.
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="
        mt-24
        border-t border-[var(--color-border)]
        transition-colors duration-250
      "
    >
      <div
        className="
          max-w-[var(--container-wide)] mx-auto
          px-6 md:px-12
          pt-10 pb-8
          flex flex-col md:flex-row items-start md:items-center justify-between
          gap-4
          text-sm text-[var(--color-text-mid)]
        "
      >
        <p className="font-display">
          © {currentYear} {siteConfig.identity.name}
        </p>

        <nav aria-label="Footer" className="flex items-center gap-6">
          <a
            href={siteConfig.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="
              font-display
              hover:text-[var(--color-text-primary)]
              transition-colors duration-150
            "
          >
            GitHub
          </a>
          <a
            href={`mailto:${siteConfig.author.email}`}
            className="
              font-display
              hover:text-[var(--color-text-primary)]
              transition-colors duration-150
            "
          >
            Email
          </a>
        </nav>
      </div>
    </footer>
  );
}

// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { siteConfig } from '~/config/site.config';

/**
 * Footer: minimal site footer.
 *
 * Left: copyright line with dynamic year (so the site never looks
 * abandoned). Right: GitHub link, contact email, privacy page.
 */
export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="
        border-t border-divider
        transition-colors duration-(--duration-base)
      "
    >
      <div
        className="
          max-w-wide mx-auto
          px-(--web-gutter-phone) md:px-(--web-gutter-tablet)
          pt-10 pb-8
          flex flex-col md:flex-row items-start md:items-center justify-between
          gap-4
          text-ui-lg text-text-tertiary
        "
      >
        <p className="font-sans">
          © {currentYear} {siteConfig.identity.name}
        </p>

        <nav aria-label="Footer" className="flex items-center gap-6">
          <a
            href={siteConfig.links.github}
            target="_blank"
            rel="me noopener noreferrer"
            className="
              font-sans
              hover:text-text
              transition-colors duration-(--duration-fast)
            "
          >
            GitHub
          </a>
          <a
            href={`mailto:${siteConfig.author.email}`}
            className="
              font-sans
              hover:text-text
              transition-colors duration-(--duration-fast)
            "
          >
            Email
          </a>
          <Link
            to="/privacy"
            className="
              font-sans
              hover:text-text
              transition-colors duration-(--duration-fast)
            "
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}

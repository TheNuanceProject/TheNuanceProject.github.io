// SPDX-License-Identifier: MIT
import { useEffect } from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from 'react-router';
import type { LinksFunction, MetaFunction } from 'react-router';

import { Header } from '~/components/Header';
import { ReadingProgress } from '~/components/ReadingProgress';
import { AmbientField } from '~/components/AmbientField';
import { Footer } from '~/components/Footer';
import { ThemeProvider } from '~/lib/theme';
import { siteConfig } from '~/config/site.config';
import { logConsoleSignature } from '~/lib/console-signature';
import { COLOURS } from '~/lib/design-tokens';

// The site's fonts, served from this site itself: no request leaves for
// a font service. Each file covers only the characters it is needed for.
import '@fontsource/lora/400.css';
import '@fontsource/lora/600.css';
import '@fontsource/lora/400-italic.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './styles/globals.css';

/**
 * Root route.
 *
 * This module owns the HTML shell: everything outside the per-route
 * content. It sets up the document head (favicons, base meta tags),
 * loads the site's own fonts, wraps every page in `ThemeProvider`,
 * and renders the persistent chrome (Header, Footer) around the
 * routed `<Outlet />`.
 *
 * The `themeScript` block runs before React hydrates and reads the
 * user's saved preference (or their OS setting) to set the
 * `data-theme` attribute on `<html>`. That guarantees no flash of
 * the wrong theme on first paint.
 *
 * The Cloudflare Web Analytics beacon is injected only when the
 * `VITE_CLOUDFLARE_ANALYTICS_TOKEN` environment variable is set at
 * build time; otherwise the script tag is simply omitted. This
 * means the public repo stays free of analytics tokens while still
 * emitting the beacon in the production build.
 */

// ─── Links ─────────────────────────────────────────────────────────────

export const links: LinksFunction = () => [
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  {
    rel: 'alternate icon',
    type: 'image/png',
    sizes: '32x32',
    href: '/favicon-32.png',
  },
  {
    rel: 'apple-touch-icon',
    sizes: '180x180',
    href: '/apple-touch-icon.png',
  },
  { rel: 'mask-icon', href: '/favicon.svg', color: COLOURS.light.accent },

  // RSS feed (generated at build into dist/client/feed.xml).
  {
    rel: 'alternate',
    type: 'application/rss+xml',
    title: `${siteConfig.identity.name}: Writing`,
    href: '/feed.xml',
  },

];

// ─── Site-wide default meta ────────────────────────────────────────────
// These defaults may be overridden by individual routes. Anything
// that MUST be present on every single page regardless of the
// route (viewport, charset, theme-color) lives in the Layout
// JSX below, not here. React Router replaces the parent `meta`
// array with the child's when a route exports its own `meta`, so
// descriptors declared here would be lost on every non-root page.

export const meta: MetaFunction = () => [
  { name: 'author', content: siteConfig.author.fullName },
  { name: 'robots', content: 'index, follow' },
];

// ─── Inline theme-before-hydration script ──────────────────────────────

const themeScript = `(function(){try{var s=localStorage.getItem('nuance-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',s||(d?'dark':'light'))}catch(e){}})()`;

// ─── Layout ────────────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const cloudflareToken = import.meta.env.VITE_CLOUDFLARE_ANALYTICS_TOKEN;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Static head elements: these are identical on every page and
          must render on every page. Keeping them here as fixed JSX
          (rather than inside `meta`) ensures they survive per-route
          meta overrides.
        */}
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content={COLOURS.light.paper}
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content={COLOURS.dark.paper}
        />

        {/* Per-route meta and link tags injected by React Router. */}
        <Meta />
        <Links />

        {/* Set `data-theme` before hydration to prevent flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        {cloudflareToken ? (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: cloudflareToken })}
          />
        ) : null}
      </body>
    </html>
  );
}

// ─── Main app shell ────────────────────────────────────────────────────

export default function App() {
  useEffect(() => {
    logConsoleSignature();
  }, []);

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <ReadingProgress />
        <a
          href="#main"
          className="
            sr-only focus:not-sr-only
            focus:fixed focus:top-4 focus:left-4 focus:z-100
            focus:px-4 focus:py-2
            focus:bg-paper
            focus:border focus:border-text
            focus:rounded-sm
            focus:text-ui-lg focus:font-sans
          "
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="relative isolate flex-1 overflow-x-clip">
          <AmbientField />
          <div className="relative z-1">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

// ─── Error boundary ────────────────────────────────────────────────────

export function ErrorBoundary({ error }: { error: unknown }) {
  const isResponse = isRouteErrorResponse(error);
  const status = isResponse ? error.status : 500;
  const title = isResponse
    ? status === 404
      ? 'Page not found'
      : `${status}: Something went wrong`
    : 'Something went wrong';
  const body =
    status === 404
      ? 'The link may be broken, or the page may have moved.'
      : 'An unexpected error occurred.';

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <ReadingProgress />
        <Header />
        <main id="main" className="relative isolate flex-1 overflow-x-clip">
          <AmbientField />
          <div className="relative z-1 max-w-default mx-auto px-(--web-gutter-phone) md:px-(--web-gutter-tablet)">
            <section className="pt-20 md:pt-32 pb-20 md:pb-32">
              <p className="text-label font-sans font-medium uppercase text-accent-strong mb-6">
                {status}
              </p>
              <h1 className="font-sans font-regular text-display-sm text-text mb-6">
                {title}
              </h1>
              <p className="font-serif text-reading text-text-secondary max-w-narrow">
                {body}
              </p>
            </section>
          </div>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}

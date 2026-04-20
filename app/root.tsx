// SPDX-License-Identifier: MIT
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
import { Footer } from '~/components/Footer';
import { ThemeProvider } from '~/lib/theme';
import { siteConfig } from '~/config/site.config';

import './styles/globals.css';

/**
 * Root route.
 *
 * This module owns the HTML shell: everything outside the per-route
 * content. It sets up the document head (favicons, fonts, base
 * meta tags), wraps every page in `ThemeProvider`, and renders the
 * persistent chrome (Header, Footer) around the routed `<Outlet />`.
 *
 * The `themeScript` block runs before React hydrates and reads the
 * user's saved preference (or their OS setting) to set the
 * `data-theme` attribute on `<html>`. That guarantees no flash of
 * the wrong theme on first paint.
 *
 * The Cloudflare Web Analytics beacon is injected only when the
 * `VITE_CLOUDFLARE_ANALYTICS_TOKEN` environment variable is set at
 * build time — otherwise the script tag is simply omitted. This
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
  { rel: 'mask-icon', href: '/favicon.svg', color: '#D97757' },

  // Fonts — preconnect first, then the stylesheet.
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Poppins:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
  },
];

// ─── Site-wide default meta ────────────────────────────────────────────

export const meta: MetaFunction = () => [
  { charSet: 'utf-8' },
  { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
  {
    name: 'theme-color',
    media: '(prefers-color-scheme: light)',
    content: '#FAF9F5',
  },
  {
    name: 'theme-color',
    media: '(prefers-color-scheme: dark)',
    content: '#1A1A18',
  },
  { name: 'author', content: siteConfig.author.fullName },
  { name: 'robots', content: 'index, follow' },
];

// ─── Inline theme-before-hydration script ──────────────────────────────

const themeScript = `(function(){try{var s=localStorage.getItem('nuance-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',s||(d?'dark':'light'))}catch(e){}})()`;

// ─── Layout ────────────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const cloudflareToken = import.meta.env.VITE_CLOUDFLARE_ANALYTICS_TOKEN;

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
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
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="
            sr-only focus:not-sr-only
            focus:fixed focus:top-4 focus:left-4 focus:z-[100]
            focus:px-4 focus:py-2
            focus:bg-[var(--color-paper)]
            focus:border focus:border-[var(--color-text-primary)]
            focus:rounded
            focus:text-sm focus:font-display
          "
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          <Outlet />
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
      : `${status} — Something went wrong`
    : 'Something went wrong';
  const body =
    status === 404
      ? 'The link may be broken, or the page may have moved.'
      : 'An unexpected error occurred.';

  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main id="main" className="flex-1">
          <div className="max-w-[var(--container-default)] mx-auto px-6 md:px-12">
            <section className="pt-20 md:pt-32 pb-20 md:pb-32">
              <p className="text-xs font-display font-medium uppercase tracking-[0.08em] text-[var(--color-accent)] mb-6">
                {status}
              </p>
              <h1 className="font-display font-normal text-3xl md:text-[2.75rem] leading-[1.15] tracking-[-0.02em] text-[var(--color-text-primary)] mb-6">
                {title}
              </h1>
              <p className="font-body text-[17px] leading-[1.75] text-[var(--color-text-secondary)] max-w-[var(--container-narrow)]">
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

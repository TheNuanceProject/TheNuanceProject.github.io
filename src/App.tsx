// SPDX-License-Identifier: MIT
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme';
import { ScrollToTop } from '@/lib/scroll-to-top';
import { Layout } from '@/components/Layout';
import Home from '@/pages/Home';
import Projects from '@/pages/Projects';
import Writing from '@/pages/Writing';
import About from '@/pages/About';
import Privacy from '@/pages/Privacy';
import NotFound from '@/pages/NotFound';

// ─── Project pages ─────────────────────────────────────────────────────
// One import + one route per project. Adding a new project means
// dropping a folder in src/pages/projects/[slug]/ and adding two lines
// here. Routing is kept explicit so every URL the app responds to is
// visible in this one file.
import ProjectWireTrace from '@/pages/projects/wiretrace';

// ─── Writing pages ─────────────────────────────────────────────────────
// Same pattern as projects. The _example/ folder is the reference
// template — its route is intentionally NOT registered here, so even
// if the loader changes, the example never appears as a real piece.
//
// To publish a real piece:
//   1. Create src/pages/writing/[slug]/ with meta.ts + index.tsx
//   2. Add an import + a Route line below
//   3. Restart the dev server

/**
 * App — Top-level composition and routing.
 *
 * Routing is explicit: every URL the app responds to is listed here.
 * Index pages (Projects, Writing) auto-discover their content from
 * the loaders, but each individual page registers its own route so
 * the routing tree is traceable in one place.
 */
export default function App() {
  return (
    <ThemeProvider>
      <ScrollToTop />
      <Layout>
        <Routes>
          {/* Top-level pages */}
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/writing" element={<Writing />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Project pages */}
          <Route
            path="/projects/wiretrace"
            element={<ProjectWireTrace />}
          />

          {/* Writing pages — one Route per published piece */}
          {/* (none yet — add as you publish) */}

          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}

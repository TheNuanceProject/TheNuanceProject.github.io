# thenuanceproject.com

Source for [The Nuance Project](https://thenuanceproject.com), a small,
independent studio for software, writing, and the occasional note on
something worth working through.

Built with [React Router v7](https://reactrouter.com/) (framework mode) +
[React 19](https://react.dev/) + [Vite](https://vitejs.dev/) +
[TypeScript](https://www.typescriptlang.org/) +
[Tailwind CSS v4](https://tailwindcss.com/). Every route is pre-rendered
to static HTML at build time and deployed to GitHub Pages on push to
`main`, and again every 12 hours.

---

## Running locally

```bash
npm install
npm run dev
# → http://localhost:5173
```

For optional analytics during local development, copy `.env.example`
to `.env.local` and set `VITE_CLOUDFLARE_ANALYTICS_TOKEN`. Without
the variable the beacon script is simply omitted.

## Design

Colours, sizes, type and every other design value come from the
design tokens in [`design/`](design/README.md), shared with WireTrace.
After changing them, run `npm run tokens`; never edit the generated
`app/styles/tokens.css` or `app/lib/design-tokens.ts`. A test builds
every class the components use with Tailwind and fails on a class that
is not made from the tokens.

## Build

```bash
npm run build       # produces dist/client with one HTML file per route
npm run preview     # serves dist/client locally
```

The build reads two things from the network, checks them, and puts them
in the pages: WireTrace's releases, from GitHub's API, and the public
summary of WireTrace's update server, for the usage page. If either
cannot be read, or is not exactly what is expected, the build stops. A
summary that does not exist yet (before the update server has made its
first) gives the usage page its empty state.

To build without the network, set `BUILD_DATA_DIR` to a folder holding
`releases/TheNuanceProject/WireTrace.json` (an answer of GitHub's
releases API) and, optionally, `summary.json`. They are checked exactly
as fetched data is. A build in CI refuses it.

Every page carries a Content Security Policy written by the build: it
may run only the inline scripts it was built with, and loads nothing
from another site except Cloudflare Web Analytics. The headers a page
cannot set itself (HSTS, framing, and the rest) come from a Cloudflare
response header rule.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server with hot module replacement |
| `npm run build` | Pre-renders every route into `dist/client` |
| `npm run preview` | Serves the production build for local inspection |
| `npm run typecheck` | `react-router typegen` + `tsc` |
| `npm run lint` | ESLint across the repo |
| `npm run test` | Runs the unit test suite |
| `npm run spdx` | Checks every source file carries its SPDX licence line |
| `npm run world` | Remakes `public/data/world.json`, the usage page's map, from Natural Earth |

---

## Project layout

```
app/
  root.tsx              # HTML shell, theme bootstrap, error boundary
  routes.ts             # Explicit route manifest
  routes/               # One file per URL
  components/           # Shared UI
  lib/                  # Content loaders, theme, SEO helpers
  config/               # Site-wide configuration
  styles/               # Global CSS

content/
  projects/[slug]/      # Project metadata, auto-discovered
  writing/[slug]/       # Writing metadata, auto-discovered

public/                 # Static assets (favicons, og-image, robots.txt, CNAME)
public/data/world.json  # The usage page's map (scripts/make-world.mjs)
public/images/wiretrace # WireTrace's pictures, made by its tools/make_site_screenshots.py
scripts/pages.mjs       # The pages not discovered from content/
scripts/postbuild.mjs   # Sitemap, feed, social cards, search index, 404.html, CSP
scripts/csp.mjs         # Each page's Content Security Policy
```

## Adding content

Writing pieces and projects are auto-discovered from their folders
under `content/`. To add a piece: drop a folder with a `meta.ts`
into the right place, create a corresponding route in `app/routes/`,
and add one line to `app/routes.ts`.

## Deployment

Every push to `main` triggers the workflow at
[.github/workflows/deploy.yml](./.github/workflows/deploy.yml). The
site is live within a couple of minutes.

The Cloudflare Web Analytics token is supplied to the build via a
GitHub Actions repository secret named
`VITE_CLOUDFLARE_ANALYTICS_TOKEN`. When unset, the build still
succeeds; the beacon script is simply omitted.

## License

The **code** in this repository (components, build configuration,
tooling) is licensed under the [MIT License](./LICENSE): you are
welcome to learn from, fork, or adapt it for your own site.

The **content** hosted by this code (essays, project descriptions,
images, and other written work) is copyright Mohamad Shahin
Ambalatha Kandy / The Nuance Project and is not covered by the MIT
license. Please don't republish the written work as your own.

---

Built by [Mohamad Shahin Ambalatha Kandy](https://thenuanceproject.com/about).

# thenuanceproject.com

Source for [The Nuance Project](https://thenuanceproject.com) — a small,
independent studio for software, writing, and the occasional note on
something worth working through.

Built with [React Router v7](https://reactrouter.com/) (framework mode) +
[React 19](https://react.dev/) + [Vite](https://vitejs.dev/) +
[TypeScript](https://www.typescriptlang.org/) +
[Tailwind CSS v4](https://tailwindcss.com/). Every route is pre-rendered
to static HTML at build time and deployed to GitHub Pages on push to
`main`.

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

## Build

```bash
npm run build       # produces dist/client with one HTML file per route
npm run preview     # serves dist/client locally
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server with hot module replacement |
| `npm run build` | Pre-renders every route into `dist/client` |
| `npm run preview` | Serves the production build for local inspection |
| `npm run typecheck` | `react-router typegen` + `tsc` |
| `npm run lint` | ESLint across the repo |
| `npm run test` | Runs the unit test suite |

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
scripts/postbuild.mjs   # Generates sitemap.xml and finalises 404.html
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
succeeds — the beacon script is simply omitted.

## License

The **code** in this repository (components, build configuration,
tooling) is licensed under the [MIT License](./LICENSE) — you are
welcome to learn from, fork, or adapt it for your own site.

The **content** hosted by this code (essays, project descriptions,
images, and other written work) is copyright Mohamad Shahin
Ambalatha Kandy / The Nuance Project and is not covered by the MIT
license. Please don't republish the written work as your own.

---

Built by [Mohamad Shahin Ambalatha Kandy](https://thenuanceproject.com/about).

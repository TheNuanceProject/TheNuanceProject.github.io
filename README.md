# thenuanceproject.com

Source for [The Nuance Project](https://thenuanceproject.com) — a small,
independent studio for software, writing, and the occasional note on
something worth working through.

Built with [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) +
[TypeScript](https://www.typescriptlang.org/) + [Tailwind CSS v4](https://tailwindcss.com/).
Deployed automatically to GitHub Pages on push to `main`.

---

## Running locally

```bash
npm install
npm run dev
# → http://localhost:5173
```

## Build

```bash
npm run build       # produces /dist
npm run preview     # serves /dist at http://localhost:4173
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Starts the dev server with hot module replacement |
| `npm run build` | Produces a production build in `/dist` |
| `npm run preview` | Serves the production build for local inspection |
| `npm run lint` | Runs ESLint on `/src` |

---

## Adding content

Writing pieces and projects are auto-discovered from their folders.
Drop a folder with `meta.ts` + `index.tsx`, register one route in
`src/App.tsx`, restart dev. The full workflow is documented in
[docs/AUTHORING.md](./docs/AUTHORING.md).

## Deployment

Every push to `main` triggers the GitHub Actions workflow at
[.github/workflows/deploy.yml](./.github/workflows/deploy.yml). The
site is live within ~60 seconds.

To deploy on a different branch or trigger manually, use the
"Actions" tab on GitHub.

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

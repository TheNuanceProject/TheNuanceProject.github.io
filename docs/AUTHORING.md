# Authoring Content

How to add a writing piece or a project to
[thenuanceproject.com](https://thenuanceproject.com).

Both follow the same pattern: drop a folder, register one route,
restart the dev server. Each is auto-discovered from its `meta.ts`.

---

## Adding a writing piece

### 1. Create the folder

Copy the example template:

```bash
cp -r src/pages/writing/_example src/pages/writing/your-slug
```

The folder name becomes the URL slug. Keep it lowercase with hyphens.

### 2. Edit `meta.ts`

```typescript
import type { WritingMeta } from '@/lib/content/types';

export const meta: WritingMeta = {
  kind: 'writing',
  slug: 'your-slug',                       // Must match folder name
  title: 'The title of your piece',
  description: 'One-sentence summary shown in cards and as the lead.',
  published: '2026-04-20',                 // First publication date
  // updated: '2026-05-01',                // Set when you revise it
};
```

### 3. Edit `index.tsx`

Replace the example body with your prose, using the components from
`@/components/writing-prose`:

```typescript
import { ArticleLayout } from '@/components/ArticleLayout';
import { P, H2, B, A, Quote } from '@/components/writing-prose';
import { deriveDates } from '@/lib/content/dates';
import { meta } from './meta';

const resolved = { ...meta, ...deriveDates(meta.published, meta.updated) };

export default function YourPieceTitle() {
  return (
    <ArticleLayout meta={resolved}>
      <P>Your opening paragraph...</P>
      <H2>Section heading</H2>
      <P>More prose...</P>
    </ArticleLayout>
  );
}
```

The component name must be unique. Use PascalCase matching the slug
(e.g., slug `why-i-rebuilt-it` → component `WhyIRebuiltIt`).

### 4. Register the route in `src/App.tsx`

```typescript
// At the top, alongside other writing imports:
import YourPieceTitle from '@/pages/writing/your-slug';

// Inside <Routes>, in the "Writing pages" section:
<Route path="/writing/your-slug" element={<YourPieceTitle />} />
```

### 5. Restart the dev server

```bash
# Ctrl+C the running dev server
npm run dev
```

The piece now appears at:
- `/` — Home page Writing section (top of the latest 3)
- `/writing` — Writing index (top of the latest 10)
- `/writing/your-slug` — the article page

---

## Adding a project

Same pattern, different folder and metadata shape.

### 1. Create the folder

```bash
mkdir src/pages/projects/your-project
```

### 2. Create `meta.ts`

```typescript
import type { ProjectMeta } from '@/lib/content/types';

export const meta: ProjectMeta = {
  kind: 'project',
  slug: 'your-project',
  title: 'Your Project',
  description: 'One-sentence description for cards and meta tags.',
  published: '2026-06-01',
  // updated: '2026-08-15',

  version: '26.06.01',
  status: 'Active',                        // Active | Maintained | Archived
  platforms: ['Windows'],                  // Platforms with published binaries
  tagline: 'Short tagline shown on cards.',
  productTagline: 'Fuller tagline shown on the product page.',
  downloadUrl: 'https://github.com/TheNuanceProject/YourProject/releases/latest',
  githubUrl: 'https://github.com/TheNuanceProject/YourProject',
  issuesUrl: 'https://github.com/TheNuanceProject/YourProject/issues/new',
  releasesUrl: 'https://github.com/TheNuanceProject/YourProject/releases/latest',
};
```

### 3. Create `index.tsx`

Copy `src/pages/projects/wiretrace/index.tsx` as a starting point.
The structure (header → story sections → features → specs →
requirements → download) works for most software projects. Remove
sections you don't need.

### 4. Register the route

```typescript
// At the top:
import ProjectYourProject from '@/pages/projects/your-project';

// Inside <Routes>, in the "Project pages" section:
<Route path="/projects/your-project" element={<ProjectYourProject />} />
```

### 5. Restart

Project now appears at:
- `/` — Home page Work section (if status is Active)
- `/projects` — Projects index
- `/projects/your-project` — the product page

---

## Available prose components

For writing piece bodies, import from `@/components/writing-prose`:

| Component | Purpose |
|-----------|---------|
| `<P>` | Body paragraphs |
| `<Lead>` | Larger lead paragraph |
| `<H2>`, `<H3>` | Section / subsection headings |
| `<B>`, `<I>` | Bold and italic emphasis |
| `<A href>` | Inline links (auto-detects external) |
| `<Quote>` | Block quotes |
| `<UL>`, `<OL>`, `<LI>` | Lists |
| `<Code>` | Inline code |
| `<CodeBlock>` | Multi-line code block |
| `<Divider>` | Horizontal rule between major sections |

All components match the typography rules in
[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) section 6.

---

## Published + Updated dates

Both writing and project metadata take `published` (required) and
`updated` (optional). When you set `updated`:

- The footer shows "Published X · Updated Y"
- The piece resurfaces to the top of index pages
- The Home page shows the updated date
- The Writing index shows a small "· Updated" badge

Use it when you meaningfully revise a piece. Don't use it for typo
fixes.

---

## Drafts

Prefix the folder name with `_` to keep a piece out of the site
while you work on it:

```
src/pages/writing/_half-finished-thoughts/
src/pages/projects/_experimental-tool/
```

Loaders skip underscore-prefixed folders entirely. Rename to remove
the underscore when you're ready to publish.

---

## Validation

The build fails with a clear error if metadata is missing required
fields:

```
Invalid project meta in /src/pages/projects/your-project/meta.ts:
  - missing or empty `tagline`
  - missing `releasesUrl`
```

Validation runs at module load (dev server start or `npm run build`),
never in production render. You can't accidentally ship broken
metadata.

---

## Publishing

```bash
git add .
git commit -m "writing: add 'Your piece title'"
git push
```

GitHub Actions builds and deploys automatically on push to `main`.
The site is live at thenuanceproject.com within ~60 seconds.

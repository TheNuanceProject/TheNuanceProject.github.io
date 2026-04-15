// SPDX-License-Identifier: MIT
import type { WritingMeta } from '@/lib/content/types';

/**
 * EXAMPLE WRITING META — reference for writing real pieces.
 *
 * This folder starts with an underscore (_example) so the writing
 * loader ignores it. Use it as a template:
 *
 *   1. Copy this folder to a new name (e.g., `why-i-rebuilt-it`).
 *      The folder name becomes the URL slug.
 *
 *   2. Update meta.ts (this file) — set kind, slug, title,
 *      description, published date, and optional updated date.
 *      The slug must match the folder name.
 *
 *   3. Update index.tsx — replace the placeholder body with your
 *      actual prose, using the components from @/components/writing-prose.
 *
 *   4. Add the route in src/App.tsx — one line:
 *      <Route path="/writing/your-slug" element={<YourPage />} />
 *
 *   5. Restart the dev server.
 *
 * Required fields:
 *   - kind:        Always "writing" for writing pieces.
 *   - slug:        URL segment, must match the folder name.
 *   - title:       The piece's title.
 *   - description: One sentence shown in cards and as the lead.
 *   - published:   When the piece first went live (YYYY-MM-DD).
 *
 * Optional fields:
 *   - updated:     Set this when you make a meaningful revision.
 *                  Causes the piece to resurface on index pages and
 *                  shows "Updated [date]" in the article footer.
 */
export const meta: WritingMeta = {
  kind: 'writing',
  slug: '_example',
  title: 'Example: how to write a piece for The Nuance Project',
  description:
    'A short reference showing the file structure and components used to write a piece.',
  published: '2026-04-13',
  // updated: '2026-05-01',  ← uncomment when you revise the piece
};

// SPDX-License-Identifier: MIT
import type { ProjectMeta } from '~/lib/content/types';

/**
 * WireTrace project metadata.
 *
 * Auto-discovered by the project loader at build time. Edit this file
 * to change anything about how WireTrace appears on the Home page,
 * the Projects index, or at the top of the WireTrace page itself.
 *
 * BaseMeta fields:
 *   - title: the display name
 *   - description: used for meta tags, index cards, etc.
 *   - published: when WireTrace first shipped publicly
 *   - updated: set whenever a meaningful revision ships (bumps the
 *             piece up on index pages and adds "Updated" to the footer)
 *
 * Project-specific fields:
 *   - version: current version string
 *   - status: Active | Maintained | Archived
 *   - platforms: list of supported platforms
 *   - tagline: short, accessible copy for Home/Projects cards
 *   - productTagline: longer, technical copy for the product page top
 *   - downloadUrl / githubUrl / issuesUrl / releasesUrl: external links
 */
export const meta: ProjectMeta = {
  kind: 'project',
  slug: 'wiretrace',
  title: 'WireTrace',
  description: 'A serial data monitor for hardware and embedded engineers.',
  published: '2026-02-25',

  version: '1.0.0',
  status: 'Active',
  platforms: ['Windows'],
  tagline: 'A serial data monitor for hardware and embedded engineers.',
  productTagline:
    'Multi-device, built for the throughput real hardware bring-up demands.',
  downloadUrl:
    'https://github.com/TheNuanceProject/WireTrace/releases/latest',
  githubUrl: 'https://github.com/TheNuanceProject/WireTrace',
  issuesUrl: 'https://github.com/TheNuanceProject/WireTrace/issues/new',
  releasesUrl:
    'https://github.com/TheNuanceProject/WireTrace/releases/latest',
};

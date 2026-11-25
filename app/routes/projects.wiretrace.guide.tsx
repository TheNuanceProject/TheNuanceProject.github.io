// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { DocumentPage } from '~/components/DocumentPage';
import { checkDocument } from '~/lib/docs/document';
import { pageMeta } from '~/lib/page-meta';
import { PROSE_LINK } from '~/lib/prose-link';
import { breadcrumbSchema } from '~/lib/structured-data';

import guide from 'virtual:document/content/projects/wiretrace/docs/user-guide.html';
import { meta as wtMeta } from '../../content/projects/wiretrace/meta';
import { docs } from '../../content/projects/wiretrace/content';

/**
 * WireTrace's user guide: the page.
 *
 * The guide WireTrace shows on F1, in its edition for the web (every
 * system's folders and keys), read from WireTrace's own file by the
 * documents plugin. The build refuses a guide of another version than the
 * one the site describes.
 */

const PATH = `${docs.guide.path}/`;

export function loader() {
  checkDocument(guide.document, docs.guide.file, wtMeta.version);
  return null;
}

export const meta = () =>
  pageMeta({
    title: guide.document.title,
    description: docs.guide.description,
    path: PATH,
    structuredData: [
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Projects', url: '/projects/' },
        { name: wtMeta.title, url: `/projects/${wtMeta.slug}/` },
        { name: docs.guide.name, url: PATH },
      ]),
    ],
  });

export default function Guide() {
  return (
    <DocumentPage
      document={guide.document}
      pictures={guide.pictures}
      crumbs={[
        { name: 'Home', href: '/' },
        { name: 'Projects', href: '/projects/' },
        { name: wtMeta.title, href: `/projects/${wtMeta.slug}/` },
        { name: docs.guide.name, href: PATH },
      ]}
      related={
        <>
          <Link to={`${docs.formats.path}/`} className={PROSE_LINK}>
            {docs.formats.name}
          </Link>
          <a href={wtMeta.issuesUrl} target="_blank" rel="noopener noreferrer" className={PROSE_LINK}>
            Report an issue
          </a>
        </>
      }
    />
  );
}

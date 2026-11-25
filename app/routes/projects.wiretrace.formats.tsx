// SPDX-License-Identifier: MIT
import { Link } from 'react-router';
import { DocumentPage } from '~/components/DocumentPage';
import { checkDocument } from '~/lib/docs/document';
import { pageMeta } from '~/lib/page-meta';
import { PROSE_LINK } from '~/lib/prose-link';
import { breadcrumbSchema } from '~/lib/structured-data';

import formats from 'virtual:document/content/projects/wiretrace/docs/line-formats.html';
import { meta as wtMeta } from '../../content/projects/wiretrace/meta';
import { docs } from '../../content/projects/wiretrace/content';

/**
 * WireTrace's line format reference: the page.
 *
 * How WireTrace reads the lines firmware prints, for firmware developers.
 * WireTrace writes it, and its tests run every example in it through the
 * program; the documents plugin reads WireTrace's own file. The build
 * refuses a reference of another version than the one the site describes.
 */

const PATH = `${docs.formats.path}/`;

export function loader() {
  checkDocument(formats.document, docs.formats.file, wtMeta.version);
  return null;
}

export const meta = () =>
  pageMeta({
    title: formats.document.title,
    description: docs.formats.description,
    path: PATH,
    structuredData: [
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Projects', url: '/projects/' },
        { name: wtMeta.title, url: `/projects/${wtMeta.slug}/` },
        { name: docs.formats.name, url: PATH },
      ]),
    ],
  });

export default function Formats() {
  return (
    <DocumentPage
      document={formats.document}
      pictures={formats.pictures}
      crumbs={[
        { name: 'Home', href: '/' },
        { name: 'Projects', href: '/projects/' },
        { name: wtMeta.title, href: `/projects/${wtMeta.slug}/` },
        { name: docs.formats.name, href: PATH },
      ]}
      related={
        <>
          <Link to={`${docs.guide.path}/`} className={PROSE_LINK}>
            {docs.guide.name}
          </Link>
          <a href={wtMeta.issuesUrl} target="_blank" rel="noopener noreferrer" className={PROSE_LINK}>
            Report an issue
          </a>
        </>
      }
    />
  );
}

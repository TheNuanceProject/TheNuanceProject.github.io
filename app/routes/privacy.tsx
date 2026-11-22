// SPDX-License-Identifier: MIT
import { Fragment, type ReactNode } from 'react';
import { Container } from '~/components/Container';
import { Section } from '~/components/Section';
import { P, A, B, UL, LI } from '~/components/writing-prose';
import { getReleasedPolicy } from '~/lib/build-data/data.server';
import type { Text } from '~/lib/privacy/policy';
import { pageMeta } from '~/lib/page-meta';
import { breadcrumbSchema } from '~/lib/structured-data';
import type { Route } from './+types/privacy';

import { meta as wtMeta } from '../../content/projects/wiretrace/meta';

/**
 * Privacy, the /privacy page: the privacy policy of this website and
 * of WireTrace.
 *
 * The policy is kept in one file, `PRIVACY.md` in the WireTrace
 * repository, which WireTrace's installer and user guide show too. This
 * page shows that file as the WireTrace release the site describes holds
 * it (`getReleasedPolicy`), so it is never written here and can never
 * differ from what WireTrace says.
 */

export async function loader() {
  return { policy: await getReleasedPolicy(wtMeta) };
}

export const meta = () =>
  pageMeta({
    title: 'Privacy policy',
    description:
      'What this website and the WireTrace application collect, why, for how long, who handles it, and your rights.',
    path: '/privacy/',
    structuredData: [
      breadcrumbSchema([
        { name: 'Home', url: '/' },
        { name: 'Privacy', url: '/privacy/' },
      ]),
    ],
  });

function Part({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <Section label={label} divided className={last ? 'pb-24 md:pb-32' : undefined}>
      <div className="max-w-narrow">{children}</div>
    </Section>
  );
}

function Runs({ text }: { text: Text }) {
  return (
    <>
      {text.map((run, index) => (
        <Fragment key={index}>
          {run.bold ? <B>{run.text}</B> : run.url !== null ? <A href={run.url}>{run.text}</A> : run.text}
        </Fragment>
      ))}
    </>
  );
}

export default function Privacy({ loaderData }: Route.ComponentProps) {
  const { policy } = loaderData;
  return (
    <Container width="default">
      <section className="pt-20 md:pt-28 pb-12 md:pb-16">
        <h1
          className="
            font-sans font-regular
            text-display-sm
            text-text
          "
        >
          {policy.title}
        </h1>
        <p className="mt-4 font-sans text-ui-lg text-text-secondary">{policy.updated}</p>
      </section>

      {policy.sections.map((section, index) => (
        <Part key={section.label} label={section.label} last={index === policy.sections.length - 1}>
          {section.blocks.map((block, blockIndex) =>
            block.isList ? (
              <UL key={blockIndex}>
                {block.texts.map((text, itemIndex) => (
                  <LI key={itemIndex}>
                    <Runs text={text} />
                  </LI>
                ))}
              </UL>
            ) : (
              <P key={blockIndex}>
                <Runs text={block.texts[0] as Text} />
              </P>
            ),
          )}
        </Part>
      ))}
    </Container>
  );
}

// SPDX-License-Identifier: MIT
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { CopyButton } from '~/components/CopyButton';
import { ThemedScreenshot } from '~/components/ThemedScreenshot';
import { cn } from '~/lib/cn';
import { plainText, type Block, type Cell, type Inline, type List, type Table } from '~/lib/docs/document';
import { PROSE_LINK } from '~/lib/prose-link';

/**
 * DocumentBody: a product's document (`~/lib/docs/document.ts`) drawn
 * with the site's typography: Lora for reading, Poppins for headings and
 * tables, JetBrains Mono for code, keys and levels.
 *
 * Every heading with an id is a link to itself, so a section's address
 * can be copied from it. A result ("Plotted: temp, hum") is kept with
 * the example above it.
 */

const HEADING_LINK = 'text-text no-underline hover:text-accent-strong transition-colors duration-(--duration-fast)';
const BLOCK = 'mb-6';
const READING = 'font-serif text-reading text-text';

/** Inline content of a document: a paragraph's text, a lead, a caption. */
export function Inlines({ content }: { content: readonly Inline[] }) {
  return (
    <>
      {content.map((node, index) => (
        <InlineNode key={index} node={node} />
      ))}
    </>
  );
}

function InlineNode({ node }: { node: Inline }) {
  switch (node.type) {
    case 'text':
      return node.text;
    case 'strong':
      return (
        <strong className="font-semibold">
          <Inlines content={node.children} />
        </strong>
      );
    case 'em':
      return (
        <em className="italic">
          <Inlines content={node.children} />
        </em>
      );
    case 'code':
      return <code className="font-mono text-mono bg-surface text-text px-1 rounded-sm">{node.text}</code>;
    case 'kbd':
      return (
        <kbd className="font-mono text-mono bg-surface text-text px-1 rounded-sm border border-edge whitespace-nowrap">
          {node.text}
        </kbd>
      );
    case 'break':
      return <br />;
    case 'menu':
      return <span className="font-semibold whitespace-nowrap">{node.text}</span>;
    case 'level':
      return <span className="font-mono font-medium">{node.text}</span>;
    case 'link': {
      const children = <Inlines content={node.children} />;
      const { target } = node;
      if (target.kind === 'section') {
        return (
          <a href={`#${target.id}`} className={PROSE_LINK}>
            {children}
          </a>
        );
      }
      if (target.kind === 'page') {
        return (
          <Link to={target.id === null ? target.path : `${target.path}#${target.id}`} className={PROSE_LINK}>
            {children}
          </Link>
        );
      }
      return (
        <a href={target.url} target="_blank" rel="noopener noreferrer" className={PROSE_LINK}>
          {children}
        </a>
      );
    }
  }
}

/** A list. In a table cell, and a list of folders anywhere, it is a
 *  plain column of lines. */
function ListBlock({ list, compact = false, className }: { list: List; compact?: boolean; className?: string }) {
  const Tag = list.ordered ? 'ol' : 'ul';
  const plain = compact || list.paths;
  return (
    <Tag
      className={cn(
        plain ? 'list-none p-0 space-y-1' : 'pl-6 space-y-2 marker:text-text-tertiary',
        !compact && READING,
        !plain && (list.ordered ? 'list-decimal' : 'list-disc'),
        className,
      )}
    >
      {list.items.map((item, index) => (
        <li key={index}>
          <Inlines content={item} />
        </li>
      ))}
    </Tag>
  );
}

function CellContent({ cell }: { cell: Cell }) {
  return (
    <>
      {cell.content.map((node, index) =>
        node.type === 'list' ? <ListBlock key={index} list={node} compact /> : <InlineNode key={index} node={node} />,
      )}
    </>
  );
}

/** A cell. The first column keeps to one line from a tablet's width up,
 *  unless the table says it may wrap; on a phone every column wraps, so a
 *  table always fits the screen. */
function CellNode({ cell, first, table, inHead }: { cell: Cell; first: boolean; table: Table; inHead: boolean }) {
  const Tag = cell.header ? 'th' : 'td';
  return (
    <Tag
      scope={cell.scope ?? undefined}
      colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
      rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
      className={cn(
        'px-3 py-2 text-left align-top border-b border-divider wrap-break-word [&_code]:wrap-anywhere',
        cell.header && 'font-medium',
        (inHead || cell.scope === 'colgroup') && 'bg-surface',
        first && !table.wrap && 'md:whitespace-nowrap',
        first && table.paths && 'w-2/5',
      )}
    >
      <CellContent cell={cell} />
    </Tag>
  );
}

/**
 * A table drawn on a narrow screen as a list: each row a group of its
 * cells under their headings, so nothing is squeezed or scrolled
 * sideways. Done for a table of three columns or more with one row of
 * headings; a cell that spans rows is shown in each row it spans, and a
 * table with a cell spanning columns stays a table.
 */
interface Stacked {
  readonly headings: readonly string[];
  readonly rows: readonly (readonly Cell[])[];
}

function stacked(table: Table): Stacked | null {
  const [headingRow, ...moreHeadRows] = table.head;
  if (headingRow === undefined || moreHeadRows.length > 0 || headingRow.length < 3) return null;
  if (!headingRow.every((cell) => cell.colSpan === 1 && cell.rowSpan === 1)) return null;
  const width = headingRow.length;
  // Lay the body out as the browser does: a cell spanning rows takes its
  // column in the rows below it.
  const carried: ({ cell: Cell; left: number } | null)[] = Array.from({ length: width }, () => null);
  const rows: Cell[][] = [];
  for (const row of table.body) {
    const cells = [...row];
    const out: Cell[] = [];
    for (let column = 0; column < width; column += 1) {
      const above = carried[column];
      if (above != null && above.left > 0) {
        out.push(above.cell);
        above.left -= 1;
        continue;
      }
      const cell = cells.shift();
      if (cell === undefined || cell.colSpan !== 1) return null;
      out.push(cell);
      carried[column] = cell.rowSpan > 1 ? { cell, left: cell.rowSpan - 1 } : null;
    }
    if (cells.length > 0) return null;
    rows.push(out);
  }
  const headings = headingRow.map((cell) =>
    plainText(cell.content.filter((node): node is Inline => node.type !== 'list')).trim(),
  );
  return { headings, rows };
}

function StackedTable({ layout }: { layout: Stacked }) {
  return (
    <div className="md:hidden border-t border-divider font-sans text-ui-lg text-text">
      {layout.rows.map((row, rowIndex) => (
        <dl key={rowIndex} className="m-0 py-3 flex flex-col gap-2 border-b border-divider wrap-break-word [&_code]:wrap-anywhere">
          {row.map((cell, cellIndex) => (
            <div key={cellIndex} className="flex flex-col gap-0.5">
              <dt className="text-caption text-text-tertiary">{layout.headings[cellIndex]}</dt>
              <dd className={cn('m-0', cellIndex === 0 && 'font-medium')}>
                <CellContent cell={cell} />
              </dd>
            </div>
          ))}
        </dl>
      ))}
    </div>
  );
}

function TableBlock({ table, className }: { table: Table; className?: string }) {
  const layout = stacked(table);
  const rows = (rowsOf: readonly (readonly Cell[])[], inHead: boolean) =>
    rowsOf.map((row, rowIndex) => (
      <tr key={rowIndex}>
        {row.map((cell, cellIndex) => (
          <CellNode key={cellIndex} cell={cell} first={cellIndex === 0} table={table} inHead={inHead} />
        ))}
      </tr>
    ));
  return (
    <div className={className}>
      {layout !== null && <StackedTable layout={layout} />}
      <div className={cn('overflow-x-auto', layout !== null && 'hidden md:block')}>
        <table className="w-full border-collapse font-sans text-ui-lg text-text">
          {table.head.length > 0 && <thead>{rows(table.head, true)}</thead>}
          <tbody>{rows(table.body, false)}</tbody>
        </table>
      </div>
    </div>
  );
}

function Preformatted({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('group relative', className)}>
      <CopyButton value={text} />
      <pre tabIndex={0} className="font-mono text-mono-lg bg-surface text-text px-4 py-3 rounded-md overflow-x-auto">
        <code>{text}</code>
      </pre>
    </div>
  );
}

function BlockNode({ block, pictures, spaced }: { block: Block; pictures: readonly string[]; spaced: boolean }): ReactNode {
  const space = spaced ? BLOCK : undefined;
  switch (block.type) {
    case 'heading': {
      const Tag = block.level === 2 ? 'h2' : 'h3';
      const text = <Inlines content={block.children} />;
      return (
        <Tag
          id={block.id ?? undefined}
          className={cn(
            'font-sans font-regular text-text first:mt-0',
            block.level === 2 ? 'text-title mt-16 mb-4' : 'text-title-sm mt-12 mb-3',
          )}
        >
          {block.id === null ? (
            text
          ) : (
            <a href={`#${block.id}`} className={HEADING_LINK}>
              {text}
            </a>
          )}
        </Tag>
      );
    }
    case 'paragraph':
      return (
        <p className={cn(READING, space)}>
          <Inlines content={block.children} />
        </p>
      );
    case 'result':
      return (
        <p className={cn('mt-3 font-sans text-ui-lg text-text-secondary', space)}>
          <Inlines content={block.children} />
        </p>
      );
    case 'sample':
    case 'code':
      return <Preformatted text={block.text} className={space} />;
    case 'note':
      return (
        <div className={cn('border-l-(length:--border-mark) border-accent bg-surface px-4 py-3 rounded-r-sm', space)}>
          {block.paragraphs.map((paragraph, index) => (
            <p key={index} className={cn(READING, 'mb-3 last:mb-0')}>
              <Inlines content={paragraph} />
            </p>
          ))}
        </div>
      );
    case 'list':
      return <ListBlock list={block} className={space} />;
    case 'table':
      return <TableBlock table={block} className={space} />;
    case 'figure':
      return (
        <ThemedScreenshot
          light={pictures[block.light] as string}
          dark={pictures[block.dark] as string}
          alt={block.alt}
          width={block.width}
          height={block.height}
          caption={<Inlines content={block.caption} />}
          natural
          className={space}
        />
      );
  }
}

/** Each block, with the result that follows it, if any: a result
 *  ("Plotted: temp, hum") is drawn with the example it is the result of. */
function groups(blocks: readonly Block[]): Block[][] {
  const out: Block[][] = [];
  for (const block of blocks) {
    const last = out.at(-1);
    if (block.type === 'result' && last !== undefined && last[0]?.type !== 'heading') last.push(block);
    else out.push([block]);
  }
  return out;
}

export function DocumentBody({ blocks, pictures }: { blocks: readonly Block[]; pictures: readonly string[] }) {
  return (
    <div className="wrap-break-word">
      {groups(blocks).map((group, index) =>
        group.length === 1 ? (
          <BlockNode key={index} block={group[0] as Block} pictures={pictures} spaced />
        ) : (
          <div key={index} className={BLOCK}>
            {group.map((block, blockIndex) => (
              <BlockNode key={blockIndex} block={block} pictures={pictures} spaced={false} />
            ))}
          </div>
        ),
      )}
    </div>
  );
}

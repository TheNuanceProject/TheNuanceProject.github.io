// SPDX-License-Identifier: MIT
/**
 * A document a product publishes for this site, as the site keeps it once
 * read: WireTrace's user guide and its line format reference.
 *
 * The product writes each document as HTML (WireTrace's
 * `tools/make_web_documents.py`). `reader.ts` reads that HTML at build
 * into the tree below, accepting only what is listed here, and the pages
 * draw the tree with the site's own components. So a document's text is
 * the product's, its look is the site's, and no HTML from the file ever
 * reaches a page as HTML.
 */

/** The colour a level's name takes in the console, by the console's
 *  name for it. */
export type LevelKind = 'error' | 'warning' | 'info' | 'debug' | 'command';

export type Inline =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'strong'; readonly children: readonly Inline[] }
  | { readonly type: 'em'; readonly children: readonly Inline[] }
  | { readonly type: 'code'; readonly text: string }
  | { readonly type: 'kbd'; readonly text: string }
  | { readonly type: 'break' }
  /** A menu command, such as "View > Configure plot...". */
  | { readonly type: 'menu'; readonly text: string }
  /** A level's name, as the console shows it. `kind` is null where the
   *  document names a level without a colour of its own. */
  | { readonly type: 'level'; readonly kind: LevelKind | null; readonly text: string }
  | { readonly type: 'link'; readonly target: LinkTarget; readonly children: readonly Inline[] };

/**
 * Where a link goes:
 * - `section`: a heading of the same document, by its id;
 * - `page`: a page of this site, as a path with its trailing slash, and
 *   the heading it opens at, if any;
 * - `external`: an address outside this site that the reader allows.
 */
export type LinkTarget =
  | { readonly kind: 'section'; readonly id: string }
  | { readonly kind: 'page'; readonly path: string; readonly id: string | null }
  | { readonly kind: 'external'; readonly url: string };

/** A list. `paths` is a list of one folder on each system. */
export interface List {
  readonly type: 'list';
  readonly ordered: boolean;
  readonly paths: boolean;
  readonly items: readonly (readonly Inline[])[];
}

export interface Cell {
  readonly header: boolean;
  /** For a header cell: what it heads, as the document says. */
  readonly scope: 'col' | 'row' | 'colgroup' | 'rowgroup' | null;
  readonly colSpan: number;
  readonly rowSpan: number;
  readonly content: readonly (Inline | List)[];
}

export interface Table {
  readonly type: 'table';
  /** The first column may wrap (by default it keeps to one line). */
  readonly wrap: boolean;
  /** A table of folders: its first column takes two fifths. */
  readonly paths: boolean;
  readonly head: readonly (readonly Cell[])[];
  readonly body: readonly (readonly Cell[])[];
}

/** A picture in the light and the dark theme, as indexes into the
 *  pictures that come with the document. */
export interface Figure {
  readonly type: 'figure';
  readonly light: number;
  readonly dark: number;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly caption: readonly Inline[];
}

export type Block =
  | { readonly type: 'heading'; readonly level: 2 | 3; readonly id: string | null; readonly children: readonly Inline[] }
  | { readonly type: 'paragraph'; readonly children: readonly Inline[] }
  /** What WireTrace makes of the example just before it. */
  | { readonly type: 'result'; readonly children: readonly Inline[] }
  /** Text shown exactly: what a device prints, a file name, a HEX view. */
  | { readonly type: 'sample'; readonly text: string }
  /** Firmware source code. */
  | { readonly type: 'code'; readonly text: string }
  | { readonly type: 'note'; readonly paragraphs: readonly (readonly Inline[])[] }
  | List
  | Table
  | Figure;

export interface DocumentTree {
  /** The document's name, as the product gives it: `user-guide`. */
  readonly name: string;
  /** The product version the document describes. */
  readonly version: string;
  readonly title: string;
  readonly lead: readonly Inline[];
  readonly blocks: readonly Block[];
}

/** A heading in the contents, with the headings under it. */
export interface ContentsEntry {
  readonly id: string;
  readonly text: string;
  readonly children: readonly ContentsEntry[];
}

/** The text of inline content, as a screen reader or a search reads it. */
export function plainText(content: readonly Inline[]): string {
  return content
    .map((node) => {
      switch (node.type) {
        case 'text':
        case 'code':
        case 'kbd':
        case 'menu':
        case 'level':
          return node.text;
        case 'break':
          return ' ';
        case 'strong':
        case 'em':
        case 'link':
          return plainText(node.children);
      }
    })
    .join('');
}

/** The document's contents: each section heading with an id, and the
 *  subsection headings with an id under it. */
export function contentsOf(document: DocumentTree): ContentsEntry[] {
  const entries: { id: string; text: string; children: ContentsEntry[] }[] = [];
  for (const block of document.blocks) {
    if (block.type !== 'heading' || block.id === null) continue;
    const entry = { id: block.id, text: plainText(block.children).replace(/\s+/g, ' ').trim(), children: [] };
    if (block.level === 2) entries.push(entry);
    else entries.at(-1)?.children.push(entry);
  }
  return entries;
}

/** Refuses, at build, a document other than the one named, or of a
 *  version other than the one the site describes. */
export function checkDocument(document: DocumentTree, name: string, version: string): void {
  if (document.name !== name) {
    throw new Error(`the document is "${document.name}", not "${name}"`);
  }
  if (document.version !== version) {
    throw new Error(`the ${name} document describes version ${document.version}, but the site describes ${version}`);
  }
}

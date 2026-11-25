// SPDX-License-Identifier: MIT
import { createHash } from 'node:crypto';
import { parseFragment } from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import { siteConfig } from '../../config/site.config.ts';
import type { Block, Cell, DocumentTree, Figure, Inline, LevelKind, LinkTarget, List, Table } from './document.ts';

/**
 * The reader of a product's documents (see `document.ts`).
 *
 * The HTML is parsed as a browser parses it (parse5, the WHATWG HTML
 * parser) and every element, attribute and class is checked against the
 * one structure below. Anything else, an element, an attribute, a class,
 * a link to an address not listed, a picture that is not a PNG, stops the
 * build with the line it is on, so a document can only ever be shown as
 * its text and the site's components, never as HTML of its own.
 *
 *   article[data-document][data-version]
 *     h1                                  the title
 *     p.lead                              the lead
 *     then blocks:
 *       h2[id], h3[id?]                   headings
 *       p, p.result                       paragraphs; a result of an example
 *       ul, ul.paths, ol > li             lists of inline content
 *       table[.wrap][.paths] > thead?, tbody > tr > th[scope], td
 *                                         cells hold inline content and lists
 *       pre (text or one code)            text shown exactly
 *       pre.code                          firmware source
 *       div.note > p                      a note
 *       figure > picture > source[media=dark], img, then figcaption
 *   inline: text, strong, em, code, kbd, br, a[href], span.menu,
 *           span.level[.error|.warning|.info|.debug|.command]
 *
 * `data-check` and `data-expect` on code and pre are the document's own
 * test marks (WireTrace's tests run each example through the program);
 * they are accepted and not shown.
 */

type Node = DefaultTreeAdapterMap['childNode'];
type Element = DefaultTreeAdapterMap['element'];

export class DocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentError';
  }
}

/** A picture of the document: a PNG, named by its SHA-256. */
export interface Picture {
  readonly sha256: string;
  readonly bytes: Uint8Array;
  readonly width: number;
  readonly height: number;
}

export interface ReadDocument {
  readonly document: DocumentTree;
  /** The pictures, each once, in the order a figure first shows it. */
  readonly pictures: readonly Picture[];
}

/** The addresses outside this site a document may link to: the studio's
 *  own repositories on GitHub. */
const EXTERNAL = [{ origin: 'https://github.com', path: `${new URL(siteConfig.links.github).pathname}/` }] as const;

const SITE = new URL(siteConfig.identity.url);
const NAME = /^[a-z][a-z0-9-]*$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const SPAN = /^[1-9]\d{0,2}$/;
const PNG_DATA = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const DARK = '(prefers-color-scheme: dark)';
const LEVELS: readonly LevelKind[] = ['error', 'warning', 'info', 'debug', 'command'];
const TEST_MARKS = ['data-check', 'data-expect'] as const;
const SCOPES = ['col', 'row', 'colgroup', 'rowgroup'] as const;

function isElement(node: Node): node is Element {
  return 'tagName' in node;
}

function isText(node: Node): node is DefaultTreeAdapterMap['textNode'] {
  return node.nodeName === '#text';
}

function isComment(node: Node): boolean {
  return node.nodeName === '#comment';
}

function where(node: Node): string {
  const line = node.sourceCodeLocation?.startLine;
  return line === undefined ? '' : `line ${line}: `;
}

function describe(element: Element): string {
  const classes = attribute(element, 'class');
  return `<${element.tagName}${classes ? ` class="${classes}"` : ''}>`;
}

function fail(node: Node, message: string): never {
  throw new DocumentError(`${where(node)}${message}`);
}

function attribute(element: Element, name: string): string | null {
  return element.attrs.find((attr) => attr.name === name)?.value ?? null;
}

/** The element's attributes must be among `allowed` (class is checked by
 *  `classesOf`); `required` must be present. */
function checkAttributes(element: Element, allowed: readonly string[], required: readonly string[] = []): void {
  for (const attr of element.attrs) {
    if (attr.name !== 'class' && !allowed.includes(attr.name)) {
      fail(element, `${describe(element)} may not have the attribute ${attr.name}`);
    }
  }
  for (const name of required) {
    if (attribute(element, name) === null) fail(element, `${describe(element)} needs the attribute ${name}`);
  }
}

/** The element's classes, each of which must be in `allowed`. */
function classesOf(element: Element, allowed: readonly string[]): Set<string> {
  const value = attribute(element, 'class');
  const names = value === null ? [] : value.split(/[ \t\n\f\r]+/).filter(Boolean);
  const found = new Set<string>();
  for (const name of names) {
    if (!allowed.includes(name)) fail(element, `${describe(element)} may not have the class ${name}`);
    if (found.has(name)) fail(element, `${describe(element)} has the class ${name} twice`);
    found.add(name);
  }
  if (value !== null && found.size === 0) fail(element, `${describe(element)} has an empty class`);
  return found;
}

/** The element's child elements, where anything else between them may
 *  only be white space or a comment. */
function childElements(element: Element): Element[] {
  const out: Element[] = [];
  for (const child of element.childNodes) {
    if (isElement(child)) out.push(child);
    else if (isText(child)) {
      if (child.value.trim() !== '') fail(child, `text directly inside ${describe(element)}: "${child.value.trim().slice(0, 40)}"`);
    } else if (!isComment(child)) fail(child, `${child.nodeName} inside ${describe(element)}`);
  }
  return out;
}

/** The element's text, where it may hold nothing but text. */
function textOf(element: Element): string {
  let text = '';
  for (const child of element.childNodes) {
    if (isText(child)) text += child.value;
    else fail(isElement(child) ? child : element, `${describe(element)} may hold only text`);
  }
  return text;
}

class Reader {
  private readonly ids = new Set<string>();
  private readonly sectionLinks: { node: Node; id: string }[] = [];
  private readonly pictures: Picture[] = [];
  private readonly pictureIndex = new Map<string, number>();

  read(html: string): ReadDocument {
    const fragment = parseFragment(html, { sourceCodeLocationInfo: true });
    const roots = childElements(fragment as unknown as Element);
    if (roots.length !== 1 || roots[0]?.tagName !== 'article') {
      throw new DocumentError('a document is one <article> element');
    }
    const article = roots[0];
    checkAttributes(article, ['data-document', 'data-version'], ['data-document', 'data-version']);
    classesOf(article, []);
    const name = attribute(article, 'data-document') as string;
    const version = attribute(article, 'data-version') as string;
    if (!NAME.test(name)) fail(article, `the document's name "${name}" is not a name`);
    if (!VERSION.test(version)) fail(article, `the document's version "${version}" is not a version`);

    const [h1, lead, ...rest] = childElements(article);
    if (h1?.tagName !== 'h1') fail(article, 'a document begins with its title, an <h1>');
    checkAttributes(h1, []);
    classesOf(h1, []);
    const title = this.inlineContent(h1)
      .map((node) => (node.type === 'text' ? node.text : fail(h1, 'the title may hold only text')))
      .join('')
      .trim();
    if (lead?.tagName !== 'p' || !classesOf(lead, ['lead']).has('lead')) {
      fail(lead ?? article, 'the title is followed by the lead, a <p class="lead">');
    }
    checkAttributes(lead, []);
    const leadContent = this.inlineContent(lead);

    const blocks = rest.map((element) => this.block(element));
    if (blocks.length === 0) fail(article, 'the document has nothing after its lead');
    const firstHeading = blocks.find((block) => block.type === 'heading');
    if (firstHeading?.type === 'heading' && firstHeading.level === 3) {
      fail(article, 'an <h3> comes before the first <h2>');
    }
    for (const link of this.sectionLinks) {
      if (!this.ids.has(link.id)) fail(link.node, `the link to #${link.id} leads to no heading of this document`);
    }
    return {
      document: { name, version, title, lead: leadContent, blocks },
      pictures: this.pictures,
    };
  }

  private block(element: Element): Block {
    switch (element.tagName) {
      case 'h2':
      case 'h3': {
        checkAttributes(element, ['id'], element.tagName === 'h2' ? ['id'] : []);
        classesOf(element, []);
        const id = attribute(element, 'id');
        if (id !== null) {
          if (!NAME.test(id)) fail(element, `the heading id "${id}" is not a name`);
          if (this.ids.has(id)) fail(element, `the heading id "${id}" is used twice`);
          this.ids.add(id);
        }
        return { type: 'heading', level: element.tagName === 'h2' ? 2 : 3, id, children: this.inlineContent(element) };
      }
      case 'p': {
        checkAttributes(element, []);
        const classes = classesOf(element, ['result']);
        return { type: classes.has('result') ? 'result' : 'paragraph', children: this.inlineContent(element) };
      }
      case 'ul':
      case 'ol':
        return this.list(element);
      case 'table':
        return this.table(element);
      case 'pre': {
        checkAttributes(element, TEST_MARKS);
        if (classesOf(element, ['code']).has('code')) return { type: 'code', text: textOf(element) };
        const [only] = element.childNodes;
        if (element.childNodes.length === 1 && only !== undefined && isElement(only) && only.tagName === 'code') {
          checkAttributes(only, TEST_MARKS);
          classesOf(only, []);
          return { type: 'sample', text: textOf(only) };
        }
        return { type: 'sample', text: textOf(element) };
      }
      case 'div': {
        checkAttributes(element, []);
        if (!classesOf(element, ['note']).has('note')) fail(element, 'a <div> is a note, <div class="note">');
        const paragraphs = childElements(element).map((child) => {
          if (child.tagName !== 'p') fail(child, `a note holds paragraphs, not ${describe(child)}`);
          checkAttributes(child, []);
          classesOf(child, []);
          return this.inlineContent(child);
        });
        if (paragraphs.length === 0) fail(element, 'the note is empty');
        return { type: 'note', paragraphs };
      }
      case 'figure':
        return this.figure(element);
      default:
        fail(element, `${describe(element)} is not allowed here`);
    }
  }

  private list(element: Element): List {
    checkAttributes(element, []);
    const ordered = element.tagName === 'ol';
    const paths = classesOf(element, ordered ? [] : ['paths']).has('paths');
    const items = childElements(element).map((item) => {
      if (item.tagName !== 'li') fail(item, `a list holds <li>, not ${describe(item)}`);
      checkAttributes(item, []);
      classesOf(item, []);
      return this.inlineContent(item);
    });
    if (items.length === 0) fail(element, 'the list is empty');
    return { type: 'list', ordered, paths, items };
  }

  private table(element: Element): Table {
    checkAttributes(element, []);
    const classes = classesOf(element, ['wrap', 'paths']);
    const parts = childElements(element);
    let head: Cell[][] = [];
    let body: Cell[][] | null = null;
    for (const part of parts) {
      checkAttributes(part, []);
      classesOf(part, []);
      if (part.tagName === 'thead' && body === null && head.length === 0) head = this.rows(part);
      else if (part.tagName === 'tbody' && body === null) body = this.rows(part);
      else fail(part, `a table holds a <thead> and then a <tbody>, not ${describe(part)} here`);
    }
    if (body === null || body.length === 0) fail(element, 'the table has no <tbody> rows');
    return { type: 'table', wrap: classes.has('wrap'), paths: classes.has('paths'), head, body };
  }

  private rows(part: Element): Cell[][] {
    return childElements(part).map((row) => {
      if (row.tagName !== 'tr') fail(row, `${describe(part)} holds <tr>, not ${describe(row)}`);
      checkAttributes(row, []);
      classesOf(row, []);
      const cells = childElements(row).map((cell) => this.cell(cell));
      if (cells.length === 0) fail(row, 'the row is empty');
      return cells;
    });
  }

  private cell(element: Element): Cell {
    if (element.tagName !== 'th' && element.tagName !== 'td') fail(element, `a row holds cells, not ${describe(element)}`);
    const header = element.tagName === 'th';
    checkAttributes(element, header ? ['scope', 'colspan', 'rowspan'] : ['colspan', 'rowspan']);
    classesOf(element, []);
    const span = (name: string): number => {
      const value = attribute(element, name);
      if (value === null) return 1;
      if (!SPAN.test(value)) fail(element, `${name}="${value}" is not a number of cells`);
      return Number(value);
    };
    const scope = attribute(element, 'scope');
    if (scope !== null && !(SCOPES as readonly string[]).includes(scope)) fail(element, `scope="${scope}" is not a scope`);
    const content: (Inline | List)[] = [];
    for (const child of element.childNodes) {
      if (isElement(child) && (child.tagName === 'ul' || child.tagName === 'ol')) content.push(this.list(child));
      else content.push(...this.inlineNodes([child], element));
    }
    return {
      header,
      scope: scope as Cell['scope'],
      colSpan: span('colspan'),
      rowSpan: span('rowspan'),
      content,
    };
  }

  private figure(element: Element): Figure {
    checkAttributes(element, []);
    classesOf(element, []);
    const [picture, caption, ...more] = childElements(element);
    if (picture?.tagName !== 'picture' || caption?.tagName !== 'figcaption' || more.length > 0) {
      fail(element, 'a figure holds a <picture> and then a <figcaption>');
    }
    checkAttributes(picture, []);
    classesOf(picture, []);
    checkAttributes(caption, []);
    classesOf(caption, []);
    const [source, img, ...extra] = childElements(picture);
    if (source?.tagName !== 'source' || img?.tagName !== 'img' || extra.length > 0) {
      fail(picture, 'a picture holds its dark <source> and then its light <img>');
    }
    checkAttributes(source, ['srcset', 'media'], ['srcset', 'media']);
    classesOf(source, []);
    if (attribute(source, 'media') !== DARK) fail(source, `the <source> is the dark picture, media="${DARK}"`);
    checkAttributes(img, ['src', 'alt'], ['src', 'alt']);
    classesOf(img, []);
    const alt = (attribute(img, 'alt') as string).trim();
    if (alt === '') fail(img, 'the picture needs a description in alt');
    const dark = this.picture(source, attribute(source, 'srcset') as string);
    const light = this.picture(img, attribute(img, 'src') as string);
    const lightPicture = this.pictures[light] as Picture;
    const darkPicture = this.pictures[dark] as Picture;
    if (lightPicture.width !== darkPicture.width || lightPicture.height !== darkPicture.height) {
      fail(element, 'the light and dark pictures differ in size');
    }
    return {
      type: 'figure',
      light,
      dark,
      width: lightPicture.width,
      height: lightPicture.height,
      alt,
      caption: this.inlineContent(caption),
    };
  }

  /** The index of a picture given as a PNG data address. */
  private picture(element: Element, address: string): number {
    const match = PNG_DATA.exec(address);
    if (!match) fail(element, 'a picture is a PNG given as data:image/png;base64');
    const bytes = new Uint8Array(Buffer.from(match[1] as string, 'base64'));
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const isPng =
      bytes.length >= 33 &&
      PNG_SIGNATURE.every((byte, index) => bytes[index] === byte) &&
      view.getUint32(8) === 13 &&
      String.fromCharCode(...bytes.subarray(12, 16)) === 'IHDR';
    if (!isPng) fail(element, 'the picture is not a PNG');
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    if (width === 0 || height === 0) fail(element, 'the picture has no size');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const known = this.pictureIndex.get(sha256);
    if (known !== undefined) return known;
    this.pictures.push({ sha256, bytes, width, height });
    this.pictureIndex.set(sha256, this.pictures.length - 1);
    return this.pictures.length - 1;
  }

  private inlineContent(element: Element): Inline[] {
    return this.inlineNodes(element.childNodes, element);
  }

  private inlineNodes(nodes: readonly Node[], parent: Element): Inline[] {
    const out: Inline[] = [];
    for (const node of nodes) {
      if (isText(node)) out.push({ type: 'text', text: node.value });
      else if (isComment(node)) continue;
      else if (isElement(node)) out.push(this.inline(node));
      else fail(node, `${node.nodeName} inside ${describe(parent)}`);
    }
    return out;
  }

  private inline(element: Element): Inline {
    switch (element.tagName) {
      case 'strong':
      case 'em':
        checkAttributes(element, []);
        classesOf(element, []);
        return { type: element.tagName, children: this.inlineContent(element) };
      case 'code':
        checkAttributes(element, TEST_MARKS);
        classesOf(element, []);
        return { type: 'code', text: textOf(element) };
      case 'kbd':
        checkAttributes(element, []);
        classesOf(element, []);
        return { type: 'kbd', text: textOf(element) };
      case 'br':
        checkAttributes(element, []);
        classesOf(element, []);
        return { type: 'break' };
      case 'span': {
        checkAttributes(element, []);
        const classes = classesOf(element, ['menu', 'level', ...LEVELS]);
        if (classes.has('menu') && classes.size === 1) return { type: 'menu', text: textOf(element) };
        if (classes.has('level') && classes.size <= 2) {
          const kind = LEVELS.find((level) => classes.has(level)) ?? null;
          if (classes.size === 2 && kind === null) fail(element, `${describe(element)} is not a level`);
          return { type: 'level', kind, text: textOf(element) };
        }
        return fail(element, `${describe(element)} is not a menu command or a level`);
      }
      case 'a': {
        checkAttributes(element, ['href'], ['href']);
        classesOf(element, []);
        // A link cannot hold a link: the HTML parser closes the first <a> at
        // the second, as a browser does.
        return { type: 'link', target: this.target(element, attribute(element, 'href') as string), children: this.inlineContent(element) };
      }
      default:
        return fail(element, `${describe(element)} is not allowed in text`);
    }
  }

  private target(element: Element, href: string): LinkTarget {
    if (href.startsWith('#')) {
      const id = href.slice(1);
      if (!NAME.test(id)) fail(element, `the link to "${href}" is not to a heading id`);
      this.sectionLinks.push({ node: element, id });
      return { kind: 'section', id };
    }
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      return fail(element, `the link to "${href}" is neither to a heading of this document nor a full address`);
    }
    if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.port !== '') {
      fail(element, `the link to "${href}" is not a plain https address`);
    }
    if (url.origin === SITE.origin) {
      if (url.search !== '' || !url.pathname.endsWith('/')) {
        fail(element, `the link to "${href}" is not to a page of this site, which ends in "/" and has no query`);
      }
      const id = url.hash === '' ? null : url.hash.slice(1);
      if (id !== null && !NAME.test(id)) fail(element, `the link to "${href}" is not to a heading id`);
      return { kind: 'page', path: url.pathname, id };
    }
    if (EXTERNAL.some((allowed) => url.origin === allowed.origin && url.pathname.startsWith(allowed.path))) {
      return { kind: 'external', url: url.href };
    }
    return fail(element, `the link to "${href}" is to an address a document may not link to`);
  }
}

/** Read a document's HTML; throws `DocumentError` on anything not allowed. */
export function readDocument(html: string): ReadDocument {
  return new Reader().read(html);
}

/** The SHA-256 of each file a `SHA256SUMS` file lists, by file name. The
 *  file is the one `sha256sum` writes: a hash, two spaces, a name. */
export function readChecksums(text: string): Map<string, string> {
  const sums = new Map<string, string>();
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();
  for (const [index, line] of lines.entries()) {
    const match = /^([0-9a-f]{64}) {2}([A-Za-z0-9._-]+)$/.exec(line);
    if (!match) throw new DocumentError(`SHA256SUMS line ${index + 1} is not "<sha256>  <name>"`);
    const [, sha, name] = match as unknown as [string, string, string];
    if (sums.has(name)) throw new DocumentError(`SHA256SUMS lists ${name} twice`);
    sums.set(name, sha);
  }
  return sums;
}

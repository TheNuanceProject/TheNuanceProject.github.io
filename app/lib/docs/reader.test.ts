// SPDX-License-Identifier: MIT
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { STATIC_PAGES } from '../../../scripts/pages.mjs';
import { docs } from '../../../content/projects/wiretrace/content';
import { meta as wtMeta } from '../../../content/projects/wiretrace/meta';
import { contentsOf, plainText, type Block, type DocumentTree, type Inline, type LinkTarget } from './document';
import { documentModule } from './documents-plugin';
import { DocumentError, readChecksums, readDocument } from './reader.server';

const FOLDER = join(__dirname, '..', '..', '..', 'content', 'projects', 'wiretrace', 'docs');
const DOCUMENTS = Object.values(docs).map((doc) => ({
  ...doc,
  read: readDocument(readFileSync(join(FOLDER, `${doc.file}.html`), 'utf8')),
}));

/** A PNG of the given size: the signature and the IHDR chunk, which is all
 *  the reader looks at. */
function png(width: number, height: number, salt = 0): string {
  const bytes = Buffer.alloc(33 + 1);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[33] = salt;
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

function document(body: string, { lead = 'For version 2.2.0.', attrs = 'data-document="sample" data-version="2.2.0"' } = {}): string {
  return `<article ${attrs}>\n<h1>Sample</h1>\n<p class="lead">${lead}</p>\n${body}\n</article>\n`;
}

const FIGURE = `<figure>
  <picture><source srcset="${png(40, 20, 1)}" media="(prefers-color-scheme: dark)"><img src="${png(40, 20, 2)}" alt="A window"></picture>
  <figcaption>The <strong>window</strong>.</figcaption>
</figure>`;

function linksOf(blocks: readonly Block[]): LinkTarget[] {
  const out: LinkTarget[] = [];
  const visit = (content: readonly Inline[]) => {
    for (const node of content) {
      if (node.type === 'link') out.push(node.target);
      if (node.type === 'link' || node.type === 'strong' || node.type === 'em') visit(node.children);
    }
  };
  for (const block of blocks) {
    if (block.type === 'heading' || block.type === 'paragraph' || block.type === 'result') visit(block.children);
    else if (block.type === 'list') block.items.forEach(visit);
    else if (block.type === 'note') block.paragraphs.forEach(visit);
    else if (block.type === 'figure') visit(block.caption);
    else if (block.type === 'table') {
      for (const row of [...block.head, ...block.body]) {
        for (const cell of row) {
          for (const node of cell.content) {
            if (node.type === 'list') node.items.forEach(visit);
            else visit([node]);
          }
        }
      }
    }
  }
  return out;
}

describe("WireTrace's documents, as the site keeps them", () => {
  it('are each the document of its page, of the version the site describes', () => {
    for (const doc of DOCUMENTS) {
      expect(doc.read.document.name).toBe(doc.file);
      expect(doc.read.document.version).toBe(wtMeta.version);
    }
  });

  it('carry the titles the search, the sitemap and llms.txt give them', () => {
    for (const doc of DOCUMENTS) {
      const page = STATIC_PAGES.find((entry) => entry.path === doc.path);
      expect(page?.title).toBe(doc.read.document.title);
    }
  });

  it('are listed in their SHA256SUMS, as the tool that made them wrote them', () => {
    const sums = readChecksums(readFileSync(join(FOLDER, 'SHA256SUMS'), 'utf8'));
    const files = readdirSync(FOLDER).filter((name) => name.endsWith('.html')).sort();
    expect([...sums.keys()].sort()).toEqual(files);
    for (const name of files) {
      expect(createHash('sha256').update(readFileSync(join(FOLDER, name))).digest('hex')).toBe(sums.get(name));
    }
  });

  it('link only to pages of this site that exist, and to headings those pages have', () => {
    const pages = new Set([
      ...STATIC_PAGES.map((page) => `${page.path}/`),
      `/projects/${wtMeta.slug}/`,
    ]);
    const headings = new Map(DOCUMENTS.map((doc) => [`${doc.path}/`, new Set(headingIds(doc.read.document))]));
    const targets = DOCUMENTS.flatMap((doc) => linksOf(doc.read.document.blocks));
    const toPages = targets.filter((target) => target.kind === 'page');
    expect(toPages.length).toBeGreaterThan(0);
    for (const target of toPages) {
      expect(pages, target.path).toContain(target.path);
      if (target.id !== null) {
        expect(headings.get(target.path), `${target.path}#${target.id}`).toContain(target.id);
      }
    }
  });

  it('give every picture in a light and a dark version of one size', () => {
    const guide = DOCUMENTS.find((doc) => doc.file === 'user-guide');
    const figures = guide?.read.document.blocks.filter((block) => block.type === 'figure') ?? [];
    expect(figures.length).toBeGreaterThan(0);
    for (const figure of figures) {
      expect(figure.light).not.toBe(figure.dark);
      expect(figure.alt.length).toBeGreaterThan(0);
    }
  });
});

function headingIds(tree: DocumentTree): string[] {
  return tree.blocks.flatMap((block) => (block.type === 'heading' && block.id !== null ? [block.id] : []));
}

describe('readDocument', () => {
  it('reads each part of a document into the tree', () => {
    const { document: tree, pictures } = readDocument(
      document(`
<h2 id="first">First <code>part</code></h2>
<p>Press <kbd>F1</kbd>, choose <span class="menu">Help &gt; Guide</span>, see <a href="#second">the second</a>,
<a href="https://thenuanceproject.com/privacy/">privacy</a>, <a href="https://thenuanceproject.com/projects/wiretrace/formats/#levels">levels</a>
and <a href="https://github.com/TheNuanceProject/WireTrace/issues">issues</a>.<br><em>Note</em></p>
<!-- a comment -->
<ul class="paths"><li>Windows: <code>%APPDATA%</code></li></ul>
<ol><li><strong>One</strong></li></ol>
<table class="wrap paths">
  <thead><tr><th scope="col">What</th><th>Where</th></tr></thead>
  <tbody>
    <tr><th colspan="2" scope="colgroup">File</th></tr>
    <tr><td><span class="level error">Error</span> <span class="level">Data</span></td><td><ul class="paths"><li>A</li></ul></td></tr>
  </tbody>
</table>
<h3 id="second">Second</h3>
<h3>Untitled</h3>
<pre><code>raw &lt;text&gt;</code></pre>
<pre data-check="plot" data-expect="a">a: 1</pre>
<p class="result">Plotted: a</p>
<pre class="code">printf("x");</pre>
<div class="note"><p>One.</p><p>Two.</p></div>
${FIGURE}`),
    );
    expect(tree.name).toBe('sample');
    expect(tree.title).toBe('Sample');
    expect(plainText(tree.lead)).toBe('For version 2.2.0.');
    expect(tree.blocks.map((block) => block.type)).toEqual([
      'heading', 'paragraph', 'list', 'list', 'table', 'heading', 'heading', 'sample', 'sample', 'result', 'code', 'note', 'figure',
    ]);
    expect(linksOf(tree.blocks)).toEqual([
      { kind: 'section', id: 'second' },
      { kind: 'page', path: '/privacy/', id: null },
      { kind: 'page', path: '/projects/wiretrace/formats/', id: 'levels' },
      { kind: 'external', url: 'https://github.com/TheNuanceProject/WireTrace/issues' },
    ]);
    const table = tree.blocks[4];
    expect(table).toMatchObject({ type: 'table', wrap: true, paths: true });
    if (table?.type === 'table') {
      expect(table.head[0]?.map((cell) => cell.scope)).toEqual(['col', null]);
      expect(table.body[0]?.[0]).toMatchObject({ header: true, scope: 'colgroup', colSpan: 2 });
      expect(table.body[1]?.[0]?.content).toEqual([
        { type: 'level', kind: 'error', text: 'Error' },
        { type: 'text', text: ' ' },
        { type: 'level', kind: null, text: 'Data' },
      ]);
    }
    expect(tree.blocks[7]).toEqual({ type: 'sample', text: 'raw <text>' });
    expect(tree.blocks[10]).toEqual({ type: 'code', text: 'printf("x");' });
    expect(tree.blocks[12]).toMatchObject({ type: 'figure', light: 1, dark: 0, width: 40, height: 20, alt: 'A window' });
    expect(pictures.map((picture) => [picture.width, picture.height])).toEqual([[40, 20], [40, 20]]);
    expect(contentsOf(tree)).toEqual([{ id: 'first', text: 'First part', children: [{ id: 'second', text: 'Second', children: [] }] }]);
  });

  it('keeps a picture once when the document shows it twice', () => {
    const same = png(8, 8, 7);
    const { pictures, document: tree } = readDocument(
      document(`<h2 id="a">A</h2><figure><picture><source srcset="${same}" media="(prefers-color-scheme: dark)"><img src="${same}" alt="x"></picture><figcaption>x</figcaption></figure>`),
    );
    expect(pictures).toHaveLength(1);
    expect(tree.blocks[1]).toMatchObject({ light: 0, dark: 0 });
  });

  const refused: [string, string, RegExp][] = [
    ['a script', '<h2 id="a">A</h2><script>alert(1)</script>', /<script> is not allowed here/],
    ['a style', '<h2 id="a">A</h2><style>p{}</style>', /<style> is not allowed here/],
    ['an image outside a figure', '<h2 id="a">A</h2><p><img src="x" alt="x"></p>', /<img> is not allowed in text/],
    ['an event attribute', '<h2 id="a">A</h2><p onclick="x()">A</p>', /may not have the attribute onclick/],
    ['a style attribute', '<h2 id="a">A</h2><p style="color:red">A</p>', /may not have the attribute style/],
    ['an unknown class', '<h2 id="a">A</h2><p class="big">A</p>', /may not have the class big/],
    ['a script address', '<h2 id="a">A</h2><p><a href="javascript:alert(1)">x</a></p>', /not a plain https address/],
    ['a plain http address', '<h2 id="a">A</h2><p><a href="http://thenuanceproject.com/">x</a></p>', /not a plain https address/],
    ['an address of another site', '<h2 id="a">A</h2><p><a href="https://example.com/">x</a></p>', /may not link to/],
    ['a look-alike of an allowed address', '<h2 id="a">A</h2><p><a href="https://github.com/TheNuanceProjectX/">x</a></p>', /may not link to/],
    ['a relative address', '<h2 id="a">A</h2><p><a href="../privacy/">x</a></p>', /neither to a heading/],
    ['a page address without its slash', '<h2 id="a">A</h2><p><a href="https://thenuanceproject.com/privacy">x</a></p>', /ends in "\/"/],
    ['a link to no heading', '<h2 id="a">A</h2><p><a href="#b">x</a></p>', /leads to no heading/],
    ['a section heading without an id', '<h2>A</h2>', /needs the attribute id/],
    ['an id used twice', '<h2 id="a">A</h2><h2 id="a">B</h2>', /used twice/],
    ['a subsection before any section', '<h3 id="a">A</h3>', /<h3> comes before the first <h2>/],
    ['text outside a block', '<h2 id="a">A</h2>loose text', /text directly inside <article>/],
    ['a JPEG picture', '<h2 id="a">A</h2><figure><picture><source srcset="data:image/jpeg;base64,AAAA" media="(prefers-color-scheme: dark)"><img src="data:image/jpeg;base64,AAAA" alt="x"></picture><figcaption>x</figcaption></figure>', /a PNG given as data/],
    ['bytes that are not a PNG', '<h2 id="a">A</h2><figure><picture><source srcset="data:image/png;base64,AAAAAAAA" media="(prefers-color-scheme: dark)"><img src="data:image/png;base64,AAAAAAAA" alt="x"></picture><figcaption>x</figcaption></figure>', /not a PNG/],
    ['a picture with no description', `<h2 id="a">A</h2><figure><picture><source srcset="${png(1, 1)}" media="(prefers-color-scheme: dark)"><img src="${png(1, 1)}" alt=" "></picture><figcaption>x</figcaption></figure>`, /needs a description/],
    ['a dark picture for another condition', `<h2 id="a">A</h2><figure><picture><source srcset="${png(1, 1)}" media="print"><img src="${png(1, 1)}" alt="x"></picture><figcaption>x</figcaption></figure>`, /the dark picture/],
    ['light and dark pictures of different sizes', `<h2 id="a">A</h2><figure><picture><source srcset="${png(1, 1)}" media="(prefers-color-scheme: dark)"><img src="${png(2, 1)}" alt="x"></picture><figcaption>x</figcaption></figure>`, /differ in size/],
    ['a table without rows', '<h2 id="a">A</h2><table><thead><tr><th>A</th></tr></thead></table>', /no <tbody> rows/],
    ['a cell spanning no columns', '<h2 id="a">A</h2><table><tbody><tr><td colspan="0">A</td></tr></tbody></table>', /not a number of cells/],
    ['markup inside code', '<h2 id="a">A</h2><p><code><b>x</b></code></p>', /may hold only text/],
    ['an empty list', '<h2 id="a">A</h2><ul></ul>', /the list is empty/],
  ];
  it.each(refused)('refuses %s', (_, body, message) => {
    expect(() => readDocument(document(body))).toThrow(message);
  });

  it('refuses anything but one article with a name and a version', () => {
    expect(() => readDocument('<p>no article</p>')).toThrow(/one <article>/);
    expect(() => readDocument(`${document('<h2 id="a">A</h2>')}${document('<h2 id="a">A</h2>')}`)).toThrow(/one <article>/);
    expect(() => readDocument(document('<h2 id="a">A</h2>', { attrs: 'data-document="sample"' }))).toThrow(/needs the attribute data-version/);
    expect(() => readDocument(document('<h2 id="a">A</h2>', { attrs: 'data-document="sample" data-version="2.2"' }))).toThrow(/not a version/);
    expect(() => readDocument(document('', {}))).toThrow(/nothing after its lead/);
  });

  it('says which line a refused part is on', () => {
    expect(() => readDocument(document('<h2 id="a">A</h2>\n<p>\n<blink>x</blink></p>'))).toThrow(/^line 6: <blink>/);
  });

  it('refuses with a DocumentError', () => {
    expect(() => readDocument('')).toThrow(DocumentError);
  });
});

describe('readChecksums', () => {
  it('reads the lines sha256sum writes', () => {
    const sha = 'a'.repeat(64);
    expect(readChecksums(`${sha}  user-guide.html\n`)).toEqual(new Map([['user-guide.html', sha]]));
  });

  it('refuses any other line, and a file listed twice', () => {
    expect(() => readChecksums('abc  x.html\n')).toThrow(/line 1/);
    expect(() => readChecksums(`${'a'.repeat(64)} *x.html\n`)).toThrow(/line 1/);
    expect(() => readChecksums(`${'a'.repeat(64)}  x.html\n${'b'.repeat(64)}  x.html\n`)).toThrow(/twice/);
  });
});

describe('documentModule', () => {
  let folder = '';
  afterEach(() => {
    if (folder) rmSync(folder, { recursive: true, force: true });
    folder = '';
  });

  function withDocument(html: string, sums?: string): string {
    folder = mkdtempSync(join(tmpdir(), 'documents-'));
    const file = join(folder, 'sample.html');
    writeFileSync(file, html);
    const sha = createHash('sha256').update(html).digest('hex');
    writeFileSync(join(folder, 'SHA256SUMS'), sums ?? `${sha}  sample.html\n`);
    return file;
  }

  it('makes a module of the tree, with each picture written once as a file named by its SHA-256', async () => {
    const file = withDocument(document(`<h2 id="a">A</h2>${FIGURE}`));
    const cache = join(folder, 'cache');
    const code = await documentModule(file, cache);
    const written = readdirSync(cache).sort();
    expect(written).toHaveLength(2);
    expect(written.every((name) => /^[0-9a-f]{64}\.png$/.test(name))).toBe(true);
    for (const name of written) expect(code).toContain(`${cache.replaceAll('\\', '/')}/${name}`);
    expect(code).toContain('"name":"sample"');
    expect(code).not.toContain('data:image');
  });

  it('writes a picture again when the file under its name is not that picture', async () => {
    const file = withDocument(document(`<h2 id="a">A</h2>${FIGURE}`));
    const cache = join(folder, 'cache');
    await documentModule(file, cache);
    const [name] = readdirSync(cache);
    writeFileSync(join(cache, name as string), 'not the picture');
    await documentModule(file, cache);
    const bytes = readFileSync(join(cache, name as string));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe((name as string).replace('.png', ''));
    expect(readdirSync(cache).some((entry) => entry.endsWith('.partial'))).toBe(false);
  });

  it('refuses a file that differs from its line in SHA256SUMS', async () => {
    const file = withDocument(document('<h2 id="a">A</h2>'), `${'0'.repeat(64)}  sample.html\n`);
    await expect(documentModule(file, join(folder, 'cache'))).rejects.toThrow(/not edited by hand/);
  });

  it('refuses a file SHA256SUMS does not list', async () => {
    const file = withDocument(document('<h2 id="a">A</h2>'), `${'0'.repeat(64)}  other.html\n`);
    await expect(documentModule(file, join(folder, 'cache'))).rejects.toThrow(/not listed/);
  });

  it('refuses a file with no SHA256SUMS beside it', async () => {
    const file = withDocument(document('<h2 id="a">A</h2>'));
    rmSync(join(folder, 'SHA256SUMS'));
    await expect(documentModule(file, join(folder, 'cache'))).rejects.toThrow(/no SHA256SUMS/);
  });

  it("names the file in the reader's refusal", async () => {
    const file = withDocument(document('<h2 id="a">A</h2><script></script>'));
    await expect(documentModule(file, join(folder, 'cache'))).rejects.toThrow(/sample\.html: line \d+: <script>/);
  });

  it('reads the documents the site keeps', async () => {
    folder = mkdtempSync(join(tmpdir(), 'documents-'));
    for (const name of [...DOCUMENTS.map((doc) => `${doc.file}.html`), 'SHA256SUMS']) {
      copyFileSync(join(FOLDER, name), join(folder, name));
    }
    for (const doc of DOCUMENTS) {
      await expect(documentModule(join(folder, `${doc.file}.html`), join(folder, 'cache'))).resolves.toContain(doc.file);
    }
  });
});

// SPDX-License-Identifier: MIT
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { Plugin } from 'vite';

import { DocumentError, readChecksums, readDocument } from './reader.server.ts';

/**
 * The Vite plugin that turns a product's document (see `document.ts`)
 * into a module a page imports:
 *
 *   import guide from 'virtual:document/content/projects/wiretrace/docs/user-guide.html';
 *   guide.document   // the tree the reader read
 *   guide.pictures   // the address of each picture, by the tree's index
 *
 * At build, and in the development server, the plugin:
 *   1. refuses a file that differs from its line in the `SHA256SUMS` beside
 *      it, which is the product's own list of the files it made, so a
 *      document is never edited here by hand;
 *   2. reads it with the reader, which refuses anything not allowed;
 *   3. writes each picture once, as `<sha256>.png`, to `documents/` in
 *      Vite's cache folder, and imports it from there, so Vite serves and
 *      publishes it as any other picture of the site (a file with a hashed
 *      name, cached for good), and a page carries no picture inline.
 *
 * Documents are read only from the site's `content/` folder.
 */

const PREFIX = 'virtual:document/';
// The resolved id is the file's path with ".js" after it: the module made
// of the file. An id ending in ".html" would be taken by Vite's own HTML
// plugin, which takes every id that does.
const RESOLVED = `\0${PREFIX}`;
const MODULE = '.js';
const CHECKSUMS = 'SHA256SUMS';

/** The module of the document at `file`, its pictures written under `cacheDir`. */
export async function documentModule(file: string, cacheDir: string): Promise<string> {
  const bytes = await readFile(file);
  let sums: Map<string, string>;
  try {
    sums = readChecksums(await readFile(join(dirname(file), CHECKSUMS), 'utf8'));
  } catch (error) {
    if (error instanceof DocumentError) throw error;
    throw new DocumentError(`${file}: no ${CHECKSUMS} beside it, the list of the files the product made`);
  }
  const listed = sums.get(basename(file));
  if (listed === undefined) throw new DocumentError(`${file}: not listed in the ${CHECKSUMS} beside it`);
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (actual !== listed) {
    throw new DocumentError(`${file}: differs from its line in ${CHECKSUMS}; it is the product's file and is not edited by hand`);
  }

  let read: ReturnType<typeof readDocument>;
  try {
    read = readDocument(bytes.toString('utf8'));
  } catch (error) {
    if (error instanceof DocumentError) throw new DocumentError(`${file}: ${error.message}`);
    throw error;
  }

  await mkdir(cacheDir, { recursive: true });
  const imports: string[] = [];
  for (const [index, picture] of read.pictures.entries()) {
    const path = join(cacheDir, `${picture.sha256}.png`);
    const kept = await readFile(path).catch(() => null);
    if (kept === null || createHash('sha256').update(kept).digest('hex') !== picture.sha256) {
      // Written under a name of its own first and then renamed, so no build
      // ever reads a partial picture under the name of a whole one.
      const partial = `${path}.${randomUUID()}.partial`;
      await writeFile(partial, picture.bytes);
      await rename(partial, path);
    }
    imports.push(`import picture${index} from ${JSON.stringify(path.split(sep).join('/'))};`);
  }
  const pictures = read.pictures.map((_, index) => `picture${index}`).join(', ');
  return [
    ...imports,
    `export default { document: ${JSON.stringify(read.document)}, pictures: [${pictures}] };`,
    '',
  ].join('\n');
}

export function documents(): Plugin {
  let root = '';
  let cacheDir = '';
  return {
    name: 'nuance:documents',
    enforce: 'pre',
    configResolved(config) {
      root = config.root;
      cacheDir = join(config.cacheDir, 'documents');
    },
    resolveId(id) {
      return id.startsWith(PREFIX) ? `\0${id}${MODULE}` : null;
    },
    async load(id) {
      if (!id.startsWith(RESOLVED) || !id.endsWith(MODULE)) return null;
      const file = resolve(root, id.slice(RESOLVED.length, -MODULE.length));
      const fromContent = relative(join(root, 'content'), file);
      if (fromContent === '' || fromContent.startsWith('..') || isAbsolute(fromContent)) {
        this.error(`${id}: a document is read only from the site's content/ folder`);
      }
      this.addWatchFile(file);
      this.addWatchFile(join(dirname(file), CHECKSUMS));
      try {
        return await documentModule(file, cacheDir);
      } catch (error) {
        if (error instanceof DocumentError) this.error(error.message);
        throw error;
      }
    },
  };
}

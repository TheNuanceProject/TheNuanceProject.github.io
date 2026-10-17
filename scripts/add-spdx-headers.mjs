#!/usr/bin/env node
// SPDX-License-Identifier: MIT

/**
 * Add or verify SPDX license identifiers on every source file.
 *
 * Per the SPDX standard (https://spdx.dev), license identification is a
 * single machine-parseable comment at the top of each source file:
 *
 *     // SPDX-License-Identifier: MIT
 *
 * Usage:
 *   node scripts/add-spdx-headers.mjs              # add missing headers
 *   node scripts/add-spdx-headers.mjs --check      # verify only (exit 1 if missing)
 *
 * Idempotent: running twice does nothing the second time.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

const SPDX_LINE = '// SPDX-License-Identifier: MIT';

const INCLUDE_EXT = ['.ts', '.tsx', '.mts', '.js', '.mjs'];
/** The folders with source in them, and the configuration files at the
 *  top of the repository. */
const SOURCE_DIRS = ['app', 'content', 'design', 'scripts'];
const EXCLUDE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git',
  '.cache', '.vite', 'coverage',
]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (INCLUDE_EXT.some((ext) => full.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function hasSpdx(content) {
  const head = content.split('\n').slice(0, 5).join('\n');
  return head.includes('SPDX-License-Identifier:');
}

function addSpdx(content) {
  // A script's first line names its interpreter and must stay first.
  if (content.startsWith('#!')) {
    const end = content.indexOf('\n') + 1;
    return `${content.slice(0, end)}${SPDX_LINE}\n${content.slice(end)}`;
  }
  return `${SPDX_LINE}\n${content}`;
}

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');

const files = [
  ...SOURCE_DIRS.flatMap((dir) => walk(join(REPO_ROOT, dir))),
  ...readdirSync(REPO_ROOT)
    .filter((entry) => INCLUDE_EXT.some((ext) => entry.endsWith(ext)))
    .map((entry) => join(REPO_ROOT, entry))
    .filter((full) => statSync(full).isFile()),
];

if (files.length === 0) {
  console.log('No source files found.');
  process.exit(0);
}

const missing = [];
const added = [];

for (const path of files) {
  const content = readFileSync(path, 'utf-8');
  if (hasSpdx(content)) continue;

  missing.push(path);
  if (!checkOnly) {
    writeFileSync(path, addSpdx(content), 'utf-8');
    added.push(path);
  }
}

if (checkOnly) {
  if (missing.length > 0) {
    console.error(`✗ ${missing.length} file(s) missing SPDX header:`);
    for (const p of missing) {
      console.error(`    ${relative(REPO_ROOT, p)}`);
    }
    process.exit(1);
  }
  console.log(`✓ All ${files.length} source files have SPDX headers.`);
  process.exit(0);
}

if (added.length > 0) {
  console.log(`✓ Added SPDX header to ${added.length} file(s).`);
  for (const p of added) {
    console.log(`    ${relative(REPO_ROOT, p)}`);
  }
} else {
  console.log(`✓ All ${files.length} source files already have SPDX headers.`);
}

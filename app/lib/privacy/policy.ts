// SPDX-License-Identifier: MIT
/**
 * The privacy policy, read from its one file.
 *
 * The policy of this website and of WireTrace is `PRIVACY.md` in the
 * WireTrace repository, and nowhere else: the Windows installer and
 * WireTrace's user guide show that file, and this site shows the file of
 * the WireTrace release it describes (`getReleasedPolicy`). So it can
 * never say one thing here and another there.
 *
 * It is read by exactly the rules WireTrace reads it by
 * (`app/privacy_policy.py` there), so every place shows all of it and
 * none of its markup: a title (`#`), the line `Last updated <day>
 * <month> <year>`, then sections (`##`), each of paragraphs and lists
 * (`- ` at the start of each line, one line an item). Within text, only
 * `**bold**` and links `[text](https://...)` or `[address](mailto:address)`.
 * Anything else, any character outside ASCII, and any control character
 * but the line feed, is refused.
 */

export interface Run {
  readonly text: string;
  readonly bold: boolean;
  readonly url: string | null;
}

export type Text = readonly Run[];

export interface Block {
  readonly texts: readonly Text[];
  readonly isList: boolean;
}

export interface PolicySection {
  readonly label: string;
  readonly blocks: readonly Block[];
}

export interface Policy {
  readonly title: string;
  readonly updated: string;
  readonly sections: readonly PolicySection[];
}

export class PolicyError extends Error {
  override readonly name = 'PolicyError';
}

const TITLE = /^# (\S.*)$/;
const UPDATED = /^Last updated \d{1,2} [A-Z][a-z]+ \d{4}$/;
const SECTION = /^## (\S.*)$/;
const ITEM = '- ';
const INLINE = /\*\*([^*[\]]+)\*\*|\[([^[\]]+)\]\((https:\/\/[^\s()]+|mailto:[^\s()]+)\)/g;
/** Every control character but the line feed: Python and JavaScript
 *  would not agree on which of them are spaces. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x09\x0b-\x1f\x7f]/;
/** Markup this reading does not take. */
const UNTAKEN = /[*_`[\]<>\\]/;
/** The start of a line in Markdown's other blocks. */
const OTHER_BLOCK = /^(#|>|\d+[.)]\s|[*+]\s|```|---|___|\s)/;

function refuseMarkup(text: string, where: number): void {
  if (UNTAKEN.test(text)) {
    throw new PolicyError(`line ${where}: markup that is not read: ${JSON.stringify(text)}`);
  }
}

function plain(text: string, where: number): Run[] {
  if (text === '') return [];
  refuseMarkup(text, where);
  return [{ text, bold: false, url: null }];
}

function readText(line: string, where: number): Text {
  const runs: Run[] = [];
  let position = 0;
  for (const match of line.matchAll(INLINE)) {
    runs.push(...plain(line.slice(position, match.index), where));
    if (match[1] !== undefined) {
      runs.push({ text: match[1], bold: true, url: null });
    } else {
      refuseMarkup(match[2] as string, where);
      runs.push({ text: match[2] as string, bold: false, url: match[3] as string });
    }
    position = (match.index as number) + match[0].length;
  }
  runs.push(...plain(line.slice(position), where));
  if (runs.length === 0) {
    throw new PolicyError(`line ${where}: empty text`);
  }
  return runs;
}

/**
 * The policy in `markdown`.
 *
 * @throws PolicyError when it does not keep to the part of Markdown it is read in.
 */
export function parsePolicy(markdown: string): Policy {
  if ([...markdown].some((character) => character.charCodeAt(0) > 0x7f)) {
    throw new PolicyError('only ASCII characters are taken: the installer cannot show others');
  }
  if (CONTROL.test(markdown)) {
    throw new PolicyError('lines end with a line feed alone, and no other control character is taken');
  }
  const paragraphs: { at: number; lines: string[] }[] = [];
  markdown.split('\n').forEach((line, index) => {
    const number = index + 1;
    if (line !== line.trimEnd()) {
      throw new PolicyError(`line ${number}: ends with a space`);
    }
    if (line === '') return;
    const last = paragraphs.at(-1);
    if (last && last.at + last.lines.length === number) {
      last.lines.push(line);
    } else {
      paragraphs.push({ at: number, lines: [line] });
    }
  });
  if (paragraphs.length < 3) {
    throw new PolicyError('a title, the day it was last updated, and sections are needed');
  }
  const [titleParagraph, updatedParagraph] = paragraphs as [typeof paragraphs[number], typeof paragraphs[number]];
  const title = TITLE.exec(titleParagraph.lines[0] as string);
  if (titleParagraph.lines.length !== 1 || !title) {
    throw new PolicyError(`line ${titleParagraph.at}: the first line is the title, after '# '`);
  }
  if (updatedParagraph.lines.length !== 1 || !UPDATED.test(updatedParagraph.lines[0] as string)) {
    throw new PolicyError(`line ${updatedParagraph.at}: then 'Last updated <day> <month> <year>'`);
  }
  const sections: { label: string; blocks: Block[] }[] = [];
  for (const { at, lines } of paragraphs.slice(2)) {
    const first = lines[0] as string;
    const heading = SECTION.exec(first);
    if (heading) {
      if (lines.length !== 1) {
        throw new PolicyError(`line ${at}: a section heading is a line of its own`);
      }
      sections.push({ label: heading[1] as string, blocks: [] });
      continue;
    }
    const section = sections.at(-1);
    if (!section) {
      throw new PolicyError(`line ${at}: text before the first section`);
    }
    if (first.startsWith(ITEM)) {
      if (!lines.every((line) => line.startsWith(ITEM))) {
        throw new PolicyError(`line ${at}: every line of a list begins with '- '`);
      }
      section.blocks.push({
        texts: lines.map((line, offset) => readText(line.slice(ITEM.length), at + offset)),
        isList: true,
      });
      continue;
    }
    lines.forEach((line, offset) => {
      if (OTHER_BLOCK.test(line)) {
        throw new PolicyError(`line ${at + offset}: markup that is not read: ${JSON.stringify(line)}`);
      }
    });
    section.blocks.push({ texts: [readText(lines.join(' '), at)], isList: false });
  }
  for (const { label, blocks } of sections) {
    refuseMarkup(label, 0);
    if (blocks.length === 0) {
      throw new PolicyError(`the section ${JSON.stringify(label)} is empty`);
    }
  }
  return { title: title[1] as string, updated: updatedParagraph.lines[0] as string, sections };
}

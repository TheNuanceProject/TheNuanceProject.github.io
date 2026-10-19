// SPDX-License-Identifier: MIT
/**
 * The class names the site's components give their elements.
 *
 * Read from the source with TypeScript's own parser: every string in a
 * `className` attribute, in the arguments of `cn()`, and in a constant of
 * the same file that a `className` uses. The design-language test checks
 * each one against Tailwind and the language's rules.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const SOURCE_DIRS = ['app', 'content'];
const SOURCE_FILE = /\.tsx?$/;
const SKIPPED = /\.test\.tsx?$/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** The strings an expression can produce, as far as they are written out. */
function strings(node, constants, out) {
  const kind = ts.SyntaxKind;
  if (ts.isStringLiteralLike(node)) out.push(node.text);
  else if (ts.isTemplateExpression(node)) {
    out.push(node.head.text);
    for (const span of node.templateSpans) {
      strings(span.expression, constants, out);
      out.push(span.literal.text);
    }
  } else if (ts.isIdentifier(node)) {
    if (constants.has(node.text)) strings(constants.get(node.text), constants, out);
  } else if (ts.isConditionalExpression(node)) {
    strings(node.whenTrue, constants, out);
    strings(node.whenFalse, constants, out);
  } else if (ts.isBinaryExpression(node)) {
    // `a && 'b'` gives 'b'; `a || 'b'` and `a ?? 'b'` either; `'a' + 'b'` both.
    // A comparison gives no class.
    const op = node.operatorToken.kind;
    if (op === kind.AmpersandAmpersandToken) strings(node.right, constants, out);
    else if ([kind.BarBarToken, kind.QuestionQuestionToken, kind.PlusToken].includes(op)) {
      strings(node.left, constants, out);
      strings(node.right, constants, out);
    }
  } else if (ts.isElementAccessExpression(node)) {
    strings(node.expression, constants, out);
  } else if (ts.isPropertyAssignment(node)) {
    strings(node.initializer, constants, out);
  } else if (ts.isCallExpression(node)) {
    if (ts.isIdentifier(node.expression) && node.expression.text === 'cn') {
      node.arguments.forEach((argument) => strings(argument, constants, out));
    }
  } else if (
    ts.isArrayLiteralExpression(node) || ts.isObjectLiteralExpression(node)
    || ts.isParenthesizedExpression(node) || ts.isJsxExpression(node)
    || ts.isArrowFunction(node) || ts.isAsExpression(node)
  ) {
    ts.forEachChild(node, (child) => strings(child, constants, out));
  }
  return out;
}

/** The tag of the element a `className` attribute belongs to, or null. */
function elementOf(attribute) {
  const opening = attribute.parent?.parent;
  return opening && (ts.isJsxOpeningElement(opening) || ts.isJsxSelfClosingElement(opening))
    ? opening.tagName.getText()
    : null;
}

/** Every class name of one file: { name, line, element }, where `element`
 *  is the tag it is given to when it is written in a `className`
 *  attribute, and null when it is only in a `cn()` call. */
export function classNamesOf(path, text) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const constants = new Map();
  const visitConstants = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      constants.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visitConstants);
  };
  visitConstants(source);

  const found = [];
  const add = (node, element) => {
    const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    for (const value of strings(node, constants, [])) {
      for (const name of value.split(/\s+/)) if (name) found.push({ name, line, element });
    }
  };
  const visit = (node) => {
    if (ts.isJsxAttribute(node) && node.name.getText() === 'className' && node.initializer) {
      add(node.initializer, elementOf(node));
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'cn') {
      add(node, null);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** Every class name of the site: { name, file, line, element }. */
export function classNames(root) {
  return SOURCE_DIRS.flatMap((dir) => walk(join(root, dir)))
    .filter((path) => SOURCE_FILE.test(path) && !SKIPPED.test(path))
    .flatMap((path) => classNamesOf(path, readFileSync(path, 'utf8'))
      .map((found) => ({ ...found, file: relative(root, path).replaceAll('\\', '/') })));
}

// SPDX-License-Identifier: MIT
import type { HighlighterCore } from 'shiki/core';

/**
 * Lazy, client-side syntax highlighting (progressive enhancement).
 *
 * Shiki and its grammars load via dynamic `import()` the first time a
 * code block actually needs them, so the bundler splits them into their
 * own async chunk — they never weigh down the main bundle or the
 * article pages that contain no code. The static HTML ships plain;
 * `CodeBlock` upgrades it after mount. Output uses dual themes via CSS
 * variables, so colours adapt to `[data-theme='dark']`.
 *
 * Scoped to the languages this site writes in to keep the chunk small.
 */

let highlighterPromise: Promise<HighlighterCore> | null = null;

const LOADED = new Set(['typescript', 'tsx', 'python', 'bash', 'json']);

const ALIASES: Record<string, string> = {
  ts: 'typescript',
  js: 'typescript',
  javascript: 'typescript',
  jsx: 'tsx',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
};

async function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = (async () => {
      const [core, engine, ts, tsx, python, bash, json, light, dark] =
        await Promise.all([
          import('shiki/core'),
          import('shiki/engine/javascript'),
          import('shiki/langs/typescript.mjs'),
          import('shiki/langs/tsx.mjs'),
          import('shiki/langs/python.mjs'),
          import('shiki/langs/bash.mjs'),
          import('shiki/langs/json.mjs'),
          import('shiki/themes/github-light.mjs'),
          import('shiki/themes/github-dark.mjs'),
        ]);
      return core.createHighlighterCore({
        themes: [light.default, dark.default],
        langs: [
          ts.default,
          tsx.default,
          python.default,
          bash.default,
          json.default,
        ],
        engine: engine.createJavaScriptRegexEngine(),
      });
    })();
  }
  return highlighterPromise;
}

/**
 * Highlight `code` for `lang`, returning dual-theme HTML. Unknown
 * languages fall back to an un-tokenised (but styled) block. Resolves
 * to null only if highlighting throws, so the caller keeps its plain
 * `<pre>`.
 */
export async function highlightCode(
  code: string,
  lang: string
): Promise<string | null> {
  const resolved = ALIASES[lang] ?? lang;
  const useLang = LOADED.has(resolved) ? resolved : 'text';
  try {
    const highlighter = await getHighlighter();
    return highlighter.codeToHtml(code, {
      lang: useLang,
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    });
  } catch {
    return null;
  }
}

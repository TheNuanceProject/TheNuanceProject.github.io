# The Nuance Design Language: tokens

Every colour, size, space, radius, shadow, duration and font of
thenuanceproject.com and of WireTrace is decided here, once, in the
[W3C Design Tokens Format Module, version 2025.10](https://w3c.github.io/cg-reports/design-tokens/CG-FINAL-format-20251028/).

| File | Holds |
|---|---|
| `nuance.resolver.json` | How the files combine: the base, then the theme (light or dark) |
| `tokens/base.tokens.json` | Type, space, sizes, lines, radii, shadow, motion, the dot grid, the website's containers and breakpoints, WireTrace's regions and floors |
| `tokens/theme/light.tokens.json`, `tokens/theme/dark.tokens.json` | The colours of each theme |
| `generate.mjs` | Checks the tokens and writes what each product reads |

## Changing a decision

1. Change the token files.
2. Run `npm run tokens`. The generator refuses tokens that break the
   language's rules (the 4-pixel grid, the smallest text size, the
   contrast of every pair of colours the products draw text and controls
   in) and says which rule.
3. It writes `app/styles/tokens.css` and `app/lib/design-tokens.ts`.
   For WireTrace, run it with the path of a WireTrace checkout:

   ```
   node design/generate.mjs --wiretrace ../WireTrace
   ```

   which also writes WireTrace's `ui/themes/design_tokens.py`.
4. Commit the token files and the generated files together.

`npm run tokens:check` (run in CI) fails when the website's generated
files are out of date or were edited by hand. With `--wiretrace` it checks
a WireTrace checkout's copy too; WireTrace's own tests fail when that copy
was edited by hand. The generated files are never edited.

The rules the tokens follow, and why, are in the design language
document of the project.

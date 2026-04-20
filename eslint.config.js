import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

/**
 * ESLint configuration.
 *
 * `react-refresh` is scoped to regular component files only. In
 * Framework Mode, route files legitimately export multiple named
 * things (default component, `meta`, `loader`, etc.) alongside the
 * default export — that's the route-module contract, not an HMR
 * problem, so the rule is skipped there.
 */
export default defineConfig([
  globalIgnores([
    'dist',
    'build',
    '.react-router',
    'node_modules',
  ]),

  // Regular TS/TSX files: full rule set.
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['app/routes/**', 'app/root.tsx'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },

  // Route modules: same rules minus react-refresh (see header comment).
  {
    files: ['app/routes/**/*.{ts,tsx}', 'app/root.tsx'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
]);

// SPDX-License-Identifier: MIT
import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [reactRouter(), tailwindcss()],

  resolve: {
    tsconfigPaths: true,
  },

  server: {
    port: 5173,
    host: true,
  },

  build: {
    sourcemap: false,
    target: 'es2022',
    cssMinify: 'lightningcss',
    // Fonts are always served as files, never inlined as data: URIs, so
    // the Content Security Policy can allow fonts from this site alone.
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/.test(file) ? false : undefined),
  },
});

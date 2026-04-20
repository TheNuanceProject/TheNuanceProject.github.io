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
  },
});

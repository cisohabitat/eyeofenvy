import { defineConfig } from 'vite';

// Local-only dev/host config. No backend, no external services at runtime.
export default defineConfig({
  server: {
    port: 5173,
    open: true,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});

import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'HelloWorldWC',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: [],
    },
    sourcemap: true,
    target: 'es2020',
    minify: 'esbuild',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
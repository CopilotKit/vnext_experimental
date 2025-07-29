import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  outDir: 'dist',
  external: ['react', 'react-dom'],
  esbuildOptions(options) {
    // Resolve path aliases during build
    options.alias = {
      '@': './src'
    };
  },
});
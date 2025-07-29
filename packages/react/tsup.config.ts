import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: false, // Don't clean to preserve CSS file
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
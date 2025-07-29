import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: ['dist/**/*.{js,mjs,d.ts,d.mts,js.map,mjs.map}'], // Clean only JS/TS files, preserve CSS
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
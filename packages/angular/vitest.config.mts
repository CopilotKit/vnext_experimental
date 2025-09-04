import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'es2016',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        // Avoid class fields transform incompatibilities
        useDefineForClassFields: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
    // Important: Inline/prebundle Angular deps for vite-node
    deps: {
      optimizer: {
        web: {
          include: [
            /^@angular\//,
            'zone.js',
            'rxjs',
          ],
        },
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '*.config.*',
        'src/test-setup.ts',
        'src/index.ts',
        'src/public-api.ts',
      ],
    },
  },
});
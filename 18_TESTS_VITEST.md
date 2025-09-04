**Goal**
- Make Angular 18 library tests run reliably on Vitest (no framework switch).

**Baseline Requirements**
- Node 18+.
- `vitest` 2.x, `jsdom` 24.x, `zone.js` ^0.14, `reflect-metadata` ^0.2.
- Angular 18 dev deps installed, including `@angular/compiler` (for JIT in tests).

**What To Change/Verify**

- Vitest config (ESM + Angular‑friendly transforms):
  - Use ESM config (`vitest.config.mts`) or set package `"type": "module"`.
  - Enable decorators for esbuild so Angular metadata isn’t stripped.
  - Use `jsdom` env and a single threaded pool to avoid Zone flakiness.
  - Prebundle Angular packages to avoid Node externalization/dual‑zone issues.

  Example `packages/angular/vitest.config.mts` (adjust if you already have similar):

  ```ts
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
  ```

- Test setup (Angular + Zone + JSDOM polyfills):
  - Initialize Angular’s testing environment once via `TestBed.initTestEnvironment(...)`.
  - Reset the test module between tests.
  - Polyfill browser APIs JSDOM doesn’t provide (ResizeObserver, IntersectionObserver, matchMedia, requestAnimationFrame, Canvas context, DOMRect). Missing observers are a common cause of Angular component test failures.

  Example `packages/angular/src/test-setup.ts` (merge with your current file):

  ```ts
  // Angular + Zone
  import 'reflect-metadata';
  import 'zone.js';
  import 'zone.js/testing';
  import { beforeAll, afterEach } from 'vitest';
  import { TestBed } from '@angular/core/testing';
  import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting,
  } from '@angular/platform-browser-dynamic/testing';

  // JSDOM polyfills commonly needed by Angular/CDK/components
  // ResizeObserver
  if (!(globalThis as any).ResizeObserver) {
    class RO {
      callback: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) { this.callback = cb; }
      observe() { /* noop */ }
      unobserve() { /* noop */ }
      disconnect() { /* noop */ }
    }
    (globalThis as any).ResizeObserver = RO as any;
  }

  // IntersectionObserver
  if (!(globalThis as any).IntersectionObserver) {
    class IO {
      constructor(_: IntersectionObserverCallback) {}
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
      root = null; rootMargin = ''; thresholds: number[] = [];
    }
    (globalThis as any).IntersectionObserver = IO as any;
  }

  // matchMedia
  if (!window.matchMedia) {
    (window as any).matchMedia = () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  // requestAnimationFrame
  if (!globalThis.requestAnimationFrame) {
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
    (globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
  }

  // Canvas context
  if (!(HTMLCanvasElement.prototype as any).getContext) {
    (HTMLCanvasElement.prototype as any).getContext = () => ({
      fillRect: () => {}, clearRect: () => {}, getImageData: () => ({ data: [] }),
      putImageData: () => {}, createImageData: () => [], setTransform: () => {},
      drawImage: () => {}, save: () => {}, fillText: () => {}, restore: () => {},
      beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
      stroke: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
      arc: () => {}, fill: () => {}, measureText: () => ({ width: 0 }),
      transform: () => {}, rect: () => {}, clip: () => {},
    });
  }

  // DOMRect
  if (!(globalThis as any).DOMRect) {
    (globalThis as any).DOMRect = class { constructor(public x=0, public y=0, public width=0, public height=0) {} } as any;
  }

  beforeAll(() => {
    try {
      TestBed.initTestEnvironment(
        BrowserDynamicTestingModule,
        platformBrowserDynamicTesting(),
        { teardown: { destroyAfterEach: false } },
      );
    } catch {
      // Already initialized
    }
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });
  ```

- TypeScript config for tests:
  - Ensure Vitest globals and Node types are visible to the tests.

  Example `packages/angular/tsconfig.spec.json`:

  ```json
  {
    "extends": "./tsconfig.json",
    "compilerOptions": {
      "types": ["node", "vitest/globals"]
    },
    "include": [
      "src/**/*.spec.ts",
      "src/**/*.test.ts",
      "src/**/*.d.ts"
    ],
    "exclude": ["node_modules", "dist"]
  }
  ```

**Troubleshooting**
- SyntaxError: Cannot use import statement outside a module
  - Use ESM config (`vitest.config.mts`) or add `"type": "module"` to the package running tests.
- Error: NG… JIT compiler not available
  - Ensure `@angular/compiler` is in devDependencies of the Angular package (it is required for JIT in tests).
- ReferenceError: ResizeObserver/IntersectionObserver not defined
  - Add the polyfills shown above in `test-setup.ts`.
- Flaky/hanging tests with Zone/fakeAsync
  - Keep `pool: 'threads'` with `singleThread: true` and call `TestBed.resetTestingModule()` in `afterEach`.
- ViteNode externalization issues with Angular packages
  - Keep `test.deps.optimizer.web.include` entries for `@angular/*`, `zone.js`, and `rxjs`.

**How To Run**
- From repo root: `pnpm -C packages/angular test` or within the package: `pnpm test`.

With these changes in place, Vitest runs Angular 18 unit tests consistently without switching frameworks.


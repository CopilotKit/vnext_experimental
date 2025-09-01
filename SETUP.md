# New Package Setup: Lit + Tailwind (prefixed) + tailwind-merge (no Shadow DOM)

This guide walks you through creating a new web component package in the monorepo that uses:
- Lit (but renders to light DOM — no Shadow DOM)
- Tailwind CSS with a `copilotkit-` prefix and Preflight disabled
- tailwind-merge to merge default classes with optional user-provided classes
- Statically inlined CSS so consumers do not need to import any stylesheet

The end result is a single proof-of-concept component that renders a red background “Hello world” `<div>` and accepts an optional `class` attribute that overrides defaults via tailwind-merge.


## Prerequisites
- Node.js 18+ and a matching package manager already used by the repo (npm or pnpm).
- Monorepo has workspaces enabled (npm workspaces or pnpm workspaces).

Where commands differ, pick the one matching your package manager.
- npm examples use `npm run …`, `npm install …`.
- pnpm examples use `pnpm …`.


## 1) Create the Package Skeleton
- Path: `packages/hello-world-wc`

Commands:
```
mkdir -p packages/hello-world-wc/src
```

Create `packages/hello-world-wc/package.json`:
```
{
  "name": "@your-scope/hello-world-wc",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "main": "dist/index.js",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build:css": "tailwindcss -c tailwind.config.js -i src/styles.css -o src/tw.css --minify",
    "build": "npm run build:css && vite build",
    "dev": "vite",
    "clean": "rimraf dist src/tw.css"
  }
}
```
Notes:
- Replace `@your-scope` with your org scope if needed.
- We build Tailwind separately into `src/tw.css`, then inline-import it in the component.

Add workspace reference in the monorepo root (pick the right manager):
- npm: ensure root `package.json` has:
```
{
  "workspaces": [
    "packages/*"
  ]
}
```
- pnpm: ensure root `pnpm-workspace.yaml` includes:
```
packages:
  - "packages/*"
```


## 2) Install Dependencies (latest versions)
From the repo root (preferred) or package dir, install:

Runtime deps:
```
# npm
npm install -w @your-scope/hello-world-wc lit tailwind-merge

# pnpm
pnpm add -w lit tailwind-merge --filter @your-scope/hello-world-wc
```

Dev deps (build toolchain):
```
# npm
npm install -w @your-scope/hello-world-wc -D typescript vite tailwindcss postcss autoprefixer rimraf

# pnpm
pnpm add -w -D typescript vite tailwindcss postcss autoprefixer rimraf --filter @your-scope/hello-world-wc
```

Initialize Tailwind (creates a default config):
```
# run in package directory
cd packages/hello-world-wc
npx tailwindcss init -p
cd -
```
This creates `tailwind.config.js` and `postcss.config.js` in the package.


## 3) Configure Tailwind (prefix + no Preflight)
Edit `packages/hello-world-wc/tailwind.config.js` to:
- Use the `copilotkit-` prefix
- Disable Preflight (to avoid global resets)
- Scan the package’s `src` for class usage

```
/** @type {import('tailwindcss').Config} */
module.exports = {
  prefix: 'copilotkit-',
  corePlugins: {
    preflight: false,
  },
  content: [
    './src/**/*.{ts,tsx,js,jsx,html}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

Update `packages/hello-world-wc/postcss.config.js` if needed (typical default is fine):
```
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Create `packages/hello-world-wc/src/styles.css` (Tailwind input). We only need utilities:
```
@tailwind utilities;
```


## 4) Add TypeScript and Vite Config
Create `packages/hello-world-wc/tsconfig.json`:
```
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "declaration": true,
    "declarationDir": "dist",
    "outDir": "dist",
    "strict": true,
    "jsx": "react-jsx",
    "lib": ["ES2020", "DOM"],
    "skipLibCheck": true
  },
  "include": ["src"]
}
```
If your repo doesn’t have a root `tsconfig.json`, remove the `extends` line and keep the rest.

Create `packages/hello-world-wc/vite.config.ts`:
```
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
      // Ensure CSS inlined imports remain bundled into JS when using ?inline
      // and avoid externalizing runtime deps for simplicity.
      external: [],
    },
    sourcemap: true,
    target: 'es2020',
    minify: 'esbuild',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
```


## 5) Implement the Component (no Shadow DOM, inline CSS)
We will:
- Compile Tailwind to `src/tw.css` (minified)
- Import it as text (`?inline`) and inject it once into `document.head`
- Render to light DOM by overriding `createRenderRoot()`
- Merge defaults with optional `class` attribute using tailwind-merge configured for the `copilotkit-` prefix

Create `packages/hello-world-wc/src/HelloWorld.ts`:
```
import { LitElement, html } from 'lit';
import { extendTailwindMerge } from 'tailwind-merge';
import styles from './tw.css?inline';

// Create a prefixed tailwind-merge instance
const twm = extendTailwindMerge({ prefix: 'copilotkit-' });

// Inject the compiled Tailwind CSS once into the page
let stylesInjected = false;
function ensureStylesInjected() {
  if (stylesInjected) return;
  if (typeof document !== 'undefined') {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-hello-world-wc', 'tw');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    stylesInjected = true;
  }
}

export class HelloWorld extends LitElement {
  // Render to light DOM (no Shadow DOM)
  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    ensureStylesInjected();
  }

  render() {
    // Default classes to make a red background and white text
    const base = 'copilotkit-bg-red-500 copilotkit-text-white copilotkit-font-sans copilotkit-p-3';

    // Optional user classes from the host's class attribute
    const user = this.getAttribute('class') ?? '';

    // Merge with tailwind-merge so later classes win (e.g., copilotkit-bg-blue-500)
    const merged = twm(`${base} ${user}`);

    return html`<div class="${merged}">Hello world</div>`;
  }
}
```

Create `packages/hello-world-wc/src/index.ts`:
```
export { HelloWorld } from './HelloWorld';

// Define the custom element so consumers can use <hello-world-wc>
import { HelloWorld } from './HelloWorld';
if (!customElements.get('hello-world-wc')) {
  customElements.define('hello-world-wc', HelloWorld);
}
```


## 6) Build Tailwind CSS and the Package
From the package directory:
```
# 1) Build Tailwind -> src/tw.css
npm run build:css   # or: pnpm build:css

# 2) Build the library bundle
npm run build       # or: pnpm build
```
This produces `dist/index.js` and `dist/index.d.ts`. The Tailwind CSS is embedded into the JS bundle and auto-injected at runtime by the component.


## 7) Try It Locally
Create a quick test HTML next to the package (or in a consumer app) to verify behavior.

Example `demo.html` (any static server or VS Code Live Server):
```
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hello World WC Demo</title>
    <script type="module">
      import '../packages/hello-world-wc/dist/index.js';
    </script>
  </head>
  <body style="margin:20px">
    <!-- Default (red background) -->
    <hello-world-wc></hello-world-wc>

    <!-- Override with blue background and larger text -->
    <hello-world-wc class="copilotkit-bg-blue-500 copilotkit-text-lg"></hello-world-wc>
  </body>
  </html>
```
Open `demo.html` in the browser. You should see two components: one red, one blue (overridden), both without any external CSS included.


## 8) Publish or Consume in the Monorepo
- If you publish:
  - Ensure `files` includes `dist` and your build outputs are present.
  - Use your registry workflow (`npm publish` or CI).
- If you consume within the monorepo:
  - Add a dependency from your app package to `@your-scope/hello-world-wc`.
  - Import the element in your app’s entry: `import '@your-scope/hello-world-wc';`
  - Use in HTML: `<hello-world-wc class="copilotkit-bg-blue-500"></hello-world-wc>`.


## Notes & Rationale
- No Shadow DOM: we override `createRenderRoot()` to render to light DOM so the global Tailwind utilities apply naturally. CSS will leak globally (acceptable by design here), but we prevent conflicts by prefixing with `copilotkit-` and disabling Preflight.
- Static CSS: we compile Tailwind once into `src/tw.css` and inline it via `?inline`, then inject a single `<style>` tag at runtime. Consumers do not need any stylesheets.
- tailwind-merge: configured with the same `copilotkit-` prefix so user classes win over defaults when they conflict (e.g., background color).
- Performance: injecting the stylesheet once keeps multiple instances lightweight. If you make many components, consider sharing a small runtime that injects the CSS once per package.


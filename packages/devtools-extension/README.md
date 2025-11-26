# CopilotKit DevTools extension

Builds a Chrome DevTools panel that hosts the CopilotKit web inspector.

## Commands

- `pnpm --filter @copilotkitnext/devtools-extension build` – bundle scripts to `dist/` and copy the manifest/assets.
- `pnpm --filter @copilotkitnext/devtools-extension dev` – watch mode for local iteration.

## Loading the extension

1. Run the build command above.
2. In Chrome, open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**.
3. Select `packages/devtools-extension/dist`. A “CopilotKit” DevTools panel will appear when inspecting a tab.

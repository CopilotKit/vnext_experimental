# CopilotKit for Angular

This package provides native Angular components, directives, and providers to build Copilot chat UIs powered by the CopilotKit runtime and AG-UI agents. It mirrors the React experience with idiomatic Angular APIs.

## Quick Start

1. **Install**: `pnpm add @copilotkitnext/angular`
2. **Add styles**: Add `@copilotkitnext/angular/styles.css` to your Angular app styles array or `@import "@copilotkitnext/angular/styles.css";` in a global stylesheet
3. **Provide CopilotKit**: Set the runtime URL and optional labels via providers
4. **Use the chat**: Drop `<copilot-chat />` into any template

## Installation

### Package Installation

Install `@copilotkitnext/angular` in your Angular app (supports Angular 18 and 19):

```bash
# pnpm (recommended)
pnpm add @copilotkitnext/angular

# npm
npm install @copilotkitnext/angular

# yarn
yarn add @copilotkitnext/angular
```

### Peer Dependencies

Ensure these are present (matching your Angular major):

- `@angular/core`
- `@angular/common`
- `@angular/cdk` (use `^18` with Angular 18, `^19` with Angular 19)
- `rxjs`
- `tslib`

### Styles

Reference the package CSS so the components render correctly:

**Option 1:** In `angular.json`:

```json
"styles": [
  "@copilotkitnext/angular/styles.css",
  "src/styles.css"
]
```

**Option 2:** In your global stylesheet:

```css
@import "@copilotkitnext/angular/styles.css";
```

## App Wiring (Providers)

Add CopilotKit providers in your application config to set labels and runtime URL.

### Example (`app.config.ts`):

```typescript
import {
  provideCopilotKit,
  provideCopilotChatConfiguration,
} from "@copilotkitnext/angular";

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(BrowserModule),
    ...provideCopilotKit({
      // runtimeUrl can also be set via template directive; see below
    }),
    provideCopilotChatConfiguration({
      labels: {
        chatInputPlaceholder: "Ask me anything...",
        chatDisclaimerText: "AI responses may need verification.",
      },
    }),
  ],
};
```

## Runtime URL (Template Directive)

You can declare the CopilotKit runtime endpoint directly in templates via the `CopilotKitConfigDirective`.

### Component Template Example:

```html
<div
  [copilotkitConfig]="{ runtimeUrl: runtimeUrl }"
  style="display:block;height:100vh"
>
  <copilot-chat></copilot-chat>
</div>
```

### Component Class:

```typescript
export class AppComponent {
  runtimeUrl = "http://localhost:3001/api/copilotkit";
}
```

## Using the Chat Component

### Minimal Usage:

```html
<copilot-chat></copilot-chat>
```

### With a Specific Agent:

```html
<copilot-chat [agentId]="'sales'"></copilot-chat>
```

### Behavior:

- If `agentId` is omitted, the component uses the default agent (ID: `default`)

## Agents 101 (AG-UI)

- **Agent model**: CopilotKit uses AG-UI's `AbstractAgent` interface (package `@ag-ui/client`)
- **Frontend vs backend**:
  - **Backend (runtime)**: Host your real agents. You can use any AG-UI agent on the server
  - **Frontend (Angular app)**: Discovers remote agents from the runtime automatically, and can also host local in-browser agents if desired
- **Default agent**: The ID `default` is special; when present, it is used by `<copilot-chat>` if no `agentId` is provided
- **Compatibility**: Any agent that supports AG-UI works. See https://docs.ag-ui.com/

> **Note**: In most real apps, you define agents on the server (runtime). The frontend will auto-discover them when a `runtimeUrl` is configured.

## Backend Runtime (Hono Server)

Example Angular server (from `apps/angular/demo-server`):

### `index.ts`

```typescript
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  CopilotRuntime,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkitnext/runtime";
import { AnyAGUIAgent } from "@ag-ui/your-desired-agent-framework";

const runtime = new CopilotRuntime({
  agents: { default: new AnyAGUIAgent() },
});

// Create a main app with CORS enabled
const app = new Hono();

// Enable CORS for local dev (Angular demo at http://localhost:4200)
app.use(
  "*",
  cors({
    origin: "http://localhost:4200",
    allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposeHeaders: ["Content-Type"],
    credentials: true,
    maxAge: 86400,
  })
);

// Create the CopilotKit endpoint
const copilotApp = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

// Mount the CopilotKit app
app.route("/", copilotApp);

const port = Number(process.env.PORT || 3001);
serve({ fetch: app.fetch, port });
console.log(
  `CopilotKit runtime listening at http://localhost:${port}/api/copilotkit`
);
```

## CopilotKit Angular APIs (Most Used)

### Components

- **`CopilotChatComponent`**: Full chat UI
  - Inputs: `agentId?: string`

### Directives

- **`CopilotKitConfigDirective`** (`[copilotkitConfig]`): Set `runtimeUrl`, `headers`, `properties`, and/or `agents` declaratively
- **`CopilotKitAgentDirective`** (`[copilotkitAgent]`): Observe agent state; defaults to the `default` agent if no `agentId` is provided

### Providers

- **`provideCopilotKit(...)`**: Set runtime URL, headers, properties, agents, tools, human-in-the-loop handlers
- **`provideCopilotChatConfiguration(...)`**: Set UI labels and behavior for chat input/view

## End-to-End: Running the Demo

From the repo root:

1. **Install deps**: `pnpm install`
2. **Start both demo server and Angular demo app**: pnpm build && pnpm demo:angular`
   - Frontend: runs on http://localhost:4200
   - Backend: runs on http://localhost:3001/api/copilotkit
3. **Prerequisite**: Set `OPENAI_API_KEY` in `apps/angular/demo-server/.env` if using the OpenAI demo agent

## Building This Monorepo

- **Full build**: `pnpm build` (compiles all packages including Angular)
- **Clean**: `pnpm clean`
- **Package-only dev (watch)**: `pnpm dev`

## Angular Storybook

### Dev Server

```bash
pnpm storybook:angular
```

- Serves Storybook for Angular components on http://localhost:6007
- For live chat stories, ensure the demo server is running so the chat can connect:
  ```bash
  pnpm --filter @copilotkitnext/angular-demo-server dev
  ```

### Production Build

```bash
pnpm -C apps/angular/storybook build
```

## Notes

- Node 18+ and pnpm 9+ recommended
- If using custom CORS or non-default ports, update `runtimeUrl` and server CORS settings accordingly
- Styles must be included for proper rendering; if customizing CSS, prefer overriding classes instead of modifying the distributed CSS

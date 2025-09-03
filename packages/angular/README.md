CopilotKit for Angular

This package provides native Angular components, directives, and providers to build Copilot chat UIs powered by the CopilotKit runtime and AG-UI agents. It mirrors the React experience with idiomatic Angular APIs.

Quick Start

- Install: pnpm add @copilotkitnext/angular
- Add styles: add `@copilotkitnext/angular/styles.css` to your Angular app styles array (or `@import "@copilotkitnext/angular/styles.css";` in a global stylesheet)
- Provide CopilotKit: set the runtime URL and optional labels via providers
- Use the chat: drop `<copilot-chat />` into any template

Installation

- Package: install `@copilotkitnext/angular` in your Angular app (Angular 19+)
  - pnpm: pnpm add @copilotkitnext/angular
  - npm: npm install @copilotkitnext/angular
  - yarn: yarn add @copilotkitnext/angular
- Peer dependencies: ensure these are present (Angular 19)
  - @angular/core, @angular/common, @angular/cdk, rxjs, tslib
- Styles: reference the package CSS so the components render correctly
  - In `angular.json` add: "styles": ["@copilotkitnext/angular/styles.css", ...]
  - Or in your global stylesheet: `@import "@copilotkitnext/angular/styles.css";`

App Wiring (providers)

- Add CopilotKit providers in your application config to set labels and runtime URL
  - Example (`app.config.ts`):
    - import { provideCopilotKit, provideCopilotChatConfiguration } from '@copilotkitnext/angular';
    - export const appConfig: ApplicationConfig = {
      providers: [
      importProvidersFrom(BrowserModule),
      ...provideCopilotKit({
      // runtimeUrl can also be set via template directive; see below
      }),
      provideCopilotChatConfiguration({
      labels: {
      chatInputPlaceholder: 'Ask me anything...',
      chatDisclaimerText: 'AI responses may need verification.'
      }
      })
      ]
      };

Runtime URL (template directive)

- You can declare the CopilotKit runtime endpoint directly in templates via the `CopilotKitConfigDirective`
  - Component template example:
    - <div [copilotkitConfig]="{ runtimeUrl: runtimeUrl }" style="display:block;height:100vh">
        <copilot-chat></copilot-chat>
      </div>
  - Component class:
    - runtimeUrl = 'http://localhost:3001/api/copilotkit';

Using the Chat Component

- Minimal usage:
  - <copilot-chat></copilot-chat>
- With a specific agent:
  - <copilot-chat [agentId]="'sales'"></copilot-chat>
- Behavior:
  - If `agentId` is omitted, the component uses the default agent (ID: `default`).

Agents 101 (AG-UI)

- Agent model: CopilotKit uses AG-UI’s `AbstractAgent` interface (package `@ag-ui/client`).
- Frontend vs backend:
  - Backend (runtime): host your real agents. You can use any AG-UI agent on the server.
  - Frontend (Angular app): discovers remote agents from the runtime automatically, and can also host local in-browser agents if desired.
- Default agent:
  - The ID `default` is special; when present, it is used by `<copilot-chat>` if no `agentId` is provided.
- Compatibility: Any agent that supports AG-UI works. See https://docs.ag-ui.com/

Note: In most real apps, you define agents on the server (runtime). The frontend will auto-discover them when a `runtimeUrl` is configured.

Backend Runtime (Hono server)

- Example Angular server: copied from `apps/angular/demo-server`

index.ts

```
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
  agents: { default: new AnyAGUIAgent() }
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

CopilotKit Angular APIs (most used)

- Components
  - `CopilotChatComponent`: full chat UI. Inputs: `agentId?: string`
- Directives
  - `CopilotKitConfigDirective` (`[copilotkitConfig]`): set `runtimeUrl`, `headers`, `properties`, and/or `agents` declaratively
  - `CopilotKitAgentDirective` (`[copilotkitAgent]`): observe agent state; defaults to the `default` agent if no `agentId` is provided
- Providers
  - `provideCopilotKit(...)`: set runtime URL, headers, properties, agents, tools, human-in-the-loop handlers
  - `provideCopilotChatConfiguration(...)`: set UI labels and behavior for chat input/view

End-to-End: Running the Demo

- From the repo root:
  - Install deps: pnpm install
  - Start both demo server and Angular demo app: pnpm demo:angular
    - Frontend: runs on http://localhost:4200
    - Backend: runs on http://localhost:3001/api/copilotkit
  - Prerequisite: set `OPENAI_API_KEY` in `apps/angular/demo-server/.env` if using the OpenAI demo agent

Building This Monorepo

- Full build: pnpm build (compiles all packages including Angular)
- Clean: pnpm clean
- Package-only dev (watch): pnpm dev:packages

Angular Storybook

- Dev server: pnpm storybook:angular
  - Serves Storybook for Angular components on http://localhost:6007
  - For live chat stories, ensure the demo server is running so the chat can connect
    - pnpm --filter @copilotkitnext/angular-demo-server dev
- Production build: pnpm -C apps/angular/storybook build

Notes

- Node 18+ and pnpm 9+ recommended
- If using custom CORS or non-default ports, update `runtimeUrl` and server CORS settings accordingly
- Styles must be included for proper rendering; if customizing CSS, prefer overriding classes instead of modifying the distributed CSS

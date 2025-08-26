Angular Demo Parity: Minimal Hono Server + Angular Wiring

Goal: Mirror the React demo behavior for Angular with the smallest viable setup. No proxies, no extras. Just a tiny Node/Hono server that matches the Next.js API and a thin Angular container that wires the existing UI components to an agent.

Prerequisites
- Node.js 18+ and pnpm installed.
- OPENAI_API_KEY available in your environment (or a .env file alongside the server).

High-Level Plan
1) Add a tiny Hono-based server that exposes the CopilotKit runtime at /api/copilotkit (same shape as the React demo). 2) Add a thin Angular CopilotChat container that wires an agent to the existing chat view. 3) Add a Storybook story for a live demo against the Hono server. That’s it.

1) Tiny Hono Server (apps/angular/demo-server)

1.1 Create the app folder and files
- Path: apps/angular/demo-server
- Files to add:
  - package.json
  - tsconfig.json
  - src/index.ts
  - src/openai.ts

1.2 package.json (exact contents)
{
  "name": "@copilotkit/angular-demo-server",
  "private": true,
  "type": "module",
  "version": "0.0.0",
  "scripts": {
    "dev": "tsx --env-file=.env src/index.ts",
    "start": "node --env-file=.env --loader tsx src/index.ts"
  },
  "dependencies": {
    "@copilotkit/runtime": "workspace:^",
    "@hono/node-server": "^1.13.6",
    "hono": "^4.6.11",
    "openai": "^4.56.1"
  },
  "devDependencies": {
    "tsx": "^4.19.2",
    "typescript": "^5.6.3"
  }
}

1.3 tsconfig.json (NodeNext, ESNext)
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  },
  "include": ["src"]
}

1.4 src/openai.ts (same agent behavior as the React demo)
// OPENAI_API_KEY must be set in the environment
import {
  AbstractAgent,
  RunAgentInput,
  EventType,
  BaseEvent,
} from "@ag-ui/client";
import { Observable } from "rxjs";
import { OpenAI } from "openai";

export class OpenAIAgent extends AbstractAgent {
  private openai: OpenAI;

  constructor(openai?: OpenAI) {
    super();
    this.openai = openai ?? new OpenAI();
  }

  clone(): OpenAIAgent {
    const cloned = Object.create(Object.getPrototypeOf(this));
    for (const key of Object.getOwnPropertyNames(this)) {
      const value = (this as Record<string, unknown>)[key];
      if (typeof value !== "function") {
        if (key === "openai") {
          cloned[key] = value;
        } else {
          cloned[key] = structuredClone(value);
        }
      }
    }
    return cloned;
  }

  protected run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((observer) => {
      observer.next({
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      } as BaseEvent);

      this.openai.chat.completions
        .create({
          model: "gpt-4o",
          stream: true,
          tools: input.tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          })),
          messages: input.messages.map((message) => {
            if (message.role === "tool") {
              return {
                role: "tool" as const,
                content: message.content ?? "",
                tool_call_id: message.toolCallId ?? "",
              };
            } else if (message.role === "assistant" && message.toolCalls) {
              return {
                role: "assistant" as const,
                content: message.content ?? "",
                tool_calls: message.toolCalls,
              };
            } else {
              return {
                role: message.role as "system" | "user" | "assistant",
                content: message.content ?? "",
              };
            }
          }),
        })
        .then(async (response) => {
          const messageId = Date.now().toString();
          for await (const chunk of response) {
            if (chunk.choices[0].delta.content) {
              observer.next({
                type: EventType.TEXT_MESSAGE_CHUNK,
                messageId,
                delta: chunk.choices[0].delta.content,
              } as BaseEvent);
            } else if (chunk.choices[0].delta.tool_calls) {
              const toolCall = chunk.choices[0].delta.tool_calls[0];
              observer.next({
                type: EventType.TOOL_CALL_CHUNK,
                toolCallId: toolCall.id,
                toolCallName: toolCall.function?.name,
                parentMessageId: messageId,
                delta: toolCall.function?.arguments,
              } as BaseEvent);
            }
          }
          observer.next({
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
          } as BaseEvent);
          observer.complete();
        })
        .catch((error) => {
          observer.next({
            type: EventType.RUN_ERROR,
            message: error.message,
          } as BaseEvent);
          observer.error(error);
        });
    });
  }
}

1.5 src/index.ts (Hono server exposing /api/copilotkit)
import { serve } from "@hono/node-server";
import { CopilotRuntime, createCopilotEndpoint, InMemoryAgentRunner } from "@copilotkit/runtime";
import { OpenAIAgent } from "./openai.js";

const runtime = new CopilotRuntime({
  agents: { default: new OpenAIAgent() },
  runner: new InMemoryAgentRunner(),
});

// This returns a Hono app with routes mounted under basePath
const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

const port = Number(process.env.PORT || 3001);
serve({ fetch: app.fetch, port });
console.log(`CopilotKit runtime listening at http://localhost:${port}/api/copilotkit`);

1.6 Install deps and run the server
- Install deps (from repo root):
  - pnpm --filter @copilotkit/angular-demo-server add hono @hono/node-server @copilotkit/runtime openai
  - pnpm --filter @copilotkit/angular-demo-server add -D tsx typescript
- Add a .env file in apps/angular/demo-server/ with:
  - OPENAI_API_KEY=sk-...
- Start the server:
  - cd apps/angular/demo-server
  - pnpm dev
- Verify it responds:
  - curl http://localhost:3001/api/copilotkit/info
  - You should see JSON with agents and a version.

2) Angular CopilotChat Container (packages/angular)

Purpose: Small standalone component to replicate React’s <CopilotChat> behavior by wiring an agent to the existing chat view and input config.

2.1 File to add
- packages/angular/src/components/chat/copilot-chat.component.ts

2.2 Implementation details
- Standalone component, selector: "copilot-chat".
- Inputs: `agentId?: string` (defaults to DEFAULT_AGENT_ID), `threadId?: string` (default random UUID via @copilotkit/shared).
- Inject services: CopilotChatConfigurationService (optional), CopilotKitService.
- Use `watchAgent(agentId)` from packages/angular/src/utils/agent.utils.ts to obtain `agent()` and `isRunning()` signals.
- Maintain a `showCursor` signal: true while connecting/running, false when idle.
- On init/agent change:
  - If agent exists, set `agent.threadId = providedOrGeneratedThreadId`.
  - Kick a lightweight connect call:
    - await agent.runAgent({ forwardedProps: { __copilotkitConnect: true } }, subscriber)
    - subscriber toggles `showCursor` during text/tool-call events.
- Hook input submission via CopilotChatConfigurationService:
  - Set service handlers: onSubmitInput(value) ⇒ add user message + run agent; onChangeInput(value) ⇒ keep input state if you need it.
- Template: render `copilot-chat-view` bound to `messages` and `showCursor`:
  - <copilot-chat-view [messages]="agent()?.messages ?? []" [autoScroll]="true" [messageViewClass]="'w-full'" [showCursor]="showCursor()"></copilot-chat-view>

2.3 Export the component
- Update packages/angular/src/index.ts to export `CopilotChatComponent` so storybook/apps can import it.

3) Standalone Angular Demo App (outside Storybook)

We recommend creating a minimal Angular app under apps/angular/demo that renders <copilot-chat> full-screen and points to the Hono server. Because this repo isn’t currently set up as an Angular CLI root workspace, the most practical path is to add a tiny single-app workspace under apps/angular/demo with its own angular.json. Keep this self-contained and avoid touching the monorepo root.

3.1 Structure
- apps/angular/demo/
  - package.json
  - angular.json
  - tsconfig.json, tsconfig.app.json
  - src/main.ts
  - src/app/app.component.ts
  - src/app/app.config.ts
  - src/index.html
  - src/styles.css (import @copilotkit/angular/src/styles/globals.css)

3.2 Minimal contents
- package.json scripts: { "start": "ng serve", "build": "ng build" }
- angular.json: single application project named "angular-demo" with builder @angular-devkit/build-angular:browser and dev-server.
- src/index.html: a basic body with <app-root></app-root> and <base href="/">.
- src/styles.css: `@import "@copilotkit/angular/src/styles/globals.css";`
- src/app/app.config.ts: provideCopilotKit() + provideCopilotChatConfiguration()
- src/app/app.component.ts (standalone):
  - Template:
    <div style="height:100vh;overflow:hidden" copilotkitConfig [runtimeUrl]="'http://localhost:3001/api/copilotkit'">
      <copilot-chat [threadId]="'xyz'"></copilot-chat>
    </div>
- src/main.ts: bootstrapApplication(AppComponent, { providers: [importProvidersFrom(BrowserModule), ...from app.config] })

3.3 Run the demo
- Terminal A:
  - cd apps/angular/demo-server && pnpm dev
- Terminal B:
  - cd apps/angular/demo && pnpm install && pnpm start
- Open http://localhost:4200 and chat.

Note: Keeping the demo app self-contained under apps/angular/demo avoids changing the repo’s root Angular configuration and ensures a clean separation from Storybook.

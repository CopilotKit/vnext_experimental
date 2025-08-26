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
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { CopilotRuntime, createCopilotEndpoint, InMemoryAgentRunner } from "@copilotkit/runtime";
import { OpenAIAgent } from "./openai";

const runtime = new CopilotRuntime({
  agents: { default: new OpenAIAgent() },
  runner: new InMemoryAgentRunner(),
});

// This returns a Hono app with routes mounted under basePath
const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

// Enable CORS for local dev (Angular demo at http://localhost:4200)
app.use("*", cors({
  origin: (origin) => origin ?? "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Type"],
  credentials: true,
  maxAge: 86400,
}));

const port = Number(process.env.PORT || 3001);
serve({ fetch: app.fetch, port });
console.log(`CopilotKit runtime listening at http://localhost:${port}/api/copilotkit`);

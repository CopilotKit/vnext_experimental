import { CopilotRuntime, createCopilotEndpoint } from "@copilotkit/runtime";
import { InMemoryAgentRunner } from "@copilotkit/runtime";
import { handle } from "hono/vercel";
import { OpenAIAgent } from "./openai";

const SETUP_DEFAULT_AGENT = false;

const runtime = new CopilotRuntime({
  agents: SETUP_DEFAULT_AGENT ? { default: new OpenAIAgent() } : {},
  runner: new InMemoryAgentRunner(),
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);

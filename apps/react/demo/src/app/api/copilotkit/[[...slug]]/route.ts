import { CopilotRuntime, createCopilotEndpoint } from "@copilotkitnext/runtime";
import { InMemoryAgentRunner } from "@copilotkitnext/runtime";
import { handle } from "hono/vercel";
import { OpenAIAgent } from "./openai";

const runtime = new CopilotRuntime({
  // @ts-expect-error
  agents: { default: new OpenAIAgent() },
  runner: new InMemoryAgentRunner(),
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);

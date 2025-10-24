import { CopilotRuntime, createCopilotEndpoint, InMemoryAgentRunner } from "@copilotkitnext/runtime";
import { handle } from "hono/vercel";
import { BasicAgent } from "@copilotkitnext/agent";
import { A2AAgent } from "@ag-ui/a2a";
import { A2AClient } from "@a2a-js/sdk/client";

// Determine which model to use based on available API keys
const getModelConfig = () => {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return "openai/gpt-4o";
  } else if (process.env.ANTHROPIC_API_KEY?.trim()) {
    return "anthropic/claude-sonnet-4.5";
  } else if (process.env.GOOGLE_API_KEY?.trim()) {
    return "google/gemini-2.5-pro";
  }
  // Default to OpenAI (will fail at runtime if no key is set)
  return "openai/gpt-4o";
};

// const agent = new BasicAgent({
//   model: getModelConfig(),
//   prompt: "You are a helpful AI assistant.",
//   temperature: 0.7,
// });
//
const a2aClient = new A2AClient("http://localhost:10002");
const agent = new A2AAgent({ a2aClient, debug: true });

const runtime = new CopilotRuntime({
  agents: {
    default: agent,
  },
  runner: new InMemoryAgentRunner(),
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);

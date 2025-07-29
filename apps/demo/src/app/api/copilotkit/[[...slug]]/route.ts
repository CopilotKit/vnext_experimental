import { CopilotKitRuntime, createEndpoint } from "@copilotkit/runtime";
import { MastraAgent } from "./mastra";
import { Agent } from "@mastra/core";
import { openai } from "@ai-sdk/openai";

const runtime = new CopilotKitRuntime({
  agents: {
    default: new MastraAgent({
      agent: new Agent({
        name: "default",
        instructions: "You are a default agent",
        model: openai("gpt-4o"),
      }),
    }),
  },
});

const copilotkitEndpoint = createEndpoint(runtime);

export async function GET(request: Request) {
  return copilotkitEndpoint(request);
}

export async function POST(request: Request) {
  return copilotkitEndpoint(request);
}

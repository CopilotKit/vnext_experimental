import { CopilotKitRuntime, copilotkitEndpoint } from "@copilotkit/runtime";
import { handle } from "hono/vercel";
import { OpenAIAgent } from "./openai";

const runtime = new CopilotKitRuntime({
  agents: {
    default: new OpenAIAgent(),
  },
});

const app = copilotkitEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);

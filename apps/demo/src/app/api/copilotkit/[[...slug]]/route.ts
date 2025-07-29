import { CopilotKitRuntime, CopilotKitEndpoint } from "@copilotkit/runtime";
import { handle } from "hono/vercel";
import { OpenAIAgent } from "./openai";

export const runtime = "edge";

const copilotKitRuntime = new CopilotKitRuntime({
  agents: {
    default: new OpenAIAgent(),
  },
});

const app = new CopilotKitEndpoint(copilotKitRuntime).basePath("/api/copilotkit");

export const GET = handle(app);
export const POST = handle(app);

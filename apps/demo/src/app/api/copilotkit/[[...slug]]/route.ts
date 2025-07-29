import { CopilotKitRuntime, createEndpoint } from "@copilotkit/runtime";
import { OpenAIAgent } from "./openai";

const runtime = new CopilotKitRuntime({
  agents: {
    default: new OpenAIAgent(),
  },
});

const copilotkitEndpoint = createEndpoint(runtime);

export async function GET(request: Request) {
  return copilotkitEndpoint(request);
}

export async function POST(request: Request) {
  return copilotkitEndpoint(request);
}

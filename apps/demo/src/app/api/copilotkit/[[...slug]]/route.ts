import { CopilotKitRuntime, createEndpoint } from "@copilotkit/runtime";

const runtime = new CopilotKitRuntime({
  agents: {}
});

const copilotKitEndpoint = createEndpoint(runtime);

export async function GET(request: Request) {
  return copilotKitEndpoint(request);
}

export async function POST(request: Request) {
  return copilotKitEndpoint(request);
}


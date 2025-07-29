import { CopilotKitRuntime, createEndpoint } from "@copilotkit/runtime";

const runtime = new CopilotKitRuntime({
  agents: {},
});

const copilotKitEndpoint = createEndpoint(runtime);

export const GET = copilotKitEndpoint;

export const POST = copilotKitEndpoint;

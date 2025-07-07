import { CopilotKitRuntime } from "../runtime";

interface RunAgentParameters {
  request: Request;
  runtime: CopilotKitRuntime;
  agentName: string;
}

export function handleRunAgent({
  runtime,
  request,
  agentName,
}: RunAgentParameters) {
  return new Response(JSON.stringify({ message: "Hello, world!" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

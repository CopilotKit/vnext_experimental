import { CopilotKitRuntime } from "../runtime";

interface RunAgentParameters {
  request: Request;
  runtime: CopilotKitRuntime;
  agentName: string;
}

export function handleRunAgent({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  runtime,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  agentName,
}: RunAgentParameters) {
  return new Response(JSON.stringify({ message: "Hello, world!" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

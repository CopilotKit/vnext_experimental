import CopilotKitRuntime from "./runtime";

interface RunParameters {
  runtime: CopilotKitRuntime;
  request: Request;
  agentName: string;
}

export function handleRun({ runtime, request, agentName }: RunParameters) {
  return new Response(JSON.stringify({ message: "Hello, world!" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

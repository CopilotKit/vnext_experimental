import { CopilotKitRuntime } from "../runtime";
import { VERSION } from "../runtime";

interface HandleGetInfoParameters {
  runtime: CopilotKitRuntime;
  request: Request;
}

export async function handleGetInfo(_params: HandleGetInfoParameters) {
  return new Response(
    JSON.stringify({
      version: VERSION,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

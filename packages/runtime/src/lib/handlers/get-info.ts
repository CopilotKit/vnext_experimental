import CopilotKitRuntime from "../runtime";
import { VERSION } from "../runtime";

interface GetInfoEndpointParameters {
  runtime: CopilotKitRuntime;
  request: Request;
}

export async function handleGetInfoEndpoint(
  _params: GetInfoEndpointParameters
) {
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

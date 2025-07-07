import { CopilotKitRuntime } from "../runtime";
import { VERSION } from "../runtime";

interface HandleGetInfoParameters {
  runtime: CopilotKitRuntime;
  request: Request;
}

export async function handleGetInfo(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: HandleGetInfoParameters
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

import { createServerAdapter } from "@whatwg-node/server";
import { readFileSync } from "fs";
import { resolve } from "path";
import { handleRun } from "./run";
import { handleGetAgents } from "./agents";
import CopilotKitRuntime from "./runtime";

const packageJsonPath = resolve(__dirname, "../../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const response = { copilotkitVersion: packageJson.version };

export default (runtime: CopilotKitRuntime) =>
  createServerAdapter(async (request: Request) => {
    const url = new URL(request.url);
    const path = url.pathname;

    // Check if path ends with agent/<agentName>/run
    const runMatch = path.match(/\/agent\/([^\/]+)\/run$/);
    if (runMatch && runMatch[1]) {
      const agentName = runMatch[1];
      return handleRun({ runtime, request, agentName });
    }

    // Check if path ends with /agents
    if (path.endsWith("/agents")) {
      return handleGetAgents({ runtime, request });
    }

    // Default response with version
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

import { createServerAdapter } from "@whatwg-node/server";
import { readFileSync } from "fs";
import { resolve } from "path";
import { handleCompletion } from "./completion";

const packageJsonPath = resolve(__dirname, "../../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const response = { copilotkitVersion: packageJson.version };

export default createServerAdapter((request: Request) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Check if path ends with agent/<agentName>/completion
  const completionMatch = path.match(/\/agent\/([^\/]+)\/completion$/);
  if (completionMatch && completionMatch[1]) {
    const agentName = completionMatch[1];
    return handleCompletion(request, agentName);
  }

  // Default response with version
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

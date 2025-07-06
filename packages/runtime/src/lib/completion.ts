export function handleCompletion(request: Request, agentName: string) {
  return new Response(
    JSON.stringify({
      message: `Completion endpoint for agent: ${agentName}`,
      agentName,
      method: request.method,
      url: request.url,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

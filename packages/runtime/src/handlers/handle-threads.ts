import { CopilotRuntime } from "../runtime";

interface ListThreadsParameters {
  request: Request;
  runtime: CopilotRuntime;
}

interface GetThreadParameters {
  request: Request;
  runtime: CopilotRuntime;
  threadId: string;
}

interface DeleteThreadParameters {
  request: Request;
  runtime: CopilotRuntime;
  threadId: string;
}

export async function handleListThreads({ runtime, request }: ListThreadsParameters) {
  try {
    // Parse client-declared resourceId from header
    const clientDeclared = CopilotRuntime["parseClientDeclaredResourceId"](request);

    // Resolve resource scope
    const scope = await runtime.resolveThreadsScope({ request, clientDeclared });

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : NaN;
    const parsedOffset = offsetParam ? Number.parseInt(offsetParam, 10) : NaN;

    const limit = Math.max(1, Math.min(100, Number.isNaN(parsedLimit) ? 20 : parsedLimit));
    const offset = Math.max(0, Number.isNaN(parsedOffset) ? 0 : parsedOffset);

    const runner = await runtime.runner;
    const result = await runner.listThreads({ scope, limit, offset });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        error: "Failed to list threads",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function handleGetThread({ runtime, threadId, request }: GetThreadParameters) {
  try {
    // Parse client-declared resourceId from header
    const clientDeclared = CopilotRuntime["parseClientDeclaredResourceId"](request);

    // Resolve resource scope
    const scope = await runtime.resolveThreadsScope({ request, clientDeclared });

    const runner = await runtime.runner;
    const metadata = await runner.getThreadMetadata(threadId, scope);

    if (!metadata) {
      // Return 404 (not 403) to prevent resource enumeration
      return new Response(
        JSON.stringify({
          error: "Thread not found",
          message: `Thread '${threadId}' does not exist`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(metadata), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        error: "Failed to get thread",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function handleDeleteThread({ runtime, threadId, request }: DeleteThreadParameters) {
  if (!threadId) {
    return new Response(JSON.stringify({ error: "Thread ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Parse client-declared resourceId from header
    const clientDeclared = CopilotRuntime["parseClientDeclaredResourceId"](request);

    // Resolve resource scope
    const scope = await runtime.resolveThreadsScope({ request, clientDeclared });

    const runner = await runtime.runner;
    await runner.deleteThread(threadId, scope);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return new Response(
      JSON.stringify({
        error: "Failed to delete thread",
        message: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

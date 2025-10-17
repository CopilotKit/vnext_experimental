import { ResourceScope } from "./runner/agent-runner";

/**
 * Helper to validate that client-declared resourceId matches the authenticated user's resourceId.
 *
 * Throws an error if validation fails.
 *
 * @example
 * ```typescript
 * resolveThreadsScope: async ({ request, clientDeclared }) => {
 *   const user = await authenticate(request);
 *   validateResourceIdMatch(clientDeclared, user.id);
 *   return { resourceId: user.id };
 * }
 * ```
 */
export function validateResourceIdMatch(
  clientDeclared: string | string[] | undefined,
  serverAuthorized: string | string[],
): void {
  if (!clientDeclared) {
    return; // No client hint - OK
  }

  const clientIds = Array.isArray(clientDeclared) ? clientDeclared : [clientDeclared];
  const authorizedIds = Array.isArray(serverAuthorized) ? serverAuthorized : [serverAuthorized];

  // Check if ANY client-declared ID matches ANY authorized ID
  const hasMatch = clientIds.some((clientId) => authorizedIds.includes(clientId));

  if (!hasMatch) {
    throw new Error("Unauthorized: Client-declared resourceId does not match authenticated user");
  }
}

/**
 * Helper to filter client-declared resourceIds to only those the user has access to.
 *
 * Returns the filtered resourceId(s), or throws if no valid IDs remain.
 *
 * @example
 * ```typescript
 * resolveThreadsScope: async ({ request, clientDeclared }) => {
 *   const user = await authenticate(request);
 *   const userResourceIds = await getUserAccessibleResources(user);
 *   const resourceId = filterAuthorizedResourceIds(clientDeclared, userResourceIds);
 *   return { resourceId };
 * }
 * ```
 */
export function filterAuthorizedResourceIds(
  clientDeclared: string | string[] | undefined,
  serverAuthorized: string | string[],
): string | string[] {
  const authorizedIds = Array.isArray(serverAuthorized) ? serverAuthorized : [serverAuthorized];

  if (!clientDeclared) {
    // No client hint - return all authorized
    return serverAuthorized;
  }

  const clientIds = Array.isArray(clientDeclared) ? clientDeclared : [clientDeclared];

  // Filter to only authorized IDs
  const filtered = clientIds.filter((id) => authorizedIds.includes(id));

  if (filtered.length === 0) {
    throw new Error("Unauthorized: None of the client-declared resourceIds are authorized");
  }

  // Return single string if originally single, otherwise array
  return Array.isArray(clientDeclared) ? filtered : filtered[0]!;
}

/**
 * Helper to create a strict thread scope resolver that only allows exact matches.
 *
 * Use this when you want to enforce that the client MUST declare the correct resourceId.
 *
 * @example
 * ```typescript
 * new CopilotRuntime({
 *   agents: { myAgent },
 *   resolveThreadsScope: createStrictThreadScopeResolver(async (request) => {
 *     const user = await authenticate(request);
 *     return user.id;
 *   })
 * });
 * ```
 */
export function createStrictThreadScopeResolver(
  getUserId: (request: Request) => Promise<string | string[]>,
): (context: { request: Request; clientDeclared?: string | string[] }) => Promise<ResourceScope> {
  return async ({ request, clientDeclared }) => {
    const userId = await getUserId(request);
    validateResourceIdMatch(clientDeclared, userId);
    return { resourceId: userId };
  };
}

/**
 * Helper to create a filtering thread scope resolver for multi-resource scenarios.
 *
 * Use this when users have access to multiple resources (e.g., multiple workspaces).
 *
 * @example
 * ```typescript
 * new CopilotRuntime({
 *   agents: { myAgent },
 *   resolveThreadsScope: createFilteringThreadScopeResolver(async (request) => {
 *     const user = await authenticate(request);
 *     return await getUserAccessibleWorkspaces(user);
 *   })
 * });
 * ```
 */
export function createFilteringThreadScopeResolver(
  getUserResourceIds: (request: Request) => Promise<string[]>,
): (context: { request: Request; clientDeclared?: string | string[] }) => Promise<ResourceScope> {
  return async ({ request, clientDeclared }) => {
    const userResourceIds = await getUserResourceIds(request);
    const resourceId = filterAuthorizedResourceIds(clientDeclared, userResourceIds);
    return { resourceId };
  };
}

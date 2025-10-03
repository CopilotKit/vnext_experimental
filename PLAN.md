# Plan: Centralize render tool management in CopilotKitCoreReact

## Objective
Finish moving `renderToolCalls` / `currentRenderToolCalls` handling from `CopilotKitProvider` state into `CopilotKitCoreReact`, letting React consumers react to core-managed updates while keeping the core API as-is.

## Remaining Workstreams
1. **Provider refactor** – replace the provider’s `CopilotKitCore` instance with a single `CopilotKitCoreReact`, keep the static render list fixed from construction, and push dynamic renderer updates through `setRenderToolCalls`. Mirror updates into React by reusing the provider’s existing merge logic inside a lightweight subscription effect.
2. **Hooks & utilities** – update `useFrontendTool`, `useHumanInTheLoop`, and related helpers to manage their merge bookkeeping locally and call `copilotkit.setRenderToolCalls` with the updated dynamic list.
3. **Surface & docs** – adjust context types, tests, and documentation to reflect the new contract (no more `setCurrentRenderToolCalls`).
4. **Validation** – run the focused provider/chat rendering test suites and spot-check wildcard & human-in-the-loop flows.

## Implementation Details
- In `CopilotKitProvider`, instantiate `CopilotKitCoreReact` (instead of `CopilotKitCore`), replace the `useState` store with a `useEffect`-driven subscription that listens for `onRenderToolCallsChanged` and forces a re-render (e.g., via `useReducer`). Use memoized helpers to compute the dynamic list, call `copilotkit.setRenderToolCalls(dynamicList)` when it changes, and read the combined list directly from the core.
- Update the context value to share `copilotkit`, the merged render list from the core, and any helper needed for hooks to compute their dynamic lists; drop `setCurrentRenderToolCalls` from the public surface.
- Adjust hooks to pull the current dynamic list, perform their simple merge/replacement locally, and push the result back through `setRenderToolCalls`; ensure cleanup maintains historical renderers where required.
- Refresh docs/tests to cover the new API surface and ensure wildcard precedence expectations still hold.
- Validate with targeted unit/integration tests (e.g., `pnpm test --filter CopilotKitProvider`, chat rendering suites).

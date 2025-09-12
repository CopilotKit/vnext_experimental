# React Package E2E Testing Plan

Purpose: define a comprehensive, deterministic E2E test plan for the React package that validates streaming chat behavior, tool-call rendering, and dynamic registration via `useFrontendTool`, `useHumanInTheLoop`, and `useRenderToolCall`. Tests are end-to-end within React (Provider + Chat + Hooks), using mocked agent events — no timers, no network.

Scope: `packages/react` only. We exercise real components and hooks together (E2E-in-react). No unit- or provider-only tests. No assistant toolbar/markdown tests. No edge-case stress (malformed deltas, duplicates, unmount churn, etc.).

Runner: Vitest + Testing Library (jsdom).


## Guiding Principles

- Deterministic streams: drive the agent with a Subject-backed mock; assert after each emitted step.
- Full surface: always render `CopilotKitProvider` + `CopilotChat` in tests; verify UI via DOM queries.
- Hooks via behavior: validate `useRenderToolCall`, `useFrontendTool`, and `useHumanInTheLoop` by observing their effects in the rendered chat (not in isolation).
- Keep scenarios realistic: text deltas, tool-call deltas (partial JSON), tool results, multiple calls in one response.


## Shared Test Utilities

- `MockStepwiseAgent`: Subject-backed mock exposing `emit(event)` and `complete()`; produces AG-UI events like `RUN_STARTED`, `TEXT_MESSAGE_CHUNK`, `TOOL_CALL_CHUNK`, `TOOL_CALL_RESULT`, `RUN_FINISHED`.
- Render harness: `<CopilotKitProvider agents={{ default: agent }} renderToolCalls={...}><CopilotChat/></CopilotKitProvider>`.
- Dynamic registration harness: test components that mount/unmount and call `useFrontendTool` and/or `useHumanInTheLoop` during the test.


## E2E Scenarios

1) Chat Basics: text input + run
- Type a message and press Enter → user message appears and agent run starts (loading cursor visible if applicable).
- Emit `TEXT_MESSAGE_CHUNK` deltas → the assistant message accumulates content. Keep assertions minimal (we are not testing markdown/toolbar).

2) Tool Rendering via `useRenderToolCall`
- Named renderer: provide a renderer for `getWeather`; stream partial args via `TOOL_CALL_CHUNK` (e.g., `{"location":"Paris","unit":"c`) and assert renderer shows InProgress with parsed partials; then finish args + emit `TOOL_CALL_RESULT` and assert Complete with result.
- Multiple tool calls in the same assistant message: ensure each renders independently and finalizes upon its own result.
- Wildcard fallback: when no exact renderer exists, supply `*` renderer and assert it is used; then add a specific renderer and assert the specific one is used on subsequent runs.

3) Dynamic Registration via `useFrontendTool` (renderers)
- Register at runtime: mount a small component that calls `useFrontendTool({ name: "dynamicTool", parameters, render })` after the provider is mounted; then emit a tool call for `dynamicTool` and assert it renders.
- Unregister (cleanup): unmount the component before emitting a tool call; assert no renderer appears (or wildcard takes over if present).
- Override behavior: mount one registration, then mount another with the same `name` but different render output; emit a tool call and assert the latest render appears.
- Agent scoping (if applicable in rendering): if you support `agentId` on the render registration path, test that renderers scoped to another agent are not selected for the default agent. If not applicable, skip.

4) Dynamic Registration via `useHumanInTheLoop` (renderers only)
- Register HITL tool with a custom renderer. Stream a tool call for this tool:
  - During partial args: assert your renderer receives InProgress status and shows partial args (the hook augments props with `name`/`description`).
  - After tool result: assert Complete status and result are rendered by the same HITL renderer.
- Note: in the current React chat path, the tool handler execution/promise flow is not invoked by `CopilotChat` (execution happens in `CopilotKitCore.runAgent`, which chat does not call). Therefore we only validate rendering/status props, not the interactive `respond()` lifecycle.
 - Executing status: with framework updates, `CopilotChat` now uses `copilotkit.runAgent` and the core surfaces executing state. Create a `useFrontendTool` tool whose handler returns a deferred promise; after streaming args, run the handler and assert the renderer switches to Executing until you resolve the promise.

5) End-to-end Streaming Patterns
- Single tool flow: `RUN_STARTED` → `TEXT_MESSAGE_CHUNK` → `TOOL_CALL_CHUNK` (partial) → `TOOL_CALL_CHUNK` (finish) → `TOOL_CALL_RESULT` → `RUN_FINISHED`.
- Multiple tools interleaved in one assistant message: call A (partial), call B (partial), result A, result B; verify each renderer updates correctly.


## File Organization

- `src/components/chat/__tests__/CopilotChat.e2e.test.tsx` — Chat basics and streaming patterns (text + tools, wildcard fallback).
- `src/components/chat/__tests__/CopilotChatToolRendering.test.tsx` — Detailed tool rendering scenarios (already present: partial args → complete, add more cases as above).
- `src/hooks/__tests__/use-frontend-tool.e2e.test.tsx` — E2E dynamic registration (mount/unmount/override); uses chat UI and mocked events.
- `src/hooks/__tests__/use-human-in-the-loop.e2e.test.tsx` — E2E registration of HITL renderer; asserts InProgress → Executing (while handler pending) → Complete (after resolving handler result) via streamed events.


## Deterministic Event Sequences

- Prefer explicit `agent.emit(...)` calls and immediate `await screen.findBy...`/`waitFor` assertions after each logical step.
- Avoid timers; no sleeps; no reliance on animation frames beyond Testing Library defaults.


## Execution

- Run with `pnpm -C packages/react test`.
- Use `--testNamePattern` locally for focused runs when iterating.


## Notes / Future Enhancements

- If/when `CopilotChat` integrates `CopilotKitCore.runAgent`, add E2E tests that cover interactive tool execution (HITL `respond()` flow) and `ToolCallStatus.Executing` transitions.

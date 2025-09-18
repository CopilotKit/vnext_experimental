# CopilotKit React Provider Refactor Plan

## Objectives
- Move render tool call orchestration out of `packages/react/src/providers/CopilotKitProvider.tsx` into a React-specific core subclass.
- Extend `CopilotKitCore` events to surface render tool call changes to React consumers.
- Provide a hook-driven opt-in update mechanism, mirroring `use-agent`, so React providers re-render only when requested.

## Work Streams

### 1. Introduce `CopilotKitCoreReact`
- Create `packages/react/src/lib/CopilotKitCoreReact.ts` extending `CopilotKitCore`.
- Lift render tool call normalization, merging, and dynamic registration tracking from the provider into the subclass.
- Maintain internal state for computed + dynamic renders and expose read accessors for provider consumption.

### 2. Event Extensions
- Define a `CopilotKitCoreReactSubscriber` interface (and exported `SubscribeOptions`) that augments `CopilotKitCoreSubscriber` with `onRenderToolCallsChanged`.
- Update `CopilotKitCore.subscribe` typing to accept the wider subscriber shape via generics or overloads, ensuring base behaviour remains backwards compatible.
- Emit the new event whenever the subclass updates the merged render tool call list.

### 3. React Provider Refactor
- Replace `CopilotKitCore` instantiation with `CopilotKitCoreReact` inside `CopilotKitProvider`.
- Remove local state for `currentRenderToolCalls`; rely on the subclass to own/render them and subscribe to its change event.
- Keep context value shape stable (`renderToolCalls`, `currentRenderToolCalls`, `setCurrentRenderToolCalls`) by delegating to the subclass for reads/writes.
- Ensure lifecycle hooks forward runtime config props to the subclass without regressions.

### 4. Controlled Update Hook
- Add a `useCopilotKitCoreReact` (or extend `useCopilotKit`) hook that mirrors `use-agent` semantics: consumers specify which core events (runtime status, render tool calls, agents, etc.) should trigger re-renders.
- Internally subscribe/unsubscribe to `CopilotKitCoreReact` with the selected event list.
- Update provider (and any direct consumers) to use the new hook so renders occur only when requested.

### 5. Validation & Follow-up
- Update or add unit/integration coverage for the new subclass, provider wiring, and hook behaviour.
- Document migration notes for downstream users relying on `renderToolCalls` prop identity or direct `CopilotKitCore` usage.

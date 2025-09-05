# Tool Call Render Refactor (Angular)

This document describes the refactor to simplify Angular tool-call render registration by removing the unused `args` field and related typing friction. It also records two cleanup decisions in the Storybook example components: removing the `description` input and the `selector` in dynamically-created render components.

Goals
- Remove `args` from Angular tool render definitions (`ToolCallRender` / `AngularToolCallRender`).
- Eliminate the need for `as unknown as ToolCallRender<...>` casts in Storybook and app code.
- Keep behavior the same at runtime (tool calls still render; no schema enforcement at render-time).
- Clean up Storybook render components by removing unused `description` input and `selector` metadata since they are created dynamically.

Scope
- Angular package (`packages/angular/**`).
- Angular Storybook (`apps/angular/storybook/**`).
- Do NOT touch React code in this refactor.

---

High‑Level Changes
- Types: Remove `args` from `AngularToolCallRender` / `ToolCallRender` and drop the generic parameter.
- Providers/Service/Utils: Stop adding `args` when composing render registrations; remove unused `zod` imports used only for `args`.
- Storybook: Register renderers without `args` or casts; remove unused `description` input and `selector` from example components.
- Tests: Update Angular utils tests that assert on `args` to no longer expect it.

---

File‑by‑File Plan

1) packages/angular/src/core/copilotkit.types.ts
- Remove `z` import if only used for `args` in the render type.
- Change `AngularToolCallRender<T = unknown>` to a non‑generic interface without `args`:
  - Before:
    - `interface AngularToolCallRender<T> { name: string; args: z.ZodSchema<T>; agentId?: string; render: Type<any> | TemplateRef<ToolCallProps<T>> }`
  - After:
    - `interface AngularToolCallRender { name: string; agentId?: string; render: Type<any> | TemplateRef<ToolCallProps<any>> }`
- Update the export alias:
  - Before: `export type ToolCallRender<T = unknown> = AngularToolCallRender<T>;`
  - After: `export type ToolCallRender = AngularToolCallRender;`
- Update any references in this file to use the non‑generic `ToolCallRender` (e.g., in `CopilotKitContextValue`, `CopilotKitRuntimeInputs`, and injection tokens):
  - `renderToolCalls: ToolCallRender[];`
  - `currentRenderToolCalls: ToolCallRender[];`
  - `COPILOTKIT_RENDER_TOOL_CALLS = new InjectionToken<ToolCallRender[]>(...)`
- Leave `ToolCallProps` unchanged (we are not removing `description` from the props model in this refactor).

2) packages/angular/src/core/copilotkit.providers.ts
- Update the option types to use the non‑generic `ToolCallRender`:
  - `renderToolCalls?: ToolCallRender[];`
- No runtime logic changes needed.

3) packages/angular/src/core/copilotkit.service.ts
- Types: Update all occurrences of `ToolCallRender<unknown>` to `ToolCallRender`.
- Computed `this._allRenderToolCalls` and `processTools(...)`:
  - Stop pushing `args: ...` when composing render entries from frontend tools and human‑in‑the‑loop tools. Construct render entries as `{ name, render, ...(agentId && { agentId }) }`.
- Methods `registerToolRender`, `unregisterToolRender`, `getToolRender`:
  - Update signatures and local types to the non‑generic `ToolCallRender`.
- Remove any unused imports that were only present for `args` (e.g., `z` if present—though likely not imported here).

4) packages/angular/src/directives/copilotkit-frontend-tool.directive.ts
- Remove `z` import (only used to provide a default empty schema for `args`).
- When registering a render entry for a tool that includes a `render`, drop the `args` property entirely:
  - Before: `{ name: tool.name, args: tool.parameters || z.object({}), render: tool.render }`
  - After: `{ name: tool.name, render: tool.render }`
- Update local type annotations to use `ToolCallRender` (non‑generic) and `AngularToolCallRender` (no generics).

5) packages/angular/src/utils/frontend-tool.utils.ts
- Remove `z` import.
- Update these functions to stop adding `args` in render entries and to use non‑generic `ToolCallRender`:
  - `addFrontendTool`:
    - Before: constructs `renderEntry` with `args` from `parameters`.
    - After: constructs `renderEntry` without `args`.
  - `registerFrontendTool`:
    - Same change as above.
  - `removeFrontendTool`:
    - Update the type parameter used in the filter to `ToolCallRender`.
  - `createDynamicFrontendTool`:
    - When updating render, drop `args` and create `{ name, render }`.
- Remove any comments and examples that mention `args` on render definitions.

6) packages/angular/src/utils/human-in-the-loop.utils.ts
- Where a render is registered (via `service.registerToolRender`), stop passing `args`:
  - Before: `service.registerToolRender(frontendTool.name, { name, args: tool.parameters, render })`
  - After: `service.registerToolRender(frontendTool.name, { name, render })`
- Same for `addHumanInTheLoop` and `createHumanInTheLoop` helper bodies.

7) packages/angular/src/components/chat/copilot-chat-tool-calls-view.component.ts
- No functional changes required. This component already ignores `renderConfig.args`.
- Double‑check and remove any dead code comments suggesting `args` use.

8) packages/angular/src/components/copilotkit-tool-render.component.ts
- No API changes required. It consumes `ToolCallProps` at runtime and does not depend on render config `args`.
- Keep `description` handling here unchanged for now (the Storybook components will remove their `@Input() description`).

9) apps/angular/storybook/stories/CopilotChatMessageView.stories.ts
- Remove `@Input({ required: true }) description!: string;` from all render example components:
  - `SearchToolRenderComponent`
  - `CalculatorToolRenderComponent`
  - `WildcardToolRenderComponent`
- Remove `selector: '...'` from those components since they’re created dynamically (not used as elements in templates).
- Update `renderToolCalls` arrays to remove `args` and remove casts:
  - Before:
    - `{ name: 'search', args: searchArgsSchema, render: SearchToolRenderComponent } as unknown as ToolCallRender<SearchArgs>`
  - After:
    - `{ name: 'search', render: SearchToolRenderComponent }`
  - Do this in both places in the file where `renderToolCalls` is provided (there are two arrays around the mid/late sections of the story: one inside the demo component providers and one in `decorators: [moduleMetadata({ providers: [...] })]`).
- Remove the `import { z } from 'zod'` if it becomes unused by the story after removing `args`. If the schemas are still shown in docs code blocks for illustration, keep `z` import only if used.

10) packages/angular/src/index.ts
- No runtime changes required. Confirm the exported type alias for `ToolCallRender` points to the updated non‑generic type.
- Optional: update the inline comment that mentions “direct ToolCallRender<T> usage” to remove `<T>` in the wording.

11) Tests to Update (Angular)
- packages/angular/src/utils/__tests__/frontend-tool.utils.spec.ts
  - Remove expectations for `args` on render entries; keep checks for `{ name, render }` only.
- packages/angular/src/utils/__tests__/human-in-the-loop.utils.spec.ts
  - Replace any object shapes `{ name, args: ..., render: ... }` with `{ name, render: ... }`.
  - Where tests assert on registration calls to `registerToolRender`, update expected call parameters accordingly.
- packages/angular/src/utils/__tests__/frontend-tool-integration.spec.ts
  - Same updates: remove `args` fields in expected render arrays.
- Ensure no test imports of `z` remain solely to satisfy render `args`.

---

Public API Changes (Angular)
- `ToolCallRender` becomes non‑generic and drops the `args` field.
  - Before: `ToolCallRender<T> = { name: string; args: z.ZodSchema<T>; agentId?: string; render: ... }`
  - After: `ToolCallRender = { name: string; agentId?: string; render: ... }`
- All `provideCopilotKit({ renderToolCalls })`, directive, and utils interfaces accept the new shape.

Migration Guide (App/Story code)
- Replace any render registration using `args`:
  - From: `{ name: 'calculator', args: calculatorArgsSchema, render: CalculatorToolRenderComponent } as unknown as ToolCallRender<CalculatorArgs>`
  - To: `{ name: 'calculator', render: CalculatorToolRenderComponent }`
- Remove redundant casts like `as unknown as ToolCallRender<...>`.
- If you still want typed hints for your tool’s args within your render component, keep your component’s `@Input() args!: MyArgs;` typing. The render registration no longer carries a schema.

Notes on `description` and `selector` in examples
- In Storybook example render components, remove `@Input() description` and the `selector` because they are dynamically created and `description` isn’t populated by the runtime path.
- No framework‑level change to `ToolCallProps` is made in this refactor; only the example components drop the unused input.

Backward Compatibility and Risks
- Existing code that depended on `ToolCallRender.args` (Angular only) must be updated. In this repo, only Angular utils/tests and Storybook used it.
- Runtime behavior is unchanged: the renderer still extracts tool call arguments from messages; `args` on the render config was never consulted at render time.

Validation Checklist
- TypeScript builds for `packages/angular` succeed.
- Angular Storybook builds and stories render:
  - `pnpm storybook:angular`
- Unit tests under `packages/angular` pass after expectation updates.
- No lingering `args:` properties in Angular code or tests.
- No unused imports of `zod` in Angular package after cleanup.

Out of Scope / Future Ideas
- If we want ergonomic compile‑time typing for each renderer’s `args` without cluttering runtime config, consider introducing an optional `defineToolRender<T>()` helper that returns a correctly typed object without needing a schema prop.

---

Appendix: Quick Examples After Refactor
- Registering renders in providers:

```ts
provideCopilotKit({
  renderToolCalls: [
    { name: 'search', render: SearchToolRenderComponent },
    { name: 'calculator', render: CalculatorToolRenderComponent },
    { name: '*', render: WildcardToolRenderComponent },
  ],
});
```

- Example Storybook render component inputs (no `description`, no `selector`):

```ts
@Component({
  standalone: true,
  template: `
    <div>
      <strong>Calculator</strong>
      <div>Expression: {{ args?.expression }}</div>
      <div *ngIf="status === ToolCallStatus.InProgress">Calculating…</div>
      <div *ngIf="status === ToolCallStatus.Complete">Result: {{ result }}</div>
    </div>
  `,
})
class CalculatorToolRenderComponent {
  readonly ToolCallStatus = ToolCallStatus;
  @Input({ required: true }) name!: string;
  @Input({ required: true }) args!: { expression: string } | Partial<{ expression: string }>;
  @Input({ required: true }) status!: ToolCallStatus;
  @Input() result?: string;
}
```


# Review of Latest WIP Commit and Next Steps

This document summarizes feedback on the latest commit and aligns it with the idiomatic Angular plan (no back-compat).

## Overall
- Direction is solid: moved to `setInput`, explicit outputs map, `ReadonlyMap`-based `SLOT_CONFIG`, unified slot rendering.
- A few polish items remain to make it fully consistent and simpler.

## What’s Strong
- setInput: `componentRef.setInput(...)` used in slot utils, slot component, and tool render.
- Outputs map: explicit wiring with teardown via `componentRef.onDestroy`.
- DI cleanup: `provideSlots` accepts component types only.
- Button standardization: scroll button emits `clicked` and is wired via `{ clicked: ... }`.

## Nits / Risks
- Props typing: `RenderSlotOptions.props` should be `Partial<T>` (not `T`).
- Component detection: `isComponentType` still too permissive; rely on try/catch (or use `typeof value === 'function'`) and fallback to default.
- Handler binding: prefer arrow functions over `.bind(this)` in `[outputs]` for clarity.
- Output naming consistency: standardize on a single output name across all button-like components (recommend `clicked`).
- createSlotRenderer typing: ensure it accepts `props?: Partial<T>` and matches `RenderSlotOptions`.
- Stories: ensure all new `[outputs]` bindings use the standardized output name and avoid DOM queries or manual style mutation.

## File-Specific Feedback
- `packages/angular/src/lib/slots/slot.utils.ts`
  - Good: try/catch around dynamic creation; outputs + cleanup; DI restricted to components; `createSlotRenderer` threads outputs.
  - Improve: simplify detection to `typeof eff === 'function'` and rely on try/catch.
- `packages/angular/src/lib/slots/slot.types.ts`
  - Change `RenderSlotOptions<T>['props']` to `Partial<T>`; keep `SLOT_CONFIG` as `ReadonlyMap`.
- `packages/angular/src/lib/slots/copilot-slot.component.ts`
  - Good: adds `@Input() outputs`; uses `setInput` in `updateComponentProps`.
- `packages/angular/src/components/copilotkit-tool-render.component.ts`
  - Good: transitions to `setInput`. Consider a single `props` input as the contract for tool render components, or continue to set individual inputs via `setInput`.
- `packages/angular/src/components/chat/copilot-chat-view-scroll-view.component.ts`
  - Good: moved to `{ clicked: ... }` and removed `onClick` from contexts.
- `packages/angular/src/components/chat/copilot-chat-input.component.ts` and `copilot-chat-assistant-message.component.ts`
  - Good: replaced onClick contexts with `[outputs]` maps.
  - Improve: standardize on the chosen output name and prefer arrow functions.

## Concrete Next Steps
- Unify output names
  - Choose `clicked` for all button-like components; update components to `@Output() clicked = new EventEmitter<void>()` and switch all `[outputs]` maps to `{ clicked: ... }`.
- Align types
  - Change `RenderSlotOptions.props?: Partial<T>` in `slot.types.ts`; ensure `createSlotRenderer` signature matches.
- Simplify detection
  - Replace `isComponentType` gate with a minimal guard (`typeof value === 'function'`) or remove the gate and rely on try/catch for creation.
- Prefer templates where possible
  - For interactive overrides, prefer templates to avoid outputs maps and keep event wiring in markup.
- Update stories/tests
  - Replace `.bind(this)` with arrow functions in `[outputs]`.
  - Update any tests and stories relying on old output names or legacy inputs.
  - Ensure tests for `SLOT_CONFIG` use Map semantics.

## Storybook Coverage (Keep These Three Tracks)
- Keep three story categories: Styling (CSS), Templates, Components.
- Goals:
  - Show quick visual tweaks via classes (no structural changes).
  - Demonstrate idiomatic `ng-template` overrides with typed context and event binding in markup.
  - Demonstrate component overrides for complex/stateful replacements with explicit inputs/outputs.

### How To Implement Stories
- Styling (CSS/classes)
  - Use inputs like `inputClass`, `messageViewClass`, `scrollToBottomButtonClass` to demonstrate visual customization.
  - Avoid DOM mutations; rely on class bindings only.

- Templates
  - Provide `ng-template` with a template ref and pass it via `...Template` inputs (e.g., `[inputTemplate]`, `[disclaimerTemplate]`, `[scrollToBottomButtonTemplate]`).
  - Bind events directly in markup using the template context (e.g., `let-onSend="onSend"`) or pass callbacks as named fields in the context.
  - Prefer this path for interactive overrides when possible.

- Components
  - Supply override components via `...Component` inputs and wire events with `[outputs]` maps (e.g., `[outputs]="{ clicked: () => onScroll() }"`).
  - Pass configuration via inputs (mapped from story args) using normal Angular bindings; dynamic wiring happens internally via `setInput`.
  - Ensure all button-like overrides use the standardized `@Output() clicked`.

- Structure and hygiene
  - Group stories under "Styling (CSS)", "Templates", and "Components" sections.
  - Move inline story components into `apps/angular/storybook/components/` and import them for reuse.
  - Avoid `document.querySelector` and manual style changes; use Angular bindings and template refs instead.
  - Optional advanced: add one DI override story using `provideSlots({ key: ComponentType })` (components only, no templates in DI).

## Alignment with Cleanup Plan (No Back-Compat)
- Matches the goals in `cleanup2.md`: template-first customizations, minimal slot API, explicit outputs, no heuristics, components-only DI.
- After standardizing outputs and final type tweaks, the library will be strongly idiomatic and easier to consume.

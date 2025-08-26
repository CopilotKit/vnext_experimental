# Angular Idiomatic Cleanup Plan

This document outlines a focused refactor to reach 100% idiomatic Angular while preserving all current features and override capabilities.

## Effort Estimate

- Scope: 8–14 files; ~700–1,100 changed LOC total (includes unit tests and Storybook updates)
- Time: 2–3 dev-days implementation + 1 day verification (tests + stories + docs)
- Risk: Moderate; touches slot rendering, dynamic creation, public inputs, tests, and stories

## Keep As-Is

- Standalone components, OnPush change detection, signals (`signal`, `computed`, `effect`)
- Content projection via `@ContentChild(..., { read: TemplateRef })` + `ngTemplateOutlet`
- Slot-style customization using `TemplateRef` and typed template contexts
- Story coverage demonstrating both template and component overrides

## Change / Improve

- Dynamic inputs: use `componentRef.setInput(name, value)` instead of mutating instances
- Prefer `NgComponentOutlet` where simple and template-driven; keep `ViewContainerRef.createComponent` where control is needed
- Outputs: remove heuristic mapping (e.g., `onClick` → subscribe to `click`); require explicit `@Output` contracts or use templates for event binding (see detailed steps below)
- Slot type detection: stop relying on private ɵ markers; accept only `TemplateRef` | `Type` and document that directives aren’t valid slot values
- Slot DI shape: standardize on `InjectionToken<ReadonlyMap<string, SlotRegistryEntry>>`; `provideSlots` returns a Map; `getSlotConfig()` reads a (possibly merged) Map
- Breaking change: remove legacy/duplicate inputs (`...Slot`, any redundant variants). Keep a single, consistent pair: `XTemplate?: TemplateRef` and `XComponent?: Type`. Update all usage sites (unit tests, stories, docs).
- Stories: extract inline components to standalone files; avoid DOM queries and manual style mutation; use bindings and template refs

## Remove Output Heuristics (Concrete Steps)

1) Delete heuristic mapping
- In `packages/angular/src/lib/slots/slot.utils.ts` remove the branch that maps `props.onClick` to `instance.click.subscribe`.

2) Add explicit output wiring
- Extend `RenderSlotOptions<T>` with `outputs?: Record<string, (event: any) => void>`.
- In `createComponent(...)`, after creating `componentRef`, for each `[eventName, handler]` in `outputs`, if `componentRef.instance[eventName]?.subscribe` exists, subscribe to it.

3) Thread outputs through slot component
- In `packages/angular/src/lib/slots/copilot-slot.component.ts`, add `@Input() outputs?: Record<string, (event: any) => void>` and pass it into `renderSlot(...)`.

4) Use explicit outputs at call sites
- Where a slot renders a component and needs events, pass `[outputs]="{ click: send }"`, etc. Prefer templates for complex bindings.

5) Document contracts
- For each overridable area, list expected `@Input`s and `@Output`s for component overrides. For template overrides, document the template context (`$implicit` and named fields).

## File-by-File Plan

1) `packages/angular/src/lib/slots/slot.utils.ts` (≈60–100 LOC)
- Replace property assignment with `componentRef.setInput(...)`
- Remove ɵ-based type checks; narrow to `TemplateRef | Type`
- Normalize DI: `provideSlots` → Map; `getSlotConfig()` returns Map (consider `multi: true` layering)
- Add `outputs` support to `RenderSlotOptions` and wire subscriptions in `createComponent`
- Keep `createSlotRenderer` and resolve from Map

2) `packages/angular/src/lib/slots/slot.types.ts` (≈10–20 LOC)
- `SLOT_CONFIG`: `InjectionToken<ReadonlyMap<string, SlotRegistryEntry>>`
- Ensure slot context types are precise and exported

3) `packages/angular/src/lib/slots/copilot-slot.component.ts` (≈20–40 LOC)
- When rendering dynamic components, set inputs via `setInput`
- Accept `@Input() outputs` and pass to `renderSlot`
- Optionally introduce `NgComponentOutlet` for straightforward cases

4) `packages/angular/src/components/copilotkit-tool-render.component.ts` (≈40–60 LOC)
- Replace `Object.assign(instance, props)` with `setInput` calls
- If render components support a single `props` input, set explicitly with `setInput('props', props)`
- Remove output heuristics

5) `packages/angular/src/components/chat/copilot-chat-input.component.ts` (≈60–100 LOC)
- Remove legacy inputs and directive-slot fallback; route all overrides through `CopilotSlotComponent`
- Ensure slot contexts are consistently named and typed
- Update template usages to pass explicit `[outputs]` where a component override is expected to emit

6) `packages/angular/src/components/chat/copilot-chat-view.component.ts` (≈20–40 LOC)
- Remove legacy `...Slot` inputs; keep `...Template` and `...Component` only
- Ensure all slot areas use `CopilotSlotComponent` with typed contexts

7) Tests: `packages/angular/src/lib/slots/__tests__/slot.utils.spec.ts` and related (≈80–140 LOC)
- Update to Map-based `SLOT_CONFIG`; verify merged behavior if `multi: true` is added
- Update tests that relied on `onClick` heuristic to use explicit outputs or templates
- Update any tests referencing removed legacy inputs

8) Stories: `apps/angular/storybook/stories/*.stories.ts` (≈200–350 LOC)
- Extract inline story components to `apps/angular/storybook/components/`
- Replace DOM queries and manual style mutation with bound state and template refs
- Update all stories to new API (no `...Slot` inputs; use `...Template` or `...Component`, and `[outputs]` where needed)

## Recommended API Shape (Post-Refactor)

- Slots: single, consistent pair per area (breaking change)
  - `@Input() fooTemplate?: TemplateRef<FooContext>`
  - `@Input() fooComponent?: Type<FooComponent>`
- Template context: typed and documented
  - Expose `$implicit` and named fields (e.g., `{ $implicit: props, onClick, inputDisabled }`)
- Dynamic components
  - Inputs via `componentRef.setInput('name', value)`
  - Outputs via explicit `@Output`s; wire with `[outputs]` in slot component usage, or prefer templates for event binding
- DI overrides
  - `provideSlots({...})` → Map; `getSlotConfig()` reads merged Map (if `multi: true`)
  - Inputs override DI; DI reserved for advanced/global overrides

## Migration Strategy (Breaking Changes Allowed)

- Single-pass refactor with coordinated updates across code, tests, and stories
- Update slot internals (`slot.utils.ts`, `slot.types.ts`, `copilot-slot.component.ts`) first
- Remove legacy inputs and output heuristics; add explicit outputs support
- Update all component templates to new API; fix unit tests accordingly
- Clean and modernize stories; verify manually via Storybook
- Final docs pass (README + stories) to describe the new idiomatic override paths

## Quick Checklist

- [ ] Swap to `setInput` in all dynamic creation sites
- [ ] Tighten slot type detection; drop ɵ checks
- [ ] Standardize `SLOT_CONFIG` to Map; update providers/tests
- [ ] Remove legacy/duplicate inputs; keep only `...Template`/`...Component`
- [ ] Implement explicit outputs (`RenderSlotOptions.outputs`, `CopilotSlotComponent.outputs`)
- [ ] Update all stories to new API and remove DOM hacks
- [ ] Update all unit tests to reflect new API and output wiring
- [ ] Add/refresh docs for slot contexts, component inputs/outputs, and DI overrides

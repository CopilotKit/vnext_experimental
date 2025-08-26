# Angular Idiomatic Cleanup Plan

This document outlines a focused refactor to reach 100% idiomatic Angular while preserving all current features and override capabilities.

## Effort Estimate

- Scope: 6–10 files; ~400–700 changed LOC total
- Time: 1–2 dev-days implementation + 0.5 day verification (stories/tests)
- Risk: Low–moderate; changes local to slot rendering and dynamic component creation

## Keep As-Is

- Standalone components, OnPush change detection, signals (`signal`, `computed`, `effect`)
- Content projection via `@ContentChild(..., { read: TemplateRef })` + `ngTemplateOutlet`
- Slot-style customization using `TemplateRef` and typed template contexts
- Story coverage demonstrating both template and component overrides

## Change / Improve

- Dynamic inputs: use `componentRef.setInput(name, value)` instead of mutating instances
- Prefer `NgComponentOutlet` where simple and template-driven; keep `ViewContainerRef.createComponent` where control is needed
- Outputs: remove heuristic mapping (e.g., `onClick` → subscribe to `click`); require explicit `@Output` contracts or use templates for event binding
- Slot type detection: stop relying on private ɵ markers; accept only `TemplateRef` | `Type` and document that directives aren’t valid slot values
- Slot DI shape: standardize on `InjectionToken<ReadonlyMap<string, SlotRegistryEntry>>`; `provideSlots` returns a Map; `getSlotConfig()` reads a (possibly merged) Map
- Back-compat inputs: keep existing `...Slot`/`...Component`/`...Template` but funnel through one rendering path; deprecate duplicates in typings/docs
- Stories: extract inline components to standalone files; avoid DOM queries and manual style mutation; use bindings and template refs

## File-by-File Plan

1) `packages/angular/src/lib/slots/slot.utils.ts` (≈60–100 LOC)
- Replace property assignment with `componentRef.setInput(...)`
- Remove ɵ-based type checks; narrow to `TemplateRef | Type`
- Normalize DI: `provideSlots` → Map; `getSlotConfig()` returns Map (consider `multi: true` layering)
- Keep `createSlotRenderer` and resolve from Map

2) `packages/angular/src/lib/slots/slot.types.ts` (≈10–20 LOC)
- `SLOT_CONFIG`: `InjectionToken<ReadonlyMap<string, SlotRegistryEntry>>`
- Ensure slot context types are precise and exported

3) `packages/angular/src/lib/slots/copilot-slot.component.ts` (≈20–40 LOC)
- When rendering dynamic components, set inputs via `setInput`
- Optionally introduce `NgComponentOutlet` for straightforward cases

4) `packages/angular/src/components/copilotkit-tool-render.component.ts` (≈40–60 LOC)
- Replace `Object.assign(instance, props)` with `setInput` calls
- If render components support a single `props` input, set explicitly with `setInput('props', props)`
- Remove output heuristics

5) `packages/angular/src/components/chat/copilot-chat-input.component.ts` (≈30–60 LOC)
- Remove/mark-deprecated directive-slot fallback; route through `CopilotSlotComponent`
- Ensure slot contexts are consistently named and typed

6) `packages/angular/src/components/chat/copilot-chat-view.component.ts` (≈10–30 LOC)
- Minor: ensure all slot areas consistently use `CopilotSlotComponent` with typed contexts

7) Tests: `packages/angular/src/lib/slots/__tests__/slot.utils.spec.ts` (≈40–80 LOC)
- Update to Map-based `SLOT_CONFIG` and verify merged behavior if `multi: true` is added

8) Stories: `apps/angular/storybook/stories/*.stories.ts` (≈150–250 LOC)
- Extract inline story components to `apps/angular/storybook/components/`
- Replace DOM queries and manual style mutation with bound state and template refs

## Recommended API Shape (Post-Refactor)

- Slots: single, consistent pair per area
  - `@Input() fooTemplate?: TemplateRef<FooContext>`
  - `@Input() fooComponent?: Type<FooComponent>`
- Template context: typed and documented
  - Expose `$implicit` and named fields (e.g., `{ $implicit: props, onClick, inputDisabled }`)
- Dynamic components
  - Inputs via `componentRef.setInput('name', value)`
  - Outputs: rely on explicit `@Output`s; consumers wire events in templates or through documented contracts
- DI overrides
  - `provideSlots({...})` → Map; `getSlotConfig()` reads merged Map (if `multi: true`)
  - Inputs still override DI; DI reserved for advanced/global overrides

## Migration Strategy

- Phase 1: Slot internals update (`slot.utils.ts`, `slot.types.ts`) + tests
- Phase 2: Remove output heuristics; document explicit override contracts; keep back-compat inputs
- Phase 3: Story cleanup (extract components, remove DOM hacks)
- Phase 4: Docs pass (README + stories) to promote the preferred idiomatic paths

## Quick Checklist

- [ ] Swap to `setInput` in all dynamic creation sites
- [ ] Tighten slot type detection; drop ɵ checks
- [ ] Standardize `SLOT_CONFIG` to Map; update providers/tests
- [ ] Consolidate slot resolution paths; mark legacy inputs as deprecated in docs
- [ ] Update stories to use standalone components and bindings
- [ ] Add/refresh docs for slot contexts and override contracts


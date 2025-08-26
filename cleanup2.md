# Angular Idiomatic Cleanup Plan (No Backward Compatibility)

This plan applies the best, simplest, and most idiomatic Angular approach without preserving old APIs. It supersedes earlier compatibility notes.

## Principles

- Favor templates for customization; components only when necessary.
- Keep API surface minimal and consistent: one slot pair per area (TemplateRef | Component Type).
- Strictly typed template contexts and explicit `@Output` contracts.
- Avoid internal/private markers and heuristics; prefer explicit contracts or safe fallbacks.

## Public API (Final)

- Slots per area (only):
  - `@Input() fooTemplate?: TemplateRef<FooContext>`
  - `@Input() fooComponent?: Type<FooComponent>`
- Template contexts: typed and documented with `$implicit` and named fields.
- Dynamic components:
  - Inputs set via `componentRef.setInput('name', value)`.
  - Outputs wired explicitly via a simple outputs map from the host usage:
    - `@Input() outputs?: Record<string, (event: any) => void>` on the slot wrapper
    - Call sites: `[outputs]="{ clicked: () => doThing() }"`
- Standardized button outputs:
  - For all “button-like” overrides, use a single `@Output() clicked = new EventEmitter<void>()` (no hybrid function-or-Emitter inputs).
- DI overrides:
  - `provideSlots({ key: ComponentType })` only; DI accepts components, not templates.
  - `SLOT_CONFIG: InjectionToken<ReadonlyMap<string, SlotRegistryEntry>>`

## Removals (Breaking)

- Remove legacy `...Slot` inputs and any directive-slot fallbacks.
- Remove hybrid input/output patterns (e.g., `onClick` as an input and `onClickEmitter` as output) — use a single output `clicked`.
- Remove output heuristics (e.g., mapping `onClick` prop to `click` emitter).
- Stop relying on ɵ markers for type detection.

## Implementation Steps

1) Slot utils and types
- `RenderSlotOptions<T>`: `props?: Partial<T>`, `outputs?: Record<string, (e:any)=>void>`.
- `renderSlot(...)` tries TemplateRef → component via `createComponent(...)` (inside try/catch) → fallback to default or null.
- `createComponent(...)`: use `setInput` for inputs; wire outputs subscriptions and register `componentRef.onDestroy(() => sub.unsubscribe())`.
- `isSlotValue(...)`: `TemplateRef | function`; do not inspect ɵ markers.
- `provideSlots(...)`: accept `Record<string, Type<any>>`, return a `Map` entry per key; optionally `multi: true`.
- `createSlotRenderer(...)`: accept `outputs` and thread them through to `renderSlot(...)`.

2) Slot wrapper component
- `CopilotSlotComponent` accepts `@Input() slot?: TemplateRef | Type`, `@Input() context?: any`, `@Input() outputs?: Record<string,fn>`, `@Input() defaultComponent?: Type`.
- For component slots, call `renderSlot(...)` with `props: context` and `outputs`.

3) Button-like components
- Replace any `onClick` input and `onClickEmitter` output with a single `@Output() clicked`.
- Internally emit `clicked` in the `(click)` handler.

4) Host components
- Update all places where components are used as slots to pass `[outputs]` with `clicked` (or template event bindings if template is used).
- Remove all references to legacy props/events.

5) Stories and unit tests
- Update stories to the new API (no `...Slot`; no hybrid inputs; use `[outputs]` or templates).
- Replace DOM manipulation in stories with Angular bindings.
- Update tests for `SLOT_CONFIG` Map, output wiring via `outputs`, and button `clicked` events.

## Notes on Simplicity

- Prefer templates for interactive overrides to keep event binding in markup and avoid outputs maps where possible.
- Reserve dynamic components for cases where consumers genuinely want to supply a component (e.g., a complex renderer).

## Tailored Feedback on Latest WIP Commit

Commit `b792f71` (“wip”) touched:
- slot utils/types, `copilot-slot.component.ts`, `copilotkit-tool-render.component.ts`, chat components, stories, and tests.

What’s good
- Introduced `outputs` map into slot rendering. This aligns with explicit output wiring and removes heuristics.
- Switched to `setInput` for component inputs (idiomatic and change-detection friendly).
- Moved toward Map-based `SLOT_CONFIG`.

What to improve to stay maximally idiomatic
- Standardize outputs:
  - Replace special names like `onClickEmitter` with a single `@Output() clicked`. Update call sites to `[outputs]="{ clicked: ... }"`.
  - Drop hybrid `onClick` input handling from button components.
- Simplify component detection:
  - Avoid permissive `isComponentType` that treats any function as a component. Use try/catch around creation; if it fails, fall back to default/null. This is safer without touching ɵ internals.
- Unsubscribe from output subscriptions:
  - When subscribing to `EventEmitter`s from `outputs`, register `componentRef.onDestroy(() => sub.unsubscribe())`.
- DI with templates:
  - Ensure `provideSlots` only accepts component types. TemplateRefs should not be placed in DI (they lack view context).
- Remove directive-slot fallback branches:
  - Route everything through `CopilotSlotComponent` and the unified `renderSlot` path; eliminate divergence.
- Stories cleanup:
  - Favor templates for interactive overrides where possible, and avoid `.bind(this)` by using arrow functions in `[outputs]`.
  - Remove direct DOM queries (`document.querySelector`) and manual style mutations; use Angular bindings/refs.

## Example Changes to Apply Next

- In `copilot-chat-view-scroll-to-bottom-button.component.ts`:
  - Replace `onClickEmitter` and `onClick` input with `@Output() clicked = new EventEmitter<void>()`.
  - Emit `clicked` in `handleClick()`; update stories/call sites to `[outputs]="{ clicked: () => scrollToBottom() }"`.
- In `slot.utils.ts`:
  - Wrap `createComponent` call in a try/catch and fall back to the default component on error.
  - On outputs subscription, store subscriptions and unsubscribe on `componentRef.onDestroy`.
- In `copilot-slot.component.ts`:
  - Add `@Input() outputs?: Record<string, (event:any)=>void>` and pass to `renderSlot(...)`.
- In stories:
  - Replace `[outputs]="{ onClickEmitter: ... }"` with `[outputs]="{ clicked: ... }"` after component update.

This brings the WIP in line with the no-backcompat, maximally idiomatic plan while keeping the current refactor momentum.


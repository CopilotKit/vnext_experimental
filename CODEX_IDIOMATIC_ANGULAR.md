# Codex Angular Migration Plan — Idiomatic Slots, Events, and Customization

This document describes a complete migration plan to make the Angular package 100% idiomatic while preserving the same customization power as the React build. It focuses on:

- Replacing “prop bags” and dynamic instance mutation with explicit Inputs, Outputs, and `ng-template` content projection.
- Maintaining deep customization in a type-safe, Angular-native way.
- No legacy mode: we will break backward compatibility (unreleased code).

The plan is organized by themes and concrete tasks with suggested file targets.

---

## Goals

- Idiomatic Angular APIs:
  - Use `@Input()` for data; use `@Output()` for events.
  - Prefer `ng-template`/content projection for slots.
  - Avoid function handlers inside “props” objects; don’t mutate component instances dynamically.
- Maintain deep customization capabilities with named template slots and component-type overrides.
- Keep surface API predictable and discoverable via TypeScript types and Angular tooling.

---

## High-Level Changes

1) Event wiring moves to Outputs bubbled up through the hierarchy.
2) Slots prefer `ng-template` and component-type overrides over object/class/function “slot values”.
3) Styling and configuration move to explicit Inputs (e.g., `inputClass`) instead of “string slots”.
4) Remove legacy prop-bag and string/object slots entirely; no deprecation shims needed.

---

## Component API Remodeling

### A. Top-Level View: `CopilotChatViewComponent`
Files:
- `packages/angular/src/components/chat/copilot-chat-view.component.ts`
- `packages/angular/src/components/chat/copilot-chat-view.types.ts`

Changes:
- Add top-level Outputs to bubble assistant/user events from inside the message view:
  - `@Output() assistantMessageThumbsUp = new EventEmitter<{ message: Message }>();`
  - `@Output() assistantMessageThumbsDown = new EventEmitter<{ message: Message }>();`
  - `@Output() assistantMessageReadAloud = new EventEmitter<{ message: Message }>();`
  - `@Output() assistantMessageRegenerate = new EventEmitter<{ message: Message }>();`
  - Consider similar for user message events if applicable (copy/edit).
- Accept named `ng-template` slots at the view level for deep customization, and pass them to subcomponents via inputs:
  - `#messageView` (layout of messages and cursor)
  - `#sendButton`, `#toolbar`, `#textArea`, etc. (forwarded to input)
  - `#assistantMessageMarkdownRenderer`, `#thumbsUpButton`, `#thumbsDownButton`, etc. (forwarded to assistant messages)
- Keep component-type override Inputs as is (e.g., `[messageViewComponent]`) for larger customizations.
- Remove reliance on `messageViewProps` for events. Treat `messageViewProps` as style-only for the migration window or remove entirely; preferred is to delete and expose explicit Inputs. If retained in short term, accept class-only and drop later.
- Ensure view forwards Outputs emitted from children: subscribe/bind in template and re-emit.

### B. Message View: `CopilotChatMessageViewComponent`
Files:
- `packages/angular/src/components/chat/copilot-chat-message-view.component.ts`
- `packages/angular/src/components/chat/copilot-chat-message-view.types.ts`

Changes:
- Inputs:
  - Remove support for function handlers inside props. Only accept explicit Inputs for classes/flags.
  - Prefer explicit Inputs (e.g., `[assistantMessageClass]`) and remove generic `assistantMessageProps`/`userMessageProps` if feasible.
- Outputs (new):
  - Re-emit assistant message events directly:
    - `@Output() assistantMessageThumbsUp = new EventEmitter<{ message: Message }>();` (and others)
  - In the default branch (no overrides), bind inner assistant message component outputs and re-emit.
  - In custom slot branches, provide context callbacks in the template (see Slots section) so templates can call `emit()`.
- Template changes:
  - Default assistant message render binds Outputs directly and re-emits via message-view Outputs.
  - No calling of handler-like fields from props; events flow only via Outputs.

### C. Assistant Message: `CopilotChatAssistantMessageComponent`
Files:
- `packages/angular/src/components/chat/copilot-chat-assistant-message.component.ts`

Changes:
- Keep current Outputs: `thumbsUp`, `thumbsDown`, `readAloud`, `regenerate`.
- Ensure all default toolbar buttons are wired via Outputs; no function props.
- Make toolbar button slots purely `ng-template` or component-type swaps. No object “slot props” for events.

### D. Input: `CopilotChatInputComponent`
Files:
- `packages/angular/src/components/chat/copilot-chat-input.component.ts`

Changes:
- Keep the existing template slots (`#sendButton`, `#toolbar`, `#textArea`, `#audioRecorder`, and button variants), but ensure they pass data via template context only, not by mutation.
- Remove acceptance of function handlers in props; expose Outputs for actions:
  - `@Output() submitMessage = new EventEmitter<string>();`
  - `@Output() startTranscribe = new EventEmitter<void>();` etc. (already present).
- Keep component-type overrides as-is.
- Ensure any class/style customization is via explicit Inputs.

### E. Scroll View and Utility Components
Files:
- `packages/angular/src/components/chat/copilot-chat-view-scroll-view.component.ts`
- `packages/angular/src/components/chat/copilot-chat-view-input-container.component.ts`
- `packages/angular/src/components/chat/copilot-chat-view-feather.component.ts`
- `packages/angular/src/components/chat/copilot-chat-view-disclaimer.component.ts`

Changes:
- Continue to accept component-type overrides.
- Prefer explicit Inputs for styling (`inputClass`) and config.
- Remove dependency on string slots and object props for behavior.

---

## Slot System Remodeling

### A. Preferred Slot Pattern
- Use `ng-template` with well-defined context objects:
  - Example: `#sendButton let-send="send" let-disabled="disabled"`
  - Example: `#assistantMessageMarkdownRenderer let-content="content"`
- Provide named template Inputs on components and project them using `*ngTemplateOutlet`.

### B. Component-Type Overrides
- Continue to support `[...Component]?: Type<any>` for swapping whole subcomponents where needed.
- Require that such components expose the same Inputs/Outputs (or documented subset) for predictable integration.

### C. Deprecate Non-Idiomatic Slot Values
Files:
- `packages/angular/src/lib/slots/slot.utils.ts`
- `packages/angular/src/lib/slots/slot.types.ts`
- `packages/angular/src/lib/slots/copilot-slot.component.ts`

Changes:
- Remove support for string slot values (CSS class via “slot”). Use explicit class/style Inputs.
- Remove support for “object slot” values (dynamic prop bags). Use explicit Inputs and template context.
- Keep only `TemplateRef` and component `Type` as slot mechanisms.
- In `CopilotSlotComponent`/`renderSlot`: never mutate Outputs; only set explicitly whitelisted Inputs if we keep dynamic component creation at all.

### D. `CopilotSlotComponent` Status
- Mark `CopilotSlotComponent` internal-only and remove it from public exports.
- Slim responsibilities to: render a TemplateRef via `*ngTemplateOutlet` OR create a component by type and set a limited, explicit input map.
- Do not accept or merge arbitrary `props`. No class strings. No events.
- Prefer rendering defaults directly in templates when Output binding is needed.

---

## Backward Compatibility Strategy

Not applicable (unreleased). We will remove legacy APIs outright.

---

## Documentation Tasks

- Update `COPILOT_CHAT_VIEW.md` with idiomatic Angular usage patterns:
  - Outputs at top-level for assistant/user events.
  - Named templates for buttons and markdown.
  - Component-type overrides and their expected Inputs/Outputs.
- Remove references to function props and string/object slots. No migration section required.

---

## Storybook Updates (Angular)
Files:
- `apps/angular/storybook/stories/CopilotChatView.stories.ts`
- `apps/angular/storybook/stories/CopilotChatMessageView.stories.ts`
- `apps/angular/storybook/stories/CopilotChatAssistantMessage.stories.ts`
- `apps/angular/storybook/stories/CopilotChatInput.stories.ts`

Changes:
- Replace examples that pass function handlers through `messageViewProps` with Output bindings on `<copilot-chat-view>` and/or `<copilot-chat-message-view>`.
- Demonstrate named `ng-template` slots for:
  - `#sendButton` customization.
  - `#assistantMessageMarkdownRenderer`.
  - `#thumbsUpButton`, `#thumbsDownButton`, etc.
- Remove any “legacy interop” stories.

---

## Type and API Surface

- Tighten `*.types.ts` to reflect explicit Inputs/Outputs. Remove generic `any` bags where feasible.
- Add context interfaces for each named template slot (e.g., `SendButtonContext`, `ToolbarContext`, `AssistantMessageMarkdownRendererContext`).
- Ensure public exports in `packages/angular/src/index.ts` expose only the intended public API (remove `CopilotSlotComponent`).

### Public Export Changes
- Remove: `export { CopilotSlotComponent } from "./lib/slots/copilot-slot.component";`
- Keep: all chat components, directives, services required for public consumption.

---

## Implementation Steps (Suggested Order)

1) Add Output bubbling from inner assistant message → message view → top-level view; bind defaults directly in templates.
2) Remove all uses of function handlers in prop bags; delete legacy aliases.
3) Remove string/object slot support; update `slot.utils.ts` and `copilot-slot.component.ts` to only accept `TemplateRef`/`Type` and explicit input mapping.
4) Remove `CopilotSlotComponent` from public exports; mark internal.
5) Replace `copilot-slot` usages with direct renders where Output binding is required; keep for pure template or component overrides where safe.
6) Introduce/confirm named `ng-template` inputs on public components and forward them to children.
7) Update Storybook to new Output + template-slot DX; remove legacy examples.
8) Update documentation files accordingly.
9) Ensure all packages build and tests run; fix any typing gaps created by removal of `any` bags.

### File-Level Checklist
- `packages/angular/src/index.ts`:
  - Remove `CopilotSlotComponent` export.
- `packages/angular/src/lib/slots/slot.types.ts`:
  - Narrow `SlotValue` to `TemplateRef | Type` only; remove `string | Partial<T>`.
  - Remove `SlotConfig`, `SlotRegistryEntry` fields related to class/props.
- `packages/angular/src/lib/slots/slot.utils.ts`:
  - Remove handling for string/object slots; keep only TemplateRef/Type branches.
  - If dynamic component inputs are needed, accept a typed map parameter (internal-only) and never touch outputs.
- `packages/angular/src/lib/slots/copilot-slot.component.ts`:
  - Accept only `slot?: TemplateRef | Type` and `context?: object`.
  - Remove `[props]` and any instance mutation logic other than explicit internal input mapping.
  - Add `@internal` note; keep out of public exports.
- `packages/angular/src/components/chat/*`:
  - Render default components directly where event binding is required.
  - Replace string/object slot props with explicit Inputs or template slots.
  - Bubble Outputs to parents as appropriate.
- `apps/angular/storybook/*`:
  - Update stories to bind Outputs and use named `ng-template` slots.
  - Remove examples using function props or string/object slot values.
- `packages/angular/src/components/chat/*.types.ts`:
  - Align types with explicit Inputs/Outputs and template contexts.


---

## Example Target DX (Post-Migration)

- Top-level Outputs:
  - `<copilot-chat-view [messages]="messages" (assistantMessageThumbsUp)="onThumbsUp($event)" (assistantMessageThumbsDown)="onThumbsDown($event)"></copilot-chat-view>`
- Button slot via template:
  - `<ng-template #thumbsUpButton let-onClick><button (click)="onClick()">Great</button></ng-template>`
- Markdown renderer slot:
  - `<ng-template #assistantMessageMarkdownRenderer let-content><my-markdown [markdown]="content"></my-markdown></ng-template>`
- Send button slot from top-level:
- `<ng-template #sendButton let-send="send" let-disabled="disabled"><button [disabled]="disabled" (click)="send()">Send</button></ng-template>`

No function props, no string/object slots, no dynamic instance mutation.

---

## Risks and Mitigations

- Risk: Over-customization via component-type overrides may drift from expected Inputs/Outputs.
  - Mitigation: Document required interface, add compile-time types, and Storybook examples.
- Risk: Removing string/object slots changes ergonomics for quick styling.
  - Mitigation: Add explicit `...Class`/`...Style` Inputs; document common patterns.

---

## Acceptance Criteria

- Storybook: all stories use only Outputs + template slots; no legacy stories.
- No dynamic mutation of `EventEmitter` outputs anywhere in slot rendering.
- All events available as Outputs at either `copilot-chat-view` or `copilot-chat-message-view` level.
- Documentation reflects the new patterns and migration steps.
- Code compiles across workspace; unit tests pass (slot utils and component tests updated accordingly).

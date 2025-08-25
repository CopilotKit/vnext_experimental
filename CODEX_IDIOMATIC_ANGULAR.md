# Codex Angular Migration Plan — Idiomatic Slots, Events, and Customization

This document describes a complete migration plan to make the Angular package 100% idiomatic while preserving the same customization power as the React build. It focuses on:

- Replacing “prop bags” and dynamic instance mutation with explicit Inputs, Outputs, and `ng-template` content projection.
- Maintaining deep customization in a type-safe, Angular-native way.
- Minimizing breaking changes where practical and providing a compatibility shim for staged adoption.

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
4) Backward-compatibility shim to map legacy prop-bag usage where feasible; mark as deprecated.

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
- Remove reliance on `messageViewProps` for events; still allow a transitional props bag for styling-only fields (e.g., `className`) with deprecation notices.
- Ensure view forwards Outputs emitted from children: subscribe/bind in template and re-emit.

### B. Message View: `CopilotChatMessageViewComponent`
Files:
- `packages/angular/src/components/chat/copilot-chat-message-view.component.ts`
- `packages/angular/src/components/chat/copilot-chat-message-view.types.ts`

Changes:
- Inputs:
  - Keep `assistantMessageProps`, `userMessageProps`, `cursorProps` for styling/config-only in a transitional period; add alias setters to map legacy names to current Inputs for minimal breakage:
    - `@Input() set assistantMessage(v) { this.assistantMessageProps = v; }`
    - `@Input() set userMessage(v) { this.userMessageProps = v; }`
    - `@Input() set cursor(v) { this.cursorProps = v; }`
    - `@Input() set className(v: string) { this.inputClass = v; }`
  - Prefer explicit Inputs for classes and flags rather than embedding in a bag (e.g., `[assistantMessageClass]`).
- Outputs (new):
  - Re-emit assistant message events directly:
    - `@Output() assistantMessageThumbsUp = new EventEmitter<{ message: Message }>();` (and others)
  - In the default branch (no overrides), bind inner assistant message component outputs and re-emit.
  - In custom slot branches, provide context callbacks in the template (see Slots section) so templates can call `emit()`.
- Template changes:
  - Default assistant message render binds:
    - `(thumbsUp)="assistantMessageProps?.onThumbsUp?.($event) || assistantMessageThumbsUp.emit($event)"`
    - and similarly for down/read/regenerate.
  - If `assistantMessageProps` contains handler-like fields, treat them as legacy; prefer consumers to use Outputs on the parent going forward.

### C. Assistant Message: `CopilotChatAssistantMessageComponent`
Files:
- `packages/angular/src/components/chat/copilot-chat-assistant-message.component.ts`

Changes:
- Keep current Outputs: `thumbsUp`, `thumbsDown`, `readAloud`, `regenerate`.
- Ensure all default toolbar buttons are wired via Outputs; no function props.
- Make toolbar button slots purely `ng-template` or component-type swaps. Avoid object “slot props” for events.

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
- Deprecate support for string slot values (CSS class via “slot”). Replace with explicit class/style Inputs.
- Deprecate “object slot” values (dynamic prop bags). Replace with explicit Inputs and template context.
- Keep `TemplateRef` and `Type` as the primary slot mechanisms.
- In `CopilotSlotComponent` and `renderSlot`:
  - Stop mutating component instances with arbitrary props for new APIs.
  - If keeping a compatibility path, DO NOT assign into `EventEmitter` properties; skip keys whose instance property is an EventEmitter.
  - Log a development warning (once) when legacy slot props/events are detected.

---

## Backward Compatibility Strategy

1) Introduce alias Inputs in `CopilotChatMessageViewComponent` that map legacy prop-bag keys to current Inputs (e.g., `assistantMessage` → `assistantMessageProps`).
2) Wire default assistant message Outputs to call `assistantMessageProps?.onX?.(...)` if present, while also emitting new Outputs. Mark the prop-bag path as deprecated.
3) In `CopilotSlotComponent` and `renderSlot`, add guards to avoid overwriting `EventEmitter`s and console-warn when function-like fields are passed via props.
4) Update Storybook examples to the new idiomatic API while keeping a “legacy interop” story.
5) Mark deprecated APIs in code comments and release notes. Plan removal in a future major version.

---

## Documentation Tasks

- Update `COPILOT_CHAT_VIEW.md` with idiomatic Angular usage patterns:
  - Outputs at top-level for assistant/user events.
  - Named templates for buttons and markdown.
  - Component-type overrides and their expected Inputs/Outputs.
- Add a migration guide section explaining legacy props → new Outputs/templates mapping.
- Document deprecations and removal timeline.

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
- Keep one “Legacy Interop” story that shows deprecation warnings and explains the new approach.

---

## Type and API Surface

- Tighten `*.types.ts` to reflect explicit Inputs/Outputs. Remove generic `any` bags where feasible.
- Add context interfaces for each named template slot (e.g., `SendButtonContext`, `ToolbarContext`, `AssistantMessageMarkdownRendererContext`).
- Ensure public exports in `packages/angular/src/index.ts` expose the new types and any new templates/components.

---

## Implementation Steps (Suggested Order)

1) Add Output bubbling from inner assistant message → message view → top-level view.
2) Add alias Inputs on message view for legacy prop-bag keys.
3) Update message view template to wire default assistant message outputs to both legacy handlers (if present) and new Outputs.
4) Guard `CopilotSlotComponent`/`renderSlot` from mutating `EventEmitter` properties; add dev warnings for legacy props/events.
5) Introduce named `ng-template` inputs on `CopilotChatViewComponent` and forward them to children.
6) Replace string/object slot patterns with explicit Inputs or templates throughout components; keep compatibility path.
7) Update Storybook stories to idiomatic API; add a legacy interop example with deprecation notes.
8) Update documentation files and add migration notes.

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

---

## Risks and Mitigations

- Risk: Consumers relying on prop-bag handlers will break.
  - Mitigation: Provide alias inputs + dual wiring for one minor version; warn and document migration.
- Risk: Over-customization via component-type overrides may drift from expected Inputs/Outputs.
  - Mitigation: Document required interface, add compile-time types, and Storybook examples.
- Risk: Removing string/object slots changes ergonomics for quick styling.
  - Mitigation: Add explicit `...Class`/`...Style` Inputs; document common patterns.

---

## Acceptance Criteria

- Storybook: all idiomatic stories run without legacy warnings; one legacy interop story shows warnings but still works.
- No dynamic mutation of `EventEmitter` outputs anywhere in slot rendering.
- All events available as Outputs at either `copilot-chat-view` or `copilot-chat-message-view` level.
- Documentation reflects the new patterns and migration steps.


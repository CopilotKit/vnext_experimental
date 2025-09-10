CopilotKit Angular: Storybook and Docs Cleanup TODO

Summary
- Goal: Remove misleading `onSend` patterns from Angular Storybook, align examples with the idiomatic service-based submission (`CopilotChatConfigurationService.submitInput`), and fix any examples using non-existent inputs (e.g., `[sendButtonTemplate]`). Add clear examples for custom inputs via `[inputComponent]` and template slots. Update docs accordingly.

Scope
- Affects Angular Storybook stories and example components under `apps/angular/storybook/` and Angular docs/readme under `packages/angular/`.

High‑Priority Fixes (Blocking)
- Replace all `onSend` patterns in Angular stories/examples.
  - apps/angular/storybook/stories/CopilotChatView-Templates.stories.ts
    - Remove `let-onSend="onSend"` template contexts.
    - Replace helper functions `sendMessage(input, onSend)` and `send(input, onSend)` with a custom input component pattern.
    - New pattern: Demonstrate `[inputComponent]` pointing to a tiny standalone component that injects `CopilotChatConfigurationService` and calls `submitInput(value)`.
    - Keep scroll-to-bottom template `let-onClick="onClick"` (valid), but verify it still works after changes.
  - apps/angular/storybook/stories/CopilotChatView-Components.stories.ts
    - Inlined `CustomInputComponent` currently has `@Input() onSend?: (message: string) => void;` — remove this input.
    - Inject `CopilotChatConfigurationService` and replace `onSend(...)` calls with `chat.submitInput(this.inputValue.trim())`.
    - Ensure providers include `provideCopilotChatConfiguration({})` (already present) so submission is handled.
  - apps/angular/storybook/components/custom-input.component.ts
    - Same change as above: remove `@Input() onSend`, inject service, call `submitInput`.

- Fix usage of non-existent `sendButtonTemplate` input on `CopilotChatInputComponent`.
  - apps/angular/storybook/stories/CopilotChatInput.stories.ts
    - Remove `[sendButtonTemplate]` input usage in the default render configuration.
    - Keep and emphasize the content-projection slot example:
      <ng-template #sendButton let-send let-disabled> ... </ng-template>
    - Audit `argTypes` for `sendButtonTemplate`; remove if documented as an input.

Add/Update Examples (Recommended)
- Add a minimal “Custom Input via Component” story using `[inputComponent]` with the service-based submission.
  - New small standalone component:
    - `value = ''`
    - constructor(private chat: CopilotChatConfigurationService) {}
    - `submit() { const v = this.value.trim(); if (!v) return; this.chat.submitInput(v); this.value = ''; }`
  - Story template:
    <copilot-chat-view [messages]="messages" [inputComponent]="CustomInput"></copilot-chat-view>

- Add a “Custom Input via Template” story ONLY if we expose a supported context (e.g., labels or placeholder). Do NOT imply an `onSend` function in the template context.
  - Prefer `[inputComponent]` for custom inputs; if keeping template story, explicitly call a service from within a small component embedded via the template (i.e., the template renders the component, not raw DOM with `onSend`).

- Keep/clarify the send-button slot example on `CopilotChatInputComponent`.
  - Ensure it uses the content-projected slot (`#sendButton`) with `let-send`/`let-disabled` context (this is correct as-is).

Docs Updates
- packages/angular/README.md
  - Add a “Custom Input (Angular)” section showing the service-based pattern.
  - Include minimal example (component + usage in `copilot-chat-view`).
  - Explicitly state: `copilot-chat-view` does not pass an `onSend` callback to custom inputs; use `CopilotChatConfigurationService.submitInput(...)`.
  - Mention the alternative directive approach: `copilotkitChatConfig` with `(submitInput)`/`(changeInput)` for template-level hooks.

- Storybook MDX (Welcome or per-component docs)
  - Note the difference from React: React uses callback props (e.g., `onSubmitMessage`), Angular uses a shared service for cross-component submission.
  - Ensure all Angular code snippets align with the service-based model.

Code Changes – File by File
- apps/angular/storybook/stories/CopilotChatView-Templates.stories.ts
  - Remove: `let-onSend="onSend"` in custom input templates.
  - Remove helper functions expecting `onSend`.
  - Add a local `CustomInput` component (standalone) per story or import a shared one under `apps/angular/storybook/components/` that calls `submitInput`.
  - Replace `[inputTemplate]` usage where it implies `onSend` with `[inputComponent]` using the above component.

- apps/angular/storybook/stories/CopilotChatView-Components.stories.ts
  - Inlined `CustomInputComponent`:
    - Remove `@Input() onSend`.
    - Inject `CopilotChatConfigurationService` and call `submitInput` in `handleSend`.
  - Verify story still renders and sends.

- apps/angular/storybook/components/custom-input.component.ts
  - Same as above: drop `onSend`, use service.
  - Confirm any stories importing this component compile and work.

- apps/angular/storybook/stories/CopilotChatInput.stories.ts
  - Remove `[sendButtonTemplate]` binding from default render.
  - Search and remove any `argTypes` or docs suggesting `sendButtonTemplate` is an @Input.
  - Keep the slot-based custom send button story as canonical.

Searches to Run (sanity)
- Disallow `onSend` in Angular Storybook code:
  - ripgrep: `rg -n "\bonSend\b" apps/angular/storybook`
  - After changes, result list should be empty.
- Disallow `[sendButtonTemplate]` input usage:
  - ripgrep: `rg -n "sendButtonTemplate\s*=\s*\"|\]sendButtonTemplate\]" apps/angular/storybook`

Validation / Acceptance Criteria
- All Angular Storybook stories build and run without errors.
- Stories that previously used `onSend` now successfully send messages (verify visually or via console logs in story handlers).
- No references to `onSend` remain in Angular Storybook.
- No story binds `sendButtonTemplate` as an input on `CopilotChatInputComponent`.
- README and Storybook docs clearly describe the service-based submission pattern.

Future Enhancements (Optional)
- Consider supporting an event-based API for custom input components via `@Output() send = new EventEmitter<string>()` and wiring it internally in the view container. This would allow purely event-driven custom inputs in addition to the service model. If implemented, document it and add a story demonstrating `(send)` wiring.
- Add a CI guard to fail if `onSend` appears in Angular Storybook (`rg` check in a lint script).

Non‑Goals
- No changes to React APIs or docs here (React keeps `onSubmitMessage`).
- No runtime logic changes to the core Angular components unless needed to support the examples.

Checklist
- [ ] Remove `onSend` usage in Templates stories.
- [ ] Replace Templates stories’ custom input with `[inputComponent]` approach.
- [ ] Refactor Components stories’ custom input to call `submitInput`.
- [ ] Update shared `custom-input.component.ts` to service-based submission.
- [ ] Remove `[sendButtonTemplate]` input usage and related argTypes/docs.
- [ ] Add a new “Custom Input via Component” story.
- [ ] Update Angular README with “Custom Input” guidance.
- [ ] Update Storybook MDX/docs to clarify Angular vs React patterns.
- [ ] Run search to confirm `onSend` is gone from Angular stories.
- [ ] Verify all stories render and interaction works.


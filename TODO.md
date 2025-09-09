# Angular TODOs — Remaining Items

## Component Cleanup (Optional)
- [ ] Consider removing explicit `ngOnDestroy` unsubscribe in `CopilotChatComponent` (cleanup is handled via `DestroyRef` inside `watchAgent`). Keep if you prefer immediate teardown semantics.
- [ ] Optional typing cleanup: use `watcher?: ReturnType<typeof watchAgent>` to avoid importing `AgentWatchResult`.

## Verify
- [ ] Run build, lint, and Angular unit tests for the package.
- [ ] Confirm `CopilotChatComponent` connects once and updates `threadId` correctly.

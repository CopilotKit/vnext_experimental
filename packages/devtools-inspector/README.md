# DevTools inspector host

Lit wrapper that mounts the existing `<web-inspector>` element and exposes helpers for the DevTools panel.

- Import `defineDevtoolsInspectorHost` to register `<devtools-inspector-host>`.
- Feed it with extension payloads via `updateFromInit`, `updateFromStatus`, `updateFromAgents`, `updateFromTools`, `updateFromContext`, and `updateFromEvents`.

This package keeps the original `@copilotkitnext/web-inspector` untouched and only provides a thin remote core/agent shim for the DevTools experience.

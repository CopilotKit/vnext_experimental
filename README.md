# CopilotKit vnext_experimental

A modern TypeScript-first copilot framework built with React components and AI agents.

## Development

### Prerequisites

- Node.js 18+
- pnpm 9+

### Setup

```bash
pnpm install
```

### Available Commands

#### Build

```bash
# Build all packages
pnpm turbo run build

# Build specific package
pnpm turbo run build --filter=@copilotkitnext/react
```

#### Development

```bash
# Run tests
pnpm turbo run test

# Run tests in watch mode
pnpm turbo run test:watch

# Type checking
pnpm turbo run check-types

# Linting
pnpm turbo run lint
```

#### Storybook

```bash
# Start Storybook development server
pnpm turbo run storybook:dev --filter=storybook

# Build Storybook for production
pnpm turbo run storybook:build --filter=storybook
```

### Package Structure

- `packages/core` - Core utilities and types
- `packages/react` - React components and hooks
- `packages/runtime` - Server-side runtime handlers
- `packages/shared` - Common utilities
- `apps/storybook` - Component documentation and examples

### Inspector and DevTools packages

- `packages/web-inspector` - Lit-based `<web-inspector>` custom element that attaches to a live `CopilotKitCore` to mirror runtime status, agents, tools, context, and AG-UI events (caps 200 per agent / 500 total). Includes persistence helpers for layout/dock state.
- `packages/devtools-inspector` - Proof-of-concept host that depends on `@copilotkitnext/web-inspector`, registers the element, and injects a remote core/agent shim so streamed data can render inside DevTools.
- `packages/devtools-extension` - Chrome DevTools MV3 extension scaffold (background/content/page scripts, devtools panel) that relays CopilotKit data from the inspected page to the `devtools-inspector` host and renders a “CopilotKit” panel.

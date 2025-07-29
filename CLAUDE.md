# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
# Install dependencies
pnpm install

# Run development mode (watch mode for all packages)
pnpm dev

# Build all packages
pnpm build

# Build specific package
pnpm turbo run build --filter=@copilotkit/react
```

### Testing & Quality
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Type checking
pnpm check-types

# Linting
pnpm lint

# Code formatting
pnpm format
```

### Storybook
```bash
# Start Storybook development server
pnpm storybook

# Build Storybook for production
pnpm build-storybook
```

## Architecture Overview

CopilotKit 2.0 is a TypeScript-first monorepo built with React components and AI agents. The codebase follows a modular workspace architecture managed by Turbo and pnpm.

### Package Structure

- **`packages/core`** - Core utilities, types, and foundational logic
- **`packages/react`** - React components, hooks, and providers for building copilot interfaces
- **`packages/runtime`** - Server-side runtime utilities, handlers, and API endpoints
- **`packages/shared`** - Common utilities shared across packages
- **`packages/eslint-config`** - Shared ESLint configuration
- **`packages/typescript-config`** - TypeScript configuration presets

### Application Structure

- **`apps/demo`** - Next.js demo application showcasing CopilotKit features
- **`apps/docs`** - Documentation site built with Mintlify
- **`apps/storybook`** - Component documentation and interactive examples

## Development Guidelines

### Package Management
- Always use `pnpm` for package management (never use `npm`)
- Add workspace dependencies with `pnpm add -w <pkg>`
- Keep scripts standardized across packages: `build`, `dev`, `lint`, `check-types`, `test`, `test:watch`

### Code Organization
- React components are in `packages/react/src/components/`
- Server-side logic belongs in `packages/runtime/src/`
- Shared utilities go in `packages/shared/src/`
- Tests are located in `src/__tests__/` directories within each package
- Build outputs (`dist/`, `.next/`) are never committed

### Key Technologies
- **TypeScript 5.8.2** for type safety
- **React 18+** for UI components
- **Tailwind CSS** for styling (with custom build process)
- **Vitest** for testing with jsdom environment
- **Turbo** for monorepo task orchestration
- **@ag-ui** for core AI agent functionality

### Testing
- Tests use Vitest with jsdom environment
- React components tested with @testing-library/react
- Runtime code uses Node environment for testing
- Coverage reports available via `test:coverage`

### Build Process
- React package builds both TypeScript and CSS (Tailwind)
- Runtime package compiles TypeScript from `src/` to `dist/`
- Turbo handles dependency ordering and caching
- Development mode supports watch mode across all packages
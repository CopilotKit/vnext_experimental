# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Rules

- NEVER commit or push to the repository unless explicitly asked to
- NEVER credit yourself in commit messages (no "Generated with Claude Code" or similar)

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Run development mode (watch mode for all packages + all Storybook instances)
# This starts everything: package watchers, React Storybook (6006), Angular Storybook (6007)
pnpm dev

# Build all packages
pnpm build

# Build specific package
pnpm turbo run build --filter=@copilotkit/react
```

**Important:** Always use `pnpm dev` to start the development environment. This command:
- Starts all package build watchers in development mode
- Launches React Storybook on port 6006
- Launches Angular Storybook on port 6007
- Enables auto-reload on all file changes
- Runs Tailwind CSS compilation in watch mode

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

### Web Development and UI Testing

- **Always verify UI changes with Playwright MCP when available** - When working on web UI components, especially when matching behavior between frameworks (React/Angular), use Playwright to verify that changes work correctly
- **Don't stop until functionality is confirmed** - Continue working on UI issues until they are fully resolved and verified with Playwright or other testing tools
- **Test interactively** - Use Playwright to interact with components (clicking buttons, scrolling, etc.) to ensure they behave as expected

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

#### Angular Testing Patterns

**Important findings from testing Angular directives and components:**

1. **Dependency Injection Context Issues**
   - Angular's `inject()` function must be called in an injection context
   - Cannot directly instantiate directives/components that use `inject()` in tests
   - Use `TestBed.createComponent()` for testing components with DI dependencies
   - Prefer field initializers over `ngOnInit` for `inject()` calls when possible

2. **Memory Issues with Test Components**
   - Declaring too many Angular components at module level can cause "JavaScript heap out of memory" errors
   - Keep test components minimal and focused
   - Consider declaring simple test components inside test functions (like `CopilotKitAgentContextDirective` tests)
   - If experiencing memory issues, reduce the number of test components or split tests across files

3. **TestBed Configuration**
   - Cannot call `TestBed.configureTestingModule()` multiple times in the same test
   - Components declared with `@Component` decorator can import their own dependencies (directives, etc.)
   - Use `providers: [provideCopilotKit({})]` in TestBed or component decorator for CopilotKit services

4. **Directive Testing Patterns**
   - For directives using field injection (`inject()`), test through host components
   - For directives with constructor injection, can test more directly
   - Follow existing patterns in `copilotkit-agent-context.directive.spec.ts` for reference

### Build Process

- React package builds both TypeScript and CSS (Tailwind)
- Runtime package compiles TypeScript from `src/` to `dist/`
- Turbo handles dependency ordering and caching
- Development mode supports watch mode across all packages

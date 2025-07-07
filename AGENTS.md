# AGENTS.md
> Guidelines for Codex and contributors. Scope: entire repository.

## 🗂️ Repo map
- `packages/` – workspace packages managed with pnpm
  - `eslint-config` – shared ESLint configs
  - `typescript-config` – tsconfig presets (`strict`, `noUncheckedIndexedAccess`)
  - `runtime` – server-side runtime utilities and handlers
  - `shared` – common utilities and types

## 🚀 Quick-start
```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm check-types
pnpm test
```
Use `pnpm format` before committing.

## 🎨 Coding standards
- Use pnpm only; never npm. Add deps via `pnpm add -w` or `pnpm add -F <pkg>`.
- Prettier v3 with repo defaults (`pnpm format`).
- TypeScript: prefer `type` aliases, avoid `any`, single export per `kebab-case.ts`.
- Do not edit `dist/` or `node_modules/`.

## ✅ Testing
- Jest + ts-jest. Tests live under `__tests__/` with `.test.ts` suffix.
- Run all tests with `pnpm test`; coverage via `pnpm test:coverage`.

## 🔀 Pull-request etiquette
- Branch names: `feat/*`, `fix/*`, `chore/*`.
- Commits follow Conventional Commits.
- Keep lockfile committed; no build artefacts.

## 🔒 Sandbox
- Node >=18. Avoid network calls in tests.


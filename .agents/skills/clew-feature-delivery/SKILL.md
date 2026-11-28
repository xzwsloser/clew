---
name: clew-feature-delivery
description: Standardized vertical-slice feature delivery workflow for Clew (spec check, TDD, typecheck/lint/test/build, diff audit, doc sync, Conventional Commit & Push).
---

# Clew Feature Delivery Workflow

1. **Scope & Contract**: Confirm affected layer (`@clew/shared`, `@clew/engine`, or `@clew/dsh-plugin`) and update Zod schemas before implementation.
2. **Test First**: Write failing unit/integration tests in Vitest covering happy path, edge cases, and security boundaries (path traversal, symlink escape, malformed input).
3. **Implement**: Keep functions small and pure where possible; keep `@clew/engine` completely decoupled from DeepSeek Harness (`cordis`).
4. **Gate**: Run `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` and verify zero warnings/errors.
5. **Diff & Doc Sync**: Review `git status` and `git diff --check`, update `PROGRESS.md` / `PLANS.md` / `docs/` if architecture or behavior changed, then commit with Conventional Commits and push to `origin/develop`.

# Contributing to Clew

Thank you for contributing to **Clew** (*Find your way through complex codebases*). Please review [`AGENTS.md`](AGENTS.md) and [`DESIGN.md`](DESIGN.md) before opening a pull request.

## Strict Boundaries
- **Read-Only Only**: Never add code editing, saving, formatting, refactoring, compiling, or script execution on user repositories.
- **No Native Addons**: Keep `@clew/engine` zero-native-build (`web-tree-sitter` WASM + pure JS/TS + `ripgrep`). Do not introduce `node-gyp` native bindings.
- **Reuse DeepSeek Harness**: Use `ctx.agents`, `ctx.tools`, `ctx.skills`, `ctx.storageDomain`, and `ctx.connection` rather than building parallel harnesses or credential stores.

## Local Development Setup
```bash
pnpm install --ignore-scripts
pnpm run build
pnpm run typecheck
pnpm run lint
pnpm run test
```

Notice `.npm-workspace` configuration disables postinstall/build scripts (`--ignore-scripts`) by policy.

## Testing & Verification Expectations
Before committing or opening a PR:
1. Run `pnpm run build && pnpm run typecheck && pnpm run lint && pnpm run test`.
2. Verify `git status` and `git diff --check`.
3. Add regression tests inside `packages/*/tests/` for engine or plugin changes, and keep UI token parity with [`DESIGN.md`](DESIGN.md).
4. Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).

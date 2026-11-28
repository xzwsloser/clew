# ADR-0004: Client Bundle Format, Read-Only Code Reader & Worker Graph Layout

- **Status**: Accepted
- **Date**: 2026-11-28
- **Discussion**: [2026-11-28-host-integration-and-packaging.md](../discussions/2026-11-28-host-integration-and-packaging.md)
- **Architecture Refs**: [ARCHITECTURE.md](../ARCHITECTURE.md), [DESIGN.md](../../DESIGN.md)

## Context
DSH loads browser plugin bundles through `window.__ModuleLoader__.load({ id, factory(require) { ... } })`, forbids external plugins from importing `@deepseek-ai/dsh-client-ui-primitives`, and requires smooth rendering on large files and dense call graphs.

## Decision
1. Use **esbuild** with a custom banner/footer plugin to emit `lib/client.js` as a lazy-CJS factory compatible with `window.__ModuleLoader__`, externalizing DSH's `staticModules` (`react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@deepseek-ai/cordis`, `zod`, `@tanstack/react-virtual`, etc.).
2. Scope all Clew styles under `.clew-root` using `--dsw-alias-*` tokens and `--clew-*` variables; inject styles inside `apply(ctx)` via `ctx.effect` so plugin unload cleanly removes them.
3. Build a virtualized read-only source code reader using `@tanstack/react-virtual` (provided by DSH's `staticModules`) paired with lightweight multi-language tokenization / semantic highlight bands, never allowing edits or target-repo script execution.
4. Run `elkjs` graph layout in a dedicated Web Worker served as a same-origin asset (`ctx.connection.fetch.register` / static route) to avoid blocking the UI thread and stay CSP-safe without `blob:` URLs.

## Consequences
- Zero duplicate React instances, clean plugin mount/unmount lifecycle, and responsive 60fps interaction even on multi-thousand-line files or 100+ node graphs.

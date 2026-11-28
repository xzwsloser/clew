# ADR-0005: Storage Boundary, Incremental Caching & Token Budget Trimming

- **Status**: Accepted
- **Date**: 2026-11-28
- **Discussion**: [2026-11-28-host-integration-and-packaging.md](../discussions/2026-11-28-host-integration-and-packaging.md), [2026-11-28-multilang-indexing-and-graph-engine.md](../discussions/2026-11-28-multilang-indexing-and-graph-engine.md)
- **Architecture Refs**: [ARCHITECTURE.md](../ARCHITECTURE.md)

## Context
Large repositories (e.g., vLLM, Redis, Ripgrep) produce megabytes of symbol tables and AST metadata, while user annotations, saved reading paths, and workspace registries require durable cross-session persistence.

## Decision
1. **Durable Metadata (`ctx.storageDomain`)**: Store workspaces, user preferences, saved reading trails/paths, line-level annotations, trace summaries, and compact index manifests in `ctx.storageDomain` (`defineDomain` + Zod schemas with `invalidRecords: 'backup-and-skip'`).
2. **Disposable Index Cache (Local Disk)**: Store large symbol indices and per-file parse caches in a bounded directory (`$DSH_HOME/cache/clew/` or injected cache root) namespaced by `(repoRoot, gitHead, dirtyFingerprint, parserVersion)`. Validate files via `(mtimeMs, size)` fast-path + SHA-256 content hash and invalidate changed files + reverse importers via `git diff --name-status`. Cache corruption falls back cleanly to re-indexing.
3. **Token Budget Trimmer**: Enforce strict character/token budgets in `@clew/engine` by ranking symbols/spans (query relevance, graph distance, signature priority, excerpt trimming) before passing context to DSH Host Agents. Track files read, cache hits, analysis duration, and host-reported token usage for the Diagnostics panel.

## Consequences
- `ctx.storageDomain` stays lean and fast across restarts.
- Repeated queries reuse cached indices and trace summaries deterministically without re-scanning unchanged files.

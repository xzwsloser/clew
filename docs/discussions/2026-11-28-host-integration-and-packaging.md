# Discussion: DeepSeek Harness Native Integration, Packaging & Storage Boundaries

- **Date**: 2026-11-28
- **Participants**: Antigravity (Lead Architect) ↔ Codex CLI (`gpt-6.2-sol`, Reviewer)
- **Related ADRs**: [ADR-0001](../adr/0001-deepseek-harness-native-integration.md), [ADR-0003](../adr/0003-runtime-skills-and-host-agent-orchestration.md), [ADR-0004](../adr/0004-client-bundle-code-reader-and-worker-graph.md), [ADR-0005](../adr/0005-storage-caching-and-token-budget.md)

## 1. Context
Clew must ship as a first-class DeepSeek Harness (`dsh`) plugin (`@clew/dsh-plugin`) while keeping its core code-understanding engine (`@clew/engine`) 100% host-agnostic and unit-testable outside Cordis/DSH.

## 2. Antigravity Initial Proposal
- Bundle Client UI (`src/client/index.tsx`) into DSH's lazy-CJS `window.__ModuleLoader__.load({ id, factory(require) { ... } })` wrapper, externalizing `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@deepseek-ai/cordis`, `zod`, `@tanstack/react-virtual`, `@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-slots`.
- Use `ctx.connection.rpc.intercept('/api', ...)` + `ctx.connection.fetch.register({ path: '/api/clew/events', ... })` for authenticated IPC & SSE.
- Reuse `ctx.agents`, `ctx.tools`, `ctx.skills`, and `ctx.storageDomain` without building any custom agent loop or LLM gateway.

## 3. Codex CLI Critique & Recommendations (`gpt-6.2-sol`)
1. **Bundling & Web Worker CSP**:
   - Use **esbuild** for the browser client bundle (exact CJS-compatible `window.__ModuleLoader__.load` wrapper, single bundle without uncoordinated chunk splitting, scoped CSS injected with a unique Clew prefix, zero `eval`/`new Function`/blob workers).
   - Keep **tsdown** (or `tsc`) for Host/library packages (`@clew/shared`, `@clew/engine`, Host `lib/index.js`).
   - Emit the ELK graph layout Web Worker as a separate same-origin JS asset served by the Host rather than inline `Blob` URLs to stay CSP-safe.
2. **Agent Streaming & Event Normalization**:
   - Raw DSH `agent/assistant-stream` and `turn/end` events carry risks of duplicate/reordered frames, reconnect replays, cancellation races, and premature graph updates before source verification.
   - Define a versioned, sequence-numbered normalized event protocol in `@clew/shared` (`sessionId`, `turnId`, `seq`, `correlationId`). Make the server adapter idempotent and publish trace nodes only after `@clew/engine` verifies source lines.
3. **Storage Boundary**:
   - `ctx.storageDomain` (Zod-validated) should hold durable, compact user-facing metadata: workspaces, annotations, saved reading paths, preferences, and index manifests.
   - Large symbol indices and parsed AST caches belong in a bounded disposable local disk cache keyed by `(repoRoot, gitHead, dirtyFingerprint, parserVersion)`, with graceful rebuild on miss/corruption.

## 4. Converged Conclusion & Rationale
- **Adopted**:
  - Dual build pipeline: `tsc`/ESM for `@clew/shared` & `@clew/engine` + Host `lib/index.js`, and `esbuild` CJS-factory wrapper for Client `lib/client.js` + separate CSP-safe Worker asset.
  - Sequence-numbered normalized Clew SSE event protocol in `@clew/shared` isolating UI from raw DSH event churn.
  - Strict storage split between `ctx.storageDomain` (durable state) and bounded disk cache (rebuildable indices).
- **Rejected**:
  - Inline `Blob` Web Workers (rejected due to potential strict host CSP) and storing multi-megabyte symbol tables directly inside `ctx.storageDomain` JSON blobs.

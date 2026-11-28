# Discussion: Multi-Language Zero-Config Indexing, Navigation & Evidence Verification

- **Date**: 2026-11-28
- **Participants**: Antigravity (Lead Architect) ↔ Codex CLI (`gpt-6.2-sol`, Reviewer)
- **Related ADR**: [ADR-0002](../adr/0002-zero-native-compile-multilang-indexing.md), [ADR-0005](../adr/0005-storage-caching-and-token-budget.md)

## 1. Context
Clew must deliver zero-config (LSP-free) Go to Definition, Find References, Outline, and verified implementation trace graphs across Python, C, C++, Go, Rust, and TypeScript/JavaScript in Node 26 without `node-gyp` native compilation.

## 2. Antigravity Initial Proposal
- Parse files via `web-tree-sitter@0.26.8` + official per-language `.wasm` grammars (`--ignore-scripts`).
- Rank Go to Definition by `(1) current file lexical scope -> (2) resolved import path -> (3) sibling/same module -> (4) global symbol table`; instant jump on 1 candidate, Peek list on >1.
- Compute Find References via `ripgrep` word-boundary search filtered by Tree-sitter AST node kind (dropping comments/strings/declarations), falling back to raw `ripgrep` when AST is unavailable.
- Build trace graphs with bounded BFS/DFS + Token Budget trimming -> Host Agent (via runtime skills) -> deterministic reverse source-line evidence verifier (`source_verified_call`, `static_dependency`, `inferred_dynamic`, `dataflow`, `unverified`).

## 3. Codex CLI Critique & Suggestions (`gpt-6.2-sol`)
1. **Language-Specific P0 Failure Modes**:
   - *Python*: `importlib`, dynamic `getattr`, aliases, `__all__`, namespace packages. Mitigate by resolving static literals/aliases, honoring `__all__`, and surfacing explicit ambiguous/unresolved states.
   - *C/C++*: include paths, conditional compilation, macros, overloads across translation units. Without `compile_commands.json`, index declarations + include edges conservatively, expose multi-candidate Peek lists, and separate macro expansions from direct calls.
   - *Go*: package-level collisions, dot imports, build tags, `_test.go` packages. Index package identity + build context and prefer qualified resolution.
   - *Rust*: traits, blanket `impl`s, macros, `cfg` features. Resolve explicit paths and `impl` blocks, surfacing trait/impl candidates with feature context.
   - *TS/JS*: `export *`, aliased re-exports, `tsconfig` paths, `.d.ts`, CJS interop. Traverse re-export chains with depth/cycle caps while preserving original export paths.
   - Preserve declaration and import references as distinct reference kinds; degrade conservatively to `ripgrep` if parsing fails.
2. **Deterministic Reverse Evidence Verifier**:
   - Operate against an immutable snapshot `(repoRoot, gitHead, dirtyFingerprint)`.
   - Store canonical path, line/span, symbol ID, and content hash per edge.
   - Re-resolve callee from caller AST + symbol/import index; emit `source_verified_call` **only** on unique syntactic resolution. Never upgrade edge confidence solely from LLM prose.
3. **Incremental Indexing & Cache Invalidation**:
   - Namespace cache by `(repoRoot, gitHead, parserVersion, resolverConfig)`.
   - Track per-file `(path, mtimeMs, size, contentHash)` and use `git diff --name-status` to invalidate changed files + reverse importers eagerly while keeping untouched subtrees lazy.
   - Maintain a separate dirty-worktree fingerprint to avoid stale cross-branch hits.

## 4. Converged Conclusion & Rationale
- **Adopted**:
  - Added distinct reference kinds (`call`, `reference`, `import`, `declaration`) and bounded re-export/alias resolution with cycle guards.
  - Strictly restricted `source_verified_call` to AST-verified call-site + target resolution on immutable file hashes; ambiguous/macro/dynamic edges stay `inferred_dynamic` or `static_dependency`, and unconfirmed LLM edges stay `unverified`.
  - Adopted `(repoRoot, gitHead, dirtyFingerprint, parserVersion)` cache keys with `mtimeMs/size` fast-path + SHA-256 content verification and reverse-importer invalidation.
- **Deferred (to P1/P2)**:
  - Full C/C++ preprocessor macro expansion and optional `compile_commands.json` / LSP (`clangd`, `gopls`, `pyright`) augmentation remain P2 so P0 stays 100% zero-config.

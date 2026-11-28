# ADR-0002: Zero-Native-Compile Multi-Language Indexing & Navigation

- **Status**: Accepted
- **Date**: 2026-11-28
- **Discussion**: [2026-11-28-multilang-indexing-and-graph-engine.md](../discussions/2026-11-28-multilang-indexing-and-graph-engine.md)
- **Architecture Refs**: [ARCHITECTURE.md](../ARCHITECTURE.md)

## Context
Clew must work out-of-the-box on Python, C, C++, Go, Rust, TypeScript, and JavaScript repositories on Node.js 26+ without requiring `node-gyp` native builds or external LSP servers.

## Decision
1. Use `web-tree-sitter@0.26.8` paired with official prebuilt `.wasm` grammar packages (`tree-sitter-python@0.25.0`, `tree-sitter-c@0.24.1`, `tree-sitter-cpp@0.23.4`, `tree-sitter-go@0.25.0`, `tree-sitter-rust@0.24.0`, `tree-sitter-typescript@0.23.2`, `tree-sitter-javascript@0.25.0`), verified to install and load with `--ignore-scripts`.
2. Implement a pluggable `LanguageParser` registry with `ripgrep` (`rg`) word-boundary + text fallback for any unparsed or unsupported language.
3. Implement LSP-free Go to Definition using 4-tier candidate ranking (`lexical_scope -> resolved_import -> sibling_module -> global`) with cycle-bounded re-export/alias traversal, and Find References via `rg` filtered by Tree-sitter AST node classification (`call`, `reference`, `import`, `declaration`).
4. Enforce deterministic reverse source-line verification on immutable content hashes so only AST-verified call-sites earn `source_verified_call`.

## Consequences
- Zero native C++ toolchain dependency during plugin installation (`pnpm add` / `dsh plugin add`).
- Fast graceful degradation on macro-heavy C/C++ or dynamic Python code, explicitly surfacing multi-candidate Peek lists and confidence levels rather than fabricating certainty.

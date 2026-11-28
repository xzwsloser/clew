# Changelog

All notable changes to **Clew** will be documented in this file.

The format adheres to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Conventional Commits](https://www.conventionalcommits.org/).

## [0.1.0] - 2026-11-28

### Added
- **Shared Contracts & Security Guard (`@clew/shared`)**:
  - Browser-safe Zod schemas (`@clew/shared/contracts`), typed `ClewError` codes, and canonical path traversal + symlink escape prevention (`resolveSafeRepoPath`).
- **Multi-Language Zero-Native Engine (`@clew/engine`)**:
  - Safe repository scanner respecting `.gitignore` / `.clewignore` with binary, lockfile, and huge-file protections (`readFileSpan`).
  - `web-tree-sitter@0.26.8` WASM parsers for Python, C, C++, Go, Rust, TypeScript, TSX, and JavaScript plus regex fallback.
  - SHA-256 incremental disk symbol cache, 4-tier zero-LSP Go-to-Definition ranking, AST-filtered `ripgrep` Find References, repository overview with noise-filtered entry points, bounded subgraph retrieval, token-budget trimmer, and reverse AST evidence verifier.
  - **P1 Enhancements**: `peekSymbolPreview` for data-structure inspection and read-only `readLineGitContext` (`git log -L`).
- **DeepSeek Harness Native Plugin (`@clew/dsh-plugin`)**:
  - Host integration via `ctx.storageDomain` (`repos`, `annotations`, `paths`, `statuses`), `ctx.connection.fetch` (`/api/clew/rpc`, `/api/clew/events`, `/api/clew/elk-worker.js`), `ctx.tools` (7 deterministic tools), `ctx.skills` (4 runtime skills), and optional `ctx.agents` Cordis injection.
  - 3-column workbench UI (`sidebar.panellist` + `main` slots) featuring Web Worker ELK trace graph, virtualized multi-tab read-only code reader, `Cmd+P` palette, `Cmd+Shift+F` ripgrep search, Exploration Trail + persistent Reading Paths, anchored Line Annotations, Dual-Pane Split Compare, Structure Peek Card, Git Line History, File Reading Status tags, bilingual `EN`/`ZH` support, and Light/Dark DSH theme integration.
- **Documentation, Validation & Homepage**:
  - Architecture & Design specs with Mermaid diagrams (`docs/ARCHITECTURE.md`, `DESIGN.md`), 5 ADRs, multi-language real OSS validation report (`ripgrep`, `gin`, `llama.cpp`), 2-round visual/UX review (`docs/UI-REVIEW.md`), and GitHub Pages static homepage (`website/`).

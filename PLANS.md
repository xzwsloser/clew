# PLANS.md — Clew Execution Plan & Milestones

| Milestone | Scope | Key Deliverables | Status |
|---|---|---|---|
| **M0** | Repository Init & Engineering Baseline | Git repo (`main`/`develop`), `AGENTS.md`, `GOALS.md`, `PLANS.md`, `PROGRESS.md`, `docs/TESTING.md` | `done` |
| **M1** | AI Tooling Probe & Zero-Native Deps | `docs/AI-TOOLING.md`, `.agents/skills/`, Codex CLI & image-gen probe, `web-tree-sitter` & DSH SDK verification | `done` |
| **M2** | Brand Assets, Design & Architecture | `assets/brand/`, `assets/design/`, `docs/discussions/*`, `docs/adr/*`, `DESIGN.md`, `docs/ARCHITECTURE.md` (with Mermaid) | `done` |
| **M3** | Monorepo & Minimal Native DSH Plugin | `pnpm` workspace, CI, `@clew/shared`, `@clew/engine` skeleton, `@clew/dsh-plugin` verified in `dsh web` | `done` |
| **M4** | Multi-Language Engine & Runtime Skills | Scanner, WASM Tree-sitter parsers, symbol index, Go-to-Def/Find-Refs, overview, jobs, graph retrieval, evidence verifier, runtime skills | `done` |
| **M5** | Core Interactive Workbench UI | 3-column layout, Worker ELK graph, virtualized read-only reader, command palette, global search, exploration trail, Ask AI | `done` |
| **M6** | Annotations, Caching & Diagnostics | Line-level annotations, path persistence, token budget & cache reuse, incremental indexing base, diagnostics view | `done` |
| **M7** | Real Multi-Language E2E Validation | E2E validation across >=2 real OSS repos (Python/C++ + Go/Rust/C), pinned SHAs, bug fixes, `docs/validation/` | `done` |
| **M8** | Polish, Visual Review & High-Value P1 | Two-round Impeccable + browser review (`docs/UI-REVIEW.md`), accessibility/perf/security audits, selected P1 features | `done` |
| **M9** | Release & GitHub Pages Homepage | Full test suite, clean install/uninstall test, bilingual `README`, `CHANGELOG.md`, `docs/release/`, `website/` + Pages workflow | `done` |

# PROGRESS.md — Session Recovery & Live Status

- **Current Version**: `0.0.1-dev`
- **Active Milestone**: `M4 — Multi-Language Engine & Runtime Skills`
- **Active Branch**: `develop`
- **Last Stable Commit**: `M3 verified minimal native DSH plugin`

## Completed
- Verified workspace `/home/xzw/projects/clew` is clean and empty.
- Verified GitHub SSH access (`xzwsloser`) and empty remote `git@github.com:xzwsloser/clew.git`.
- Probed DeepSeek Harness (`@deepseek-ai/dsh@0.2.1-rc.5`) and Codex CLI (`0.172.0`).
- **M0**: Initialized Git repo (`main` + `develop`), pushed baseline governance docs.
- **M1**: Verified `codex exec` (`gpt-6.2-sol`), installed project skills in `.agents/skills/`, confirmed `web-tree-sitter@0.26.8` + official per-language `.wasm` packages load all 7 P0 languages cleanly with `--ignore-scripts`, and verified DSH `staticModules` & plugin APIs (`docs/AI-TOOLING.md`).
- **M2**: Generated original Clew brand assets (`assets/brand/`), workbench concept (`assets/design/workbench-concept.png`) & landing wireframe (`assets/design/landing-concept.svg`), completed 2 Codex CLI architecture reviews (`docs/discussions/`), authored 5 ADRs (`docs/adr/0001..0005`), `DESIGN.md`, and `docs/ARCHITECTURE.md` (with 4 Mermaid diagrams).
- **M3**: Scaffolded `pnpm` monorepo + CI (`.github/workflows/ci.yml`), `@clew/shared` (browser-safe `./contracts` + Node path/symlink guard), `@clew/engine` skeleton (`language-detector` + `searchWithRipgrep`), and `@clew/dsh-plugin` (`ctx.storageDomain`, `ctx.tools`, `ctx.skills`, `/api/clew/rpc`, `/api/clew/events` SSE, `sidebar.panellist` + `main` slots). Verified end-to-end inside isolated `dsh web` via real browser (`Clew` sidebar & panel rendered, RPC 200, SSE seq 0->1, `persistedPings` 1->2, `ctx.agents` live probe, 0 console/HTTP errors).

## In Progress
- M4: Implementing the full multi-language code understanding engine (`scanner`, WASM Tree-sitter parsers, incremental symbol index, zero-config navigation, overview, subgraph retrieval, token budget trimmer, evidence verifier) and Clew runtime skills.

## Latest Test Results
- `pnpm run build && pnpm run typecheck && pnpm run lint && pnpm run test`: 3 test files, 5 tests passing (`@clew/shared`, `@clew/engine`, `@clew/dsh-plugin`).
- Isolated `dsh web` browser verification: HTTP 200 across all 44 requests, 0 console errors, live RPC + SSE + `ctx.storageDomain` + `ctx.agents` verified.

## Blockers & Technical Debt
- None.

## Next Actions
1. M4.1: Extend `@clew/shared` contracts and implement `@clew/engine` repository scanner, Git metadata reader, and safe file span reader.
2. M4.2: Implement WASM Tree-sitter parsers (Python, C, C++, Go, Rust, TS/TSX, JS) + fallback extractor + incremental disk cache.
3. M4.3–M4.5: Implement zero-config navigation, overview/subgraph/evidence verifier, and wire full Host services & runtime skills.

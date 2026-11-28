# PROGRESS.md — Session Recovery & Live Status

- **Current Version**: `0.1.0`
- **Active Milestone**: `M9 Complete — Release v0.1.0 Ready`
- **Active Branch**: `main` / `develop`
- **Last Stable Commit**: `Clew v0.1.0 P0 + P1 release`

## Completed
- Verified workspace `/home/xzw/projects/clew` is clean and empty.
- Verified GitHub SSH access (`xzwsloser`) and empty remote `git@github.com:xzwsloser/clew.git`.
- Probed DeepSeek Harness (`@deepseek-ai/dsh@0.2.1-rc.5`) and Codex CLI (`0.172.0`).
- **M0**: Initialized Git repo (`main` + `develop`), pushed baseline governance docs.
- **M1**: Verified `codex exec` (`gpt-6.2-sol`), installed project skills in `.agents/skills/`, confirmed `web-tree-sitter@0.26.8` + official per-language `.wasm` packages load all 7 P0 languages cleanly with `--ignore-scripts`, and verified DSH `staticModules` & plugin APIs (`docs/AI-TOOLING.md`).
- **M2**: Generated original Clew brand assets (`assets/brand/`), workbench concept (`assets/design/workbench-concept.png`) & landing wireframe (`assets/design/landing-concept.svg`), completed 2 Codex CLI architecture reviews (`docs/discussions/`), authored 5 ADRs (`docs/adr/0001..0005`), `DESIGN.md`, and `docs/ARCHITECTURE.md` (with 4 Mermaid diagrams).
- **M3**: Scaffolded `pnpm` monorepo + CI (`.github/workflows/ci.yml`), `@clew/shared` (browser-safe `./contracts` + Node path/symlink guard), `@clew/engine` skeleton (`language-detector` + `searchWithRipgrep`), and `@clew/dsh-plugin` (`ctx.storageDomain`, `ctx.tools`, `ctx.skills`, `/api/clew/rpc`, `/api/clew/events` SSE, `sidebar.panellist` + `main` slots). Verified end-to-end inside isolated `dsh web` via real browser (`Clew` sidebar & panel rendered, RPC 200, SSE seq 0->1, `persistedPings` 1->2, `ctx.agents` live probe, 0 console/HTTP errors).

- **M4**: Delivered complete host-agnostic `@clew/engine` (scanner with `.gitignore`/`.clewignore`/binary/symlink guards, Git metadata reader, WASM Tree-sitter parsers for Python/C/C++/Go/Rust/TS/TSX/JS + regex fallback, incremental disk cache, 4-tier Go-to-Definition, AST-filtered Find References, overview, bounded subgraph retrieval, token budget trimmer, reverse evidence verifier) and wired `@clew/dsh-plugin` application services, job queue, 7 deterministic tools, 4 runtime skills, and full `/api/clew/rpc` + SSE endpoints.
- **M5 & M6**: Built full 3-column Clew Workbench UI (Web Worker `elkjs` graph canvas with edge confidence filters & zoom/pan, `@tanstack/react-virtual` read-only code reader with XSS-safe multi-language highlighting, outline, Back/Forward history, selection floating toolbar, `Cmd+P` palette, `Cmd+Shift+F` ripgrep search, live Exploration Trail + saved reading paths, line annotations with anchor revalidation, Ask AI with clickable citations, Diagnostics & cache controls, and full EN/ZH dictionaries). Verified live end-to-end inside isolated `dsh web` (`18766`) via real browser (`20` nodes / `30` edges ELK graph, node->code sync, `Ask AI` citations, `Cmd+P`, `Cmd+Shift+F`, Exploration Trail -> Save Reading Path -> page reload persistence, Diagnostics telemetry, `0` console/HTTP 4xx/5xx errors).

- **M7**: Completed multi-language real OSS E2E validation (`docs/validation/E2E-REPORT.md`) across `ripgrep` (`3e85c6c148`, Rust, 221 files, 4,116 symbols), `gin` (`eb4d4b52e5`, Go, 129 files, 1,643 symbols), and `llama.cpp` (`8e23278c7c`, C++/C/Python/TS/JS, 4,737 files, 48,952 symbols) — verifying 5.7x–7.6x warm disk-cache speedup, AST-filtered references, verified trace graphs, restart recovery, and live `dsh web` browser flows with 0 console/HTTP errors. Fixed entry-point / core-module tour noise filtering in `overview.ts` + stale `symbolPick` reset in `CodeReader.tsx`.

- **M8**: Implemented P1 features (`nav/peek` Symbol Peek Card, read-only `git/line-context` commit history integrated into Evidence & Ask AI, Dual-Pane Split Compare & persisted Reading Status tags in `statuses` KV table) with regression tests; completed Round 1 & Round 2 real browser visual reviews across `1280×800`, `1440×900`, `1920×1080`, Dark/Light, EN/ZH; saved verified real screenshots to `docs/screenshots/` and documented fixes + a11y/perf/security audits in `docs/UI-REVIEW.md`.

- **M9**: Passed clean-environment `dsh plugin add` / `list` / `dsh web` / `remove` lifecycle test; authored bilingual `README.md` & `README.zh-CN.md` (with real screenshots), `CHANGELOG.md`, `CONTRIBUTING.md`, `docs/release/DSH-PLUGIN-SUBMISSION.md`; synced `DESIGN.md` & `docs/ARCHITECTURE.md`; built and visually verified GitHub Pages static homepage (`website/` + `.github/workflows/pages.yml`) at desktop (`1440×900`) and mobile (`390×844`) across Dark/Light & EN/ZH (`0` console/HTTP errors, `0` horizontal overflow).

## In Progress
- None (`v0.1.0` shipped).

## Latest Test Results
- `pnpm run build && pnpm run typecheck && pnpm run lint && pnpm run test`: 8 test files, 14 tests passing (`@clew/shared`, `@clew/engine`, `@clew/dsh-plugin`).
- Real OSS E2E Validation (`ripgrep`, `gin`, `llama.cpp`): 100% warm cache hit reuse, 0 console/HTTP errors.
- Round 2 Workbench & Website Browser Verifications: 0 console errors, 0 HTTP 4xx/5xx responses.

## Blockers & Technical Debt
- None.

## Next Actions
1. Maintain `v0.1.0` on `main` and iterate P2 features (optional local LSP augmentation, multi-repo linking) on `develop`.

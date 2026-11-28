# Clew M7 Multi-Language Real OSS E2E Validation Report

> Verified against three real open-source repositories across **Rust, Go, C++, C, Python, TypeScript, and JavaScript** under Node `v26.13.1` + `web-tree-sitter@0.26.8` (zero native `node-gyp` addons) and live inside DeepSeek Harness (`dsh web`).

---

## 1. Validated Repositories & Pinned Snapshots

| Repository | Language Stack | Git URL | Branch | Pinned Commit SHA | Indexed Files | Extracted Symbols |
|---|---|---|---|---|---:|---:|
| **ripgrep** | Rust (`Cargo`) | `https://github.com/BurntSushi/ripgrep.git` | `master` | `3e85c6c148fdce38a99ceeb9d2780dc7b03b4a4f` | 221 (`105` Rust) | 4,116 |
| **gin** | Go (`Go Modules`, `Make`) | `https://github.com/gin-gonic/gin.git` | `master` | `eb4d4b52e5a0cf794e915ac2a62f0b0e3c631fa8` | 129 (`99` Go) | 1,643 |
| **llama.cpp** | C++, C, Python, TS, JS (`CMake`, `Make`, `pyproject.toml`, `Node`) | `https://github.com/ggml-org/llama.cpp.git` | `master` | `8e23278c7c36f4429fb237467d50e2935a91e655` | 4,737 (`897` C++, `742` TS, `467` C, `272` Py, `25` JS) | 48,952 |

> Validation clones reside strictly outside the Clew repository under `/tmp/clew-validation-repos/` and are never executed (`core.hooksPath=/dev/null`, read-only inspection only).

---

## 2. Indexing Speed, Disk Cache Reuse & Navigation Metrics

Measured via the standalone Node E2E harness over `@clew/engine` (`lib/index.js`):

| Metric | `ripgrep` | `gin` | `llama.cpp` |
|---|---:|---:|---:|
| **Cold Index Build** | `2,613 ms` (`221/221` parsed) | `1,225 ms` (`129/129` parsed) | `44,577 ms` (`4,737/4,737` parsed) |
| **Warm Cache Re-Index** | `458 ms` (`221/221` reused, `0` reparsed) | `162 ms` (`129/129` reused, `0` reparsed) | `7,590 ms` (`4,737/4,737` reused, `0` reparsed) |
| **Cache Speedup** | `~5.7x` (`7.19 MB` cache) | `~7.6x` (`3.19 MB` cache) | `~5.9x` (`120.17 MB` cache) |
| **Detected Top Entry Point** | `crates/core/main.rs:43` (`main`) | `gin.go:691` (`ServeHTTP`) | `tools/batched-bench/main.cpp:3` (`main`) |
| **Go-to-Definition Query** | `Searcher` -> `jump` (`crates/searcher/src/searcher/mod.rs:612`) | `Engine` -> `jump` (`gin.go:99`) | `llama_decode` -> `jump` (`src/llama-context.cpp:5084`) |
| **Find References (AST-Filtered)** | `19` hits (`8` AST-filtered) | `16` hits (`9` AST-filtered) | `3` hits (`2` AST-filtered) |
| **Global Search (`ripgrep`)** | `SearcherBuilder` -> `20` hits | `HandlersChain` -> `20` hits | `llama_kv_cache` -> `20` hits |
| **Trace Subgraph** | `search_reader`: `24` nodes, `53` edges (`28` `source_verified_call`, `25` `inferred_dynamic`) | `ServeHTTP`: `24` nodes, `29` edges (`4` `source_verified_call`, `25` `inferred_dynamic`) | `llama_decode`: `24` nodes, `28` edges (`7` `source_verified_call`, `21` `inferred_dynamic`) |

---

## 3. Host Persistence & Restart Recovery Verification

Verified across two lifecycle modes:

1. **Disk-Backed KV Store Restart Simulation (`@clew/dsh-plugin` on `gin`)**:
   - First trace (`ServeHTTP`): `cacheHit = false`; immediate repeat trace: `cacheHit = true`.
   - Created line annotation and saved reading path `"Gin E2E Request Lifecycle"`.
   - Disposed plugin context and re-initialized fresh `apply(ctx)` against the persisted KV JSON state:
     - `reposCount = 1`, `annotationsCount = 1`, `annStatusAfterRevalidate = "open"`, `pathsCount = 1`, `savedPathTitle = "Gin E2E Request Lifecycle"`.

2. **Live Isolated `dsh web` Browser E2E (`http://127.0.0.1:18767/`)**:
   - Imported **`ripgrep`** and **`gin`** directly through the Workbench Import dialog.
   - Verified Overview language percentages, Cargo / Go Modules detection, and clean entry points (`crates/core/main.rs:43`, `gin.go:691`).
   - Executed live ELK Trace graphs (`search_reader`: `20` nodes, `44` edges, `25 source_verified_call`, `376ms`; `ServeHTTP`: `20` nodes, `25` edges, `3 source_verified_call`, `178ms`).
   - Verified node-to-code sync, Go-to-Definition Peek candidate selection (`BinaryDetection`), Find References (`struct`, `143` hits), line annotation creation, and saved Reading Path `"Gin ServeHTTP Path (6)"`.
   - Reloaded full browser page (`page.reload()`) and reopened Clew: confirmed both repos, `Notes (1)`, and `Saved Reading Paths (1)` restored cleanly with **`0` console errors** and **`0` HTTP `4xx`/`5xx` responses across `50` requests**.

---

## 4. Defects Discovered & Fixed During Real OSS Validation

| Defect Found During OSS Validation | Root Cause | Fix & Regression Verification |
|---|---|---|
| CI YAML workflows (`.github/workflows/server.yml` in `llama.cpp`) & test files (`binding/json_test.go`, `benchsuite`) ranked ahead of real source entry points | `overview.ts` checked filenames and `init` symbols without filtering `language === 'text'` or test/CI directories | Filtered non-code (`text`) files and `.github/`, `tests/`, `bench*`, `_test.*` paths in `packages/engine/src/overview.ts`; prioritized `main`/`ServeHTTP` over `init` (`packages/engine/tests/graph-verifier.test.ts` updated) |
| `Recommended Paths -> Core Modules Tour` in `ripgrep` picked `raw.csv` / `.gitignore` / `README.md` | `moduleSteps` took the first `index.files.find(...)` in a module without preferring parsed source files | Updated `packages/engine/src/overview.ts` to prefer non-`text`, non-test source files inside each core module (regression check added to `graph-verifier.test.ts`) |
| Switching tabs/repos in `CodeReader` retained previous `Symbol...` filter text (seen switching `ripgrep` -> `gin`) | `symbolPick` React state inside `packages/plugin/src/client/components/CodeReader.tsx` did not reset when `activeTab?.file` changed | Added `useEffect` reset on `activeTab?.file` change in `CodeReader.tsx` |

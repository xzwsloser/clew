# DeepSeek Harness (`dsh`) Plugin Submission Package — Clew (`@clew/dsh-plugin`)

## 1. Plugin Identity
- **Package Name**: `@clew/dsh-plugin`
- **Version**: `0.1.0`
- **Display Name**: `Clew` / `Clew 源码线索工作台`
- **Repository**: `https://github.com/xzwsloser/clew`
- **Homepage**: `https://xzwsloser.github.io/clew/`
- **License**: `MIT` ([`LICENSE`](../../LICENSE))

## 2. Manifest & DSH Extension Surfaces
- **Host Entry**: `./lib/index.js`
- **Client Entry**: `./lib/client.js` (zero `workspace:*` runtime dependencies; external shared peer packages bundled or resolved via DSH `staticModules`)
- **UI Slots**:
  - `sidebar.panellist` (`id: "clew"`, SVG icon mark)
  - `main` (`key: "clew"`, scoped CSS injected cleanly on mount and removed on dispose)
- **Locales**: `en`, `zh` flattened dictionary namespaces registered under `ctx.locale.register('clew', ...)`
- **Storage Domain (`ctx.storageDomain.open({ name: 'clew', version: 1 })`)**:
  - Tables: `repos`, `annotations`, `paths`, `statuses` (strict Zod schema validation, `invalidRecords: 'backup-and-skip'`)
- **HTTP / IPC Endpoints (`ctx.connection.fetch.register`)**:
  - `POST /api/clew/rpc` (JSON RPC envelope for repo/nav/trace/qa/annotations/paths/status/diagnostics)
  - `GET /api/clew/events` (SSE stream emitting heartbeats & real job stage events)
  - `GET /api/clew/elk-worker.js` (same-origin module Web Worker bundle for CSP safety)
- **Tools (`ctx.tools.register`) — 7 Read-Only Tools**:
  - `clew_health`, `clew_list_repos`, `clew_repo_overview`, `clew_read_span`, `clew_find_definition`, `clew_find_references`, `clew_trace_goal`
- **Runtime Skills (`ctx.skills.register`) — 4 Reading Workflows**:
  - `clew-repo-onboard`, `clew-trace-implementation`, `clew-qa-explain`, `clew-annotate-anchor`

## 3. Compatibility & Verification Summary
- Verified on `@deepseek-ai/dsh@0.2.1-rc.5` and Node `v26.13.1` (Linux).
- Clean-environment `dsh plugin --profile web add` / `list` / `dsh web` boot / `remove` lifecycle tested with zero errors.
- Zero native `node-gyp` build dependencies (`web-tree-sitter@0.26.8` + official per-language `.wasm` grammars).

## 4. Security, Privacy & Read-Only Guarantee
- Clew operates strictly in **read-only mode**: no file writes, deletes, builds, or scripts are ever executed inside imported user repositories (`core.hooksPath=/dev/null`).
- All file paths resolve through `resolveSafeRepoPath` blocking directory traversal and symlink escapes out of repository root.
- Repository source text passed to optional DSH agents (`ctx.agents`) is explicitly delimited as `<untrusted_source>` and never treated as authoritative without AST/source verification.

# AI-TOOLING.md — Development Toolchain, Multi-Model & Skills Inventory

> Recorded in **M1** from live environment probes on `2026-11-28`.

## 1. Multi-Model & Image Generation Capabilities

| Tool | Location / Mechanism | Probe Status | Role in Clew |
|---|---|---|---|
| **Antigravity** (Primary Architect & Builder) | Built-in execution & planning environment | Verified active | Primary design, implementation, testing, browser & artifact management |
| **Codex CLI** (`codex-cli 0.172.0`) | `/home/xzw/.local/bin/codex` (`codex exec --skip-git-repo-check -s read-only`) | Verified (`gpt-6.2-sol`, returned valid JSON response) | Architecture review, adversarial design critique, algorithm & security second opinion; discussions logged under `docs/discussions/` |
| **Image Generator** (Nano Banana) | Antigravity built-in `image-generator` subagent | Verified (`clew-brand-concept.png` + `workbench-concept.png` generated; 3rd image hit `RESOURCE_EXHAUSTED` 429 quota, covered by handcrafted vector `landing-concept.svg`) | Original brand icon exploration & design-phase concept mockups (`assets/brand/`, `assets/design/`) |
| **Browser & Playwright** | Antigravity `browser` subagent + `/usr/bin/google-chrome-stable` + `~/.cache/ms-playwright/chromium_headless_shell-1223` | Verified installed | Multi-viewport visual review (`1280x800`, `1440x900`, `1920x1080`) & E2E verification |

## 2. Project-Level Development Skills (`.agents/skills/`)
Installed strictly at project scope (`.agents/skills/`) and separated from Clew's DeepSeek Harness **runtime skills**:

| Skill | Source | Purpose |
|---|---|---|
| `test-driven-development` | `obra/superpowers` | Test-first discipline for `@clew/shared` & `@clew/engine` |
| `systematic-debugging` | `obra/superpowers` | Root-cause diagnosis before patching |
| `verification-before-completion` | `obra/superpowers` | Evidence-before-assertions gate prior to commits |
| `architecture-patterns` | `wshobson/agents` | Hexagonal layering & clean boundary enforcement |
| `api-design-principles` | `wshobson/agents` | Explicit RPC/SSE & contract ergonomics |
| `impeccable` | `pbakaus/impeccable` | Visual polish, anti-AI-slop audit & multi-round UI critique |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | Typography, density, contrast & component UX reference |
| `design`, `design-system`, `brand`, `ui-styling` | Installed by `ui-ux-pro-max-cli` | Design token, brand & Tailwind/CSS guidelines consolidated into `DESIGN.md` |
| `clew-feature-delivery` | Custom project skill | Vertical-slice delivery checklist (Zod -> TDD -> Gate -> Commit/Push) |
| `clew-ui-review` | Custom project skill | Clew-specific viewport, theme & bilingual UI review protocol |

> Note: Unrelated marketing templates (`slides`, `banner-design`) installed by generic CLI scaffolding were removed to keep `.agents/skills/` focused.

## 3. DeepSeek Harness Host & Zero-Native Dependency Verification

### 3.1 DeepSeek Harness (`@deepseek-ai/dsh@0.2.1-rc.5`)
- Installed globally at `/home/xzw/.npm-global/lib/node_modules/@deepseek-ai/dsh`.
- Official extension docs reviewed: `cordis-plugin-development`, `dsh-package-manifest`, `dsh-client-modules`, `dsh-client-ui-layout`, `dsh-client-ui-sidebar`, `dsh-client-connection`, `dsh-storage`, `dsh-tools`, `dsh-skill`, `dsh-agent`.
- **Browser `staticModules` seed table** (verified in `dsh-web-frontend/dist/assets/index-BXV-oxvX.js`):
  - `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, `@deepseek-ai/cordis`, `zod`, `@tanstack/react-virtual`, `@deepseek-ai/dsh-client-store`, `@deepseek-ai/dsh-client-ui-slots`, `@deepseek-ai/dsh-client-ui-primitives` *(prohibited for external plugins per `practices.md`)*, `@deepseek-ai/dsh-client-ui-dockkit`.
- **Host Integration Seams**:
  - Bundle manifest (`dsh.manifestVersion: 1`, `dsh.bundle.patch`, `dsh.client`, `./locale/*.json`, `./icon`).
  - Browser module format: `window.__ModuleLoader__.load({ id, factory(require) { ... } })`.
  - Authenticated RPC & SSE: `ctx.connection.rpc.intercept('/api', ...)` + `ctx.connection.fetch.register({ path: '/api/clew/...', ... })` + client `ctx.connection.rpc.call('/api', ...)`.
  - Persistence: `ctx.storageDomain.open(defineDomain(...))`.
  - Tools & Runtime Skills: `ctx.tools.register(defineTool(...))` + `ctx.skills.register(...)`.
  - Agent Orchestration: `ctx.agents.create(...)`, `followup()`, `agent/assistant-stream`, `turn/end`.

### 3.2 Zero-Native Multi-Language Parsing & Rendering Probe (Node.js v26.13.1)
- **Important Compatibility Finding**: `tree-sitter-wasms@0.1.13` fails `getDylinkMetadata` under `web-tree-sitter@0.27.2`.
- **Verified Working Stack (`--ignore-scripts`, zero `node-gyp`)**:
  - `web-tree-sitter@0.26.8` + official per-language packages shipping prebuilt `.wasm` files:
    - `tree-sitter-python@0.25.0` (ABI 15) — verified
    - `tree-sitter-c@0.24.1` (ABI 15) — verified
    - `tree-sitter-cpp@0.23.4` (ABI 14) — verified
    - `tree-sitter-go@0.25.0` (ABI 15) — verified
    - `tree-sitter-rust@0.24.0` (ABI 14) — verified
    - `tree-sitter-typescript@0.23.2` (`typescript` + `tsx`, ABI 14) — verified
    - `tree-sitter-javascript@0.25.0` (ABI 15) — verified
- **Search / Layout / Highlighting**:
  - Local `ripgrep 15.2.0` (`/usr/bin/rg`) for fast word-boundary & global regex search.
  - `elkjs@0.12.2` (Web Worker layout) & `shiki@4.6.0` / lightweight client highlighter (evaluated in M2/M3).

## 4. Clew Runtime Skills (Planned for M3–M4)
Strictly separated from `.agents/skills/`, Clew's runtime skills are registered into DSH `ctx.skills` for the Host Agent:
- `clew-repository-overview` (M4)
- `clew-implementation-trace` (M4)
- `clew-code-explanation` (M4)
- `clew-dataflow-summary` (M4)
- Minimal bootstrap `clew-source-analysis` verified in M3.

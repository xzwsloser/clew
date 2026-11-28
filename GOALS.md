# GOALS.md — Clew Product Vision, Scope & Acceptance Criteria

> **Clew** — *Find your way through complex codebases.* / *循着线索，读懂复杂源码。*

## 1. Product Vision
An interactive, AI-agent-driven source code reading & understanding workbench distributed as a native **DeepSeek Harness (`dsh`)** plugin. Clew turns opaque multi-language repositories into verifiable implementation traces, zero-config navigation, interactive call/dependency graphs, context-aware explanations, and persistent reading notes—without requiring LSP setup or modifying a single line of user source code.

## 2. Target Users
- Systems, infrastructure, AI/ML, and application engineers onboarding onto unfamiliar multi-language codebases (Python, C, C++, Go, Rust, TypeScript/JavaScript).
- Open-source contributors, security reviewers, and technical leads tracing cross-module execution paths.

## 3. Priority Scope

### P0 — Core Release (Must Deliver & Verify)
1. **Native DeepSeek Harness Integration**: Cordis bundle manifest, Web Client slot registration (`sidebar.panellist` + `main`), authenticated IPC (`ctx.connection.rpc` & `fetch` SSE), host storage (`ctx.storageDomain`), runtime tools (`ctx.tools`), runtime skills (`ctx.skills`), and host agent orchestration (`ctx.agents`).
2. **Repository Management & Shallow Analysis**: Local path & Git URL import (recording branch + Commit SHA; never running target repo scripts), real staged progress with cancel/retry/cache resume, overview (languages, build systems, core modules, entry points, recommended reading paths).
3. **Zero-Config Lightweight Code Navigation (LSP-free)**:
   - **Go to Definition**: Tree-sitter symbol table ranked by file scope → import path → sibling/module → global; instant jump on unique match, Peek selector on multiple matches.
   - **Find References**: `ripgrep` word-boundary search filtered by Tree-sitter AST to eliminate comment/string false positives.
   - **Breadcrumb, Outline & Jump History Stack** (`Back` / `Forward`).
4. **Command Palette & Global Search**: `Cmd/Ctrl + P` fuzzy file/symbol search; `Cmd/Ctrl + Shift + F` global `ripgrep` search (case, regex, path filter).
5. **Exploration Trail**: Automatic tracking of manual navigation steps with one-click pinning to a learning path or trace graph.
6. **Natural-Language Reading Goals & Verified Trace Graphs**: Runtime Skill + deterministic retrieval + Host Agent producing interactive call/implementation graphs (zoom, search, grouping, path highlight, upstream/downstream tracing) with bidirectional file/line sync.
7. **Read-Only Multi-Language Code Reader**: Syntax highlighting for Python/C/C++/Go/Rust/TS/JS, multi-tab support, semantic range highlights (trace lines, selection, AI citations, annotations, current line).
8. **Selection Contextual Q&A**: Floating toolbar (`Ask AI`, `Annotate`, `Highlight`, `Bookmark`, `Definition`, `References`, `Callers/Callees`), clickable verified source citations.
9. **Persistent Line-Level Annotations & Reading Trails**: Single/multi-line threads, edit/resolve states, safe anchor relocation, saved reading paths with cross-session recovery.
10. **Caching, Token Budget Control, Diagnostics, Brand Icon, UI Review, Multi-Language E2E Validation, Bilingual Docs, Release Assets & GitHub Pages Homepage**.

### P1 — Post-P0 High-Value Enhancements
- Hover/Peek Card for core data structures (`struct`/`class`/`interface`).
- Git Blame / Commit context (`git blame` / `git log -L`) integrated into reader & Ask AI.
- Dual-pane side-by-side code comparison + reading status tags (`Understood`, `Deep Dive`, `Core Entry`).
- Cross-language FFI tracing (Python↔C/C++, Go↔CGO, Rust FFI), Markdown export, Clew-Bench multi-language evaluation.

### P2 — Future Roadmap
- Optional LSP augmentation (`gopls`/`clangd`/`pyright` when locally present), vertical domain extensions (AI Infra tensor shape inference), cross-version diff, multi-repo linking.

## 4. Non-Goals (Strict Product Boundaries)
- **NOT an editor or IDE**: No file editing, saving, formatting, refactoring, compiling, or debugging.
- **NO custom Agent Harness**: No standalone agent loop, LLM gateway, or custom credential store.
- **NO target repo code execution**: Never run `npm install`, `pip install`, `make`, `cargo build`, or arbitrary repo hooks.
- **NO static mocks or fake metrics**: All indices, progress bars, graphs, citations, and diagnostics must come from real execution.

## 5. Non-Functional Requirements & Acceptance Criteria
- **Zero-Native-Build**: Core engine runs on Node 26+ Linux without `node-gyp` native compilation failures.
- **Performance**: Graph layout runs in a Web Worker; large files & trees virtualized; search & persistence debounced; large graphs expand/collapse on demand.
- **Security**: Path traversal / symlink escape guards, command injection prevention, XSS-safe rendering, prompt-injection isolation for repo contents.
- **Multi-Language Real Validation**: End-to-end verification on at least 2 real open-source repos across distinct language stacks (e.g., vLLM [Python/C++] + Ripgrep/Gin/Redis [Rust/Go/C]) with pinned Commit SHAs.

# ARCHITECTURE.md — Clew System Architecture

> **Clew** — *Find your way through complex codebases.* / *循着线索，读懂复杂源码。*

## 1. Architectural Principles
1. **Hexagonal Layering**: Pure core understanding engine (`@clew/engine`) and shared Zod contracts (`@clew/shared`) have zero dependency on DeepSeek Harness (`cordis`), React, or browser APIs.
2. **Reuse the Harness**: Clew never implements its own LLM gateway, model credentials, or agent loop; it composes `ctx.agents`, `ctx.tools`, `ctx.skills`, `ctx.storageDomain`, `ctx.connection`, and `ctx.slots`.
3. **Strict Read-Only & Untrusted Data Boundary**: Clew never edits files or executes scripts inside user repositories. All paths undergo traversal + `realpath` symlink-escape checks; source snippets are treated strictly as untrusted data.
4. **Deterministic-First + Reverse Verification**: Tree-sitter WASM + `ripgrep` perform deterministic indexing, navigation, and subgraph retrieval; every LLM-proposed trace edge is verified against immutable source hashes before presentation.

---

## 2. System Context Diagram

```mermaid
flowchart LR
    User(["Developer / Reader"]) -->|Web UI & Keyboard| DSHWeb["DeepSeek Harness Web Shell\n(dsh-web-frontend + Slots + Theme)"]
    DSHWeb <-->|Authenticated RPC + SSE\n/api/clew/*| ClewHost["Clew DSH Plugin Host\n(@clew/dsh-plugin)"]

    ClewHost -->|Pure Engine Calls| ClewEngine["Clew Core Engine\n(@clew/engine + web-tree-sitter WASM + rg)"]
    ClewHost -->|Durable Metadata\nZod-Validated| DSHStorage["DSH Storage Domain\n(ctx.storageDomain)"]
    ClewHost -->|Agent Turns & Skills| DSHAgent["DSH Agent Runtime\n(ctx.agents / ctx.tools / ctx.skills)"]

    ClewEngine -->|Read-Only Access\nPath + Symlink Guard| LocalRepo[("Imported Local / Cloned Git Repo\n(Python / C / C++ / Go / Rust / TS/JS)")]
    ClewEngine -->|Bounded Disposable Cache| DiskCache[("Local Symbol & AST Cache\n(gitHead + dirtyFingerprint)")]
```

---

## 3. Hexagonal Module Dependency & Multi-Language Parser Extension

```mermaid
flowchart TB
    subgraph Client["Browser Client (@clew/dsh-plugin/client)"]
        UI["ClewWorkbench React UI\n(3-Col Layout + Virtualized Reader + Ask AI)"]
        Worker["ELK Graph Layout Web Worker\n(Same-Origin Asset)"]
        UI <-->|PostMessage Graph DTO| Worker
    end

    subgraph Plugin["DSH Host Adapter (@clew/dsh-plugin)"]
        Host["Cordis Plugin Entry\n(RPC / SSE / Slot / Tool / Skill Registration)"]
        AppSvc["Application Services\n(RepoService, JobQueue, TraceService, AnnotationService)"]
        AgentBridge["DSH Agent & Skill Bridge\n(Normalized Sequenced Events)"]
        StorageAdapter["Storage & Cache Adapter\n(ctx.storageDomain + Disk Cache)"]
        Host --> AppSvc
        AppSvc --> AgentBridge
        AppSvc --> StorageAdapter
    end

    subgraph Engine["Host-Agnostic Core (@clew/engine)"]
        Scanner["RepoScanner (.gitignore / .clewignore / binary guard)"]
        ParserReg["Pluggable LanguageParser Registry"]
        WasmParsers["WASM Tree-sitter Parsers\n(Py / C / C++ / Go / Rust / TS / JS)"]
        RgFallback["Ripgrep Text & Word-Boundary Fallback"]
        Nav["Zero-Config Navigation\n(Go-to-Def / Find-Refs / Outline)"]
        Graph["Subgraph Retriever & Token Budget Trimmer"]
        Verifier["Reverse Source-Line Evidence Verifier"]

        Scanner --> ParserReg
        ParserReg --> WasmParsers
        ParserReg --> RgFallback
        WasmParsers --> Nav
        RgFallback --> Nav
        Nav --> Graph
        Graph --> Verifier
    end

    subgraph Shared["Shared Contracts (@clew/shared)"]
        Contracts["Zod Schemas, Error Codes, Event Protocol, Path Guards"]
    end

    Client <-->|IPC / SSE| Host
    Plugin --> Engine
    Plugin --> Shared
    Engine --> Shared
    Client --> Shared
```

---

## 4. Core Execution Sequence (Reading Goal -> Trace Graph -> Verified UI)

```mermaid
sequenceDiagram
    actor U as User
    participant UI as Clew Client UI
    participant Host as Clew Host (RPC/SSE)
    participant Eng as @clew/engine
    participant Agent as DSH Agent + Runtime Skill

    U->>UI: Submit reading goal ("How does request scheduling work?")
    UI->>Host: RPC clew/trace/start (repoId, goal, focusSymbol)
    Host-->>UI: { jobId, correlationId }
    Host->>Eng: Deterministic scan/index check + entry symbol retrieval
    Eng-->>Host: Candidate subgraph + Token-budgeted context packet
    Host-->>UI: SSE progress (stage: retrieving, filesRead, cacheHit)

    Host->>Agent: ctx.agents.create + followup (invoke clew-implementation-trace skill)
    loop Skill-driven deterministic tool calls
        Agent->>Host: Tool call (clew_expand_subgraph / clew_read_span)
        Host->>Eng: Execute bounded AST/rg lookup
        Eng-->>Host: Verified source spans
        Agent-->>Host: agent/assistant-stream chunks
        Host-->>UI: Normalized SSE delta (seq, correlationId)
    end
    Agent-->>Host: turn/end (structured trace proposal)

    Host->>Eng: verifyTraceProposal(snapshotHash, proposal)
    Eng-->>Host: Verified TraceGraph (source_verified_call / static_dependency / inferred_dynamic / dataflow / unverified)
    Host->>Host: Persist summary in ctx.storageDomain
    Host-->>UI: SSE trace_ready (verified TraceGraph)
    UI->>UI: Run ELK layout in Web Worker & sync code reader highlight
```

---

## 5. Background Job State Machine & Cache/Data Flow

```mermaid
stateDiagram-v2
    [*] --> Queued: Enqueue scan/index/trace job
    Queued --> Scanning: Acquire repo lock & respect .gitignore
    Scanning --> Indexing: Diff git HEAD + dirtyFingerprint
    Indexing --> Ready: Persist manifest & update disk cache
    Scanning --> Cancelled: User cancel / AbortSignal
    Indexing --> Cancelled: User cancel / AbortSignal
    Scanning --> Failed: Path guard / I/O error
    Indexing --> Failed: Fatal parser error
    Failed --> Queued: User retry
    Cancelled --> Queued: User retry
```

### Storage Split Summary
- **`ctx.storageDomain` (Durable User State)**: Imported repo metadata, saved reading paths, exploration trails, line annotations (with anchor commit/hash), user settings, and compact trace history.
- **Disposable Local Disk Cache (`$DSH_HOME/cache/clew/`)**: Per-file parsed symbol tables, import graphs, and AST line maps keyed by `(repoRoot, gitHead, dirtyFingerprint, parserVersion)`. Automatically invalidated via `git diff --name-status` and safely rebuilt on miss or corruption.

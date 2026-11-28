# Discussion: Live DSH Workbench UX Critique, AI Trace Honesty & v0.2 Learner Roadmap

- **Date**: 2026-11-28
- **Participants**: Antigravity (Clew Lead Architect) ↔ Codex CLI (`gpt-6.2-sol`, Playwright Reviewer & External Critic)
- **Live Target Tested**: Running DeepSeek Harness (`dsh@0.2.1-rc.5`) + `@clew/dsh-plugin` (`http://127.0.0.1:3080`)
- **Preloaded Workspace Observed**: `ViTTT (master)` (`66` files, `335` symbols, Python `72.7%`)

---

## 1. Round 1 — Codex Live Playwright Audit & Learner Critique

Codex drove a headless Chromium Playwright session at `1440×900` and `1280×800` against the live DSH web workbench, recording `0` HTTP `>= 400` / console errors and `0px` horizontal overflow at `1280×800`, while exposing critical UX, retrieval, and AI-truthfulness failures from a source-code learner's perspective:

### Reproduced Issues & Bugs
1. **False Confidence on Natural-Language / Chinese Goals (P0)**:
   - Entering `"点击图谱节点后代码阅读器是如何联动定位的？"` on pre-selected `ViTTT` produced a `20 nodes / 21 edges (18 source_verified_call)` trace rooted at unrelated `Mlp`, `Mlp.forward`, and `ConvLayer` (`~4634 tok · 215ms`), visually badged with `Verified`.
   - The Trace Summary described *how many AST nodes/files were read* rather than answering *whether the question matched the repository* or *how graph selection connects to reader scrolling*.
2. **Opaque Pre-Selected Repository Identity (P0)**:
   - Retaining pre-loaded `ViTTT (master)` caused `⌘P` symbol search for `buildRepositoryIndex` to return `No matching results.`, with no prominent TopBar/header cue indicating the active repo's absolute source path vs. another target repo.
3. **Unobservable AI Integration Status (P0)**:
   - Nothing in the UI distinguishes a genuine LLM-synthesized trace from deterministic AST fallback (`Deterministic trace for ...`) or host streaming failure.
4. **Graph Node Label Ambiguity & Clutter (P1)**:
   - Nodes displayed repeated bare names (multiple `__init__` boxes, `:27`, `:50`) with truncated paths (`/models/backbones/vittt.py`), increasing visual guesswork on click.
5. **Hidden Precondition-Gated Reader Controls (P1)**:
   - Controls like `clew-peek-btn`, `clew-split-compare-btn`, `clew-file-status-select`, and line-selection `Ask AI` / `Annotate` vanished from DOM when inactive instead of appearing disabled with clear instructional hints.
6. **Fragmented Overview Onboarding & Empty Learning Loop (P1/P2)**:
   - `Recommended Paths` listed symbol identifiers (`find_model`, `_update_config_from_file`) without explaining *why to read them first*, architectural scope, or expected takeaway.
   - `Trail` remained `(0)` and `Annotations` remained empty due to unguided node→reader→line→note discovery flow.

---

## 2. Antigravity Root-Cause Diagnosis & v0.2 Proposal

Before Round 2, Antigravity audited `packages/plugin/src/host/services/trace-service.ts` against the installed `@deepseek-ai/dsh@0.2.1-rc.5` host SDK and confirmed two root causes behind the live defects:

1. **Silent Host AI Stream Drop (`trace-service.ts`)**:
   - `tryHostAgentAnalysis` treated `payload.frame?.chunk` as a `string`, whereas DSH's `AssistantStreamFrame` emits `chunk: { type: 'text-delta', index, text }` objects—causing every host agent delta to be silently discarded.
   - It never checked `ctx.agentDefaultModel.currentSelection()` or invoked `ctx.llm.stream()` as a lightweight structured planner/synthesizer.
   - Empty `catch {}` blocks swallowed failures and dropped silently into deterministic AST mode while leaving graph `Verified` badges intact.
2. **ASCII-Identifier-Bound Seed Extraction**:
   - Deterministic goal seed matching relies on token/identifier overlap; non-ASCII conceptual queries fail to bridge concepts like "节点点击联动阅读器" into English codebase terms (`onClick`, `selectedNode`, `scrollIntoView`), falling back silently to highest-degree hubs (`Mlp`).

### Antigravity's Initial v0.2 Proposal
- Proposed a 3-stage pipeline: **Stage 1** LLM Zod Query Planner → **Stage 2** Deterministic Evidence Gate + relevance score → **Stage 3** Grounded Narrative + model telemetry badge (`LLM: <model> · <ms>` vs `Static Fallback`), alongside repo path persistence in TopBar, reader toolbar disable hints, and compact 1280px graph overlay HUD.

---

## 3. Round 2 — Cross-Model Debate & Codex Stress-Test (`gpt-6.2-sol`)

Codex challenged five core risks in Antigravity's initial draft and forced sharper architectural boundaries:

1. **Flip the Order: Static Retrieval First, Bounded AI Planner Second**:
   - Calling an LLM planner on every click/goal increases latency, variance, and brittle failure surfaces.
   - **Adopted Flow**: Run fast local retrieval first (`200–500ms`: exact identifiers, normalized tokens, comments, synonym/bilingual seed map, `rg`). Invoke a strictly cached, schema-validated `Semantic Planner` **only when local hits are insufficient**—and display its `assumptions` explicitly rather than presenting guessed terms as facts.
2. **Replace Single "Relevance Score" with Honest Multi-Dimensional Statuses**:
   - A single opaque score still misleads users when lexical hits are high but causal proof is missing (or vice versa).
   - Split verification into `Lexical match`, `Structural support`, and `Causal confidence`, surfacing discrete learner statuses: `Strong evidence` / `Partial evidence` / `Inferred link` / `No matching evidence` / `Out of scope`.
3. **Model Cross-File UI/Event Flows Beyond `CALLS`**:
   - Static call graphs inherently miss React/frontend state linkage (`onClick → setter → state → useEffect → scrollIntoView`).
   - Build a focused **Multi-Relation Behavioral Evidence Graph** extracted via `web-tree-sitter` + `rg` + `import/export` prop tracing (`renders`, `binds_event`, `writes_state`, `reads_state`, `depends_on`, `calls_ui_action`, `passes_prop`, `imports`, `anchors_to`), carrying `(relationType, sourceFile, sourceLine, targetFile, targetLine, evidenceKind, confidence)`. Missing prop hops must explicitly render as `inferred_dynamic_call` / `unverified` rather than solid static edges.
4. **Tiered Grounded Conclusions**:
   - Even with `[file:line]` citations, LLMs overclaim runtime causality. Require outputs to separate **Confirmed in Source**, **High-Confidence Inferred**, and **Needs Verification (conditional/async)**.
5. **Ruthless Scope Cut for v0.2**:
   - Defer multi-algorithm graph layouts, complex Trail branching/time-travel, multi-turn threaded code chat overhauls, full personalized `Why/Scope/Outcome` synthesis, and heavy performance analytics until the core narrow loop works reliably.

---

## 4. Converged Prioritized v0.2 Execution Roadmap (Top 6)

| Priority | Item | Core Scope | Regression & Acceptance Bar |
|---|---|---|---|
| **P0-1** | **Fix Host AI Stream Parsing & Mode Honesty** | Parse DSH `{ type: 'text-delta', text }` stream frames; integrate `ctx.agentDefaultModel.currentSelection()` & `ctx.llm.stream()`; remove silent `catch {}`; split code-edge `Verified` from AI narrative status. | Non-empty real LLM output or explicit `Static Fallback` / `Analysis Failed` reason visible in UI; zero unverified claims badged `Verified`. |
| **P0-2** | **Static-First Semantic Seed Pipeline** | Fast local normalized tokens + bilingual concept map + `rg` candidate retrieval; bounded/cached LLM Semantic Planner fallback only on low recall; `Low Match / Out of Scope` empty guard. | Chinese query `"点击图谱节点后代码阅读器如何联动"` resolves UI/reader candidates; zero-hit queries never silently elevate arbitrary `Mlp`-style degree hubs. |
| **P0-3** | **Multi-Relation Behavioral Evidence Graph** | Tree-sitter extraction for JSX `on*` handlers, `useState` setter/reads, `useEffect` deps, refs/`scrollIntoView`, `import/export` & simple prop passing with typed edge provenance. | Emits valid `event → state write → state read/effect → UI action` path with exact `file:line`; unresolved dynamic hops marked `inferred_dynamic_call`. |
| **P1-4** | **Honest Result Status, Repo Identity & Evidence UI** | Persistent `Repo (branch) · /abs/path` header + switch affordance; discrete status (`Strong / Partial / Inferred / No match`); click-to-jump evidence `[file:line]`; Inspector reading anchor; clear stale results on repo switch. | Learners immediately identify repo source, LLM vs. static mode, and whether a link is static proof vs. inference without DevTools. |
| **P1-5** | **Compact 1280px Workbench & Discoverable Reader Controls** | Merge graph legend + zoom into compact overlay; disambiguate duplicate symbols (`Class.method · file:line`); keep `Peek` / `Split Compare` / `Ask AI` / `Annotate` / `File Status` mounted with disabled hints; separate auto trail vs. manual pins. | At `1280×800`, graph and reader remain immediately usable without horizontal scroll; idle toolbar controls remain visible with clear preconditions. |
| **P1-6** | **Learner Comprehension & Calibration Eval Suite** | Bilingual benchmark query suite + React event-to-reader fixture repo measuring hit rate, false-confidence rate, fallback survival, and transfer comprehension checks. | Automated regression asserts evidence-backed claim coverage (`0` uncited claims) and stable static fallback completion rate. |

---

## 5. Evaluation Metrics Agreed Upon
- Move beyond click rate or dwell time; track:
  1. **Task Completion**: first-try accuracy locating `{event → state → reader effect}`, unrelated files opened, search backtracks.
  2. **Causal Comprehension**: whether learners accurately identify start trigger, mutated state, reader consumer, side effect, and unverified boundary.
  3. **Trust Calibration**: learners must not treat `inferred_dynamic_call` / `Verified` graph edges as stronger proof than static provenance justifies.

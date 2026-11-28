# ADR-0003: Runtime Skills & Host Agent Orchestration

- **Status**: Accepted
- **Date**: 2026-11-28
- **Discussion**: [2026-11-28-host-integration-and-packaging.md](../discussions/2026-11-28-host-integration-and-packaging.md)
- **Architecture Refs**: [ARCHITECTURE.md](../ARCHITECTURE.md)

## Context
Clew's source-understanding workflows (repository overview, implementation tracing, contextual code Q&A, dataflow summarization) require AI reasoning grounded in deterministic AST/symbol/search tools while reusing DeepSeek Harness's agent loop.

## Decision
1. Register deterministic read-only tools (`clew_scan_repo`, `clew_search_code`, `clew_goto_definition`, `clew_find_references`, `clew_expand_subgraph`, `clew_read_span`, `clew_verify_trace`) via `ctx.tools.register(defineTool(...))`.
2. Register Clew's workflow instructions as DSH runtime skills (`clew-source-analysis`, `clew-repository-overview`, `clew-implementation-trace`, `clew-code-explanation`, `clew-dataflow-summary`) via `ctx.skills.register(...)`, strictly separated from `.agents/skills/`.
3. Execute AI trace & Q&A turns via `ctx.agents.create()` / `followup()` with normalized, sequence-numbered Clew SSE events bridged from `agent/assistant-stream` and `turn/end`.
4. Treat imported repository files and comments strictly as untrusted data inside delimited `<untrusted_source>` blocks in prompts; enforce Zod validation on structured trace outputs before reverse evidence verification.

## Consequences
- No custom LLM client or agent loop is maintained.
- Deterministic work never wastes LLM tokens, and every graph edge passes through `@clew/engine`'s reverse verifier before UI presentation.

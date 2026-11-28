# ADR-0001: DeepSeek Harness Native Plugin Integration

- **Status**: Accepted
- **Date**: 2026-11-28
- **Discussion**: [2026-11-28-host-integration-and-packaging.md](../discussions/2026-11-28-host-integration-and-packaging.md)
- **Architecture Refs**: [ARCHITECTURE.md](../ARCHITECTURE.md)

## Context
Clew must integrate natively into DeepSeek Harness (`@deepseek-ai/dsh@0.2.1-rc.5`) without duplicating agent execution, LLM authentication, session storage, or web transport.

## Decision
1. Package `@clew/dsh-plugin` (`packages/plugin`) as a Cordis bundle with `dsh.manifestVersion: 1`, `dsh.bundle.patch: "./cordis.patch.yml"`, `dsh.client: { platform: "web", immediately: true, inject: ["@deepseek-ai/dsh-client-ui-layout", "@deepseek-ai/dsh-client-ui-sidebar", "@deepseek-ai/dsh-client-connection", "@deepseek-ai/dsh-client-locale"] }`, plus `./locale/*.json` and `./icon`.
2. Expose Host RPC endpoints under `/api` via `ctx.connection.rpc.intercept('/api', ep => ep.startsWith('clew/'), ...)` and SSE event streams via `ctx.connection.fetch.register({ path: '/api/clew/events', ... })`, automatically inheriting DSH browser authentication, Origin checks, and Desktop IPC compatibility.
3. Validate all IPC payloads and responses with Zod schemas from `@clew/shared`.
4. Register UI surfaces exclusively through `ctx.slots.inject('sidebar.panellist', ...)` and `ctx.slots.inject('main', ...)` using `--dsw-alias-*` theme tokens and `ctx.locale`.

## Consequences
- Zero custom HTTP server, auth logic, or LLM API key handling.
- Full compatibility with `dsh plugin add`, HMR, and DSH Web / Desktop carriers.

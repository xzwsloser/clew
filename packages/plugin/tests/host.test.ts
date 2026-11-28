import { describe, expect, it } from 'vitest';
import { apply } from '../src/host/index.js';
import type {
  DshFetchRoute,
  DshHostContext,
  DshRpcResult,
  DshSkillRegistration,
  DshToolDefinition,
} from '../src/types/dsh.js';

function createStubHostContext() {
  const cleanups: Array<() => void | Promise<void>> = [];
  const tools = new Map<string, DshToolDefinition>();
  const skills = new Map<string, DshSkillRegistration>();
  const fetchRoutes = new Map<string, DshFetchRoute>();
  let globalState: Record<string, unknown> = { persistedPings: 0, lastPingAt: null };

  const ctx: DshHostContext = {
    connection: {
      rpc: {
        handle() {
          return async () => {};
        },
      },
      fetch: {
        register(route) {
          fetchRoutes.set(route.path, route);
          return async () => {
            fetchRoutes.delete(route.path);
          };
        },
      },
    },
    storageDomain: {
      async open(spec) {
        globalState = spec.global.initial as Record<string, unknown>;
        return {
          name: spec.name,
          global: {
            get: () => globalState as never,
            set: async (value) => {
              globalState = value as Record<string, unknown>;
            },
          },
          table: () => ({
            get: () => undefined,
            put: async () => {},
            delete: async () => false,
            entries: () => [][Symbol.iterator](),
          }),
          close: async () => {},
        };
      },
    },
    tools: {
      register(def) {
        tools.set(def.name, def);
        return () => {
          tools.delete(def.name);
        };
      },
    },
    skills: {
      register(skill) {
        skills.set(skill.name, skill);
        return () => {
          skills.delete(skill.name);
        };
      },
    },
    get: (key) => (key === 'agents' ? { list: () => [] } : undefined),
    effect(fn) {
      const dispose = fn();
      if (dispose) cleanups.push(dispose);
      return () => {
        if (dispose) void dispose();
      };
    },
    inject(_deps, cb) {
      cb(ctx);
      return () => {};
    },
  };

  return {
    ctx,
    tools,
    skills,
    fetchRoutes,
    callRpc: async (endpoint: string, payload: unknown): Promise<DshRpcResult> => {
      const route = fetchRoutes.get('/api/clew/rpc');
      if (!route) throw new Error('RPC route /api/clew/rpc not registered');
      const res = await route.fetch(
        new Request('http://127.0.0.1/api/clew/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint, payload }),
        }),
      );
      return (await res.json()) as DshRpcResult;
    },
    disposeAll: async () => {
      for (const cleanup of cleanups.reverse()) {
        await cleanup();
      }
    },
  };
}

describe('@clew/dsh-plugin host adapter', () => {
  it('registers tool, runtime skill, RPC, SSE, and persists health pings', async () => {
    const stub = createStubHostContext();
    await apply(stub.ctx);

    expect(stub.tools.has('clew_health')).toBe(true);
    expect(stub.skills.has('clew-source-analysis')).toBe(true);
    expect(stub.fetchRoutes.has('/api/clew/events')).toBe(true);

    const first = await stub.callRpc('health', { echo: 'hi' });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect((first.value as { persistedPings: number }).persistedPings).toBe(1);
    }

    const second = await stub.callRpc('health', {});
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect((second.value as { persistedPings: number }).persistedPings).toBe(2);
    }

    const invalid = await stub.callRpc('health', { echo: 123 });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.error.code).toBe('CLEW_INVALID_INPUT');
    }

    const sseRoute = stub.fetchRoutes.get('/api/clew/events')!;
    const ac = new AbortController();
    const res = await sseRoute.fetch(new Request('http://127.0.0.1/api/clew/events', { signal: ac.signal }));
    expect(res.status).toBe(200);
    const reader = res.body!.getReader();
    const chunk = await reader.read();
    const text = new TextDecoder().decode(chunk.value);
    expect(text).toContain('event: heartbeat');
    ac.abort();

    await stub.disposeAll();
    expect(stub.tools.size).toBe(0);
    expect(stub.skills.size).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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
  const tables = new Map<string, Map<string, unknown>>();
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
        for (const tName of Object.keys(spec.tables)) {
          tables.set(tName, new Map());
        }
        return {
          name: spec.name,
          global: {
            get: () => globalState as never,
            set: async (value) => {
              globalState = value as Record<string, unknown>;
            },
          },
          table: (name) => {
            const map = tables.get(name) ?? new Map();
            return {
              get: (k) => map.get(k) as never,
              put: async (k, v) => {
                map.set(k, v);
              },
              delete: async (k) => map.delete(k),
              entries: () => map.entries() as IterableIterator<[string, never]>,
            };
          },
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
    callRpc: async <T = unknown>(endpoint: string, payload: unknown): Promise<DshRpcResult<T>> => {
      const route = fetchRoutes.get('/api/clew/rpc');
      if (!route) throw new Error('RPC route /api/clew/rpc not registered');
      const res = await route.fetch(
        new Request('http://127.0.0.1/api/clew/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint, payload }),
        }),
      );
      return (await res.json()) as DshRpcResult<T>;
    },
    disposeAll: async () => {
      for (const cleanup of cleanups.reverse()) {
        await cleanup();
      }
    },
  };
}

describe('@clew/dsh-plugin host services, tools & runtime skills', () => {
  it('registers all 7 tools, 4 runtime skills, RPC routes, SSE, and full repo->trace->annotation workflow', async () => {
    const base = mkdtempSync(join(tmpdir(), 'clew-plugin-test-'));
    const dshHome = join(base, 'dsh-home');
    const repo = join(base, 'sample-repo');
    mkdirSync(join(repo, 'src'), { recursive: true });
    writeFileSync(join(repo, 'package.json'), '{"name":"sample"}\n');
    writeFileSync(join(repo, 'src', 'db.ts'), 'export function queryUser(id: string) {\n  return id;\n}\n');
    writeFileSync(
      join(repo, 'src', 'api.ts'),
      'import { queryUser } from "./db.js";\nexport function getUser(id: string) {\n  return queryUser(id);\n}\n',
    );

    const prevDshHome = process.env.DSH_HOME;
    process.env.DSH_HOME = dshHome;
    const stub = createStubHostContext();

    try {
      await apply(stub.ctx);

      expect(stub.tools.size).toBe(7);
      expect(stub.skills.size).toBe(4);
      expect(stub.skills.has('clew-implementation-trace')).toBe(true);

      // Health & invalid input rejection
      const health = await stub.callRpc<{ persistedPings: number }>('health', {});
      expect(health.ok && health.value.persistedPings).toBe(1);
      const bad = await stub.callRpc('health', { echo: 123 });
      expect(bad.ok).toBe(false);

      // Import & index repo
      const imp = await stub.callRpc<{ repo: { id: string; totalFiles: number } }>('repo/import', {
        sourceType: 'local',
        location: repo,
      });
      expect(imp.ok).toBe(true);
      if (!imp.ok) return;
      const repoId = imp.value.repo.id;
      expect(imp.value.repo.totalFiles).toBe(3);

      // Trace goal & cache hit on repeat
      const trace1 = await stub.callRpc<{ trace: { nodes: unknown[]; edges: unknown[]; telemetry: { cacheHit: boolean } } }>(
        'trace/run',
        { repoId, goal: 'getUser queryUser' },
      );
      expect(trace1.ok).toBe(true);
      if (trace1.ok) {
        expect(trace1.value.trace.nodes.length).toBeGreaterThanOrEqual(2);
        expect(trace1.value.trace.telemetry.cacheHit).toBe(false);
      }

      const trace2 = await stub.callRpc<{ trace: { telemetry: { cacheHit: boolean } } }>('trace/run', {
        repoId,
        goal: 'getUser queryUser',
      });
      expect(trace2.ok && trace2.value.trace.telemetry.cacheHit).toBe(true);

      // Annotation create -> reply -> revalidate (relocate/stale)
      const ann = await stub.callRpc<{ annotation: { id: string; status: string } }>('annotations/create', {
        repoId,
        file: 'src/api.ts',
        startLine: 2,
        endLine: 3,
        body: 'Entry point for user lookup',
      });
      expect(ann.ok).toBe(true);
      if (!ann.ok) return;

      const updatedAnn = await stub.callRpc<{ annotation: { replies: unknown[]; status: string } }>(
        'annotations/update',
        { id: ann.value.annotation.id, replyBody: 'Verified call to queryUser', status: 'resolved' },
      );
      expect(updatedAnn.ok && updatedAnn.value.annotation.replies.length).toBe(1);

      // Save reading path
      const savedPath = await stub.callRpc<{ path: { id: string; steps: unknown[] } }>('paths/save', {
        repoId,
        title: 'User Lookup Path',
        steps: [
          {
            id: 's1',
            file: 'src/api.ts',
            line: 2,
            symbolName: 'getUser',
            action: 'trace_node',
            timestamp: new Date().toISOString(),
          },
        ],
      });
      expect(savedPath.ok && savedPath.value.path.steps.length).toBe(1);

      // Diagnostics check
      const diag = await stub.callRpc<{ reposCount: number; annotationsCount: number; readingPathsCount: number }>(
        'diagnostics',
        {},
      );
      expect(diag.ok && diag.value.reposCount).toBe(1);
      expect(diag.ok && diag.value.annotationsCount).toBe(1);
      expect(diag.ok && diag.value.readingPathsCount).toBe(1);

      // SSE heartbeat check
      const sseRoute = stub.fetchRoutes.get('/api/clew/events')!;
      const ac = new AbortController();
      const res = await sseRoute.fetch(new Request('http://127.0.0.1/api/clew/events', { signal: ac.signal }));
      expect(res.status).toBe(200);
      const chunk = await res.body!.getReader().read();
      expect(new TextDecoder().decode(chunk.value)).toContain('event: heartbeat');
      ac.abort();

      await stub.disposeAll();
      expect(stub.tools.size).toBe(0);
      expect(stub.skills.size).toBe(0);
    } finally {
      if (prevDshHome === undefined) delete process.env.DSH_HOME;
      else process.env.DSH_HOME = prevDshHome;
      rmSync(base, { recursive: true, force: true });
    }
  });
});

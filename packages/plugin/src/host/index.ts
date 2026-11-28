import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  AgentPingRequestSchema,
  AgentPingResponseSchema,
  AnnotationRecordSchema,
  CLEW_ERROR_CODES,
  ClewError,
  DiagnosticsSnapshotSchema,
  ExplorationStepSchema,
  FileStatusRecordSchema,
  HealthCheckRequestSchema,
  HealthCheckResponseSchema,
  ReadingPathRecordSchema,
  ReadingStatusSchema,
  RepoRecordSchema,
  type ClewSseEvent,
} from '@clew/shared';
import { P0_SUPPORTED_LANGUAGES } from '@clew/engine';
import type { DshDomain, DshHostContext, DshRpcResult } from '../types/dsh.js';
import { AnnotationService } from './services/annotation-service.js';
import { ClewEventBus } from './services/event-bus.js';
import { JobQueueService } from './services/job-queue.js';
import { ProjectService } from './services/project-service.js';
import { TraceService } from './services/trace-service.js';
import { CLEW_RUNTIME_SKILLS } from './skills/runtime-skills.js';
import { buildClewToolDefinitions } from './tools/clew-tools.js';

export const name = 'clew';
export const inject = ['connection', 'storageDomain', 'tools', 'skills'];

const PLUGIN_VERSION = '0.1.0';

const ClewGlobalStateSchema = z.object({
  persistedPings: z.number().int().nonnegative(),
  lastPingAt: z.string().nullable(),
});
type ClewGlobalState = z.infer<typeof ClewGlobalStateSchema>;

function rpcOk<T>(value: T): DshRpcResult<T> {
  return { ok: true, value };
}

function rpcErr(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): DshRpcResult<never> {
  return { ok: false, error: { code, message, details } };
}

function formatError(err: unknown): DshRpcResult<never> {
  if (err instanceof ClewError) {
    return rpcErr(err.code, err.message, err.details ?? {});
  }
  if (err instanceof z.ZodError) {
    return rpcErr(CLEW_ERROR_CODES.INVALID_INPUT, 'Invalid request payload', {
      issues: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return rpcErr(
    CLEW_ERROR_CODES.INTERNAL,
    err instanceof Error ? err.message : 'Unexpected host error',
  );
}

export async function apply(ctx: DshHostContext): Promise<void> {
  const domain: DshDomain<
    ClewGlobalState,
    {
      repos: z.infer<typeof RepoRecordSchema>;
      annotations: z.infer<typeof AnnotationRecordSchema>;
      paths: z.infer<typeof ReadingPathRecordSchema>;
      statuses: z.infer<typeof FileStatusRecordSchema>;
    }
  > = await ctx.storageDomain.open({
    name: 'clew',
    version: 1,
    invalidRecords: 'backup-and-skip',
    global: {
      schema: ClewGlobalStateSchema,
      initial: {
        persistedPings: 0,
        lastPingAt: null,
      },
    },
    tables: {
      repos: { valueSchema: RepoRecordSchema },
      annotations: { valueSchema: AnnotationRecordSchema },
      paths: { valueSchema: ReadingPathRecordSchema },
      statuses: { valueSchema: FileStatusRecordSchema },
    },
  });

  ctx.effect(() => () => {
    void domain.close();
  }, 'clew:storage-domain');

  let liveAgents: DshHostContext['agents'] | undefined = ctx.get<DshHostContext['agents']>('agents');
  ctx.inject(['agents'], (agentCtx) => {
    liveAgents = agentCtx.agents ?? agentCtx.get<DshHostContext['agents']>('agents');
    return () => {
      liveAgents = undefined;
    };
  });

  const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh');
  const cacheDir = join(dshHome, 'cache', 'clew', 'index');
  const cloneRoot = join(dshHome, 'cache', 'clew', 'repos');

  const bus = new ClewEventBus();
  const jobs = new JobQueueService(bus);
  const projects = new ProjectService(domain.table('repos'), cacheDir, cloneRoot, jobs);
  const traces = new TraceService(() => liveAgents, projects, jobs, bus);
  const annotations = new AnnotationService(
    domain.table('annotations'),
    domain.table('paths'),
    projects,
    domain.table('statuses'),
  );

  const registeredSkills = CLEW_RUNTIME_SKILLS.map((s) => s.name);

  async function bumpPing(): Promise<number> {
    const current = domain.global.get();
    const next: ClewGlobalState = {
      persistedPings: current.persistedPings + 1,
      lastPingAt: new Date().toISOString(),
    };
    await domain.global.set(next);
    return next.persistedPings;
  }

  const tools = buildClewToolDefinitions({
    pluginVersion: PLUGIN_VERSION,
    registeredSkills,
    hasStorage: () => true,
    hasAgents: () => Boolean(liveAgents),
    bumpPing,
    projects,
    traces,
  });
  const registeredTools = tools.map((t) => t.name);

  for (const tool of tools) {
    ctx.effect(() => ctx.tools.register(tool), `clew:tool:${tool.name}`);
  }

  for (const skill of CLEW_RUNTIME_SKILLS) {
    ctx.effect(() => ctx.skills.register(skill), `clew:skill:${skill.name}`);
  }

  async function dispatchRpc(endpoint: string, payload: unknown): Promise<DshRpcResult> {
    switch (endpoint) {
      case 'health': {
        const parsed = HealthCheckRequestSchema.parse(payload ?? {});
        const persistedPings = await bumpPing();
        return rpcOk(
          HealthCheckResponseSchema.parse({
            ok: true,
            plugin: '@clew/dsh-plugin',
            version: PLUGIN_VERSION,
            readOnly: true,
            supportedLanguages: [...P0_SUPPORTED_LANGUAGES],
            registeredTools,
            registeredSkills,
            storageReady: true,
            agentServiceAvailable: Boolean(liveAgents),
            persistedPings,
            timestamp: new Date().toISOString(),
            ...(parsed.echo !== undefined ? { echo: parsed.echo } : {}),
          }),
        );
      }

      case 'agent-ping': {
        AgentPingRequestSchema.parse(payload ?? {});
        const agents = ctx.get<{ list?: () => unknown[] }>('agents');
        const activeAgents = agents?.list ? agents.list().length : 0;
        return rpcOk(
          AgentPingResponseSchema.parse({
            ok: Boolean(agents),
            mode: agents ? 'host_agent' : 'host_capability_check',
            message: agents
              ? `DSH host Agent service connected (${activeAgents} live agents).`
              : 'DSH host Agent service is not mounted in this profile.',
            skillsAvailable: registeredSkills,
          }),
        );
      }

      case 'repo/list':
        return rpcOk({ repos: projects.listRepos() });

      case 'repo/import': {
        const parsed = z
          .object({
            sourceType: z.enum(['local', 'git']).default('local'),
            location: z.string().min(1),
            name: z.string().optional(),
          })
          .parse(payload);
        return rpcOk(await projects.importAndIndex(parsed));
      }

      case 'repo/overview': {
        const { repoId } = z.object({ repoId: z.string().min(1) }).parse(payload);
        return rpcOk({ overview: await projects.getOverview(repoId) });
      }

      case 'repo/tree': {
        const { repoId } = z.object({ repoId: z.string().min(1) }).parse(payload);
        return rpcOk({ tree: await projects.getTree(repoId) });
      }

      case 'file/read': {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            file: z.string().min(1),
            startLine: z.number().int().positive().optional(),
            endLine: z.number().int().positive().optional(),
          })
          .parse(payload);
        return rpcOk(
          await projects.readFile(parsed.repoId, parsed.file, parsed.startLine, parsed.endLine),
        );
      }

      case 'nav/definition': {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            file: z.string().min(1),
            line: z.number().int().positive(),
            symbolName: z.string().min(1),
            column: z.number().int().nonnegative().optional(),
          })
          .parse(payload);
        return rpcOk(
          await projects.gotoDefinition(
            parsed.repoId,
            parsed.file,
            parsed.line,
            parsed.symbolName,
            parsed.column,
          ),
        );
      }

      case 'nav/references': {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            symbolName: z.string().min(1),
            maxResults: z.number().int().positive().max(500).optional(),
          })
          .parse(payload);
        return rpcOk({
          references: await projects.findRefs(parsed.repoId, parsed.symbolName, parsed.maxResults),
        });
      }

      case 'search/fuzzy': {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            query: z.string(),
            limit: z.number().int().positive().max(100).optional(),
          })
          .parse(payload);
        return rpcOk({
          items: await projects.fuzzySearch(parsed.repoId, parsed.query, parsed.limit),
        });
      }

      case 'search/text': {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            query: z.string().min(1),
            caseSensitive: z.boolean().optional(),
            regex: z.boolean().optional(),
            subpath: z.string().optional(),
            maxResults: z.number().int().positive().max(500).optional(),
          })
          .parse(payload);
        return rpcOk({ hits: await projects.textSearch(parsed.repoId, parsed) });
      }

      case 'trace/run': {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            goal: z.string().min(1),
            focusSymbolId: z.string().optional(),
            maxTokens: z.number().int().positive().max(16000).optional(),
          })
          .parse(payload);
        return rpcOk({ trace: await traces.runTrace(parsed) });
      }

      case 'qa/ask': {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            question: z.string().min(1),
            file: z.string().min(1),
            startLine: z.number().int().positive(),
            endLine: z.number().int().positive(),
            goal: z.string().optional(),
          })
          .parse(payload);
        return rpcOk(await traces.askContextualQuestion(parsed));
      }

      case 'annotations/list': {
        const parsed = z
          .object({ repoId: z.string().min(1), file: z.string().optional() })
          .parse(payload);
        return rpcOk({ annotations: annotations.listAnnotations(parsed.repoId, parsed.file) });
      }

      case 'annotations/create': {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            file: z.string().min(1),
            startLine: z.number().int().positive(),
            endLine: z.number().int().positive(),
            body: z.string().min(1),
            title: z.string().optional(),
            tags: z.array(z.string()).optional(),
          })
          .parse(payload);
        return rpcOk({ annotation: await annotations.createAnnotation(parsed) });
      }

      case 'annotations/update': {
        const parsed = z
          .object({
            id: z.string().min(1),
            body: z.string().min(1).optional(),
            status: z.enum(['open', 'resolved', 'stale']).optional(),
            replyBody: z.string().min(1).optional(),
            replyAuthor: z.enum(['user', 'assistant']).optional(),
          })
          .parse(payload);
        return rpcOk({ annotation: await annotations.updateAnnotation(parsed) });
      }

      case 'annotations/delete': {
        const { id } = z.object({ id: z.string().min(1) }).parse(payload);
        return rpcOk({ deleted: await annotations.deleteAnnotation(id) });
      }

      case 'annotations/revalidate': {
        const parsed = z.object({ repoId: z.string().min(1), file: z.string().min(1) }).parse(payload);
        return rpcOk({
          annotations: await annotations.revalidateAnchors(parsed.repoId, parsed.file),
        });
      }

      case 'paths/list': {
        const parsed = z.object({ repoId: z.string().optional() }).parse(payload ?? {});
        return rpcOk({ paths: annotations.listReadingPaths(parsed.repoId) });
      }

      case 'paths/save': {
        const parsed = z
          .object({
            id: z.string().optional(),
            repoId: z.string().min(1),
            title: z.string().min(1),
            description: z.string().optional(),
            steps: z.array(ExplorationStepSchema),
          })
          .parse(payload);
        return rpcOk({ path: await annotations.saveReadingPath(parsed) });
      }

      case 'paths/delete': {
        const { id } = z.object({ id: z.string().min(1) }).parse(payload);
        return rpcOk({ deleted: await annotations.deleteReadingPath(id) });
      }

      case 'nav/peek': {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            symbolName: z.string().min(1),
            file: z.string().optional(),
            line: z.number().int().positive().optional(),
          })
          .parse(payload);
        return rpcOk({
          peek: await projects.peekSymbol(
            parsed.repoId,
            parsed.symbolName,
            parsed.file,
            parsed.line ?? 1,
          ),
        });
      }

      case 'git/line-context': {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            file: z.string().min(1),
            startLine: z.number().int().positive(),
            endLine: z.number().int().positive(),
          })
          .parse(payload);
        return rpcOk({
          commits: await projects.getLineGitContext(
            parsed.repoId,
            parsed.file,
            parsed.startLine,
            parsed.endLine,
          ),
        });
      }

      case 'status/list': {
        const parsed = z.object({ repoId: z.string().min(1) }).parse(payload);
        return rpcOk({ statuses: annotations.listFileStatuses(parsed.repoId) });
      }

      case 'status/set': {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            file: z.string().min(1),
            status: ReadingStatusSchema,
          })
          .parse(payload);
        return rpcOk({
          status: await annotations.setFileStatus(parsed.repoId, parsed.file, parsed.status),
        });
      }

      case 'jobs/cancel': {
        const { jobId } = z.object({ jobId: z.string().min(1) }).parse(payload);
        return rpcOk({ cancelled: jobs.cancelJob(jobId) });
      }

      case 'cache/clear': {
        await projects.clearCache();
        return rpcOk({ cleared: true });
      }

      case 'diagnostics': {
        const cacheStats = await projects.getCacheStats();
        const metrics = traces.getLastMetrics();
        return rpcOk(
          DiagnosticsSnapshotSchema.parse({
            pluginVersion: PLUGIN_VERSION,
            cacheDir,
            cacheBytes: cacheStats.cacheBytes,
            cachedRepos: cacheStats.cachedRepos,
            reposCount: projects.listRepos().length,
            annotationsCount: annotations.countAllAnnotations(),
            readingPathsCount: annotations.listReadingPaths().length,
            lastAnalysisDurationMs: metrics.durationMs,
            lastFilesRead: metrics.filesRead,
            lastCacheHit: metrics.cacheHit,
            lastEstimatedTokens: metrics.estimatedTokens,
            recentLogs: jobs.getRecentLogs(),
          }),
        );
      }

      default:
        return rpcErr(CLEW_ERROR_CODES.NOT_FOUND, `Unknown Clew endpoint: ${endpoint}`);
    }
  }

  ctx.effect(() => {
    return ctx.connection.fetch.register({
      path: '/api/clew/rpc',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const result = await (async (): Promise<DshRpcResult> => {
          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return rpcErr(CLEW_ERROR_CODES.INVALID_INPUT, 'Request body must be valid JSON');
          }

          const envelope = z
            .object({
              endpoint: z.string().min(1),
              payload: z.unknown().optional(),
            })
            .safeParse(body);
          if (!envelope.success) {
            return rpcErr(CLEW_ERROR_CODES.INVALID_INPUT, 'Invalid RPC envelope');
          }

          try {
            return await dispatchRpc(envelope.data.endpoint, envelope.data.payload);
          } catch (err) {
            return formatError(err);
          }
        })();

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      },
    });
  }, 'clew:rpc');

  ctx.effect(() => {
    return ctx.connection.fetch.register({
      path: '/api/clew/events',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async (request) => {
        const encoder = new TextEncoder();
        let timer: ReturnType<typeof setInterval> | undefined;
        let unsubscribe: (() => void) | undefined;

        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const sendEvent = (event: ClewSseEvent) => {
              const frame = `id: ${event.seq}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(encoder.encode(frame));
            };

            sendEvent(
              bus.emit('heartbeat', 'clew-sse-init', { status: 'connected', readOnly: true }),
            );

            unsubscribe = bus.subscribe((evt) => {
              sendEvent(evt);
            });

            timer = setInterval(() => {
              sendEvent({
                seq: Date.now(),
                correlationId: 'clew-sse-heartbeat',
                type: 'heartbeat',
                timestamp: new Date().toISOString(),
                payload: { status: 'alive' },
              });
            }, 15_000);

            const onAbort = () => {
              if (timer !== undefined) {
                clearInterval(timer);
                timer = undefined;
              }
              unsubscribe?.();
              try {
                controller.close();
              } catch {
                // Already closed
              }
            };

            if (request.signal.aborted) {
              onAbort();
            } else {
              request.signal.addEventListener('abort', onAbort, { once: true });
            }
          },
          cancel() {
            if (timer !== undefined) {
              clearInterval(timer);
              timer = undefined;
            }
            unsubscribe?.();
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        });
      },
    });
  }, 'clew:sse');

  const hostModuleDir = dirname(fileURLToPath(import.meta.url));
  const elkWorkerPath = resolve(hostModuleDir, 'elk-worker.js');
  ctx.effect(() => {
    return ctx.connection.fetch.register({
      path: '/api/clew/elk-worker.js',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: async () => {
        try {
          const js = await readFile(elkWorkerPath, 'utf8');
          return new Response(js, {
            status: 200,
            headers: {
              'Content-Type': 'application/javascript; charset=utf-8',
              'Cache-Control': 'public, max-age=300',
            },
          });
        } catch {
          return new Response('// worker unavailable', { status: 404 });
        }
      },
    });
  }, 'clew:elk-worker');
}

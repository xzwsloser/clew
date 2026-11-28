import { z } from 'zod';
import { HealthCheckRequestSchema, HealthCheckResponseSchema } from '@clew/shared';
import { P0_SUPPORTED_LANGUAGES } from '@clew/engine';
import type { DshToolDefinition } from '../../types/dsh.js';
import type { ProjectService } from '../services/project-service.js';
import type { TraceService } from '../services/trace-service.js';

export interface ClewToolsDeps {
  pluginVersion: string;
  registeredSkills: string[];
  hasStorage: () => boolean;
  hasAgents: () => boolean;
  bumpPing: () => Promise<number>;
  projects: ProjectService;
  traces: TraceService;
}

function textOutput(value: unknown) {
  return [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }];
}

export function buildClewToolDefinitions(deps: ClewToolsDeps): DshToolDefinition[] {
  const registeredToolNames = [
    'clew_health',
    'clew_repo_overview',
    'clew_search_code',
    'clew_goto_definition',
    'clew_find_references',
    'clew_expand_subgraph',
    'clew_read_span',
  ];

  return [
    {
      name: 'clew_health',
      description: 'Read-only health and capability check for the Clew code reading plugin.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: { echo: { type: 'string' } },
      },
      output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => textOutput(v) },
      isConcurrencySafe: () => true,
      execute: async (rawArgs) => {
        const parsed = HealthCheckRequestSchema.parse(rawArgs ?? {});
        const persistedPings = await deps.bumpPing();
        return HealthCheckResponseSchema.parse({
          ok: true,
          plugin: '@clew/dsh-plugin',
          version: deps.pluginVersion,
          readOnly: true,
          supportedLanguages: [...P0_SUPPORTED_LANGUAGES],
          registeredTools: registeredToolNames,
          registeredSkills: deps.registeredSkills,
          storageReady: deps.hasStorage(),
          agentServiceAvailable: deps.hasAgents(),
          persistedPings,
          timestamp: new Date().toISOString(),
          ...(parsed.echo !== undefined ? { echo: parsed.echo } : {}),
        });
      },
    },
    {
      name: 'clew_repo_overview',
      description: 'Return language distribution, build systems, core modules, entry points, and recommended reading paths for an indexed repository.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: { repoId: { type: 'string' } },
        required: ['repoId'],
      },
      output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => textOutput(v) },
      isConcurrencySafe: () => true,
      execute: async (rawArgs) => {
        const { repoId } = z.object({ repoId: z.string().min(1) }).parse(rawArgs);
        return deps.projects.getOverview(repoId);
      },
    },
    {
      name: 'clew_search_code',
      description: 'Fast read-only global ripgrep text/regex search inside an indexed repository.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          repoId: { type: 'string' },
          query: { type: 'string' },
          caseSensitive: { type: 'boolean' },
          regex: { type: 'boolean' },
          subpath: { type: 'string' },
        },
        required: ['repoId', 'query'],
      },
      output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => textOutput(v) },
      isConcurrencySafe: () => true,
      execute: async (rawArgs) => {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            query: z.string().min(1),
            caseSensitive: z.boolean().optional(),
            regex: z.boolean().optional(),
            subpath: z.string().optional(),
          })
          .parse(rawArgs);
        return { hits: await deps.projects.textSearch(parsed.repoId, parsed) };
      },
    },
    {
      name: 'clew_goto_definition',
      description: 'LSP-free Go-to-Definition ranked by lexical scope, resolved imports, sibling module, and global symbol table.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          repoId: { type: 'string' },
          file: { type: 'string' },
          line: { type: 'integer' },
          symbolName: { type: 'string' },
        },
        required: ['repoId', 'file', 'line', 'symbolName'],
      },
      output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => textOutput(v) },
      isConcurrencySafe: () => true,
      execute: async (rawArgs) => {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            file: z.string().min(1),
            line: z.number().int().positive(),
            symbolName: z.string().min(1),
          })
          .parse(rawArgs);
        return deps.projects.gotoDefinition(parsed.repoId, parsed.file, parsed.line, parsed.symbolName);
      },
    },
    {
      name: 'clew_find_references',
      description: 'Find AST-filtered references across the repository (drops comments and string literals).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          repoId: { type: 'string' },
          symbolName: { type: 'string' },
        },
        required: ['repoId', 'symbolName'],
      },
      output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => textOutput(v) },
      isConcurrencySafe: () => true,
      execute: async (rawArgs) => {
        const parsed = z.object({ repoId: z.string().min(1), symbolName: z.string().min(1) }).parse(rawArgs);
        return { references: await deps.projects.findRefs(parsed.repoId, parsed.symbolName) };
      },
    },
    {
      name: 'clew_expand_subgraph',
      description: 'Retrieve and verify a bounded implementation trace graph for a reading goal.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          repoId: { type: 'string' },
          goal: { type: 'string' },
          focusSymbolId: { type: 'string' },
        },
        required: ['repoId', 'goal'],
      },
      output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => textOutput(v) },
      isConcurrencySafe: () => true,
      execute: async (rawArgs) => {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            goal: z.string().min(1),
            focusSymbolId: z.string().optional(),
          })
          .parse(rawArgs);
        return deps.traces.runTrace(parsed);
      },
    },
    {
      name: 'clew_read_span',
      description: 'Read a bounded, line-numbered source span inside an indexed repository (read-only).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          repoId: { type: 'string' },
          file: { type: 'string' },
          startLine: { type: 'integer' },
          endLine: { type: 'integer' },
        },
        required: ['repoId', 'file'],
      },
      output: { schema: { type: 'object', additionalProperties: true }, render: (_a, v) => textOutput(v) },
      isConcurrencySafe: () => true,
      execute: async (rawArgs) => {
        const parsed = z
          .object({
            repoId: z.string().min(1),
            file: z.string().min(1),
            startLine: z.number().int().positive().optional(),
            endLine: z.number().int().positive().optional(),
          })
          .parse(rawArgs);
        return deps.projects.readFile(parsed.repoId, parsed.file, parsed.startLine, parsed.endLine);
      },
    },
  ];
}

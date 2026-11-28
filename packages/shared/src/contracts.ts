import { z } from 'zod';

export const SupportedLanguageSchema = z.enum([
  'python',
  'c',
  'cpp',
  'go',
  'rust',
  'typescript',
  'javascript',
  'text',
]);
export type SupportedLanguage = z.infer<typeof SupportedLanguageSchema>;

export const EdgeConfidenceSchema = z.enum([
  'source_verified_call',
  'static_dependency',
  'inferred_dynamic',
  'dataflow',
  'unverified',
]);
export type EdgeConfidence = z.infer<typeof EdgeConfidenceSchema>;

export const SymbolKindSchema = z.enum([
  'function',
  'method',
  'class',
  'struct',
  'interface',
  'trait',
  'enum',
  'type',
  'variable',
  'constant',
  'module',
]);
export type SymbolKind = z.infer<typeof SymbolKindSchema>;

export const ReferenceKindSchema = z.enum(['call', 'reference', 'import', 'declaration']);
export type ReferenceKind = z.infer<typeof ReferenceKindSchema>;

export const HealthCheckRequestSchema = z.object({
  echo: z.string().max(128).optional(),
});
export type HealthCheckRequest = z.infer<typeof HealthCheckRequestSchema>;

export const HealthCheckResponseSchema = z.object({
  ok: z.literal(true),
  plugin: z.string(),
  version: z.string(),
  readOnly: z.literal(true),
  supportedLanguages: z.array(SupportedLanguageSchema),
  registeredTools: z.array(z.string()),
  registeredSkills: z.array(z.string()),
  storageReady: z.boolean(),
  agentServiceAvailable: z.boolean(),
  persistedPings: z.number().int().nonnegative(),
  timestamp: z.string(),
  echo: z.string().optional(),
});
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

export const AgentPingRequestSchema = z.object({
  prompt: z.string().min(1).max(400).optional(),
});
export type AgentPingRequest = z.infer<typeof AgentPingRequestSchema>;

export const AgentPingResponseSchema = z.object({
  ok: z.boolean(),
  mode: z.enum(['host_agent', 'host_capability_check']),
  sessionId: z.string().optional(),
  message: z.string(),
  skillsAvailable: z.array(z.string()),
});
export type AgentPingResponse = z.infer<typeof AgentPingResponseSchema>;

export const GitMetadataSchema = z.object({
  isGitRepo: z.boolean(),
  branch: z.string().nullable(),
  headSha: z.string().nullable(),
  dirtyFingerprint: z.string().nullable(),
  remoteUrl: z.string().nullable(),
});
export type GitMetadata = z.infer<typeof GitMetadataSchema>;

export const ScannedFileSchema = z.object({
  path: z.string(),
  language: SupportedLanguageSchema,
  sizeBytes: z.number().int().nonnegative(),
  mtimeMs: z.number().nonnegative(),
  lineCount: z.number().int().nonnegative().optional(),
});
export type ScannedFile = z.infer<typeof ScannedFileSchema>;

export const FileTreeNodeSchema: z.ZodType<FileTreeNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    path: z.string(),
    kind: z.enum(['directory', 'file']),
    language: SupportedLanguageSchema.optional(),
    children: z.array(FileTreeNodeSchema).optional(),
  }),
);
export interface FileTreeNode {
  name: string;
  path: string;
  kind: 'directory' | 'file';
  language?: SupportedLanguage;
  children?: FileTreeNode[];
}

export const SymbolRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  qualifiedName: z.string(),
  kind: SymbolKindSchema,
  file: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  startColumn: z.number().int().nonnegative(),
  signature: z.string(),
  containerName: z.string().optional(),
  exported: z.boolean(),
  docComment: z.string().optional(),
});
export type SymbolRecord = z.infer<typeof SymbolRecordSchema>;

export const ImportRecordSchema = z.object({
  file: z.string(),
  specifier: z.string(),
  resolvedPath: z.string().optional(),
  importedNames: z.array(z.string()),
  isWildcard: z.boolean().default(false),
  line: z.number().int().positive(),
});
export type ImportRecord = z.infer<typeof ImportRecordSchema>;

export const CallSiteRecordSchema = z.object({
  file: z.string(),
  callerSymbolId: z.string().optional(),
  callerName: z.string().optional(),
  calleeName: z.string(),
  qualifier: z.string().optional(),
  line: z.number().int().positive(),
  column: z.number().int().nonnegative(),
  snippet: z.string(),
});
export type CallSiteRecord = z.infer<typeof CallSiteRecordSchema>;

export const OutlineNodeSchema: z.ZodType<OutlineNode> = z.lazy(() =>
  z.object({
    symbolId: z.string(),
    name: z.string(),
    kind: SymbolKindSchema,
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
    children: z.array(OutlineNodeSchema),
  }),
);
export interface OutlineNode {
  symbolId: string;
  name: string;
  kind: z.infer<typeof SymbolKindSchema>;
  startLine: number;
  endLine: number;
  children: OutlineNode[];
}

export const DefinitionCandidateSchema = z.object({
  symbol: SymbolRecordSchema,
  tier: z.enum(['lexical_scope', 'resolved_import', 'sibling_module', 'global']),
  score: z.number(),
  reason: z.string(),
});
export type DefinitionCandidate = z.infer<typeof DefinitionCandidateSchema>;

export const DefinitionResultSchema = z.object({
  mode: z.enum(['jump', 'peek', 'not_found']),
  candidates: z.array(DefinitionCandidateSchema),
});
export type DefinitionResult = z.infer<typeof DefinitionResultSchema>;

export const ReferenceHitSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  lineText: z.string(),
  kind: ReferenceKindSchema,
  astFiltered: z.boolean(),
});
export type ReferenceHit = z.infer<typeof ReferenceHitSchema>;

export const SearchHitSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  lineText: z.string(),
  language: SupportedLanguageSchema,
});
export type SearchHit = z.infer<typeof SearchHitSchema>;

export const FuzzyItemSchema = z.object({
  kind: z.enum(['file', 'symbol']),
  label: z.string(),
  detail: z.string(),
  file: z.string(),
  line: z.number().int().positive().optional(),
  symbolKind: SymbolKindSchema.optional(),
  language: SupportedLanguageSchema.optional(),
  score: z.number(),
});
export type FuzzyItem = z.infer<typeof FuzzyItemSchema>;

export const RepoOverviewSchema = z.object({
  repoId: z.string(),
  name: z.string(),
  rootPath: z.string(),
  git: GitMetadataSchema,
  totalFiles: z.number().int().nonnegative(),
  totalSymbols: z.number().int().nonnegative(),
  languages: z.array(
    z.object({
      language: SupportedLanguageSchema,
      fileCount: z.number().int().nonnegative(),
      percentage: z.number().nonnegative(),
    }),
  ),
  buildSystems: z.array(z.string()),
  coreModules: z.array(
    z.object({
      path: z.string(),
      fileCount: z.number().int().nonnegative(),
      primaryLanguage: SupportedLanguageSchema,
      keySymbols: z.array(z.string()),
    }),
  ),
  entryPoints: z.array(
    z.object({
      file: z.string(),
      symbolName: z.string().optional(),
      line: z.number().int().positive(),
      reason: z.string(),
    }),
  ),
  recommendedPaths: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      steps: z.array(
        z.object({
          file: z.string(),
          line: z.number().int().positive(),
          symbolName: z.string().optional(),
        }),
      ),
    }),
  ),
});
export type RepoOverview = z.infer<typeof RepoOverviewSchema>;

export const TraceNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  qualifiedName: z.string(),
  kind: SymbolKindSchema,
  file: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  language: SupportedLanguageSchema,
  moduleGroup: z.string(),
  role: z.enum(['entry', 'intermediate', 'sink', 'data_structure', 'external']),
  summary: z.string().optional(),
  verified: z.boolean(),
});
export type TraceNode = z.infer<typeof TraceNodeSchema>;

export const TraceEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  confidence: EdgeConfidenceSchema,
  file: z.string().optional(),
  line: z.number().int().positive().optional(),
  evidenceSnippet: z.string().optional(),
  label: z.string().optional(),
});
export type TraceEdge = z.infer<typeof TraceEdgeSchema>;

export const TraceGraphSchema = z.object({
  traceId: z.string(),
  repoId: z.string(),
  goal: z.string(),
  createdAt: z.string(),
  snapshotSha: z.string().nullable(),
  nodes: z.array(TraceNodeSchema),
  edges: z.array(TraceEdgeSchema),
  narrative: z.string(),
  citations: z.array(
    z.object({
      file: z.string(),
      line: z.number().int().positive(),
      symbolName: z.string().optional(),
      verified: z.boolean(),
    }),
  ),
  telemetry: z.object({
    durationMs: z.number().nonnegative(),
    filesRead: z.number().int().nonnegative(),
    cacheHit: z.boolean(),
    estimatedTokens: z.number().int().nonnegative(),
    trimmedItems: z.number().int().nonnegative(),
    agentEnhanced: z.boolean(),
  }),
});
export type TraceGraph = z.infer<typeof TraceGraphSchema>;

export const RepoRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  rootPath: z.string(),
  sourceType: z.enum(['local', 'git']),
  sourceUrl: z.string().optional(),
  git: GitMetadataSchema,
  status: z.enum(['queued', 'scanning', 'indexing', 'ready', 'failed', 'cancelled']),
  indexedFiles: z.number().int().nonnegative(),
  totalFiles: z.number().int().nonnegative(),
  totalSymbols: z.number().int().nonnegative(),
  cacheHit: z.boolean(),
  lastIndexedAt: z.string().nullable(),
  errorMessage: z.string().optional(),
});
export type RepoRecord = z.infer<typeof RepoRecordSchema>;

export const AnnotationReplySchema = z.object({
  id: z.string(),
  author: z.enum(['user', 'assistant']),
  body: z.string(),
  createdAt: z.string(),
});
export type AnnotationReply = z.infer<typeof AnnotationReplySchema>;

export const AnnotationRecordSchema = z.object({
  id: z.string(),
  repoId: z.string(),
  file: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  anchorTextHash: z.string(),
  anchorLineText: z.string(),
  anchorCommitSha: z.string().nullable(),
  status: z.enum(['open', 'resolved', 'stale']),
  title: z.string().optional(),
  body: z.string(),
  tags: z.array(z.string()),
  replies: z.array(AnnotationReplySchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AnnotationRecord = z.infer<typeof AnnotationRecordSchema>;

export const ExplorationStepSchema = z.object({
  id: z.string(),
  file: z.string(),
  line: z.number().int().positive(),
  symbolName: z.string().optional(),
  action: z.enum(['open', 'definition', 'reference', 'trace_node', 'search', 'citation']),
  timestamp: z.string(),
});
export type ExplorationStep = z.infer<typeof ExplorationStepSchema>;

export const ReadingPathRecordSchema = z.object({
  id: z.string(),
  repoId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  steps: z.array(ExplorationStepSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ReadingPathRecord = z.infer<typeof ReadingPathRecordSchema>;

export const JobStateSchema = z.object({
  jobId: z.string(),
  repoId: z.string(),
  kind: z.enum(['index', 'trace', 'qa']),
  stage: z.enum([
    'queued',
    'scanning',
    'parsing',
    'indexing',
    'retrieving',
    'agent_analyzing',
    'verifying',
    'ready',
    'cancelled',
    'failed',
  ]),
  processed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  startedAt: z.string(),
  updatedAt: z.string(),
  error: z.string().optional(),
});
export type JobState = z.infer<typeof JobStateSchema>;

export const DiagnosticsSnapshotSchema = z.object({
  pluginVersion: z.string(),
  cacheDir: z.string(),
  cacheBytes: z.number().int().nonnegative(),
  cachedRepos: z.number().int().nonnegative(),
  reposCount: z.number().int().nonnegative(),
  annotationsCount: z.number().int().nonnegative(),
  readingPathsCount: z.number().int().nonnegative(),
  lastAnalysisDurationMs: z.number().nonnegative().nullable(),
  lastFilesRead: z.number().int().nonnegative(),
  lastCacheHit: z.boolean().nullable(),
  lastEstimatedTokens: z.number().int().nonnegative(),
  recentLogs: z.array(
    z.object({
      timestamp: z.string(),
      level: z.enum(['info', 'warn', 'error']),
      message: z.string(),
    }),
  ),
});
export type DiagnosticsSnapshot = z.infer<typeof DiagnosticsSnapshotSchema>;

export const ClewSseEventSchema = z.object({
  seq: z.number().int().nonnegative(),
  correlationId: z.string(),
  type: z.enum(['heartbeat', 'job_progress', 'agent_delta', 'trace_ready', 'error']),
  timestamp: z.string(),
  payload: z.record(z.string(), z.unknown()),
});
export type ClewSseEvent = z.infer<typeof ClewSseEventSchema>;

export const ReadingStatusSchema = z.enum(['unread', 'understood', 'deep_dive', 'core_entry']);
export type ReadingStatus = z.infer<typeof ReadingStatusSchema>;

export const FileStatusRecordSchema = z.object({
  id: z.string(),
  repoId: z.string(),
  file: z.string(),
  status: ReadingStatusSchema,
  updatedAt: z.string(),
});
export type FileStatusRecord = z.infer<typeof FileStatusRecordSchema>;

export const SymbolPeekResultSchema = z.object({
  found: z.boolean(),
  symbol: SymbolRecordSchema.nullable(),
  docComment: z.string().nullable(),
  snippetLines: z.array(
    z.object({
      number: z.number().int().positive(),
      text: z.string(),
    }),
  ),
  totalLines: z.number().int().nonnegative(),
});
export type SymbolPeekResult = z.infer<typeof SymbolPeekResultSchema>;

export const LineCommitInfoSchema = z.object({
  sha: z.string(),
  shortSha: z.string(),
  author: z.string(),
  date: z.string(),
  subject: z.string(),
});
export type LineCommitInfo = z.infer<typeof LineCommitInfoSchema>;

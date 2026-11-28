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

export const ClewSseEventSchema = z.object({
  seq: z.number().int().nonnegative(),
  correlationId: z.string(),
  type: z.enum(['heartbeat', 'job_progress', 'agent_delta', 'trace_ready', 'error']),
  timestamp: z.string(),
  payload: z.record(z.string(), z.unknown()),
});
export type ClewSseEvent = z.infer<typeof ClewSseEventSchema>;

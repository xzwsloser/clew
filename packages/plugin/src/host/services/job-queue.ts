import { randomUUID } from 'node:crypto';
import type { JobState } from '@clew/shared';
import type { ClewEventBus } from './event-bus.js';

export interface DiagnosticLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export class JobQueueService {
  private readonly jobs = new Map<string, JobState>();
  private readonly controllers = new Map<string, AbortController>();
  private readonly logs: DiagnosticLogEntry[] = [];
  private readonly maxLogs = 80;

  constructor(private readonly bus: ClewEventBus) {}

  log(level: DiagnosticLogEntry['level'], message: string): void {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
    });
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getRecentLogs(): DiagnosticLogEntry[] {
    return [...this.logs];
  }

  getJob(jobId: string): JobState | undefined {
    return this.jobs.get(jobId);
  }

  cancelJob(jobId: string): boolean {
    const controller = this.controllers.get(jobId);
    const job = this.jobs.get(jobId);
    if (!controller || !job) return false;
    controller.abort();
    const updated: JobState = {
      ...job,
      stage: 'cancelled',
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, updated);
    this.bus.emit('job_progress', jobId, updated as unknown as Record<string, unknown>);
    this.log('warn', `Job ${jobId} (${job.kind}) cancelled by user`);
    return true;
  }

  async runJob<T>(
    repoId: string,
    kind: JobState['kind'],
    fn: (ctx: {
      jobId: string;
      signal: AbortSignal;
      update: (stage: JobState['stage'], processed: number, total: number) => void;
    }) => Promise<T>,
  ): Promise<{ jobId: string; result: T }> {
    const jobId = randomUUID();
    const controller = new AbortController();
    this.controllers.set(jobId, controller);

    const now = new Date().toISOString();
    const initial: JobState = {
      jobId,
      repoId,
      kind,
      stage: 'queued',
      processed: 0,
      total: 0,
      startedAt: now,
      updatedAt: now,
    };
    this.jobs.set(jobId, initial);
    this.bus.emit('job_progress', jobId, initial as unknown as Record<string, unknown>);

    const update = (stage: JobState['stage'], processed: number, total: number) => {
      const prev = this.jobs.get(jobId) ?? initial;
      const next: JobState = {
        ...prev,
        stage,
        processed,
        total,
        updatedAt: new Date().toISOString(),
      };
      this.jobs.set(jobId, next);
      this.bus.emit('job_progress', jobId, next as unknown as Record<string, unknown>);
    };

    try {
      const result = await fn({ jobId, signal: controller.signal, update });
      update('ready', this.jobs.get(jobId)?.total ?? 1, this.jobs.get(jobId)?.total ?? 1);
      return { jobId, result };
    } catch (err) {
      const prev = this.jobs.get(jobId) ?? initial;
      const isCancelled = controller.signal.aborted;
      const next: JobState = {
        ...prev,
        stage: isCancelled ? 'cancelled' : 'failed',
        updatedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
      this.jobs.set(jobId, next);
      this.bus.emit('job_progress', jobId, next as unknown as Record<string, unknown>);
      this.log(isCancelled ? 'warn' : 'error', `Job ${jobId} failed: ${next.error}`);
      throw err;
    } finally {
      this.controllers.delete(jobId);
    }
  }
}

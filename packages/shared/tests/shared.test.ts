import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  ClewError,
  HealthCheckResponseSchema,
  resolveSafeRepoPath,
  toRepoRelativePath,
} from '../src/index.js';

describe('@clew/shared path safety & contracts', () => {
  it('resolves safe relative paths and rejects traversal and symlink escapes', () => {
    const base = mkdtempSync(join(tmpdir(), 'clew-shared-test-'));
    const repo = join(base, 'repo');
    const outside = join(base, 'outside');
    mkdirSync(join(repo, 'src'), { recursive: true });
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(repo, 'src', 'main.py'), 'print(1)\n');
    writeFileSync(join(outside, 'secret.txt'), 'secret\n');
    symlinkSync(join(outside, 'secret.txt'), join(repo, 'src', 'leak.txt'));

    try {
      expect(toRepoRelativePath(repo, 'src/main.py')).toBe('src/main.py');
      expect(() => resolveSafeRepoPath(repo, '../outside/secret.txt')).toThrow(ClewError);
      expect(() => resolveSafeRepoPath(repo, 'src/leak.txt')).toThrow(ClewError);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('validates HealthCheckResponseSchema strictly', () => {
    const parsed = HealthCheckResponseSchema.parse({
      ok: true,
      plugin: '@clew/dsh-plugin',
      version: '0.1.0',
      readOnly: true,
      supportedLanguages: ['python', 'c', 'cpp', 'go', 'rust', 'typescript', 'javascript'],
      registeredTools: ['clew_health'],
      registeredSkills: ['clew-source-analysis'],
      storageReady: true,
      agentServiceAvailable: true,
      persistedPings: 1,
      timestamp: new Date().toISOString(),
    });
    expect(parsed.readOnly).toBe(true);
  });
});

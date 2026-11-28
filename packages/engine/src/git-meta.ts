import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import type { GitMetadata } from '@clew/shared';

const execFileAsync = promisify(execFile);

async function runGit(repoRoot: string, args: string[], signal?: AbortSignal): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', repoRoot, ...args], {
      maxBuffer: 4 * 1024 * 1024,
      signal,
    });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Safely inspect Git metadata (branch, HEAD SHA, dirty status) without executing any repository scripts.
 */
export async function readGitMetadata(repoRoot: string, signal?: AbortSignal): Promise<GitMetadata> {
  const inside = await runGit(repoRoot, ['rev-parse', '--is-inside-work-tree'], signal);
  if (inside !== 'true') {
    return {
      isGitRepo: false,
      branch: null,
      headSha: null,
      dirtyFingerprint: null,
      remoteUrl: null,
    };
  }

  const [branchRaw, headSha, statusPorcelain, remoteUrl] = await Promise.all([
    runGit(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD'], signal),
    runGit(repoRoot, ['rev-parse', 'HEAD'], signal),
    runGit(repoRoot, ['status', '--porcelain'], signal),
    runGit(repoRoot, ['config', '--get', 'remote.origin.url'], signal),
  ]);

  const dirtyFingerprint =
    statusPorcelain && statusPorcelain.length > 0
      ? createHash('sha256').update(statusPorcelain).digest('hex').slice(0, 16)
      : 'clean';

  return {
    isGitRepo: true,
    branch: branchRaw === 'HEAD' ? 'detached' : branchRaw,
    headSha,
    dirtyFingerprint,
    remoteUrl,
  };
}

export interface GitChangedFile {
  status: string;
  path: string;
}

/**
 * Compute changed file paths relative to a baseline commit SHA using read-only `git diff`.
 */
export async function listGitChangedFiles(
  repoRoot: string,
  fromSha: string,
  toSha = 'HEAD',
  signal?: AbortSignal,
): Promise<GitChangedFile[] | null> {
  const out = await runGit(repoRoot, ['diff', '--name-status', fromSha, toSha], signal);
  if (out === null) {
    return null;
  }
  const results: GitChangedFile[] = [];
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('\t');
    const status = parts[0]?.[0] ?? 'M';
    const path = parts[parts.length - 1];
    if (path) {
      results.push({ status, path: path.replaceAll('\\', '/') });
    }
  }
  return results;
}

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { relative } from 'node:path';
import { promisify } from 'node:util';
import { resolveSafeRepoPath, type GitMetadata, type LineCommitInfo } from '@clew/shared';

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

/**
 * Safely read up to 5 recent Git commits touching a line range (`git log -L`) in read-only mode.
 */
export async function readLineGitContext(
  repoRoot: string,
  relativeFile: string,
  startLine: number,
  endLine: number,
  signal?: AbortSignal,
): Promise<LineCommitInfo[]> {
  let cleanRel: string;
  try {
    const abs = resolveSafeRepoPath(repoRoot, relativeFile);
    cleanRel = relative(repoRoot, abs).replaceAll('\\', '/');
    if (!cleanRel || cleanRel.startsWith('..')) return [];
  } catch {
    return [];
  }

  const start = Math.max(1, Math.floor(startLine));
  const end = Math.max(start, Math.floor(endLine));
  const out = await runGit(
    repoRoot,
    [
      'log',
      '-n',
      '5',
      '--no-patch',
      '--format=%H%x1f%h%x1f%an%x1f%aI%x1f%s',
      '-L',
      `${start},${end}:${cleanRel}`,
    ],
    signal,
  );
  if (!out) return [];

  const commits: LineCommitInfo[] = [];
  for (const line of out.split('\n')) {
    if (!line.includes('\x1f')) continue;
    const [sha, shortSha, author, date, subject] = line.split('\x1f');
    if (sha && shortSha && author && date && subject !== undefined) {
      commits.push({ sha, shortSha, author, date, subject });
    }
  }
  return commits;
}

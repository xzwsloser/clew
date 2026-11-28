import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GitMetadata } from '@clew/shared';
import type { ParsedFileArtifacts } from './parsers/fallback-extractor.js';

export const ENGINE_PARSER_VERSION = 1;

export interface CachedFileEntry {
  path: string;
  sizeBytes: number;
  mtimeMs: number;
  contentHash: string;
  artifacts: ParsedFileArtifacts;
}

export interface RepoCacheSnapshot {
  schemaVersion: number;
  parserVersion: number;
  repoRoot: string;
  headSha: string | null;
  dirtyFingerprint: string | null;
  updatedAt: string;
  files: Record<string, CachedFileEntry>;
}

export function buildCacheKey(repoRoot: string, git: GitMetadata): string {
  return createHash('sha256')
    .update(`${repoRoot}|${git.headSha ?? 'no-git'}|${git.dirtyFingerprint ?? 'none'}|v${ENGINE_PARSER_VERSION}`)
    .digest('hex')
    .slice(0, 24);
}

export function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function loadRepoCache(
  cacheDir: string,
  repoRoot: string,
  git: GitMetadata,
): Promise<RepoCacheSnapshot | null> {
  const key = buildCacheKey(repoRoot, git);
  const filePath = join(cacheDir, `${key}.json`);
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as RepoCacheSnapshot;
    if (
      parsed.schemaVersion !== 1 ||
      parsed.parserVersion !== ENGINE_PARSER_VERSION ||
      parsed.repoRoot !== repoRoot ||
      typeof parsed.files !== 'object'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveRepoCache(
  cacheDir: string,
  repoRoot: string,
  git: GitMetadata,
  snapshot: RepoCacheSnapshot,
): Promise<void> {
  await mkdir(cacheDir, { recursive: true });
  const key = buildCacheKey(repoRoot, git);
  const filePath = join(cacheDir, `${key}.json`);
  await writeFile(filePath, JSON.stringify(snapshot), 'utf8');
}

export async function measureCacheDirectory(
  cacheDir: string,
): Promise<{ totalBytes: number; fileCount: number }> {
  try {
    const entries = await readdir(cacheDir, { withFileTypes: true });
    let totalBytes = 0;
    let fileCount = 0;
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const st = await stat(join(cacheDir, entry.name));
      totalBytes += st.size;
      fileCount += 1;
    }
    return { totalBytes, fileCount };
  } catch {
    return { totalBytes: 0, fileCount: 0 };
  }
}

export async function clearCacheDirectory(cacheDir: string): Promise<void> {
  await rm(cacheDir, { recursive: true, force: true });
}

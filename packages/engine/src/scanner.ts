import { createReadStream } from 'node:fs';
import { open, readdir, readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { createInterface } from 'node:readline';
import ignore from 'ignore';
import {
  CLEW_ERROR_CODES,
  ClewError,
  resolveSafeRepoPath,
  toRepoRelativePath,
  type FileTreeNode,
  type ScannedFile,
} from '@clew/shared';
import { detectLanguage } from './language-detector.js';

const DEFAULT_IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  '.pnpm-store',
  'dist',
  'build',
  'out',
  'target',
  '__pycache__',
  '.venv',
  'venv',
  '.mypy_cache',
  '.pytest_cache',
  '.ruff_cache',
  '.next',
  '.nuxt',
  '.turbo',
  'coverage',
  '.clew-cache',
]);

const DEFAULT_IGNORED_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'Cargo.lock',
  'poetry.lock',
  'uv.lock',
  'go.sum',
]);

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MiB default cap for P0 AST/text indexing

export interface ScanRepositoryOptions {
  maxFileSizeBytes?: number;
  maxFiles?: number;
  signal?: AbortSignal;
  onProgress?: (processed: number, currentFile: string) => void;
}

export interface ScanRepositoryResult {
  repoRoot: string;
  files: ScannedFile[];
  skippedLargeOrBinary: number;
  tree: FileTreeNode;
}

async function isBinaryFile(absPath: string): Promise<boolean> {
  const handle = await open(absPath, 'r');
  try {
    const buf = Buffer.alloc(4096);
    const { bytesRead } = await handle.read(buf, 0, 4096, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
    return false;
  } finally {
    await handle.close();
  }
}

async function loadIgnoreMatcher(repoRoot: string): Promise<ReturnType<typeof ignore>> {
  const ig = ignore();
  for (const fileName of ['.gitignore', '.clewignore']) {
    try {
      const content = await readFile(join(repoRoot, fileName), 'utf8');
      ig.add(content);
    } catch {
      // Optional ignore file absent
    }
  }
  return ig;
}

function shouldSkipFilename(name: string): boolean {
  if (DEFAULT_IGNORED_FILES.has(name)) return true;
  if (name.endsWith('.min.js') || name.endsWith('.min.css') || name.endsWith('.map')) return true;
  return false;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ClewError(CLEW_ERROR_CODES.CANCELLED, 'Repository scan cancelled');
  }
}

/**
 * Scan a repository safely (read-only, respects `.gitignore` & `.clewignore`, skips symlinks escaping root, binaries, lockfiles).
 */
export async function scanRepository(
  repoRoot: string,
  options: ScanRepositoryOptions = {},
): Promise<ScanRepositoryResult> {
  const canonicalRoot = resolveSafeRepoPath(repoRoot, '.');
  const maxFileSizeBytes = options.maxFileSizeBytes ?? MAX_FILE_SIZE_BYTES;
  const maxFiles = options.maxFiles ?? 25_000;
  const ig = await loadIgnoreMatcher(canonicalRoot);

  const files: ScannedFile[] = [];
  let skippedLargeOrBinary = 0;

  async function walk(absDir: string): Promise<FileTreeNode> {
    throwIfAborted(options.signal);
    const dirRel = toRepoRelativePath(canonicalRoot, absDir);
    const entries = await readdir(absDir, { withFileTypes: true });
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const children: FileTreeNode[] = [];
    for (const entry of entries) {
      throwIfAborted(options.signal);
      if (files.length >= maxFiles) break;

      const relPath = dirRel ? `${dirRel}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        // Verify symlink stays strictly inside repoRoot; skip directories to prevent cycles
        try {
          resolveSafeRepoPath(canonicalRoot, relPath);
        } catch {
          continue;
        }
        if (entry.isDirectory()) continue;
      }

      if (entry.isDirectory()) {
        if (DEFAULT_IGNORED_DIRS.has(entry.name) || ig.ignores(`${relPath}/`)) {
          continue;
        }
        const childTree = await walk(join(absDir, entry.name));
        if ((childTree.children?.length ?? 0) > 0) {
          children.push(childTree);
        }
        continue;
      }

      if (!entry.isFile()) continue;
      if (shouldSkipFilename(entry.name) || ig.ignores(relPath)) continue;

      const absFile = resolveSafeRepoPath(canonicalRoot, relPath);
      const st = await stat(absFile);
      if (st.size > maxFileSizeBytes) {
        skippedLargeOrBinary += 1;
        continue;
      }
      if (await isBinaryFile(absFile)) {
        skippedLargeOrBinary += 1;
        continue;
      }

      const language = detectLanguage(relPath);
      files.push({
        path: relPath,
        language,
        sizeBytes: st.size,
        mtimeMs: st.mtimeMs,
      });
      children.push({
        name: entry.name,
        path: relPath,
        kind: 'file',
        language,
      });

      if (options.onProgress && files.length % 25 === 0) {
        options.onProgress(files.length, relPath);
      }
    }

    return {
      name: dirRel ? basename(absDir) : basename(canonicalRoot),
      path: dirRel,
      kind: 'directory',
      children,
    };
  }

  const tree = await walk(canonicalRoot);
  return {
    repoRoot: canonicalRoot,
    files,
    skippedLargeOrBinary,
    tree,
  };
}

export interface FileSpanResult {
  path: string;
  language: ReturnType<typeof detectLanguage>;
  totalLines: number;
  startLine: number;
  endLine: number;
  lines: Array<{ number: number; text: string }>;
}

/**
 * Stream a bounded line range `[startLine, endLine]` from a repository file with strict path-traversal guards.
 */
export async function readFileSpan(
  repoRoot: string,
  relPath: string,
  startLine = 1,
  endLine = 400,
): Promise<FileSpanResult> {
  const safePath = resolveSafeRepoPath(repoRoot, relPath);
  const normalizedRel = toRepoRelativePath(repoRoot, safePath);
  const clampedStart = Math.max(1, startLine);
  const clampedEnd = Math.max(clampedStart, endLine);

  const lines: Array<{ number: number; text: string }> = [];
  let lineNo = 0;

  const rl = createInterface({
    input: createReadStream(safePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const text of rl) {
    lineNo += 1;
    if (lineNo >= clampedStart && lineNo <= clampedEnd) {
      lines.push({ number: lineNo, text });
    }
  }

  return {
    path: normalizedRel,
    language: detectLanguage(normalizedRel),
    totalLines: lineNo,
    startLine: clampedStart,
    endLine: Math.min(clampedEnd, Math.max(lineNo, clampedStart)),
    lines,
  };
}

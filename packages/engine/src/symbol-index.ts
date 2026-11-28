import { readFile } from 'node:fs/promises';
import { dirname, posix, resolve } from 'node:path';
import {
  CLEW_ERROR_CODES,
  ClewError,
  resolveSafeRepoPath,
  type CallSiteRecord,
  type FileTreeNode,
  type GitMetadata,
  type ImportRecord,
  type OutlineNode,
  type ScannedFile,
  type SymbolRecord,
} from '@clew/shared';
import {
  computeContentHash,
  ENGINE_PARSER_VERSION,
  loadRepoCache,
  saveRepoCache,
  type CachedFileEntry,
  type RepoCacheSnapshot,
} from './disk-cache.js';
import { readGitMetadata } from './git-meta.js';
import { parseSourceFile } from './parsers/ast-extractor.js';
import { scanRepository } from './scanner.js';

export interface RepositoryIndex {
  repoRoot: string;
  git: GitMetadata;
  tree: FileTreeNode;
  files: ScannedFile[];
  fileHashes: Map<string, string>;
  symbolsById: Map<string, SymbolRecord>;
  symbolsByName: Map<string, SymbolRecord[]>;
  symbolsByFile: Map<string, SymbolRecord[]>;
  importsByFile: Map<string, ImportRecord[]>;
  importedByFile: Map<string, Set<string>>;
  callSitesByFile: Map<string, CallSiteRecord[]>;
  callersByCalleeName: Map<string, CallSiteRecord[]>;
  outlineByFile: Map<string, OutlineNode[]>;
  cacheHit: boolean;
  reusedFiles: number;
  parsedFiles: number;
  durationMs: number;
}

export interface BuildIndexOptions {
  cacheDir?: string;
  signal?: AbortSignal;
  onProgress?: (stage: 'scanning' | 'parsing' | 'indexing', processed: number, total: number) => void;
}

function resolveImportCandidates(
  fromFile: string,
  specifier: string,
  allFileSet: Set<string>,
): string | undefined {
  if (!specifier) return undefined;
  const baseDir = posix.dirname(fromFile);
  const cleanSpec = specifier.replace(/\.(js|mjs|cjs|jsx)$/, '');

  const candidates: string[] = [];
  if (specifier.startsWith('.')) {
    const relJoined = posix.normalize(posix.join(baseDir, cleanSpec));
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.py', '.c', '.h', '.cpp', '.hpp', '']) {
      candidates.push(`${relJoined}${ext}`);
      candidates.push(`${relJoined}/index${ext}`);
    }
  } else {
    // Python dotted module or C/C++ header relative to repo root / directory
    const slashed = specifier.replaceAll('.', '/');
    candidates.push(
      specifier,
      posix.join(baseDir, specifier),
      `${slashed}.py`,
      `${slashed}/__init__.py`,
    );
  }

  for (const cand of candidates) {
    if (allFileSet.has(cand)) return cand;
  }
  return undefined;
}

/**
 * Build or incrementally update a multi-language repository symbol & dependency index.
 */
export async function buildRepositoryIndex(
  repoRoot: string,
  options: BuildIndexOptions = {},
): Promise<RepositoryIndex> {
  const startedAt = Date.now();
  const canonicalRoot = resolveSafeRepoPath(repoRoot, '.');

  const [git, scan] = await Promise.all([
    readGitMetadata(canonicalRoot, options.signal),
    scanRepository(canonicalRoot, {
      signal: options.signal,
      onProgress: (processed) => options.onProgress?.('scanning', processed, 0),
    }),
  ]);

  const priorCache = options.cacheDir
    ? await loadRepoCache(options.cacheDir, canonicalRoot, git)
    : null;

  const fileHashes = new Map<string, string>();
  const nextCacheFiles: Record<string, CachedFileEntry> = {};
  const allFileSet = new Set(scan.files.map((f) => f.path));

  let reusedFiles = 0;
  let parsedFiles = 0;
  const total = scan.files.length;

  for (let i = 0; i < scan.files.length; i++) {
    if (options.signal?.aborted) {
      throw new ClewError(CLEW_ERROR_CODES.CANCELLED, 'Indexing cancelled');
    }
    const file = scan.files[i]!;
    const cached = priorCache?.files[file.path];

    if (cached && cached.sizeBytes === file.sizeBytes && cached.mtimeMs === file.mtimeMs) {
      nextCacheFiles[file.path] = cached;
      fileHashes.set(file.path, cached.contentHash);
      reusedFiles += 1;
    } else {
      const absPath = resolveSafeRepoPath(canonicalRoot, file.path);
      const content = await readFile(absPath, 'utf8');
      const contentHash = computeContentHash(content);

      if (cached && cached.contentHash === contentHash) {
        nextCacheFiles[file.path] = { ...cached, sizeBytes: file.sizeBytes, mtimeMs: file.mtimeMs };
        fileHashes.set(file.path, contentHash);
        reusedFiles += 1;
      } else {
        const artifacts = await parseSourceFile(file.path, content, file.language);
        nextCacheFiles[file.path] = {
          path: file.path,
          sizeBytes: file.sizeBytes,
          mtimeMs: file.mtimeMs,
          contentHash,
          artifacts,
        };
        fileHashes.set(file.path, contentHash);
        parsedFiles += 1;
      }
    }

    if (options.onProgress && ((i + 1) % 20 === 0 || i + 1 === total)) {
      options.onProgress('parsing', i + 1, total);
    }
  }

  options.onProgress?.('indexing', total, total);

  const symbolsById = new Map<string, SymbolRecord>();
  const symbolsByName = new Map<string, SymbolRecord[]>();
  const symbolsByFile = new Map<string, SymbolRecord[]>();
  const importsByFile = new Map<string, ImportRecord[]>();
  const importedByFile = new Map<string, Set<string>>();
  const callSitesByFile = new Map<string, CallSiteRecord[]>();
  const callersByCalleeName = new Map<string, CallSiteRecord[]>();
  const outlineByFile = new Map<string, OutlineNode[]>();

  for (const file of scan.files) {
    const entry = nextCacheFiles[file.path];
    if (!entry) continue;
    const { artifacts } = entry;

    symbolsByFile.set(file.path, artifacts.symbols);
    outlineByFile.set(file.path, artifacts.outline);
    callSitesByFile.set(file.path, artifacts.callSites);

    for (const sym of artifacts.symbols) {
      symbolsById.set(sym.id, sym);
      const bucket = symbolsByName.get(sym.name) ?? [];
      bucket.push(sym);
      symbolsByName.set(sym.name, bucket);
    }

    const resolvedImports = artifacts.imports.map((imp) => {
      const resolvedPath = resolveImportCandidates(file.path, imp.specifier, allFileSet);
      if (resolvedPath) {
        const revSet = importedByFile.get(resolvedPath) ?? new Set<string>();
        revSet.add(file.path);
        importedByFile.set(resolvedPath, revSet);
      }
      return resolvedPath ? { ...imp, resolvedPath } : imp;
    });
    importsByFile.set(file.path, resolvedImports);

    for (const call of artifacts.callSites) {
      const list = callersByCalleeName.get(call.calleeName) ?? [];
      list.push(call);
      callersByCalleeName.set(call.calleeName, list);
    }
  }

  if (options.cacheDir) {
    const snapshot: RepoCacheSnapshot = {
      schemaVersion: 1,
      parserVersion: ENGINE_PARSER_VERSION,
      repoRoot: canonicalRoot,
      headSha: git.headSha,
      dirtyFingerprint: git.dirtyFingerprint,
      updatedAt: new Date().toISOString(),
      files: nextCacheFiles,
    };
    await saveRepoCache(resolve(options.cacheDir), canonicalRoot, git, snapshot);
  }

  // Keep dirname import check clean if needed
  void dirname;

  return {
    repoRoot: canonicalRoot,
    git,
    tree: scan.tree,
    files: scan.files,
    fileHashes,
    symbolsById,
    symbolsByName,
    symbolsByFile,
    importsByFile,
    importedByFile,
    callSitesByFile,
    callersByCalleeName,
    outlineByFile,
    cacheHit: Boolean(priorCache) && reusedFiles > 0,
    reusedFiles,
    parsedFiles,
    durationMs: Date.now() - startedAt,
  };
}

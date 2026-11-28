import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  CLEW_ERROR_CODES,
  ClewError,
  type DefinitionResult,
  type FileTreeNode,
  type FuzzyItem,
  type LineCommitInfo,
  type OutlineNode,
  type ReferenceHit,
  type RepoOverview,
  type RepoRecord,
  type SearchHit,
  type SymbolPeekResult,
} from '@clew/shared';
import {
  buildRepoOverview,
  buildRepositoryIndex,
  clearCacheDirectory,
  findReferences,
  fuzzySearchFilesAndSymbols,
  globalTextSearch,
  goToDefinition,
  measureCacheDirectory,
  peekSymbolPreview,
  readFileSpan,
  readGitMetadata,
  readLineGitContext,
  type FileSpanResult,
  type RepositoryIndex,
} from '@clew/engine';
import type { DshKvTable } from '../../types/dsh.js';
import type { JobQueueService } from './job-queue.js';

const execFileAsync = promisify(execFile);

export class ProjectService {
  private readonly indices = new Map<string, RepositoryIndex>();
  private readonly trees = new Map<string, FileTreeNode>();
  private readonly overviews = new Map<string, RepoOverview>();

  constructor(
    private readonly repoTable: DshKvTable<RepoRecord>,
    private readonly cacheDir: string,
    private readonly cloneRoot: string,
    private readonly jobs: JobQueueService,
  ) {}

  listRepos(): RepoRecord[] {
    return Array.from(this.repoTable.entries()).map(([, rec]) => rec);
  }

  getRepo(repoId: string): RepoRecord {
    const rec = this.repoTable.get(repoId);
    if (!rec) {
      throw new ClewError(CLEW_ERROR_CODES.NOT_FOUND, `Repository ${repoId} not found`);
    }
    return rec;
  }

  async importAndIndex(input: {
    sourceType: 'local' | 'git';
    location: string;
    name?: string;
  }): Promise<{ repo: RepoRecord; overview: RepoOverview; tree: FileTreeNode; jobId: string }> {
    let rootPath: string;
    let sourceUrl: string | undefined;

    if (input.sourceType === 'git') {
      const url = input.location.trim();
      if (!/^https:\/\/|^git@|^ssh:\/\//.test(url)) {
        throw new ClewError(
          CLEW_ERROR_CODES.INVALID_INPUT,
          'Git URL must use https://, ssh://, or git@ scheme',
        );
      }
      sourceUrl = url;
      const slug = createHash('sha256').update(url).digest('hex').slice(0, 12);
      const repoName = basename(url).replace(/\.git$/, '') || 'repo';
      rootPath = join(this.cloneRoot, `${repoName}-${slug}`);
      await mkdir(this.cloneRoot, { recursive: true });
      try {
        await stat(join(rootPath, '.git'));
        await execFileAsync('git', ['-C', rootPath, 'fetch', '--depth', '1', 'origin']);
      } catch {
        // Clone shallowly with hooks disabled (never execute target repo scripts)
        await execFileAsync('git', [
          'clone',
          '--depth',
          '1',
          '--config',
          'core.hooksPath=/dev/null',
          url,
          rootPath,
        ]);
      }
    } else {
      rootPath = resolve(input.location.trim());
      const st = await stat(rootPath).catch(() => null);
      if (!st?.isDirectory()) {
        throw new ClewError(CLEW_ERROR_CODES.NOT_FOUND, `Local directory does not exist: ${rootPath}`);
      }
    }

    const repoId = createHash('sha256').update(rootPath).digest('hex').slice(0, 16);
    const repoName = input.name?.trim() || basename(rootPath);
    const git = await readGitMetadata(rootPath);

    const initial: RepoRecord = {
      id: repoId,
      name: repoName,
      rootPath,
      sourceType: input.sourceType,
      sourceUrl,
      git,
      status: 'queued',
      indexedFiles: 0,
      totalFiles: 0,
      totalSymbols: 0,
      cacheHit: false,
      lastIndexedAt: null,
    };
    await this.repoTable.put(repoId, initial);
    this.jobs.log('info', `Indexing repository ${repoName} (${rootPath})`);

    const { jobId, result } = await this.jobs.runJob(repoId, 'index', async ({ signal, update }) => {
      const index = await buildRepositoryIndex(rootPath, {
        cacheDir: this.cacheDir,
        signal,
        onProgress: (stage, processed, total) => {
          update(stage, processed, total);
        },
      });
      const overview = buildRepoOverview(repoId, repoName, index);
      return { index, overview };
    });

    this.indices.set(repoId, result.index);
    this.trees.set(repoId, result.index.tree);
    this.overviews.set(repoId, result.overview);

    const readyRecord: RepoRecord = {
      ...initial,
      git: result.index.git,
      status: 'ready',
      indexedFiles: result.index.files.length,
      totalFiles: result.index.files.length,
      totalSymbols: result.index.symbolsById.size,
      cacheHit: result.index.cacheHit,
      lastIndexedAt: new Date().toISOString(),
    };
    await this.repoTable.put(repoId, readyRecord);
    this.jobs.log(
      'info',
      `Indexed ${repoName}: ${readyRecord.totalFiles} files, ${readyRecord.totalSymbols} symbols (cacheHit=${readyRecord.cacheHit})`,
    );

    return {
      repo: readyRecord,
      overview: result.overview,
      tree: result.index.tree,
      jobId,
    };
  }

  async ensureIndex(repoId: string): Promise<RepositoryIndex> {
    const existing = this.indices.get(repoId);
    if (existing) return existing;
    const rec = this.getRepo(repoId);
    const index = await buildRepositoryIndex(rec.rootPath, { cacheDir: this.cacheDir });
    this.indices.set(repoId, index);
    this.trees.set(repoId, index.tree);
    this.overviews.set(repoId, buildRepoOverview(repoId, rec.name, index));
    return index;
  }

  async getOverview(repoId: string): Promise<RepoOverview> {
    const cached = this.overviews.get(repoId);
    if (cached) return cached;
    const index = await this.ensureIndex(repoId);
    const rec = this.getRepo(repoId);
    const overview = buildRepoOverview(repoId, rec.name, index);
    this.overviews.set(repoId, overview);
    return overview;
  }

  async getTree(repoId: string): Promise<FileTreeNode> {
    const cached = this.trees.get(repoId);
    if (cached) return cached;
    const index = await this.ensureIndex(repoId);
    return index.tree;
  }

  async readFile(
    repoId: string,
    file: string,
    startLine = 1,
    endLine = 400,
  ): Promise<FileSpanResult & { outline: OutlineNode[] }> {
    const index = await this.ensureIndex(repoId);
    const span = await readFileSpan(index.repoRoot, file, startLine, endLine);
    const outline = index.outlineByFile.get(span.path) ?? [];
    return { ...span, outline };
  }

  async gotoDefinition(
    repoId: string,
    file: string,
    line: number,
    symbolName: string,
    column?: number,
  ): Promise<DefinitionResult> {
    const index = await this.ensureIndex(repoId);
    return goToDefinition(index, { file, line, column, symbolName });
  }

  async peekSymbol(
    repoId: string,
    symbolName: string,
    fromFile?: string,
    fromLine = 1,
  ): Promise<SymbolPeekResult> {
    const index = await this.ensureIndex(repoId);
    return peekSymbolPreview(index, symbolName, fromFile, fromLine);
  }

  async getLineGitContext(
    repoId: string,
    file: string,
    startLine: number,
    endLine: number,
  ): Promise<LineCommitInfo[]> {
    const rec = this.getRepo(repoId);
    return readLineGitContext(rec.rootPath, file, startLine, endLine);
  }

  async findRefs(repoId: string, symbolName: string, maxResults = 150): Promise<ReferenceHit[]> {
    const index = await this.ensureIndex(repoId);
    return findReferences(index, { symbolName, maxResults });
  }

  async fuzzySearch(repoId: string, query: string, limit = 40): Promise<FuzzyItem[]> {
    const index = await this.ensureIndex(repoId);
    return fuzzySearchFilesAndSymbols(index, query, limit);
  }

  async textSearch(
    repoId: string,
    input: {
      query: string;
      caseSensitive?: boolean;
      regex?: boolean;
      subpath?: string;
      maxResults?: number;
    },
  ): Promise<SearchHit[]> {
    const rec = this.getRepo(repoId);
    return globalTextSearch({
      repoRoot: rec.rootPath,
      query: input.query,
      caseSensitive: input.caseSensitive,
      regex: input.regex,
      subpath: input.subpath,
      maxResults: input.maxResults ?? 120,
    });
  }

  async clearCache(): Promise<void> {
    await clearCacheDirectory(this.cacheDir);
    this.indices.clear();
    this.overviews.clear();
    this.jobs.log('info', 'Cleared local symbol & AST disk cache');
  }

  async getCacheStats(): Promise<{ cacheBytes: number; cachedRepos: number }> {
    const stats = await measureCacheDirectory(this.cacheDir);
    return { cacheBytes: stats.totalBytes, cachedRepos: stats.fileCount };
  }
}

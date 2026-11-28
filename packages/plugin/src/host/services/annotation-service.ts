import { createHash, randomUUID } from 'node:crypto';
import {
  CLEW_ERROR_CODES,
  ClewError,
  type AnnotationRecord,
  type ExplorationStep,
  type FileStatusRecord,
  type ReadingPathRecord,
  type ReadingStatus,
} from '@clew/shared';
import { readFileSpan } from '@clew/engine';
import type { DshKvTable } from '../../types/dsh.js';
import type { ProjectService } from './project-service.js';

function hashText(text: string): string {
  return createHash('sha256').update(text.trim()).digest('hex').slice(0, 16);
}

export class AnnotationService {
  constructor(
    private readonly annotationsTable: DshKvTable<AnnotationRecord>,
    private readonly pathsTable: DshKvTable<ReadingPathRecord>,
    private readonly projects: ProjectService,
    private readonly statusesTable?: DshKvTable<FileStatusRecord>,
  ) {}

  listAnnotations(repoId: string, file?: string): AnnotationRecord[] {
    const items: AnnotationRecord[] = [];
    for (const [, rec] of this.annotationsTable.entries()) {
      if (rec.repoId !== repoId) continue;
      if (file && rec.file !== file) continue;
      items.push(rec);
    }
    return items.sort((a, b) => a.startLine - b.startLine || a.createdAt.localeCompare(b.createdAt));
  }

  countAllAnnotations(): number {
    let count = 0;
    for (const _ of this.annotationsTable.entries()) count += 1;
    return count;
  }

  async createAnnotation(input: {
    repoId: string;
    file: string;
    startLine: number;
    endLine: number;
    body: string;
    title?: string;
    tags?: string[];
  }): Promise<AnnotationRecord> {
    const repo = this.projects.getRepo(input.repoId);
    const span = await readFileSpan(repo.rootPath, input.file, input.startLine, input.endLine);
    const anchorLineText = span.lines.map((l) => l.text).join('\n');
    const now = new Date().toISOString();

    const record: AnnotationRecord = {
      id: randomUUID(),
      repoId: input.repoId,
      file: span.path,
      startLine: span.startLine,
      endLine: span.endLine,
      anchorTextHash: hashText(anchorLineText),
      anchorLineText: anchorLineText.slice(0, 400),
      anchorCommitSha: repo.git.headSha,
      status: 'open',
      title: input.title,
      body: input.body,
      tags: input.tags ?? [],
      replies: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.annotationsTable.put(record.id, record);
    return record;
  }

  async updateAnnotation(input: {
    id: string;
    body?: string;
    status?: AnnotationRecord['status'];
    replyBody?: string;
    replyAuthor?: 'user' | 'assistant';
  }): Promise<AnnotationRecord> {
    const existing = this.annotationsTable.get(input.id);
    if (!existing) {
      throw new ClewError(CLEW_ERROR_CODES.NOT_FOUND, `Annotation ${input.id} not found`);
    }

    const replies = [...existing.replies];
    if (input.replyBody) {
      replies.push({
        id: randomUUID(),
        author: input.replyAuthor ?? 'user',
        body: input.replyBody,
        createdAt: new Date().toISOString(),
      });
    }

    const updated: AnnotationRecord = {
      ...existing,
      body: input.body ?? existing.body,
      status: input.status ?? existing.status,
      replies,
      updatedAt: new Date().toISOString(),
    };
    await this.annotationsTable.put(updated.id, updated);
    return updated;
  }

  async deleteAnnotation(id: string): Promise<boolean> {
    return this.annotationsTable.delete(id);
  }

  /**
   * Re-check annotation anchors against current file lines and relocate within +-30 lines or mark `stale`.
   */
  async revalidateAnchors(repoId: string, file: string): Promise<AnnotationRecord[]> {
    const repo = this.projects.getRepo(repoId);
    const list = this.listAnnotations(repoId, file);
    if (list.length === 0) return [];

    const fullSpan = await readFileSpan(repo.rootPath, file, 1, 10_000);
    const lineTexts = fullSpan.lines.map((l) => l.text);

    const updatedList: AnnotationRecord[] = [];
    for (const ann of list) {
      const spanSize = Math.max(1, ann.endLine - ann.startLine + 1);
      const currentSlice = lineTexts.slice(ann.startLine - 1, ann.endLine).join('\n');
      if (hashText(currentSlice) === ann.anchorTextHash) {
        const next: AnnotationRecord =
          ann.status === 'stale' ? { ...ann, status: 'open', updatedAt: new Date().toISOString() } : ann;
        if (next !== ann) await this.annotationsTable.put(next.id, next);
        updatedList.push(next);
        continue;
      }

      // Search nearby window (+-30 lines) for relocated anchor
      let relocatedStart: number | null = null;
      const minIdx = Math.max(0, ann.startLine - 1 - 30);
      const maxIdx = Math.min(lineTexts.length - spanSize, ann.startLine - 1 + 30);
      for (let idx = minIdx; idx <= maxIdx; idx++) {
        const candidateSlice = lineTexts.slice(idx, idx + spanSize).join('\n');
        if (hashText(candidateSlice) === ann.anchorTextHash) {
          relocatedStart = idx + 1;
          break;
        }
      }

      if (relocatedStart !== null) {
        const next: AnnotationRecord = {
          ...ann,
          startLine: relocatedStart,
          endLine: relocatedStart + spanSize - 1,
          status: ann.status === 'stale' ? 'open' : ann.status,
          updatedAt: new Date().toISOString(),
        };
        await this.annotationsTable.put(next.id, next);
        updatedList.push(next);
      } else {
        const next: AnnotationRecord = {
          ...ann,
          status: 'stale',
          updatedAt: new Date().toISOString(),
        };
        await this.annotationsTable.put(next.id, next);
        updatedList.push(next);
      }
    }
    return updatedList;
  }

  listReadingPaths(repoId?: string): ReadingPathRecord[] {
    const items: ReadingPathRecord[] = [];
    for (const [, rec] of this.pathsTable.entries()) {
      if (repoId && rec.repoId !== repoId) continue;
      items.push(rec);
    }
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async saveReadingPath(input: {
    id?: string;
    repoId: string;
    title: string;
    description?: string;
    steps: ExplorationStep[];
  }): Promise<ReadingPathRecord> {
    const now = new Date().toISOString();
    const existing = input.id ? this.pathsTable.get(input.id) : undefined;
    const record: ReadingPathRecord = {
      id: existing?.id ?? input.id ?? randomUUID(),
      repoId: input.repoId,
      title: input.title,
      description: input.description,
      steps: input.steps,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.pathsTable.put(record.id, record);
    return record;
  }

  async deleteReadingPath(id: string): Promise<boolean> {
    return this.pathsTable.delete(id);
  }

  listFileStatuses(repoId: string): FileStatusRecord[] {
    if (!this.statusesTable) return [];
    const items: FileStatusRecord[] = [];
    for (const [, rec] of this.statusesTable.entries()) {
      if (rec.repoId === repoId) items.push(rec);
    }
    return items.sort((a, b) => a.file.localeCompare(b.file));
  }

  async setFileStatus(repoId: string, file: string, status: ReadingStatus): Promise<FileStatusRecord> {
    const id = `${repoId}:${file}`;
    const record: FileStatusRecord = {
      id,
      repoId,
      file,
      status,
      updatedAt: new Date().toISOString(),
    };
    if (this.statusesTable) {
      if (status === 'unread') {
        await this.statusesTable.delete(id);
      } else {
        await this.statusesTable.put(id, record);
      }
    }
    return record;
  }
}

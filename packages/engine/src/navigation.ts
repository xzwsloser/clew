import { readFile } from 'node:fs/promises';
import { posix } from 'node:path';
import {
  resolveSafeRepoPath,
  type DefinitionCandidate,
  type DefinitionResult,
  type FuzzyItem,
  type ReferenceHit,
  type SearchHit,
  type SymbolRecord,
} from '@clew/shared';
import { detectLanguage } from './language-detector.js';
import { classifyPositionsWithAst } from './parsers/ast-extractor.js';
import { searchWithRipgrep, type RipgrepSearchOptions } from './ripgrep.js';
import type { RepositoryIndex } from './symbol-index.js';

export interface GoToDefinitionInput {
  file: string;
  line: number;
  column?: number;
  symbolName: string;
}

function collectTransitiveImportedFiles(
  index: RepositoryIndex,
  startFile: string,
  maxDepth = 3,
): Set<string> {
  const visited = new Set<string>();
  const queue: Array<{ file: string; depth: number }> = [{ file: startFile, depth: 0 }];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.depth >= maxDepth) continue;
    const imports = index.importsByFile.get(cur.file) ?? [];
    for (const imp of imports) {
      if (!imp.resolvedPath || visited.has(imp.resolvedPath)) continue;
      visited.add(imp.resolvedPath);
      queue.push({ file: imp.resolvedPath, depth: cur.depth + 1 });
    }
  }
  return visited;
}

/**
 * Resolve Go-to-Definition candidates without LSP using 4-tier lexical/import/sibling/global ranking.
 */
export function goToDefinition(
  index: RepositoryIndex,
  input: GoToDefinitionInput,
): DefinitionResult {
  const targetName = input.symbolName.trim();
  if (!targetName) {
    return { mode: 'not_found', candidates: [] };
  }

  const allMatches = index.symbolsByName.get(targetName) ?? [];
  if (allMatches.length === 0) {
    return { mode: 'not_found', candidates: [] };
  }

  const importedFiles = collectTransitiveImportedFiles(index, input.file, 3);
  const directImports = index.importsByFile.get(input.file) ?? [];
  const explicitlyImportedNames = new Set(directImports.flatMap((imp) => imp.importedNames));
  const currentDir = posix.dirname(input.file);

  const candidates: DefinitionCandidate[] = allMatches.map((sym: SymbolRecord) => {
    if (sym.file === input.file) {
      const enclosesOrPrecedes = sym.startLine <= input.line;
      return {
        symbol: sym,
        tier: 'lexical_scope',
        score: enclosesOrPrecedes ? 100 : 85,
        reason: 'Defined in current file',
      };
    }

    if (importedFiles.has(sym.file)) {
      const namedMatch = explicitlyImportedNames.has(sym.name);
      return {
        symbol: sym,
        tier: 'resolved_import',
        score: namedMatch ? 80 : 70,
        reason: namedMatch ? 'Explicitly imported by current file' : 'In resolved import graph',
      };
    }

    if (posix.dirname(sym.file) === currentDir) {
      return {
        symbol: sym,
        tier: 'sibling_module',
        score: sym.exported ? 55 : 45,
        reason: 'Defined in sibling module directory',
      };
    }

    return {
      symbol: sym,
      tier: 'global',
      score: sym.exported ? 30 : 15,
      reason: 'Global symbol index match',
    };
  });

  candidates.sort((a, b) => b.score - a.score || a.symbol.file.localeCompare(b.symbol.file));

  if (candidates.length === 1) {
    return { mode: 'jump', candidates };
  }

  const top = candidates[0]!;
  const second = candidates[1]!;
  // Jump directly when there is a clear unique same-file or explicit-import winner
  if (
    (top.tier === 'lexical_scope' && second.tier !== 'lexical_scope') ||
    (top.tier === 'resolved_import' && top.score >= 80 && second.score < 70)
  ) {
    return { mode: 'jump', candidates };
  }

  return { mode: 'peek', candidates };
}

export interface FindReferencesInput {
  symbolName: string;
  maxResults?: number;
  signal?: AbortSignal;
}

/**
 * Find references across the repository using word-boundary ripgrep filtered by Tree-sitter AST to remove comment/string false positives.
 */
export async function findReferences(
  index: RepositoryIndex,
  input: FindReferencesInput,
): Promise<ReferenceHit[]> {
  const symbolName = input.symbolName.trim();
  if (!symbolName) return [];

  const rawHits = await searchWithRipgrep({
    repoRoot: index.repoRoot,
    query: symbolName,
    wordBoundary: true,
    caseSensitive: true,
    regex: false,
    maxResults: input.maxResults ?? 200,
    signal: input.signal,
  });

  const byFile = new Map<string, typeof rawHits>();
  for (const hit of rawHits) {
    const arr = byFile.get(hit.file) ?? [];
    arr.push(hit);
    byFile.set(hit.file, arr);
  }

  const results: ReferenceHit[] = [];
  for (const [file, hits] of byFile.entries()) {
    const language = detectLanguage(file);
    let content = '';
    try {
      const absPath = resolveSafeRepoPath(index.repoRoot, file);
      content = await readFile(absPath, 'utf8');
    } catch {
      continue;
    }

    const classifications = await classifyPositionsWithAst(
      file,
      content,
      language,
      hits.map((h) => ({ line: h.line, column: h.column })),
    );

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i]!;
      const cls = classifications[i];
      if (cls && !cls.include) continue;
      results.push({
        file: hit.file,
        line: hit.line,
        column: hit.column,
        lineText: hit.lineText,
        kind: cls?.kind ?? 'reference',
        astFiltered: cls?.astFiltered ?? false,
      });
    }
  }

  return results;
}

function fuzzySubsequenceScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  if (t === q) return 100;
  if (t.startsWith(q)) return 85;
  const idx = t.indexOf(q);
  if (idx !== -1) return 70 - Math.min(20, idx);

  let qi = 0;
  let score = 40;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi += 1;
      score += 2;
    }
  }
  return qi === q.length ? score : -1;
}

/**
 * Fuzzy search across indexed files and symbols for the Command Palette (`Cmd/Ctrl+P`).
 */
export function fuzzySearchFilesAndSymbols(
  index: RepositoryIndex,
  query: string,
  limit = 40,
): FuzzyItem[] {
  const items: FuzzyItem[] = [];

  for (const file of index.files) {
    const score = fuzzySubsequenceScore(file.path, query);
    if (score >= 0) {
      items.push({
        kind: 'file',
        label: posix.basename(file.path),
        detail: file.path,
        file: file.path,
        language: file.language,
        score: score + 5,
      });
    }
  }

  for (const sym of index.symbolsById.values()) {
    const score = Math.max(
      fuzzySubsequenceScore(sym.name, query),
      fuzzySubsequenceScore(sym.qualifiedName, query) - 5,
    );
    if (score >= 0) {
      items.push({
        kind: 'symbol',
        label: sym.qualifiedName,
        detail: `${sym.file}:${sym.startLine}`,
        file: sym.file,
        line: sym.startLine,
        symbolKind: sym.kind,
        language: detectLanguage(sym.file),
        score,
      });
    }
  }

  items.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  return items.slice(0, limit);
}

/**
 * Global text search (`Cmd/Ctrl+Shift+F`) backed by `ripgrep`.
 */
export async function globalTextSearch(
  options: RipgrepSearchOptions,
): Promise<SearchHit[]> {
  const matches = await searchWithRipgrep(options);
  return matches.map((m) => ({
    file: m.file,
    line: m.line,
    column: m.column,
    lineText: m.lineText,
    language: detectLanguage(m.file),
  }));
}

import type { SymbolRecord, TraceEdge, TraceNode } from '@clew/shared';
import { detectLanguage } from './language-detector.js';
import { goToDefinition } from './navigation.js';
import type { RepositoryIndex } from './symbol-index.js';

export interface SubgraphQuery {
  goal: string;
  focusSymbolId?: string;
  maxNodes?: number;
  maxDepth?: number;
}

export interface RetrievedSubgraph {
  nodes: TraceNode[];
  edges: TraceEdge[];
  seedSymbols: SymbolRecord[];
}

function moduleGroupOf(filePath: string): string {
  const parts = filePath.split('/');
  return parts.length <= 1 ? '(root)' : parts.slice(0, Math.min(2, parts.length - 1)).join('/');
}

function tokenizeQuery(goal: string): string[] {
  return goal
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .filter((tok) => tok.length >= 2);
}

function scoreSymbolForGoal(sym: SymbolRecord, tokens: string[]): number {
  const hay = `${sym.qualifiedName} ${sym.file} ${sym.signature}`.toLowerCase();
  let score = sym.exported ? 3 : 0;
  for (const tok of tokens) {
    if (sym.name.toLowerCase() === tok) score += 20;
    else if (sym.name.toLowerCase().includes(tok)) score += 10;
    else if (hay.includes(tok)) score += 4;
  }
  return score;
}

function toTraceNode(
  sym: SymbolRecord,
  role: TraceNode['role'],
): TraceNode {
  return {
    id: sym.id,
    label: sym.name,
    qualifiedName: sym.qualifiedName,
    kind: sym.kind,
    file: sym.file,
    startLine: sym.startLine,
    endLine: sym.endLine,
    language: detectLanguage(sym.file),
    moduleGroup: moduleGroupOf(sym.file),
    role,
    summary: sym.signature,
    verified: true,
  };
}

/**
 * Retrieve a bounded call & dependency subgraph grounded in AST symbols and call sites.
 */
export function retrieveSubgraph(
  index: RepositoryIndex,
  query: SubgraphQuery,
): RetrievedSubgraph {
  const maxNodes = query.maxNodes ?? 24;
  const maxDepth = query.maxDepth ?? 3;
  const tokens = tokenizeQuery(query.goal);

  let seeds: SymbolRecord[] = [];
  if (query.focusSymbolId) {
    const focused = index.symbolsById.get(query.focusSymbolId);
    if (focused) seeds = [focused];
  }

  if (seeds.length === 0) {
    const scored = Array.from(index.symbolsById.values())
      .map((sym) => ({ sym, score: scoreSymbolForGoal(sym, tokens) }))
      .filter((x) => x.score > 3)
      .sort((a, b) => b.score - a.score || a.sym.file.localeCompare(b.sym.file));

    seeds = scored.slice(0, 4).map((x) => x.sym);
  }

  if (seeds.length === 0) {
    // Fallback to exported top-level symbols
    seeds = Array.from(index.symbolsById.values())
      .filter((s) => s.exported)
      .slice(0, 3);
  }

  const nodeMap = new Map<string, TraceNode>();
  const edgeMap = new Map<string, TraceEdge>();
  const queue: Array<{ sym: SymbolRecord; depth: number }> = [];

  for (const seed of seeds) {
    nodeMap.set(seed.id, toTraceNode(seed, 'entry'));
    queue.push({ sym: seed, depth: 0 });
  }

  while (queue.length > 0 && nodeMap.size < maxNodes) {
    const { sym, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    // Downstream callees from this symbol's file & line span
    const fileCalls = index.callSitesByFile.get(sym.file) ?? [];
    for (const call of fileCalls) {
      if (call.line < sym.startLine || call.line > sym.endLine) continue;
      if (nodeMap.size >= maxNodes) break;

      const def = goToDefinition(index, {
        file: sym.file,
        line: call.line,
        symbolName: call.calleeName,
      });
      const target = def.candidates[0]?.symbol;
      if (!target || target.id === sym.id) continue;

      if (!nodeMap.has(target.id)) {
        const role: TraceNode['role'] =
          target.kind === 'struct' || target.kind === 'class' || target.kind === 'interface'
            ? 'data_structure'
            : depth + 1 >= maxDepth
              ? 'sink'
              : 'intermediate';
        nodeMap.set(target.id, toTraceNode(target, role));
        queue.push({ sym: target, depth: depth + 1 });
      }

      const edgeId = `${sym.id}->${target.id}@${call.line}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: sym.id,
          target: target.id,
          confidence: def.mode === 'jump' ? 'source_verified_call' : 'inferred_dynamic',
          file: sym.file,
          line: call.line,
          evidenceSnippet: call.snippet,
          label: call.calleeName,
        });
      }
    }

    // Upstream callers calling this symbol
    const incomingCalls = index.callersByCalleeName.get(sym.name) ?? [];
    for (const call of incomingCalls.slice(0, 6)) {
      if (nodeMap.size >= maxNodes) break;
      if (!call.callerSymbolId) continue;
      const caller = index.symbolsById.get(call.callerSymbolId);
      if (!caller || caller.id === sym.id) continue;

      if (!nodeMap.has(caller.id)) {
        nodeMap.set(caller.id, toTraceNode(caller, 'intermediate'));
        queue.push({ sym: caller, depth: depth + 1 });
      }

      const edgeId = `${caller.id}->${sym.id}@${call.line}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          source: caller.id,
          target: sym.id,
          confidence: 'source_verified_call',
          file: caller.file,
          line: call.line,
          evidenceSnippet: call.snippet,
          label: call.calleeName,
        });
      }
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
    seedSymbols: seeds,
  };
}

import type { EdgeConfidence, TraceEdge, TraceNode } from '@clew/shared';
import type { RepositoryIndex } from './symbol-index.js';

export interface ProposedTraceEdge {
  source: string;
  target: string;
  claimedConfidence?: EdgeConfidence;
  file?: string;
  line?: number;
  label?: string;
}

/**
 * Deterministically re-verify proposed trace nodes and edges against the indexed repository snapshot.
 * Never upgrades confidence from LLM assertions without AST/import evidence.
 */
export function verifyTraceEvidence(
  index: RepositoryIndex,
  proposedNodes: TraceNode[],
  proposedEdges: ProposedTraceEdge[],
): { nodes: TraceNode[]; edges: TraceEdge[] } {
  const verifiedNodes: TraceNode[] = proposedNodes.map((node) => {
    const hasFile = index.fileHashes.has(node.file);
    const matchingSymbol =
      index.symbolsById.get(node.id) ??
      (index.symbolsByFile.get(node.file) ?? []).find(
        (s) => s.name === node.label || s.qualifiedName === node.qualifiedName,
      );

    return {
      ...node,
      verified: Boolean(hasFile && matchingSymbol),
      startLine: matchingSymbol ? matchingSymbol.startLine : node.startLine,
      endLine: matchingSymbol ? matchingSymbol.endLine : node.endLine,
    };
  });

  const nodeById = new Map(verifiedNodes.map((n) => [n.id, n]));
  const verifiedEdges: TraceEdge[] = [];

  for (let i = 0; i < proposedEdges.length; i++) {
    const edge = proposedEdges[i]!;
    const srcNode = nodeById.get(edge.source);
    const dstNode = nodeById.get(edge.target);

    if (!srcNode || !dstNode || !index.fileHashes.has(srcNode.file) || !index.fileHashes.has(dstNode.file)) {
      verifiedEdges.push({
        id: `${edge.source}->${edge.target}#${i}`,
        source: edge.source,
        target: edge.target,
        confidence: 'unverified',
        file: edge.file,
        line: edge.line,
        label: edge.label,
      });
      continue;
    }

    const callsInSrc = index.callSitesByFile.get(srcNode.file) ?? [];
    const matchingCall = callsInSrc.find(
      (c) =>
        c.calleeName === dstNode.label &&
        (edge.line === undefined || Math.abs(c.line - edge.line) <= 3) &&
        c.line >= srcNode.startLine &&
        c.line <= srcNode.endLine,
    );

    if (matchingCall) {
      // Confirm unique syntactic resolution OR explicit import relationship
      const sameFileTargets = (index.symbolsByFile.get(srcNode.file) ?? []).filter(
        (s) => s.name === dstNode.label,
      );
      const importsTarget = (index.importsByFile.get(srcNode.file) ?? []).some(
        (imp) => imp.resolvedPath === dstNode.file,
      );
      const sameFile = srcNode.file === dstNode.file;
      const confidence: EdgeConfidence =
        sameFile || importsTarget || sameFileTargets.length === 1
          ? 'source_verified_call'
          : 'inferred_dynamic';

      verifiedEdges.push({
        id: `${edge.source}->${edge.target}@${matchingCall.line}`,
        source: edge.source,
        target: edge.target,
        confidence,
        file: srcNode.file,
        line: matchingCall.line,
        evidenceSnippet: matchingCall.snippet,
        label: edge.label ?? matchingCall.calleeName,
      });
      continue;
    }

    const hasStaticImport = (index.importsByFile.get(srcNode.file) ?? []).some(
      (imp) => imp.resolvedPath === dstNode.file,
    );
    if (hasStaticImport) {
      verifiedEdges.push({
        id: `${edge.source}->${edge.target}#dep`,
        source: edge.source,
        target: edge.target,
        confidence: 'static_dependency',
        file: srcNode.file,
        label: edge.label ?? 'imports',
      });
      continue;
    }

    const fallbackConfidence: EdgeConfidence =
      edge.claimedConfidence === 'dataflow' ? 'dataflow' : 'unverified';
    verifiedEdges.push({
      id: `${edge.source}->${edge.target}#${i}`,
      source: edge.source,
      target: edge.target,
      confidence: fallbackConfidence,
      file: edge.file,
      line: edge.line,
      label: edge.label,
    });
  }

  const RANK: Record<EdgeConfidence, number> = {
    source_verified_call: 5,
    static_dependency: 4,
    dataflow: 3,
    inferred_dynamic: 2,
    unverified: 1,
  };

  const deduped = new Map<string, TraceEdge>();
  for (const edge of verifiedEdges) {
    const key = `${edge.source}|${edge.file ?? ''}|${edge.line ?? 0}|${edge.label ?? edge.target}`;
    const existing = deduped.get(key);
    if (!existing || RANK[edge.confidence] > RANK[existing.confidence]) {
      deduped.set(key, edge);
    }
  }

  return { nodes: verifiedNodes, edges: Array.from(deduped.values()) };
}

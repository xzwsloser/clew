import type { ELK as ElkInstance, ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk-api.js';
import * as ElkModule from 'elkjs/lib/elk.bundled.js';

interface WorkerNodeInput {
  id: string;
  width: number;
  height: number;
}

interface WorkerEdgeInput {
  id: string;
  source: string;
  target: string;
}

interface WorkerLayoutRequest {
  requestId: number;
  nodes: WorkerNodeInput[];
  edges: WorkerEdgeInput[];
}

const ElkCtor =
  (ElkModule as unknown as { default?: new () => ElkInstance }).default ??
  (ElkModule as unknown as new () => ElkInstance);
const elk = new ElkCtor();

self.onmessage = async (evt: MessageEvent<WorkerLayoutRequest>) => {
  const { requestId, nodes, edges } = evt.data;
  try {
    const graph: ElkNode = await elk.layout({
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '28',
        'elk.layered.spacing.nodeNodeBetweenLayers': '64',
        'elk.edgeRouting': 'ORTHOGONAL',
      },
      children: nodes.map((n) => ({ id: n.id, width: n.width, height: n.height })),
      edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
    });

    const positions: Record<string, { x: number; y: number }> = {};
    for (const child of graph.children ?? []) {
      positions[child.id] = { x: child.x ?? 0, y: child.y ?? 0 };
    }

    const edgeRoutes: Record<string, Array<{ x: number; y: number }>> = {};
    for (const edge of (graph.edges ?? []) as ElkExtendedEdge[]) {
      const sec = edge.sections?.[0];
      if (!sec) continue;
      edgeRoutes[edge.id] = [
        sec.startPoint,
        ...(sec.bendPoints ?? []),
        sec.endPoint,
      ];
    }

    self.postMessage({
      requestId,
      ok: true,
      width: graph.width ?? 800,
      height: graph.height ?? 500,
      positions,
      edgeRoutes,
    });
  } catch (err) {
    self.postMessage({
      requestId,
      ok: false,
      error: err instanceof Error ? err.message : 'ELK layout failed',
    });
  }
};

import { useEffect, useRef, useState } from 'react';
import type { TraceEdge, TraceNode } from '@clew/shared/contracts';

export interface GraphLayoutResult {
  width: number;
  height: number;
  positions: Record<string, { x: number; y: number }>;
  edgeRoutes: Record<string, Array<{ x: number; y: number }>>;
}

const NODE_WIDTH = 212;
const NODE_HEIGHT = 64;

function computeFallbackLayout(nodes: TraceNode[], edges: TraceEdge[]): GraphLayoutResult {
  const depthMap = new Map<string, number>();
  for (const n of nodes) {
    depthMap.set(n.id, n.role === 'entry' ? 0 : 1);
  }
  for (let pass = 0; pass < 4; pass++) {
    for (const e of edges) {
      const srcDepth = depthMap.get(e.source) ?? 0;
      const curDst = depthMap.get(e.target) ?? 0;
      if (srcDepth + 1 > curDst) {
        depthMap.set(e.target, Math.min(5, srcDepth + 1));
      }
    }
  }

  const columns = new Map<number, TraceNode[]>();
  for (const n of nodes) {
    const col = depthMap.get(n.id) ?? 0;
    const list = columns.get(col) ?? [];
    list.push(n);
    columns.set(col, list);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  let maxCol = 0;
  let maxRow = 0;
  for (const [col, list] of columns.entries()) {
    maxCol = Math.max(maxCol, col);
    list.forEach((node, rowIdx) => {
      maxRow = Math.max(maxRow, rowIdx);
      positions[node.id] = {
        x: 32 + col * (NODE_WIDTH + 68),
        y: 32 + rowIdx * (NODE_HEIGHT + 28),
      };
    });
  }

  const edgeRoutes: Record<string, Array<{ x: number; y: number }>> = {};
  for (const e of edges) {
    const src = positions[e.source];
    const dst = positions[e.target];
    if (!src || !dst) continue;
    const x1 = src.x + NODE_WIDTH;
    const y1 = src.y + NODE_HEIGHT / 2;
    const x2 = dst.x;
    const y2 = dst.y + NODE_HEIGHT / 2;
    const midX = (x1 + x2) / 2;
    edgeRoutes[e.id] = [
      { x: x1, y: y1 },
      { x: midX, y: y1 },
      { x: midX, y: y2 },
      { x: x2, y: y2 },
    ];
  }

  return {
    width: Math.max(640, (maxCol + 1) * (NODE_WIDTH + 68) + 64),
    height: Math.max(320, (maxRow + 1) * (NODE_HEIGHT + 28) + 64),
    positions,
    edgeRoutes,
  };
}

export function useGraphLayout(nodes: TraceNode[], edges: TraceEdge[]): GraphLayoutResult {
  const [layout, setLayout] = useState<GraphLayoutResult>(() => computeFallbackLayout(nodes, edges));
  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    setLayout(computeFallbackLayout(nodes, edges));
    if (nodes.length === 0 || typeof Worker === 'undefined') return;

    const reqId = ++reqIdRef.current;
    try {
      if (!workerRef.current) {
        workerRef.current = new Worker('/api/clew/elk-worker.js');
      }
      const worker = workerRef.current;
      const onMessage = (evt: MessageEvent<{ requestId: number; ok: boolean } & GraphLayoutResult>) => {
        if (evt.data.requestId !== reqId || !evt.data.ok) return;
        setLayout({
          width: evt.data.width,
          height: evt.data.height,
          positions: evt.data.positions,
          edgeRoutes: evt.data.edgeRoutes,
        });
      };
      const onError = () => {
        // Fallback layout is already rendered
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.postMessage({
        requestId: reqId,
        nodes: nodes.map((n) => ({ id: n.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      });
      return () => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
      };
    } catch {
      return;
    }
  }, [nodes, edges]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return layout;
}

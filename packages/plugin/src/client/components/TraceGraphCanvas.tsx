import { useMemo, useState } from 'react';
import type { EdgeConfidence, TraceGraph, TraceNode } from '@clew/shared/contracts';
import { useGraphLayout } from '../hooks/useGraphLayout.js';

interface TraceGraphCanvasProps {
  t: (key: string) => string;
  trace: TraceGraph | null;
  selectedNodeId: string | null;
  onSelectNode: (node: TraceNode) => void;
  isLoading: boolean;
}

const NODE_W = 212;
const NODE_H = 64;

const CONFIDENCE_COLORS: Record<EdgeConfidence, string> = {
  source_verified_call: '#2DD4BF',
  static_dependency: '#64748B',
  inferred_dynamic: '#F59E0B',
  dataflow: '#38BDF8',
  unverified: '#9CA3AF',
};

export function TraceGraphCanvas({
  t,
  trace,
  selectedNodeId,
  onSelectNode,
  isLoading,
}: TraceGraphCanvasProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [visibleConfidences, setVisibleConfidences] = useState<Set<EdgeConfidence>>(
    () =>
      new Set([
        'source_verified_call',
        'static_dependency',
        'inferred_dynamic',
        'dataflow',
        'unverified',
      ]),
  );

  const filteredNodes = useMemo(() => {
    if (!trace) return [];
    const q = filterQuery.trim().toLowerCase();
    if (!q) return trace.nodes;
    return trace.nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.qualifiedName.toLowerCase().includes(q) ||
        n.file.toLowerCase().includes(q),
    );
  }, [trace, filterQuery]);

  const filteredNodeSet = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    if (!trace) return [];
    return trace.edges.filter(
      (e) =>
        visibleConfidences.has(e.confidence) &&
        filteredNodeSet.has(e.source) &&
        filteredNodeSet.has(e.target),
    );
  }, [trace, visibleConfidences, filteredNodeSet]);

  const neighborIds = useMemo(() => {
    const set = new Set<string>();
    if (!selectedNodeId) return set;
    set.add(selectedNodeId);
    for (const e of filteredEdges) {
      if (e.source === selectedNodeId) set.add(e.target);
      if (e.target === selectedNodeId) set.add(e.source);
    }
    return set;
  }, [selectedNodeId, filteredEdges]);

  const layout = useGraphLayout(filteredNodes, filteredEdges);

  const toggleConfidence = (c: EdgeConfidence) => {
    setVisibleConfidences((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  if (isLoading && !trace) {
    return (
      <div className="clew-graph-empty" data-testid="clew-graph-loading">
        <p>{t('ui.graph.loading')}</p>
      </div>
    );
  }

  if (!trace || trace.nodes.length === 0) {
    return (
      <div className="clew-graph-empty" data-testid="clew-graph-empty">
        <div className="clew-empty-title">{t('ui.graph.emptyTitle')}</div>
        <p className="clew-empty-hint">{t('ui.graph.emptyDesc')}</p>
      </div>
    );
  }

  return (
    <div className="clew-graph-shell" data-testid="clew-graph-canvas">
      <div className="clew-graph-toolbar">
        <input
          type="text"
          className="clew-input-sm"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder={t('ui.graph.filterPlaceholder')}
        />
        <div className="clew-confidence-filters">
          {(['source_verified_call', 'static_dependency', 'inferred_dynamic', 'dataflow', 'unverified'] as const).map(
            (conf) => (
              <button
                key={conf}
                type="button"
                className={`clew-conf-chip ${visibleConfidences.has(conf) ? 'active' : ''}`}
                onClick={() => toggleConfidence(conf)}
              >
                <span className="clew-conf-dot" style={{ background: CONFIDENCE_COLORS[conf] }} />
                {t(`ui.confidence.${conf}`)}
              </button>
            ),
          )}
        </div>
        <div className="clew-zoom-controls">
          <button type="button" className="clew-btn-xs" onClick={() => setZoom((z) => Math.max(0.45, z - 0.15))}>
            −
          </button>
          <span className="clew-mono">{Math.round(zoom * 100)}%</span>
          <button type="button" className="clew-btn-xs" onClick={() => setZoom((z) => Math.min(2, z + 0.15))}>
            +
          </button>
          <button
            type="button"
            className="clew-btn-xs"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            {t('ui.graph.reset')}
          </button>
        </div>
      </div>

      <div
        className="clew-graph-viewport"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('[data-node-id]')) return;
          setDragging({ startX: e.clientX, startY: e.clientY, origX: pan.x, origY: pan.y });
        }}
        onMouseMove={(e) => {
          if (!dragging) return;
          setPan({
            x: dragging.origX + (e.clientX - dragging.startX),
            y: dragging.origY + (e.clientY - dragging.startY),
          });
        }}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="clew-graph-svg"
        >
          <defs>
            <marker
              id="clew-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,1 L7,4 L0,7 Z" fill="#64748B" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {filteredEdges.map((edge) => {
              const pts = layout.edgeRoutes[edge.id];
              if (!pts || pts.length < 2) return null;
              const d = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const mid = pts[Math.floor(pts.length / 2)]!;
              const highlighted =
                !selectedNodeId ||
                edge.source === selectedNodeId ||
                edge.target === selectedNodeId;

              return (
                <g key={edge.id} opacity={highlighted ? 1 : 0.28}>
                  <path
                    d={d}
                    fill="none"
                    stroke={CONFIDENCE_COLORS[edge.confidence]}
                    strokeWidth={highlighted ? 1.8 : 1.2}
                    strokeDasharray={edge.confidence === 'inferred_dynamic' ? '5 4' : undefined}
                    markerEnd="url(#clew-arrow)"
                  />
                  {edge.line && (
                    <g transform={`translate(${mid.x}, ${mid.y - 10})`}>
                      <rect x="-22" y="-9" width="44" height="18" rx="4" className="clew-edge-badge-bg" />
                      <text textAnchor="middle" y="3" className="clew-edge-badge-text">
                        :{edge.line}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {filteredNodes.map((node) => {
              const pos = layout.positions[node.id] ?? { x: 20, y: 20 };
              const isSelected = selectedNodeId === node.id;
              const isRelated = !selectedNodeId || neighborIds.has(node.id);

              return (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  opacity={isRelated ? 1 : 0.38}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectNode(node)}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={6}
                    className={`clew-node-box ${isSelected ? 'selected' : ''} ${node.role === 'entry' ? 'entry' : ''}`}
                  />
                  <text x="12" y="23" className="clew-node-title">
                    {node.label.slice(0, 24)}
                  </text>
                  <text x="12" y="42" className="clew-node-meta">
                    {node.file.slice(-26)}:{node.startLine}
                  </text>
                  <circle
                    cx={NODE_W - 14}
                    cy={18}
                    r={4}
                    fill={node.verified ? '#2DD4BF' : '#F59E0B'}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

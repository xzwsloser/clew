import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AnnotationRecord,
  DefinitionCandidate,
  DefinitionResult,
  ExplorationStep,
  FileStatusRecord,
  FileTreeNode,
  JobState,
  LineCommitInfo,
  OutlineNode,
  ReadingPathRecord,
  ReadingStatus,
  ReferenceHit,
  RepoOverview,
  RepoRecord,
  SupportedLanguage,
  SymbolPeekResult,
  TraceGraph,
  TraceNode,
} from '@clew/shared/contracts';
import en from '../../locale/en.json' with { type: 'json' };
import zh from '../../locale/zh.json' with { type: 'json' };
import type { DshClientContext } from '../types/dsh.js';
import { callClewRpc } from './api.js';
import { CodeReader, type CodeHighlightBand, type OpenTabState } from './components/CodeReader.js';
import { LeftRail } from './components/LeftRail.js';
import {
  CommandPaletteModal,
  DiagnosticsModal,
  GlobalSearchModal,
  ImportRepoModal,
  PeekModal,
} from './components/Modals.js';
import { RightDrawer, type QaExchange, type RightTab } from './components/RightDrawer.js';
import { ClewBrandMark, TopBar, type CenterViewMode } from './components/TopBar.js';
import { TraceGraphCanvas } from './components/TraceGraphCanvas.js';
import { CLEW_SCOPED_CSS } from './styles.js';

const NS = 'clew';
const PANEL_ID = 'clew';

function flattenDict(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenDict(value as Record<string, unknown>, fullKey));
    }
  }
  return result;
}

interface HistoryEntry {
  file: string;
  line: number;
}

function ClewWorkbench({ ctx, t }: { ctx: DshClientContext; t: (key: string) => string }) {
  const [localeRev, setLocaleRev] = useState(() => ctx.locale.getSnapshot().revision);
  const [repos, setRepos] = useState<RepoRecord[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [tree, setTree] = useState<FileTreeNode | null>(null);
  const [overview, setOverview] = useState<RepoOverview | null>(null);

  const [tabs, setTabs] = useState<OpenTabState[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [focusedLine, setFocusedLine] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number } | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [trail, setTrail] = useState<ExplorationStep[]>([]);
  const [savedPaths, setSavedPaths] = useState<ReadingPathRecord[]>([]);

  const [goalInput, setGoalInput] = useState('');
  const [trace, setTrace] = useState<TraceGraph | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<TraceNode | null>(null);

  const [rightTab, setRightTab] = useState<RightTab>('qa');
  const [qaHistory, setQaHistory] = useState<QaExchange[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [annotations, setAnnotations] = useState<AnnotationRecord[]>([]);
  const [draftAnnRange, setDraftAnnRange] = useState<{
    file: string;
    startLine: number;
    endLine: number;
  } | null>(null);
  const [references, setReferences] = useState<ReferenceHit[]>([]);
  const [activeRefSymbol, setActiveRefSymbol] = useState<string | null>(null);

  const [activeJob, setActiveJob] = useState<JobState | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<CenterViewMode>('split');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftWidth, setLeftWidth] = useState(268);
  const [rightWidth, setRightWidth] = useState(336);
  const dragRef = useRef<{ side: 'left' | 'right'; startX: number; startW: number } | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [peekCandidates, setPeekCandidates] = useState<DefinitionCandidate[] | null>(null);
  const [peekData, setPeekData] = useState<SymbolPeekResult | null>(null);
  const [splitCompareFile, setSplitCompareFile] = useState<string | null>(null);
  const [fileStatuses, setFileStatuses] = useState<Record<string, ReadingStatus>>({});
  const [lineCommits, setLineCommits] = useState<LineCommitInfo[]>([]);

  useEffect(() => {
    return ctx.locale.subscribe(() => {
      setLocaleRev(ctx.locale.getSnapshot().revision);
    });
  }, [ctx]);

  const loadRepoWorkspace = useCallback(async (repoId: string) => {
    const [treeRes, ovRes, annRes, pathRes, statusRes] = await Promise.all([
      callClewRpc<{ tree: FileTreeNode }>('repo/tree', { repoId }),
      callClewRpc<{ overview: RepoOverview }>('repo/overview', { repoId }),
      callClewRpc<{ annotations: AnnotationRecord[] }>('annotations/list', { repoId }),
      callClewRpc<{ paths: ReadingPathRecord[] }>('paths/list', { repoId }),
      callClewRpc<{ statuses: FileStatusRecord[] }>('status/list', { repoId }),
    ]);

    if (treeRes.ok) setTree(treeRes.value.tree);
    if (ovRes.ok) setOverview(ovRes.value.overview);
    if (annRes.ok) setAnnotations(annRes.value.annotations);
    if (pathRes.ok) setSavedPaths(pathRes.value.paths);
    if (statusRes.ok) {
      const nextMap: Record<string, ReadingStatus> = {};
      for (const item of statusRes.value.statuses) {
        nextMap[item.file] = item.status;
      }
      setFileStatuses(nextMap);
    }
  }, []);

  const refreshRepoList = useCallback(
    async (selectId?: string) => {
      const res = await callClewRpc<{ repos: RepoRecord[] }>('repo/list', {});
      if (!res.ok) {
        setErrorBanner(`${res.error.code}: ${res.error.message}`);
        return;
      }
      setRepos(res.value.repos);
      const nextId = selectId ?? activeRepoId ?? res.value.repos[0]?.id ?? null;
      if (nextId) {
        setActiveRepoId(nextId);
        await loadRepoWorkspace(nextId);
      }
    },
    [activeRepoId, loadRepoWorkspace],
  );

  useEffect(() => {
    void refreshRepoList();
  }, [refreshRepoList]);

  useEffect(() => {
    const source = new EventSource('/api/clew/events');
    source.addEventListener('job_progress', (evt) => {
      try {
        const envelope = JSON.parse((evt as MessageEvent<string>).data) as { payload: JobState };
        setActiveJob(envelope.payload);
      } catch {
        // Ignore malformed SSE frame
      }
    });
    return () => {
      source.close();
    };
  }, []);

  const openFileAt = useCallback(
    async (
      file: string,
      line = 1,
      action: ExplorationStep['action'] = 'open',
      symbolName?: string,
      pushHistory = true,
    ) => {
      if (!activeRepoId) return;
      const existing = tabs.find((tb) => tb.file === file);
      if (!existing) {
        const res = await callClewRpc<{
          path: string;
          language: SupportedLanguage;
          totalLines: number;
          lines: Array<{ number: number; text: string }>;
          outline: OutlineNode[];
        }>('file/read', { repoId: activeRepoId, file, startLine: 1, endLine: 4000 });
        if (!res.ok) {
          setErrorBanner(`${res.error.code}: ${res.error.message}`);
          return;
        }
        setTabs((prev) => [
          ...prev,
          {
            file: res.value.path,
            language: res.value.language,
            totalLines: res.value.totalLines,
            lines: res.value.lines,
            outline: res.value.outline,
          },
        ]);
      }

      setActiveFile(file);
      setFocusedLine(line);
      setSelectedRange({ start: line, end: line });

      if (pushHistory) {
        setHistory((prev) => [...prev.slice(0, historyIndex + 1), { file, line }]);
        setHistoryIndex((idx) => idx + 1);
      }

      setTrail((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.file === file && last.line === line && last.symbolName === symbolName) {
          return prev;
        }
        return [
          ...prev.slice(-39),
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
            file,
            line,
            symbolName,
            action,
            timestamp: new Date().toISOString(),
          },
        ];
      });
    },
    [activeRepoId, tabs, historyIndex],
  );

  const goBack = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevIdx = historyIndex - 1;
    const entry = history[prevIdx];
    if (!entry) return;
    setHistoryIndex(prevIdx);
    void openFileAt(entry.file, entry.line, 'open', undefined, false);
  }, [history, historyIndex, openFileAt]);

  const goForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIdx = historyIndex + 1;
    const entry = history[nextIdx];
    if (!entry) return;
    setHistoryIndex(nextIdx);
    void openFileAt(entry.file, entry.line, 'open', undefined, false);
  }, [history, historyIndex, openFileAt]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        if (activeRepoId) {
          e.preventDefault();
          setShowPalette(true);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        if (activeRepoId) {
          e.preventDefault();
          setShowGlobalSearch(true);
        }
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        goForward();
      } else if (e.key === 'Escape') {
        setShowPalette(false);
        setShowGlobalSearch(false);
        setShowImportModal(false);
        setShowDiagnostics(false);
        setPeekCandidates(null);
        setPeekData(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeRepoId, goBack, goForward]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      if (dragRef.current.side === 'left') {
        setLeftWidth(Math.max(200, Math.min(420, dragRef.current.startW + dx)));
      } else {
        setRightWidth(Math.max(260, Math.min(480, dragRef.current.startW - dx)));
      }
    };
    const onMouseUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const runTrace = useCallback(
    async (goalOverride?: string, focusSymbolId?: string) => {
      const goal = (goalOverride ?? goalInput).trim();
      if (!activeRepoId || !goal) return;
      setTraceLoading(true);
      setErrorBanner(null);
      const res = await callClewRpc<{ trace: TraceGraph }>('trace/run', {
        repoId: activeRepoId,
        goal,
        focusSymbolId,
      });
      setTraceLoading(false);
      if (!res.ok) {
        setErrorBanner(`${res.error.code}: ${res.error.message}`);
        return;
      }
      setTrace(res.value.trace);
      const firstNode = res.value.trace.nodes[0] ?? null;
      setSelectedNode(firstNode);
      setRightTab('qa');
      if (firstNode) {
        void openFileAt(firstNode.file, firstNode.startLine, 'trace_node', firstNode.qualifiedName);
      }
    },
    [activeRepoId, goalInput, openFileAt],
  );

  const handleGotoDefinition = useCallback(
    async (line: number, symbolName: string) => {
      if (!activeRepoId || !activeFile) return;
      const res = await callClewRpc<DefinitionResult>('nav/definition', {
        repoId: activeRepoId,
        file: activeFile,
        line,
        symbolName,
      });
      if (!res.ok) {
        setErrorBanner(`${res.error.code}: ${res.error.message}`);
        return;
      }
      if (res.value.mode === 'not_found') {
        setErrorBanner(`No definition found for "${symbolName}".`);
        return;
      }
      if (res.value.mode === 'jump' && res.value.candidates[0]) {
        const sym = res.value.candidates[0].symbol;
        void openFileAt(sym.file, sym.startLine, 'definition', sym.qualifiedName);
      } else {
        setPeekCandidates(res.value.candidates);
      }
    },
    [activeRepoId, activeFile, openFileAt],
  );

  const handlePeekSymbol = useCallback(
    async (line: number, symbolName: string) => {
      if (!activeRepoId || !activeFile) return;
      const res = await callClewRpc<{ peek: SymbolPeekResult }>('nav/peek', {
        repoId: activeRepoId,
        file: activeFile,
        line,
        symbolName,
      });
      if (!res.ok) {
        setErrorBanner(`${res.error.code}: ${res.error.message}`);
        return;
      }
      if (!res.value.peek.found) {
        setErrorBanner(`No symbol preview found for "${symbolName}".`);
        return;
      }
      setPeekData(res.value.peek);
    },
    [activeRepoId, activeFile],
  );

  useEffect(() => {
    if (!activeRepoId || !activeFile || !selectedRange) {
      setLineCommits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void callClewRpc<{ commits: LineCommitInfo[] }>('git/line-context', {
        repoId: activeRepoId,
        file: activeFile,
        startLine: selectedRange.start,
        endLine: selectedRange.end,
      }).then((res) => {
        if (res.ok) setLineCommits(res.value.commits);
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [activeRepoId, activeFile, selectedRange]);

  const handleFindReferences = useCallback(
    async (symbolName: string) => {
      if (!activeRepoId) return;
      const res = await callClewRpc<{ references: ReferenceHit[] }>('nav/references', {
        repoId: activeRepoId,
        symbolName,
      });
      if (!res.ok) {
        setErrorBanner(`${res.error.code}: ${res.error.message}`);
        return;
      }
      setReferences(res.value.references);
      setActiveRefSymbol(symbolName);
      setRightOpen(true);
      setRightTab('evidence');
    },
    [activeRepoId],
  );

  const handleAskQuestion = useCallback(
    async (question: string, rangeOverride?: { start: number; end: number }) => {
      if (!activeRepoId || !activeFile) return;
      const range = rangeOverride ?? selectedRange ?? { start: focusedLine ?? 1, end: focusedLine ?? 1 };
      setQaLoading(true);
      const res = await callClewRpc<{
        answer: string;
        citations: Array<{ file: string; line: number; symbolName?: string; verified: boolean }>;
        agentEnhanced: boolean;
      }>('qa/ask', {
        repoId: activeRepoId,
        question,
        file: activeFile,
        startLine: range.start,
        endLine: range.end,
        goal: trace?.goal,
      });
      setQaLoading(false);
      if (!res.ok) {
        setErrorBanner(`${res.error.code}: ${res.error.message}`);
        return;
      }
      setQaHistory((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          question,
          answer: res.value.answer,
          file: activeFile,
          startLine: range.start,
          endLine: range.end,
          citations: res.value.citations,
          agentEnhanced: res.value.agentEnhanced,
        },
      ]);
      setRightOpen(true);
      setRightTab('qa');
    },
    [activeRepoId, activeFile, selectedRange, focusedLine, trace],
  );

  const activeTab = useMemo(
    () => tabs.find((tb) => tb.file === activeFile) ?? null,
    [tabs, activeFile],
  );

  const readerHighlights = useMemo<CodeHighlightBand[]>(() => {
    if (!activeFile) return [];
    const bands: CodeHighlightBand[] = [];
    if (trace) {
      for (const n of trace.nodes) {
        if (n.file === activeFile) {
          bands.push({ startLine: n.startLine, endLine: n.endLine, kind: 'trace' });
        }
      }
    }
    if (focusedLine) {
      bands.push({ startLine: focusedLine, endLine: focusedLine, kind: 'citation' });
    }
    return bands;
  }, [activeFile, trace, focusedLine]);

  return (
    <div className="clew-root" data-clew-locale-rev={localeRev} data-testid="clew-workbench">
      <TopBar
        t={t}
        repos={repos}
        activeRepoId={activeRepoId}
        onSelectRepo={(id) => {
          setActiveRepoId(id);
          setTabs([]);
          setActiveFile(null);
          setSplitCompareFile(null);
          setPeekData(null);
          setLineCommits([]);
          setTrace(null);
          void loadRepoWorkspace(id);
        }}
        onOpenImport={() => setShowImportModal(true)}
        goalInput={goalInput}
        onGoalInputChange={setGoalInput}
        onRunTrace={() => void runTrace()}
        activeJob={activeJob}
        onCancelJob={(jobId) => {
          void callClewRpc('jobs/cancel', { jobId });
        }}
        onOpenPalette={() => setShowPalette(true)}
        onOpenGlobalSearch={() => setShowGlobalSearch(true)}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onOpenDiagnostics={() => setShowDiagnostics(true)}
        onToggleLeftRail={() => setLeftOpen((v) => !v)}
        onToggleRightDrawer={() => setRightOpen((v) => !v)}
      />

      {errorBanner && (
        <div className="clew-error-banner" role="alert">
          <span>{errorBanner}</span>
          <button type="button" className="clew-text-btn" onClick={() => setErrorBanner(null)}>
            ×
          </button>
        </div>
      )}

      <div className="clew-workbench-body">
        {leftOpen && (
          <>
            <div style={{ width: leftWidth, height: '100%', flexShrink: 0 }}>
              <LeftRail
                t={t}
                tree={tree}
                overview={overview}
                activeFile={activeFile}
                fileStatuses={fileStatuses}
                onOpenFile={(f, ln, act, sym) => void openFileAt(f, ln ?? 1, act ?? 'open', sym)}
                trail={trail}
                savedPaths={savedPaths}
                onSavePath={(title) => {
                  if (!activeRepoId) return;
                  void callClewRpc<{ path: ReadingPathRecord }>('paths/save', {
                    repoId: activeRepoId,
                    title,
                    steps: trail,
                  }).then((res) => {
                    if (res.ok) setSavedPaths((prev) => [res.value.path, ...prev]);
                  });
                }}
                onLoadPath={(sp) => {
                  setTrail(sp.steps);
                  if (sp.steps[0]) {
                    void openFileAt(sp.steps[0].file, sp.steps[0].line, 'open', sp.steps[0].symbolName);
                  }
                }}
                onDeletePath={(id) => {
                  void callClewRpc('paths/delete', { id }).then(() => {
                    setSavedPaths((prev) => prev.filter((p) => p.id !== id));
                  });
                }}
                onTraceFromTrail={() => {
                  const syms = trail
                    .map((s) => s.symbolName)
                    .filter(Boolean)
                    .slice(0, 4)
                    .join(' ');
                  if (syms) {
                    setGoalInput(syms);
                    void runTrace(syms);
                  }
                }}
                onClearTrail={() => setTrail([])}
              />
            </div>
            <div
              className="clew-resizer"
              onMouseDown={(e) => {
                dragRef.current = { side: 'left', startX: e.clientX, startW: leftWidth };
              }}
            />
          </>
        )}

        <main className="clew-center-pane">
          {(viewMode === 'split' || viewMode === 'graph') && (
            <div className={viewMode === 'graph' ? 'clew-center-full' : 'clew-center-top'}>
              <TraceGraphCanvas
                t={t}
                trace={trace}
                selectedNodeId={selectedNode?.id ?? null}
                isLoading={traceLoading}
                onSelectNode={(node) => {
                  setSelectedNode(node);
                  void openFileAt(node.file, node.startLine, 'trace_node', node.qualifiedName);
                }}
              />
            </div>
          )}

          {(viewMode === 'split' || viewMode === 'code') && (
            <div className={viewMode === 'code' ? 'clew-center-full' : 'clew-center-bottom'}>
              <CodeReader
                t={t}
                tabs={tabs}
                activeTab={activeTab}
                focusedLine={focusedLine}
                highlights={readerHighlights}
                annotations={annotations}
                canBack={historyIndex > 0}
                canForward={historyIndex < history.length - 1}
                onSelectTab={(file) => setActiveFile(file)}
                onCloseTab={(file) => {
                  setTabs((prev) => {
                    const remaining = prev.filter((tb) => tb.file !== file);
                    if (activeFile === file) {
                      setActiveFile(remaining[0]?.file ?? null);
                    }
                    if (splitCompareFile === file) {
                      setSplitCompareFile(null);
                    }
                    return remaining;
                  });
                }}
                onBack={goBack}
                onForward={goForward}
                onSelectLineRange={(start, end) => {
                  setFocusedLine(start);
                  setSelectedRange({ start, end });
                }}
                selectedRange={selectedRange}
                onAskAi={(start, end) => {
                  void handleAskQuestion(
                    `Explain lines ${start}-${end} in ${activeFile ?? 'file'}`,
                    { start, end },
                  );
                }}
                onAnnotate={(start, end) => {
                  if (!activeFile) return;
                  setDraftAnnRange({ file: activeFile, startLine: start, endLine: end });
                  setRightOpen(true);
                  setRightTab('annotations');
                }}
                onGotoDefinition={(line, sym) => void handleGotoDefinition(line, sym)}
                onPeekSymbol={(line, sym) => void handlePeekSymbol(line, sym)}
                peekData={peekData}
                onClosePeek={() => setPeekData(null)}
                onJumpToFileLine={(file, line, sym) =>
                  void openFileAt(file, line, 'definition', sym)
                }
                onFindReferences={(sym) => void handleFindReferences(sym)}
                onPinToTrail={(line, sym) => {
                  if (!activeFile) return;
                  void openFileAt(activeFile, line, 'open', sym, false);
                }}
                splitCompareFile={splitCompareFile}
                onChangeSplitCompareFile={setSplitCompareFile}
                fileStatuses={fileStatuses}
                onChangeFileStatus={(file, status) => {
                  if (!activeRepoId) return;
                  setFileStatuses((prev) => ({ ...prev, [file]: status }));
                  void callClewRpc('status/set', { repoId: activeRepoId, file, status });
                }}
              />
            </div>
          )}
        </main>

        {rightOpen && (
          <>
            <div
              className="clew-resizer"
              onMouseDown={(e) => {
                dragRef.current = { side: 'right', startX: e.clientX, startW: rightWidth };
              }}
            />
            <div style={{ width: rightWidth, height: '100%', flexShrink: 0 }}>
              <RightDrawer
                t={t}
                activeTab={rightTab}
                onTabChange={setRightTab}
                trace={trace}
                selectedNode={selectedNode}
                qaHistory={qaHistory}
                qaLoading={qaLoading}
                onSubmitQuestion={(q) => void handleAskQuestion(q)}
                onOpenCitation={(f, ln, sym) => void openFileAt(f, ln, 'citation', sym)}
                annotations={annotations}
                draftAnnotationRange={draftAnnRange}
                onCreateAnnotation={(body, title) => {
                  if (!activeRepoId || !draftAnnRange) return;
                  void callClewRpc<{ annotation: AnnotationRecord }>('annotations/create', {
                    repoId: activeRepoId,
                    file: draftAnnRange.file,
                    startLine: draftAnnRange.startLine,
                    endLine: draftAnnRange.endLine,
                    body,
                    title,
                  }).then((res) => {
                    if (res.ok) {
                      setAnnotations((prev) => [...prev, res.value.annotation]);
                      setDraftAnnRange(null);
                    }
                  });
                }}
                onCancelDraftAnnotation={() => setDraftAnnRange(null)}
                onUpdateAnnotation={(id, patch) => {
                  void callClewRpc<{ annotation: AnnotationRecord }>('annotations/update', {
                    id,
                    ...patch,
                  }).then((res) => {
                    if (res.ok) {
                      setAnnotations((prev) =>
                        prev.map((a) => (a.id === id ? res.value.annotation : a)),
                      );
                    }
                  });
                }}
                onDeleteAnnotation={(id) => {
                  void callClewRpc('annotations/delete', { id }).then(() => {
                    setAnnotations((prev) => prev.filter((a) => a.id !== id));
                  });
                }}
                onRevalidateAnnotations={() => {
                  if (!activeRepoId || !activeFile) return;
                  void callClewRpc<{ annotations: AnnotationRecord[] }>('annotations/revalidate', {
                    repoId: activeRepoId,
                    file: activeFile,
                  }).then((res) => {
                    if (res.ok) {
                      setAnnotations((prev) => {
                        const map = new Map(res.value.annotations.map((a) => [a.id, a]));
                        return prev.map((a) => map.get(a.id) ?? a);
                      });
                    }
                  });
                }}
                references={references}
                activeReferenceSymbol={activeRefSymbol}
                lineCommits={lineCommits}
              />
            </div>
          </>
        )}
      </div>

      {showImportModal && (
        <ImportRepoModal
          t={t}
          onClose={() => setShowImportModal(false)}
          onImported={(repoId) => void refreshRepoList(repoId)}
        />
      )}

      {showPalette && activeRepoId && (
        <CommandPaletteModal
          t={t}
          repoId={activeRepoId}
          onClose={() => setShowPalette(false)}
          onSelect={(f, ln, sym) => void openFileAt(f, ln ?? 1, 'search', sym)}
        />
      )}

      {showGlobalSearch && activeRepoId && (
        <GlobalSearchModal
          t={t}
          repoId={activeRepoId}
          onClose={() => setShowGlobalSearch(false)}
          onSelect={(f, ln) => void openFileAt(f, ln, 'search')}
        />
      )}

      {peekCandidates && (
        <PeekModal
          t={t}
          candidates={peekCandidates}
          onClose={() => setPeekCandidates(null)}
          onSelect={(cand) =>
            void openFileAt(
              cand.symbol.file,
              cand.symbol.startLine,
              'definition',
              cand.symbol.qualifiedName,
            )
          }
        />
      )}

      {showDiagnostics && (
        <DiagnosticsModal t={t} onClose={() => setShowDiagnostics(false)} />
      )}
    </div>
  );
}

export const inject = ['locale', 'slots', 'connection'];

export function apply(ctx: DshClientContext): void {
  ctx.effect(
    () => ctx.locale.register(NS, { en: flattenDict(en), zh: flattenDict(zh) }),
    'clew:locale',
  );
  const t = ctx.locale.bind(NS);

  ctx.effect(() => {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-clew-styles', 'true');
    styleEl.textContent = CLEW_SCOPED_CSS;
    document.head.appendChild(styleEl);
    return () => {
      styleEl.remove();
    };
  }, 'clew:styles');

  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      {
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 20,
        label: () => t('panel.label'),
        locale: NS,
      },
      ({ size }: { size?: number }) => <ClewBrandMark size={size ?? 18} />,
    ),
  );

  ctx.slots.inject('main', () =>
    ctx.slots.register(
      {
        name: 'main',
        key: PANEL_ID,
        locale: NS,
      },
      () => <ClewWorkbench ctx={ctx} t={t} />,
    ),
  );
}

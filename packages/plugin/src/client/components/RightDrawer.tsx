import { useState } from 'react';
import type {
  AnnotationRecord,
  LineCommitInfo,
  ReferenceHit,
  TraceGraph,
  TraceNode,
} from '@clew/shared/contracts';

export type RightTab = 'qa' | 'annotations' | 'evidence';

export interface QaExchange {
  id: string;
  question: string;
  answer: string;
  file: string;
  startLine: number;
  endLine: number;
  citations: Array<{ file: string; line: number; symbolName?: string; verified: boolean }>;
  agentEnhanced: boolean;
}

interface RightDrawerProps {
  t: (key: string) => string;
  activeTab: RightTab;
  onTabChange: (tab: RightTab) => void;
  trace: TraceGraph | null;
  selectedNode: TraceNode | null;
  qaHistory: QaExchange[];
  qaLoading: boolean;
  onSubmitQuestion: (question: string) => void;
  onOpenCitation: (file: string, line: number, symbolName?: string) => void;
  annotations: AnnotationRecord[];
  draftAnnotationRange: { file: string; startLine: number; endLine: number } | null;
  onCreateAnnotation: (body: string, title?: string) => void;
  onCancelDraftAnnotation: () => void;
  onUpdateAnnotation: (
    id: string,
    patch: { status?: AnnotationRecord['status']; replyBody?: string; body?: string },
  ) => void;
  onDeleteAnnotation: (id: string) => void;
  onRevalidateAnnotations: () => void;
  references: ReferenceHit[];
  activeReferenceSymbol: string | null;
  lineCommits: LineCommitInfo[];
}

export function RightDrawer({
  t,
  activeTab,
  onTabChange,
  trace,
  selectedNode,
  qaHistory,
  qaLoading,
  onSubmitQuestion,
  onOpenCitation,
  annotations,
  draftAnnotationRange,
  onCreateAnnotation,
  onCancelDraftAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onRevalidateAnnotations,
  references,
  activeReferenceSymbol,
  lineCommits,
}: RightDrawerProps) {
  const [questionInput, setQuestionInput] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  return (
    <aside className="clew-right-drawer" aria-label={t('ui.rightDrawerLabel')}>
      <div className="clew-tab-strip">
        {(['qa', 'annotations', 'evidence'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={`clew-tab-btn ${activeTab === k ? 'active' : ''}`}
            onClick={() => onTabChange(k)}
            data-testid={`clew-right-tab-${k}`}
          >
            {t(`ui.right.${k}`)}
            {k === 'annotations' && annotations.length > 0 ? ` (${annotations.length})` : ''}
          </button>
        ))}
      </div>

      <div className="clew-rail-body">
        {activeTab === 'qa' && (
          <div className="clew-qa-pane" data-testid="clew-qa-pane">
            {selectedNode && (
              <div className="clew-mini-card">
                <div className="clew-section-header">
                  <span className="clew-mono clew-item-title">{selectedNode.qualifiedName}</span>
                  <span className="clew-badge-subtle">{selectedNode.kind}</span>
                </div>
                <div className="clew-item-sub">
                  {selectedNode.file}:{selectedNode.startLine}–{selectedNode.endLine}
                </div>
                {selectedNode.summary && (
                  <pre className="clew-code-snippet">{selectedNode.summary}</pre>
                )}
              </div>
            )}

            {trace && (
              <div className="clew-mini-card" data-testid="clew-trace-narrative">
                <div className="clew-section-title">{t('ui.qa.traceSummary')}</div>
                <p className="clew-prose">{trace.narrative}</p>
                <div className="clew-pill-wrap">
                  {trace.citations.map((cit, idx) => (
                    <button
                      key={`${cit.file}:${cit.line}:${idx}`}
                      type="button"
                      className={`clew-citation-pill ${cit.verified ? 'verified' : ''}`}
                      onClick={() => onOpenCitation(cit.file, cit.line, cit.symbolName)}
                      data-testid="clew-citation-pill"
                    >
                      {cit.verified ? '✓ ' : '? '}
                      {cit.file.split('/').pop()}:{cit.line}
                    </button>
                  ))}
                </div>
                <div className="clew-telemetry-line">
                  {trace.telemetry.filesRead} {t('ui.qa.filesRead')} · ~{trace.telemetry.estimatedTokens} tok ·{' '}
                  {trace.telemetry.cacheHit ? 'cache hit' : `${trace.telemetry.durationMs}ms`}
                </div>
              </div>
            )}

            <div className="clew-qa-thread">
              {qaHistory.map((item) => (
                <div key={item.id} className="clew-mini-card" data-testid="clew-qa-item">
                  <div className="clew-qa-q">
                    <span className="clew-mono">
                      {item.file.split('/').pop()}:{item.startLine}–{item.endLine}
                    </span>
                    <div>{item.question}</div>
                  </div>
                  <div className="clew-prose">{item.answer}</div>
                  <div className="clew-pill-wrap">
                    {item.citations.map((c, idx) => (
                      <button
                        key={`${c.file}:${c.line}:${idx}`}
                        type="button"
                        className={`clew-citation-pill ${c.verified ? 'verified' : ''}`}
                        onClick={() => onOpenCitation(c.file, c.line, c.symbolName)}
                      >
                        {c.file.split('/').pop()}:{c.line}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <form
              className="clew-qa-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (questionInput.trim()) {
                  onSubmitQuestion(questionInput.trim());
                  setQuestionInput('');
                }
              }}
            >
              <textarea
                className="clew-textarea"
                rows={3}
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder={t('ui.qa.placeholder')}
                data-testid="clew-qa-input"
              />
              <button
                type="submit"
                className="clew-btn clew-btn-primary"
                disabled={qaLoading || !questionInput.trim()}
                data-testid="clew-qa-submit"
              >
                {qaLoading ? t('ui.qa.thinking') : t('ui.qa.askBtn')}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'annotations' && (
          <div className="clew-ann-pane" data-testid="clew-annotations-pane">
            <div className="clew-section-header">
              <span className="clew-section-title">{t('ui.annotations.title')}</span>
              <button
                type="button"
                className="clew-text-btn"
                onClick={onRevalidateAnnotations}
              >
                {t('ui.annotations.revalidate')}
              </button>
            </div>

            {draftAnnotationRange && (
              <form
                className="clew-mini-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (annBody.trim()) {
                    onCreateAnnotation(annBody.trim(), annTitle.trim() || undefined);
                    setAnnTitle('');
                    setAnnBody('');
                  }
                }}
              >
                <div className="clew-mono clew-item-sub">
                  {draftAnnotationRange.file}:{draftAnnotationRange.startLine}–
                  {draftAnnotationRange.endLine}
                </div>
                <input
                  type="text"
                  className="clew-input-sm"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder={t('ui.annotations.titlePlaceholder')}
                />
                <textarea
                  className="clew-textarea"
                  rows={3}
                  value={annBody}
                  onChange={(e) => setAnnBody(e.target.value)}
                  placeholder={t('ui.annotations.bodyPlaceholder')}
                  data-testid="clew-ann-body-input"
                />
                <div className="clew-btn-row">
                  <button
                    type="submit"
                    className="clew-btn clew-btn-primary"
                    disabled={!annBody.trim()}
                    data-testid="clew-ann-save-btn"
                  >
                    {t('ui.annotations.save')}
                  </button>
                  <button type="button" className="clew-btn" onClick={onCancelDraftAnnotation}>
                    {t('ui.cancel')}
                  </button>
                </div>
              </form>
            )}

            {annotations.length === 0 && !draftAnnotationRange ? (
              <p className="clew-empty-hint">{t('ui.annotations.empty')}</p>
            ) : (
              annotations.map((ann) => (
                <div key={ann.id} className="clew-mini-card" data-testid="clew-annotation-card">
                  <div className="clew-section-header">
                    <button
                      type="button"
                      className="clew-link-row"
                      onClick={() => onOpenCitation(ann.file, ann.startLine)}
                    >
                      {ann.file.split('/').pop()}:{ann.startLine}–{ann.endLine}
                    </button>
                    <span className={`clew-status-pill status-${ann.status}`}>{ann.status}</span>
                  </div>
                  {ann.title && <div className="clew-item-title">{ann.title}</div>}
                  <div className="clew-prose">{ann.body}</div>
                  {ann.replies.map((rep) => (
                    <div key={rep.id} className="clew-ann-reply">
                      <span className="clew-mono">{rep.author}:</span> {rep.body}
                    </div>
                  ))}
                  <div className="clew-btn-row" style={{ marginTop: 6 }}>
                    <button
                      type="button"
                      className="clew-btn-xs"
                      onClick={() =>
                        onUpdateAnnotation(ann.id, {
                          status: ann.status === 'resolved' ? 'open' : 'resolved',
                        })
                      }
                    >
                      {ann.status === 'resolved' ? t('ui.annotations.reopen') : t('ui.annotations.resolve')}
                    </button>
                    <button
                      type="button"
                      className="clew-btn-xs"
                      onClick={() => onDeleteAnnotation(ann.id)}
                    >
                      {t('ui.delete')}
                    </button>
                  </div>
                  <form
                    className="clew-reply-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const text = replyDrafts[ann.id]?.trim();
                      if (text) {
                        onUpdateAnnotation(ann.id, { replyBody: text });
                        setReplyDrafts((prev) => ({ ...prev, [ann.id]: '' }));
                      }
                    }}
                  >
                    <input
                      type="text"
                      className="clew-input-xs"
                      value={replyDrafts[ann.id] ?? ''}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [ann.id]: e.target.value }))
                      }
                      placeholder={t('ui.annotations.replyPlaceholder')}
                    />
                  </form>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="clew-evidence-pane" data-testid="clew-evidence-pane">
            {activeReferenceSymbol && (
              <div className="clew-section">
                <div className="clew-section-title">
                  {t('ui.evidence.referencesFor')} `{activeReferenceSymbol}` ({references.length})
                </div>
                {references.length === 0 ? (
                  <p className="clew-empty-hint">{t('ui.noResults')}</p>
                ) : (
                  references.map((ref, idx) => (
                    <button
                      key={`${ref.file}:${ref.line}:${idx}`}
                      type="button"
                      className="clew-list-item-btn"
                      onClick={() => onOpenCitation(ref.file, ref.line, activeReferenceSymbol)}
                    >
                      <div className="clew-section-header">
                        <span className="clew-mono">
                          {ref.file}:{ref.line}
                        </span>
                        <span className="clew-badge-subtle">{ref.kind}</span>
                      </div>
                      <div className="clew-item-sub clew-mono">{ref.lineText.trim()}</div>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="clew-section" data-testid="clew-git-history">
              <div className="clew-section-title">{t('ui.reader.gitHistory')}</div>
              {lineCommits.length === 0 ? (
                <p className="clew-empty-hint">{t('ui.reader.noGitHistory')}</p>
              ) : (
                lineCommits.map((c) => (
                  <div key={c.sha} className="clew-mini-card">
                    <div className="clew-section-header">
                      <span className="clew-mono">{c.shortSha}</span>
                      <span className="clew-item-sub">{c.date.slice(0, 10)}</span>
                    </div>
                    <div className="clew-item-title">{c.subject}</div>
                    <div className="clew-item-sub">{c.author}</div>
                  </div>
                ))
              )}
            </div>

            <div className="clew-section">
              <div className="clew-section-title">{t('ui.evidence.edgesTitle')}</div>
              {!trace || trace.edges.length === 0 ? (
                <p className="clew-empty-hint">{t('ui.evidence.empty')}</p>
              ) : (
                trace.edges.map((edge) => (
                  <div key={edge.id} className="clew-mini-card">
                    <div className="clew-section-header">
                      <span className="clew-mono">{edge.label ?? 'edge'}</span>
                      <span className="clew-badge-subtle">{edge.confidence}</span>
                    </div>
                    {edge.file && edge.line && (
                      <button
                        type="button"
                        className="clew-link-row"
                        onClick={() => onOpenCitation(edge.file!, edge.line!)}
                      >
                        {edge.file}:{edge.line}
                      </button>
                    )}
                    {edge.evidenceSnippet && (
                      <pre className="clew-code-snippet">{edge.evidenceSnippet}</pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

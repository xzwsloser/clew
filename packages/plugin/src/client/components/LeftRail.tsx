import { useState } from 'react';
import type {
  ExplorationStep,
  FileTreeNode,
  ReadingPathRecord,
  RepoOverview,
} from '@clew/shared/contracts';

type LeftTab = 'files' | 'overview' | 'trail';

interface LeftRailProps {
  t: (key: string) => string;
  tree: FileTreeNode | null;
  overview: RepoOverview | null;
  activeFile: string | null;
  onOpenFile: (file: string, line?: number, action?: ExplorationStep['action'], symbolName?: string) => void;
  trail: ExplorationStep[];
  savedPaths: ReadingPathRecord[];
  onSavePath: (title: string) => void;
  onLoadPath: (path: ReadingPathRecord) => void;
  onDeletePath: (id: string) => void;
  onTraceFromTrail: () => void;
  onClearTrail: () => void;
}

function TreeRow({
  node,
  depth,
  activeFile,
  expanded,
  onToggleDir,
  onOpenFile,
}: {
  node: FileTreeNode;
  depth: number;
  activeFile: string | null;
  expanded: Set<string>;
  onToggleDir: (path: string) => void;
  onOpenFile: (file: string) => void;
}) {
  if (node.kind === 'directory') {
    const isOpen = depth === 0 || expanded.has(node.path);
    return (
      <div>
        {depth > 0 && (
          <button
            type="button"
            className="clew-tree-row"
            style={{ paddingLeft: 8 + depth * 12 }}
            onClick={() => onToggleDir(node.path)}
          >
            <span className="clew-tree-caret">{isOpen ? '▾' : '▸'}</span>
            <span className="clew-tree-name">{node.name}</span>
          </button>
        )}
        {isOpen &&
          node.children?.map((child) => (
            <TreeRow
              key={child.path || child.name}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              expanded={expanded}
              onToggleDir={onToggleDir}
              onOpenFile={onOpenFile}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`clew-tree-row ${activeFile === node.path ? 'active' : ''}`}
      style={{ paddingLeft: 8 + depth * 12 }}
      onClick={() => onOpenFile(node.path)}
      title={node.path}
    >
      <span className="clew-lang-dot" data-lang={node.language ?? 'text'} />
      <span className="clew-tree-name">{node.name}</span>
      {node.language && node.language !== 'text' && (
        <span className="clew-tree-lang">{node.language}</span>
      )}
    </button>
  );
}

export function LeftRail({
  t,
  tree,
  overview,
  activeFile,
  onOpenFile,
  trail,
  savedPaths,
  onSavePath,
  onLoadPath,
  onDeletePath,
  onTraceFromTrail,
  onClearTrail,
}: LeftRailProps) {
  const [tab, setTab] = useState<LeftTab>('files');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set(['src', 'packages', 'app']));
  const [pathTitle, setPathTitle] = useState('');

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <aside className="clew-left-rail" aria-label={t('ui.leftRailLabel')}>
      <div className="clew-tab-strip">
        {(['files', 'overview', 'trail'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={`clew-tab-btn ${tab === k ? 'active' : ''}`}
            onClick={() => setTab(k)}
            data-testid={`clew-left-tab-${k}`}
          >
            {t(`ui.left.${k}`)}
          </button>
        ))}
      </div>

      <div className="clew-rail-body">
        {tab === 'files' && (
          <div className="clew-tree-container" data-testid="clew-file-tree">
            {!tree ? (
              <p className="clew-empty-hint">{t('ui.emptyRepoHint')}</p>
            ) : (
              <TreeRow
                node={tree}
                depth={0}
                activeFile={activeFile}
                expanded={expandedDirs}
                onToggleDir={toggleDir}
                onOpenFile={(file) => onOpenFile(file, 1, 'open')}
              />
            )}
          </div>
        )}

        {tab === 'overview' && (
          <div className="clew-overview-pane" data-testid="clew-overview-pane">
            {!overview ? (
              <p className="clew-empty-hint">{t('ui.emptyRepoHint')}</p>
            ) : (
              <>
                <div className="clew-section">
                  <div className="clew-section-title">{t('ui.overview.summary')}</div>
                  <div className="clew-kv-compact">
                    <span>{t('ui.overview.files')}</span>
                    <span className="clew-mono">{overview.totalFiles}</span>
                  </div>
                  <div className="clew-kv-compact">
                    <span>{t('ui.overview.symbols')}</span>
                    <span className="clew-mono">{overview.totalSymbols}</span>
                  </div>
                  {overview.git.headSha && (
                    <div className="clew-kv-compact">
                      <span>Commit</span>
                      <span className="clew-mono">{overview.git.headSha.slice(0, 8)}</span>
                    </div>
                  )}
                </div>

                <div className="clew-section">
                  <div className="clew-section-title">{t('ui.overview.languages')}</div>
                  {overview.languages.map((lang) => (
                    <div key={lang.language} className="clew-lang-bar-row">
                      <span>{lang.language}</span>
                      <span className="clew-mono">{lang.percentage}%</span>
                    </div>
                  ))}
                </div>

                {overview.buildSystems.length > 0 && (
                  <div className="clew-section">
                    <div className="clew-section-title">{t('ui.overview.buildSystems')}</div>
                    <div className="clew-pill-wrap">
                      {overview.buildSystems.map((b) => (
                        <span key={b} className="clew-pill">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="clew-section">
                  <div className="clew-section-title">{t('ui.overview.entryPoints')}</div>
                  {overview.entryPoints.map((ep) => (
                    <button
                      key={`${ep.file}:${ep.line}`}
                      type="button"
                      className="clew-list-item-btn"
                      onClick={() => onOpenFile(ep.file, ep.line, 'open', ep.symbolName)}
                    >
                      <div className="clew-mono clew-item-title">
                        {ep.symbolName ?? ep.file}
                      </div>
                      <div className="clew-item-sub">
                        {ep.file}:{ep.line}
                      </div>
                    </button>
                  ))}
                </div>

                {overview.recommendedPaths.length > 0 && (
                  <div className="clew-section">
                    <div className="clew-section-title">{t('ui.overview.recommendedPaths')}</div>
                    {overview.recommendedPaths.map((rp) => (
                      <div key={rp.title} className="clew-mini-card">
                        <div className="clew-item-title">{rp.title}</div>
                        {rp.steps.map((st, idx) => (
                          <button
                            key={`${st.file}:${st.line}:${idx}`}
                            type="button"
                            className="clew-link-row"
                            onClick={() => onOpenFile(st.file, st.line, 'open', st.symbolName)}
                          >
                            {idx + 1}. {st.symbolName ?? st.file} ({st.file}:{st.line})
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'trail' && (
          <div className="clew-trail-pane" data-testid="clew-trail-pane">
            <div className="clew-section">
              <div className="clew-section-header">
                <span className="clew-section-title">{t('ui.trail.liveTitle')} ({trail.length})</span>
                {trail.length > 0 && (
                  <button type="button" className="clew-text-btn" onClick={onClearTrail}>
                    {t('ui.clear')}
                  </button>
                )}
              </div>

              {trail.length === 0 ? (
                <p className="clew-empty-hint">{t('ui.trail.empty')}</p>
              ) : (
                <>
                  <div className="clew-trail-list">
                    {trail.map((step, i) => (
                      <button
                        key={step.id}
                        type="button"
                        className="clew-list-item-btn"
                        onClick={() => onOpenFile(step.file, step.line, 'open', step.symbolName)}
                      >
                        <div className="clew-mono clew-item-title">
                          {i + 1}. {step.symbolName ?? step.file}
                        </div>
                        <div className="clew-item-sub">
                          {step.file}:{step.line} · {step.action}
                        </div>
                      </button>
                    ))}
                  </div>

                  <form
                    className="clew-save-path-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (pathTitle.trim()) {
                        onSavePath(pathTitle.trim());
                        setPathTitle('');
                      }
                    }}
                  >
                    <input
                      type="text"
                      className="clew-input-sm"
                      value={pathTitle}
                      onChange={(e) => setPathTitle(e.target.value)}
                      placeholder={t('ui.trail.savePlaceholder')}
                      data-testid="clew-save-path-input"
                    />
                    <div className="clew-btn-row">
                      <button
                        type="submit"
                        className="clew-btn"
                        disabled={!pathTitle.trim()}
                        data-testid="clew-save-path-btn"
                      >
                        {t('ui.trail.saveBtn')}
                      </button>
                      <button type="button" className="clew-btn" onClick={onTraceFromTrail}>
                        {t('ui.trail.toGraph')}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>

            <div className="clew-section">
              <div className="clew-section-title">
                {t('ui.trail.savedTitle')} ({savedPaths.length})
              </div>
              {savedPaths.length === 0 ? (
                <p className="clew-empty-hint">{t('ui.trail.noSaved')}</p>
              ) : (
                savedPaths.map((sp) => (
                  <div key={sp.id} className="clew-mini-card" data-testid="clew-saved-path-item">
                    <div className="clew-section-header">
                      <button
                        type="button"
                        className="clew-link-row"
                        onClick={() => onLoadPath(sp)}
                      >
                        {sp.title} ({sp.steps.length})
                      </button>
                      <button
                        type="button"
                        className="clew-text-btn"
                        onClick={() => onDeletePath(sp.id)}
                      >
                        ×
                      </button>
                    </div>
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

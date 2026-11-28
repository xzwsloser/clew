import { useEffect, useState } from 'react';
import type {
  DefinitionCandidate,
  DiagnosticsSnapshot,
  FuzzyItem,
  SearchHit,
} from '@clew/shared/contracts';
import { callClewRpc } from '../api.js';

export function ImportRepoModal({
  t,
  onClose,
  onImported,
}: {
  t: (key: string) => string;
  onClose: () => void;
  onImported: (repoId: string) => void;
}) {
  const [sourceType, setSourceType] = useState<'local' | 'git'>('local');
  const [location, setLocation] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;
    setBusy(true);
    setError(null);
    const res = await callClewRpc<{ repo: { id: string } }>('repo/import', {
      sourceType,
      location: location.trim(),
      name: name.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(`${res.error.code}: ${res.error.message}`);
      return;
    }
    onImported(res.value.repo.id);
    onClose();
  };

  return (
    <div className="clew-modal-backdrop" role="dialog" aria-modal="true" data-testid="clew-import-modal">
      <div className="clew-modal">
        <div className="clew-modal-header">
          <h2>{t('ui.importModal.title')}</h2>
          <button type="button" className="clew-text-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="clew-modal-body">
          <div className="clew-segmented" style={{ marginBottom: 10 }}>
            <button
              type="button"
              className={`clew-seg-btn ${sourceType === 'local' ? 'active' : ''}`}
              onClick={() => setSourceType('local')}
            >
              {t('ui.importModal.local')}
            </button>
            <button
              type="button"
              className={`clew-seg-btn ${sourceType === 'git' ? 'active' : ''}`}
              onClick={() => setSourceType('git')}
            >
              {t('ui.importModal.git')}
            </button>
          </div>
          <label className="clew-field-label">
            {sourceType === 'local' ? t('ui.importModal.pathLabel') : t('ui.importModal.urlLabel')}
          </label>
          <input
            type="text"
            className="clew-input-full"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={
              sourceType === 'local' ? '/path/to/repository' : 'https://github.com/org/repo.git'
            }
            data-testid="clew-import-location"
            autoFocus
          />
          <label className="clew-field-label">{t('ui.importModal.nameLabel')}</label>
          <input
            type="text"
            className="clew-input-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('ui.importModal.namePlaceholder')}
          />
          <p className="clew-empty-hint">{t('ui.importModal.readOnlyNotice')}</p>
          {error && (
            <div className="clew-error-box" role="alert">
              {error}
            </div>
          )}
          <div className="clew-modal-footer">
            <button type="button" className="clew-btn" onClick={onClose}>
              {t('ui.cancel')}
            </button>
            <button
              type="submit"
              className="clew-btn clew-btn-primary"
              disabled={busy || !location.trim()}
              data-testid="clew-import-submit"
            >
              {busy ? t('ui.importModal.indexing') : t('ui.importModal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CommandPaletteModal({
  t,
  repoId,
  onClose,
  onSelect,
}: {
  t: (key: string) => string;
  repoId: string;
  onClose: () => void;
  onSelect: (file: string, line?: number, symbolName?: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<FuzzyItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      void callClewRpc<{ items: FuzzyItem[] }>('search/fuzzy', {
        repoId,
        query,
        limit: 40,
      }).then((res) => {
        if (res.ok) {
          setItems(res.value.items);
          setActiveIdx(0);
        }
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [repoId, query]);

  return (
    <div className="clew-modal-backdrop" role="dialog" aria-modal="true" data-testid="clew-palette-modal">
      <div className="clew-modal clew-modal-lg">
        <div className="clew-modal-header">
          <input
            type="text"
            className="clew-input-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ui.palette.placeholder')}
            autoFocus
            data-testid="clew-palette-input"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIdx((i) => Math.min(items.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIdx((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter' && items[activeIdx]) {
                const pick = items[activeIdx]!;
                onSelect(pick.file, pick.line, pick.kind === 'symbol' ? pick.label : undefined);
                onClose();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
          />
        </div>
        <div className="clew-modal-list">
          {items.length === 0 ? (
            <p className="clew-empty-hint">{t('ui.noResults')}</p>
          ) : (
            items.map((item, idx) => (
              <button
                key={`${item.kind}:${item.file}:${item.label}:${item.line ?? 0}`}
                type="button"
                className={`clew-palette-row ${idx === activeIdx ? 'active' : ''}`}
                onClick={() => {
                  onSelect(item.file, item.line, item.kind === 'symbol' ? item.label : undefined);
                  onClose();
                }}
              >
                <span className="clew-badge-subtle">{item.symbolKind ?? item.kind}</span>
                <span className="clew-mono">{item.label}</span>
                <span className="clew-item-sub">{item.detail}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function GlobalSearchModal({
  t,
  repoId,
  onClose,
  onSelect,
}: {
  t: (key: string) => string;
  repoId: string;
  onClose: () => void;
  onSelect: (file: string, line: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regex, setRegex] = useState(false);
  const [subpath, setSubpath] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searched, setSearched] = useState(false);

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    const res = await callClewRpc<{ hits: SearchHit[] }>('search/text', {
      repoId,
      query: query.trim(),
      caseSensitive,
      regex,
      subpath: subpath.trim() || undefined,
      maxResults: 120,
    });
    setSearched(true);
    if (res.ok) setHits(res.value.hits);
  };

  return (
    <div className="clew-modal-backdrop" role="dialog" aria-modal="true" data-testid="clew-search-modal">
      <div className="clew-modal clew-modal-lg">
        <div className="clew-modal-header">
          <h2>{t('ui.searchModal.title')}</h2>
          <button type="button" className="clew-text-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={(e) => void runSearch(e)} className="clew-modal-body">
          <div className="clew-btn-row">
            <input
              type="text"
              className="clew-input-full"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('ui.searchModal.placeholder')}
              autoFocus
              data-testid="clew-global-search-input"
            />
            <button type="submit" className="clew-btn clew-btn-primary">
              {t('ui.searchModal.searchBtn')}
            </button>
          </div>
          <div className="clew-btn-row" style={{ marginTop: 8 }}>
            <label className="clew-check-label">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              />
              Aa
            </label>
            <label className="clew-check-label">
              <input type="checkbox" checked={regex} onChange={(e) => setRegex(e.target.checked)} />
              .*
            </label>
            <input
              type="text"
              className="clew-input-sm"
              value={subpath}
              onChange={(e) => setSubpath(e.target.value)}
              placeholder={t('ui.searchModal.subpathPlaceholder')}
            />
          </div>
        </form>
        <div className="clew-modal-list">
          {searched && hits.length === 0 ? (
            <p className="clew-empty-hint">{t('ui.noResults')}</p>
          ) : (
            hits.map((hit, idx) => (
              <button
                key={`${hit.file}:${hit.line}:${idx}`}
                type="button"
                className="clew-palette-row"
                onClick={() => {
                  onSelect(hit.file, hit.line);
                  onClose();
                }}
              >
                <span className="clew-mono">
                  {hit.file}:{hit.line}
                </span>
                <span className="clew-item-sub clew-mono">{hit.lineText.trim()}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function PeekModal({
  t,
  candidates,
  onClose,
  onSelect,
}: {
  t: (key: string) => string;
  candidates: DefinitionCandidate[];
  onClose: () => void;
  onSelect: (cand: DefinitionCandidate) => void;
}) {
  return (
    <div className="clew-modal-backdrop" role="dialog" aria-modal="true" data-testid="clew-peek-modal">
      <div className="clew-modal">
        <div className="clew-modal-header">
          <h2>{t('ui.peek.title')}</h2>
          <button type="button" className="clew-text-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="clew-modal-list">
          {candidates.map((cand) => (
            <button
              key={cand.symbol.id}
              type="button"
              className="clew-palette-row"
              onClick={() => {
                onSelect(cand);
                onClose();
              }}
            >
              <span className="clew-badge-subtle">{cand.tier}</span>
              <span className="clew-mono">
                {cand.symbol.qualifiedName} ({cand.symbol.file}:{cand.symbol.startLine})
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DiagnosticsModal({
  t,
  onClose,
}: {
  t: (key: string) => string;
  onClose: () => void;
}) {
  const [diag, setDiag] = useState<DiagnosticsSnapshot | null>(null);
  const [clearing, setClearing] = useState(false);

  const load = () => {
    void callClewRpc<DiagnosticsSnapshot>('diagnostics', {}).then((res) => {
      if (res.ok) setDiag(res.value);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const clearCache = async () => {
    setClearing(true);
    await callClewRpc('cache/clear', {});
    setClearing(false);
    load();
  };

  return (
    <div className="clew-modal-backdrop" role="dialog" aria-modal="true" data-testid="clew-diagnostics-modal">
      <div className="clew-modal clew-modal-lg">
        <div className="clew-modal-header">
          <h2>{t('ui.diagnosticsModal.title')}</h2>
          <button type="button" className="clew-text-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="clew-modal-body">
          {!diag ? (
            <p>{t('panel.loading')}</p>
          ) : (
            <>
              <div className="clew-kv-compact">
                <span>{t('ui.diagnosticsModal.cacheDir')}</span>
                <span className="clew-mono">{diag.cacheDir}</span>
              </div>
              <div className="clew-kv-compact">
                <span>{t('ui.diagnosticsModal.cacheSize')}</span>
                <span className="clew-mono">
                  {(diag.cacheBytes / 1024).toFixed(1)} KiB ({diag.cachedRepos} snapshots)
                </span>
              </div>
              <div className="clew-kv-compact">
                <span>{t('ui.diagnosticsModal.counts')}</span>
                <span className="clew-mono">
                  {diag.reposCount} repos · {diag.annotationsCount} annotations · {diag.readingPathsCount} paths
                </span>
              </div>
              <div className="clew-kv-compact">
                <span>{t('ui.diagnosticsModal.lastRun')}</span>
                <span className="clew-mono">
                  {diag.lastAnalysisDurationMs !== null ? `${diag.lastAnalysisDurationMs}ms` : '—'} ·{' '}
                  {diag.lastFilesRead} files · ~{diag.lastEstimatedTokens} tok ·{' '}
                  {diag.lastCacheHit === null ? '—' : diag.lastCacheHit ? 'cache hit' : 'fresh'}
                </span>
              </div>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="clew-btn"
                  disabled={clearing}
                  onClick={() => void clearCache()}
                  data-testid="clew-clear-cache-btn"
                >
                  {clearing ? '...' : t('ui.diagnosticsModal.clearCache')}
                </button>
              </div>
              <div className="clew-section" style={{ marginTop: 14 }}>
                <div className="clew-section-title">{t('ui.diagnosticsModal.logs')}</div>
                <div className="clew-log-box">
                  {diag.recentLogs.length === 0 ? (
                    <span className="clew-empty-hint">{t('ui.noResults')}</span>
                  ) : (
                    diag.recentLogs.map((l, idx) => (
                      <div key={idx} className="clew-mono clew-log-line">
                        [{l.level}] {l.timestamp.slice(11, 19)} {l.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type {
  AnnotationRecord,
  OutlineNode,
  SupportedLanguage,
} from '@clew/shared/contracts';
import { tokenizeCodeLine } from '../syntax-highlight.js';

export interface OpenTabState {
  file: string;
  language: SupportedLanguage;
  totalLines: number;
  lines: Array<{ number: number; text: string }>;
  outline: OutlineNode[];
}

export interface CodeHighlightBand {
  startLine: number;
  endLine: number;
  kind: 'trace' | 'citation' | 'focus';
}

interface CodeReaderProps {
  t: (key: string) => string;
  tabs: OpenTabState[];
  activeTab: OpenTabState | null;
  focusedLine: number | null;
  highlights: CodeHighlightBand[];
  annotations: AnnotationRecord[];
  canBack: boolean;
  canForward: boolean;
  onSelectTab: (file: string) => void;
  onCloseTab: (file: string) => void;
  onBack: () => void;
  onForward: () => void;
  onSelectLineRange: (start: number, end: number) => void;
  selectedRange: { start: number; end: number } | null;
  onAskAi: (start: number, end: number) => void;
  onAnnotate: (start: number, end: number) => void;
  onGotoDefinition: (line: number, symbolName: string) => void;
  onFindReferences: (symbolName: string) => void;
  onPinToTrail: (line: number, symbolName?: string) => void;
}

export function CodeReader({
  t,
  tabs,
  activeTab,
  focusedLine,
  highlights,
  annotations,
  canBack,
  canForward,
  onSelectTab,
  onCloseTab,
  onBack,
  onForward,
  onSelectLineRange,
  selectedRange,
  onAskAi,
  onAnnotate,
  onGotoDefinition,
  onFindReferences,
  onPinToTrail,
}: CodeReaderProps) {
  const scrollParentRef = useRef<HTMLDivElement | null>(null);
  const [symbolPick, setSymbolPick] = useState<string>('');

  useEffect(() => {
    setSymbolPick('');
  }, [activeTab?.file]);

  const lines = activeTab?.lines ?? [];
  const rowVirtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 22,
    overscan: 20,
  });

  const annotatedLines = useMemo(() => {
    const map = new Map<number, AnnotationRecord[]>();
    if (!activeTab) return map;
    for (const ann of annotations) {
      if (ann.file !== activeTab.file) continue;
      for (let ln = ann.startLine; ln <= ann.endLine; ln++) {
        const list = map.get(ln) ?? [];
        list.push(ann);
        map.set(ln, list);
      }
    }
    return map;
  }, [annotations, activeTab]);

  if (!activeTab) {
    return (
      <div className="clew-reader-empty" data-testid="clew-reader-empty">
        <div className="clew-empty-title">{t('ui.reader.emptyTitle')}</div>
        <p className="clew-empty-hint">{t('ui.reader.emptyDesc')}</p>
      </div>
    );
  }

  const guessWordOnLine = (lineNumber: number): string => {
    const lineObj = lines.find((l) => l.number === lineNumber);
    if (!lineObj) return '';
    const match = /[A-Za-z_][A-Za-z0-9_]{2,}/.exec(lineObj.text.trim());
    return match?.[0] ?? '';
  };

  const activeWord =
    symbolPick.trim() || (selectedRange ? guessWordOnLine(selectedRange.start) : '');

  return (
    <div className="clew-reader-shell" data-testid="clew-code-reader">
      {/* Tabs */}
      <div className="clew-reader-tabs">
        <div className="clew-history-btns">
          <button
            type="button"
            className="clew-btn-xs"
            disabled={!canBack}
            onClick={onBack}
            title="Alt+Left"
          >
            ←
          </button>
          <button
            type="button"
            className="clew-btn-xs"
            disabled={!canForward}
            onClick={onForward}
            title="Alt+Right"
          >
            →
          </button>
        </div>
        {tabs.map((tab) => (
          <div
            key={tab.file}
            className={`clew-reader-tab ${tab.file === activeTab.file ? 'active' : ''}`}
          >
            <button type="button" className="clew-tab-label" onClick={() => onSelectTab(tab.file)}>
              {tab.file.split('/').pop()}
            </button>
            <button
              type="button"
              className="clew-tab-close"
              onClick={() => onCloseTab(tab.file)}
              aria-label={`Close ${tab.file}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Breadcrumb & Outline */}
      <div className="clew-reader-breadcrumb">
        <span className="clew-mono">{activeTab.file}</span>
        <div className="clew-outline-wrap">
          {activeTab.outline.length > 0 && (
            <select
              className="clew-select-xs"
              value=""
              onChange={(e) => {
                const ln = Number(e.target.value);
                if (ln > 0) {
                  onSelectLineRange(ln, ln);
                  rowVirtualizer.scrollToIndex(Math.max(0, ln - 3), { align: 'start' });
                }
              }}
              aria-label={t('ui.reader.outline')}
            >
              <option value="">{t('ui.reader.outline')} ({activeTab.outline.length})</option>
              {activeTab.outline.map((item) => (
                <option key={item.symbolId} value={item.startLine}>
                  {item.kind} · {item.name} (:{item.startLine})
                </option>
              ))}
            </select>
          )}
          <span className="clew-badge-subtle">{activeTab.language}</span>
        </div>
      </div>

      {/* Floating Selection Toolbar */}
      {selectedRange && (
        <div className="clew-selection-toolbar" data-testid="clew-selection-toolbar">
          <span className="clew-mono">
            L{selectedRange.start}
            {selectedRange.end > selectedRange.start ? `–L${selectedRange.end}` : ''}
          </span>
          <input
            type="text"
            className="clew-input-xs"
            value={symbolPick}
            onChange={(e) => setSymbolPick(e.target.value)}
            placeholder={activeWord || t('ui.reader.symbolPlaceholder')}
          />
          <button
            type="button"
            className="clew-btn-xs clew-btn-accent"
            onClick={() => onAskAi(selectedRange.start, selectedRange.end)}
            data-testid="clew-ask-ai-selection"
          >
            {t('ui.reader.askAi')}
          </button>
          <button
            type="button"
            className="clew-btn-xs"
            onClick={() => onAnnotate(selectedRange.start, selectedRange.end)}
            data-testid="clew-annotate-selection"
          >
            {t('ui.reader.annotate')}
          </button>
          <button
            type="button"
            className="clew-btn-xs"
            disabled={!activeWord}
            onClick={() => onGotoDefinition(selectedRange.start, activeWord)}
            data-testid="clew-goto-def-btn"
          >
            {t('ui.reader.definition')}
          </button>
          <button
            type="button"
            className="clew-btn-xs"
            disabled={!activeWord}
            onClick={() => onFindReferences(activeWord)}
            data-testid="clew-find-refs-btn"
          >
            {t('ui.reader.references')}
          </button>
          <button
            type="button"
            className="clew-btn-xs"
            onClick={() => onPinToTrail(selectedRange.start, activeWord || undefined)}
          >
            {t('ui.reader.pin')}
          </button>
        </div>
      )}

      {/* Virtualized Code Lines */}
      <div ref={scrollParentRef} className="clew-code-scroll">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((vRow) => {
            const line = lines[vRow.index];
            if (!line) return null;

            const isSelected =
              selectedRange !== null &&
              line.number >= selectedRange.start &&
              line.number <= selectedRange.end;
            const isFocused = focusedLine === line.number;
            const band = highlights.find(
              (h) => line.number >= h.startLine && line.number <= h.endLine,
            );
            const lineAnns = annotatedLines.get(line.number);
            const tokens = tokenizeCodeLine(line.text, activeTab.language);

            return (
              <div
                key={line.number}
                className={`clew-code-line ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''} ${band ? `band-${band.kind}` : ''}`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${vRow.size}px`,
                  transform: `translateY(${vRow.start}px)`,
                }}
                onClick={(e) => {
                  if (e.shiftKey && selectedRange) {
                    const start = Math.min(selectedRange.start, line.number);
                    const end = Math.max(selectedRange.start, line.number);
                    onSelectLineRange(start, end);
                  } else {
                    onSelectLineRange(line.number, line.number);
                  }
                  const sel = window.getSelection()?.toString().trim();
                  if (sel && /^[A-Za-z_][A-Za-z0-9_]*$/.test(sel)) {
                    setSymbolPick(sel);
                  }
                }}
                onDoubleClick={() => {
                  const sel = window.getSelection()?.toString().trim();
                  if (sel && /^[A-Za-z_][A-Za-z0-9_]*$/.test(sel)) {
                    setSymbolPick(sel);
                    onGotoDefinition(line.number, sel);
                  }
                }}
              >
                <span className="clew-gutter-dot">
                  {lineAnns && lineAnns.length > 0 ? '●' : ''}
                </span>
                <span className="clew-line-num">{line.number}</span>
                <span className="clew-line-code">
                  {tokens.map((tok, idx) => (
                    <span key={idx} className={`clew-tok-${tok.kind}`}>
                      {tok.text}
                    </span>
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

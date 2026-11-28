export const CLEW_SCOPED_CSS = `
.clew-root {
  --clew-bg-canvas: var(--dsw-alias-bg-base, #F8F7F4);
  --clew-bg-surface: var(--dsw-alias-bg-layer-1, #FFFFFF);
  --clew-bg-elevated: var(--dsw-alias-bg-layer-2, #F1EFE9);
  --clew-bg-code: #FCFBF8;
  --clew-border-subtle: var(--dsw-alias-border-l2, #E4E1DA);
  --clew-border-strong: var(--dsw-alias-border-l4, #CFCAC0);
  --clew-text-primary: var(--dsw-alias-label-primary, #16181D);
  --clew-text-secondary: var(--dsw-alias-label-secondary, #4B515C);
  --clew-text-muted: var(--dsw-alias-label-tertiary, #7A818E);
  --clew-accent-primary: #C85A17;
  --clew-accent-verified: #0F766E;
  --clew-accent-inferred: #B45309;
  --clew-accent-danger: #B91C1C;
  --clew-tok-keyword: #9A3412;
  --clew-tok-string: #0F766E;
  --clew-tok-comment: #7A818E;
  --clew-tok-number: #1D4ED8;
  --clew-tok-type: #7C2D12;
  --clew-tok-call: #0E7490;
  --clew-edge-verified: #0F766E;
  --clew-edge-static: #475569;
  --clew-edge-inferred: #B45309;
  --clew-edge-dataflow: #0369A1;
  --clew-edge-unverified: #6B7280;
  --clew-font-sans: var(--dsw-font-family-sans, "Inter", "PingFang SC", "Noto Sans SC", system-ui, sans-serif);
  --clew-font-code: var(--dsw-font-family-code, "JetBrains Mono", "Fira Code", ui-monospace, monospace);

  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding-top: var(--dsw-frame-top-clearance, 0px);
  background: var(--clew-bg-canvas);
  color: var(--clew-text-primary);
  font-family: var(--clew-font-sans);
  font-size: 13px;
  line-height: 1.45;
  overflow: hidden;
}

.clew-root *,
.clew-root *::before,
.clew-root *::after {
  box-sizing: border-box;
}

body[data-ds-dark-theme] .clew-root {
  --clew-bg-canvas: var(--dsw-alias-bg-base, #111317);
  --clew-bg-surface: var(--dsw-alias-bg-layer-1, #181B21);
  --clew-bg-elevated: var(--dsw-alias-bg-layer-2, #1E222A);
  --clew-bg-code: #0E1014;
  --clew-border-subtle: var(--dsw-alias-border-l2, #262A33);
  --clew-border-strong: var(--dsw-alias-border-l4, #353B47);
  --clew-text-primary: var(--dsw-alias-label-primary, #ECEEF2);
  --clew-text-secondary: var(--dsw-alias-label-secondary, #9AA2B1);
  --clew-text-muted: var(--dsw-alias-label-tertiary, #666F80);
  --clew-accent-primary: #E07A2F;
  --clew-accent-verified: #2DD4BF;
  --clew-accent-inferred: #F59E0B;
  --clew-accent-danger: #F87171;
  --clew-tok-keyword: #FB923C;
  --clew-tok-string: #2DD4BF;
  --clew-tok-comment: #666F80;
  --clew-tok-number: #FBBF24;
  --clew-tok-type: #93C5FD;
  --clew-tok-call: #E2E8F0;
  --clew-edge-verified: #2DD4BF;
  --clew-edge-static: #64748B;
  --clew-edge-inferred: #F59E0B;
  --clew-edge-dataflow: #38BDF8;
  --clew-edge-unverified: #9CA3AF;
}

.clew-mono {
  font-family: var(--clew-font-code);
  font-variant-ligatures: none;
}

.clew-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--clew-border-subtle);
  background: var(--clew-bg-surface);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.clew-topbar-left,
.clew-topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.clew-brand-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: 4px;
}

.clew-brand-name {
  font-weight: 600;
  font-size: 14px;
}

.clew-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--clew-accent-primary);
  color: var(--clew-accent-primary);
  font-family: var(--clew-font-code);
  font-size: 10px;
  font-weight: 600;
}

.clew-badge-subtle {
  display: inline-flex;
  align-items: center;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--clew-bg-elevated);
  border: 1px solid var(--clew-border-subtle);
  color: var(--clew-text-secondary);
  font-family: var(--clew-font-code);
  font-size: 10px;
}

.clew-goal-form {
  display: flex;
  flex: 1;
  min-width: 240px;
  gap: 6px;
}

.clew-goal-input,
.clew-input-full,
.clew-input-sm,
.clew-input-xs,
.clew-textarea,
.clew-select,
.clew-select-xs {
  border: 1px solid var(--clew-border-subtle);
  border-radius: 6px;
  background: var(--clew-bg-canvas);
  color: var(--clew-text-primary);
  font-family: inherit;
  font-size: 12px;
  padding: 5px 8px;
}

.clew-goal-input:focus,
.clew-input-full:focus,
.clew-input-sm:focus,
.clew-textarea:focus,
.clew-select:focus {
  outline: 1px solid var(--clew-accent-primary);
  border-color: var(--clew-accent-primary);
}

.clew-goal-input,
.clew-input-full,
.clew-textarea {
  width: 100%;
}

.clew-input-xs,
.clew-select-xs {
  padding: 2px 6px;
  font-size: 11px;
}

.clew-btn,
.clew-btn-xs,
.clew-icon-btn {
  border: 1px solid var(--clew-border-strong);
  border-radius: 6px;
  background: var(--clew-bg-surface);
  color: var(--clew-text-primary);
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  cursor: pointer;
  white-space: nowrap;
}

.clew-btn-xs {
  padding: 2px 7px;
  font-size: 11px;
  border-radius: 4px;
}

.clew-icon-btn {
  padding: 4px 8px;
  font-size: 13px;
}

.clew-btn:hover:not(:disabled),
.clew-btn-xs:hover:not(:disabled),
.clew-icon-btn:hover:not(:disabled) {
  background: var(--clew-bg-elevated);
}

.clew-btn:disabled,
.clew-btn-xs:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.clew-btn-primary,
.clew-btn-primary:hover:not(:disabled),
.clew-btn-accent {
  border-color: var(--clew-accent-primary);
  background: var(--clew-accent-primary);
  color: #FFFFFF;
}

.clew-btn-primary:hover:not(:disabled),
.clew-btn-accent:hover:not(:disabled) {
  filter: brightness(1.08);
}

.clew-btn-danger {
  border-color: var(--clew-accent-danger);
  color: var(--clew-accent-danger);
}

.clew-text-btn {
  background: none;
  border: none;
  color: var(--clew-text-secondary);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
}

.clew-text-btn:hover {
  color: var(--clew-text-primary);
}

.clew-segmented {
  display: inline-flex;
  border: 1px solid var(--clew-border-subtle);
  border-radius: 6px;
  overflow: hidden;
}

.clew-seg-btn {
  border: none;
  background: var(--clew-bg-canvas);
  color: var(--clew-text-secondary);
  padding: 4px 9px;
  font-size: 11px;
  cursor: pointer;
}

.clew-seg-btn.active {
  background: var(--clew-bg-elevated);
  color: var(--clew-text-primary);
  font-weight: 600;
}

.clew-workbench-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.clew-left-rail,
.clew-right-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--clew-bg-surface);
  overflow: hidden;
  flex-shrink: 0;
}

.clew-left-rail {
  border-right: 1px solid var(--clew-border-subtle);
}

.clew-right-drawer {
  border-left: 1px solid var(--clew-border-subtle);
}

.clew-resizer {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  flex-shrink: 0;
}

.clew-resizer:hover {
  background: var(--clew-accent-primary);
}

.clew-center-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 320px;
  min-height: 0;
  overflow: hidden;
}

.clew-center-top {
  flex: 0 0 44%;
  min-height: 180px;
  border-bottom: 1px solid var(--clew-border-subtle);
  overflow: hidden;
}

.clew-center-bottom {
  flex: 1;
  min-height: 180px;
  overflow: hidden;
}

.clew-center-full {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.clew-tab-strip {
  display: flex;
  border-bottom: 1px solid var(--clew-border-subtle);
  background: var(--clew-bg-surface);
  flex-shrink: 0;
}

.clew-tab-btn {
  flex: 1;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--clew-text-secondary);
  font-size: 12px;
  font-weight: 500;
  padding: 7px 8px;
  cursor: pointer;
}

.clew-tab-btn.active {
  color: var(--clew-text-primary);
  border-bottom-color: var(--clew-accent-primary);
}

.clew-rail-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
}

.clew-rail-body.clew-rail-qa {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 8px;
}

.clew-qa-pane {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.clew-qa-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}

.clew-tree-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--clew-text-primary);
  font-size: 12px;
  padding: 3px 6px;
  text-align: left;
  cursor: pointer;
}

.clew-tree-row:hover {
  background: var(--clew-bg-elevated);
}

.clew-tree-row.active {
  background: var(--clew-bg-elevated);
  color: var(--clew-accent-primary);
  font-weight: 600;
}

.clew-tree-caret {
  width: 10px;
  color: var(--clew-text-muted);
}

.clew-tree-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clew-tree-lang {
  font-family: var(--clew-font-code);
  font-size: 10px;
  color: var(--clew-text-muted);
}

.clew-lang-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--clew-text-muted);
  flex-shrink: 0;
}

.clew-lang-dot[data-lang="python"] { background: #3B82F6; }
.clew-lang-dot[data-lang="typescript"],
.clew-lang-dot[data-lang="javascript"] { background: #F59E0B; }
.clew-lang-dot[data-lang="rust"] { background: #E07A2F; }
.clew-lang-dot[data-lang="go"] { background: #2DD4BF; }
.clew-lang-dot[data-lang="c"],
.clew-lang-dot[data-lang="cpp"] { background: #64748B; }

.clew-section {
  margin-bottom: 14px;
}

.clew-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.clew-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--clew-text-secondary);
  margin-bottom: 6px;
}

.clew-kv-compact,
.clew-lang-bar-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 3px 0;
  border-bottom: 1px solid var(--clew-border-subtle);
}

.clew-mini-card {
  background: var(--clew-bg-canvas);
  border: 1px solid var(--clew-border-subtle);
  border-radius: 6px;
  padding: 9px;
  margin-bottom: 8px;
}

.clew-list-item-btn {
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid var(--clew-border-subtle);
  border-radius: 5px;
  background: var(--clew-bg-canvas);
  color: var(--clew-text-primary);
  padding: 6px 8px;
  margin-bottom: 6px;
  cursor: pointer;
}

.clew-list-item-btn:hover {
  border-color: var(--clew-border-strong);
  background: var(--clew-bg-elevated);
}

.clew-item-title {
  font-size: 12px;
  font-weight: 600;
}

.clew-item-sub {
  font-size: 11px;
  color: var(--clew-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clew-link-row {
  display: block;
  background: none;
  border: none;
  padding: 2px 0;
  color: var(--clew-accent-primary);
  font-family: var(--clew-font-code);
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}

.clew-link-row:hover {
  text-decoration: underline;
}

.clew-pill-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.clew-pill {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--clew-bg-elevated);
  border: 1px solid var(--clew-border-subtle);
  font-family: var(--clew-font-code);
  font-size: 11px;
}

.clew-citation-pill {
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--clew-border-strong);
  background: var(--clew-bg-elevated);
  color: var(--clew-text-primary);
  font-family: var(--clew-font-code);
  font-size: 11px;
  cursor: pointer;
}

.clew-citation-pill.verified {
  border-color: var(--clew-accent-verified);
  color: var(--clew-accent-verified);
}

.clew-empty-hint {
  color: var(--clew-text-muted);
  font-size: 12px;
  margin: 6px 0;
}

.clew-empty-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.clew-graph-empty,
.clew-reader-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  text-align: center;
}

.clew-graph-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--clew-bg-code);
}

.clew-graph-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--clew-border-subtle);
  background: var(--clew-bg-surface);
  flex-wrap: wrap;
}

.clew-confidence-filters {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.clew-conf-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--clew-border-subtle);
  background: transparent;
  color: var(--clew-text-muted);
  font-size: 11px;
  cursor: pointer;
}

.clew-conf-chip.active {
  background: var(--clew-bg-elevated);
  color: var(--clew-text-primary);
}

.clew-conf-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.clew-zoom-controls {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.clew-graph-viewport {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background-image: radial-gradient(var(--clew-border-subtle) 1px, transparent 1px);
  background-size: 18px 18px;
  cursor: grab;
}

.clew-graph-svg {
  display: block;
}

.clew-node-box {
  fill: var(--clew-bg-surface);
  stroke: var(--clew-border-strong);
  stroke-width: 1.3;
}

.clew-node-box.entry {
  stroke: var(--clew-accent-primary);
  stroke-width: 1.8;
}

.clew-node-box.selected {
  stroke: var(--clew-accent-verified);
  stroke-width: 2.2;
}

.clew-node-title {
  fill: var(--clew-text-primary);
  font-family: var(--clew-font-code);
  font-size: 12px;
  font-weight: 600;
}

.clew-node-meta {
  fill: var(--clew-text-secondary);
  font-family: var(--clew-font-code);
  font-size: 10px;
}

.clew-edge-badge-bg {
  fill: var(--clew-bg-elevated);
  stroke: var(--clew-accent-verified);
  stroke-width: 1;
}

.clew-edge-badge-text {
  fill: var(--clew-text-primary);
  font-family: var(--clew-font-code);
  font-size: 10px;
}

.clew-reader-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--clew-bg-code);
  position: relative;
}

.clew-reader-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--clew-bg-surface);
  border-bottom: 1px solid var(--clew-border-subtle);
  overflow-x: auto;
}

.clew-history-btns {
  display: flex;
  gap: 3px;
  margin-right: 4px;
}

.clew-reader-tab {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--clew-border-subtle);
  border-radius: 5px;
  background: var(--clew-bg-canvas);
}

.clew-reader-tab.active {
  border-color: var(--clew-accent-primary);
  background: var(--clew-bg-elevated);
}

.clew-tab-label {
  border: none;
  background: transparent;
  color: var(--clew-text-primary);
  font-family: var(--clew-font-code);
  font-size: 11px;
  padding: 3px 7px;
  cursor: pointer;
}

.clew-tab-close {
  border: none;
  background: transparent;
  color: var(--clew-text-muted);
  padding: 2px 5px;
  cursor: pointer;
}

.clew-reader-breadcrumb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 10px;
  border-bottom: 1px solid var(--clew-border-subtle);
  background: var(--clew-bg-surface);
  font-size: 11px;
  color: var(--clew-text-secondary);
}

.clew-outline-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.clew-selection-toolbar {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: var(--clew-bg-elevated);
  border-bottom: 1px solid var(--clew-border-strong);
  flex-wrap: nowrap;
  overflow-x: auto;
  flex-shrink: 0;
}

.clew-selection-toolbar .clew-input-xs {
  width: 96px;
  min-width: 72px;
  flex-shrink: 1;
}

.clew-select-xs {
  white-space: nowrap;
  max-width: 128px;
}

.clew-code-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 6px 0;
  font-family: var(--clew-font-code);
  font-size: 12.5px;
  font-variant-ligatures: none;
}

.clew-code-line {
  display: flex;
  align-items: center;
  min-width: max-content;
  padding: 0 12px 0 4px;
  white-space: pre;
  cursor: pointer;
}

.clew-code-line:hover {
  background: rgba(148, 163, 184, 0.08);
}

.clew-code-line.band-trace {
  background: rgba(45, 212, 191, 0.08);
}

.clew-code-line.band-citation {
  background: rgba(224, 122, 47, 0.12);
}

.clew-code-line.selected {
  background: rgba(224, 122, 47, 0.18);
}

.clew-code-line.focused {
  box-shadow: inset 3px 0 0 var(--clew-accent-primary);
}

.clew-gutter-dot {
  width: 14px;
  color: var(--clew-accent-inferred);
  font-size: 10px;
  text-align: center;
  flex-shrink: 0;
}

.clew-line-num {
  width: 44px;
  padding-right: 10px;
  text-align: right;
  color: var(--clew-text-muted);
  user-select: none;
  flex-shrink: 0;
}

.clew-line-code {
  flex: 1;
}

.clew-tok-keyword { color: var(--clew-tok-keyword); font-weight: 500; }
.clew-tok-string { color: var(--clew-tok-string); }
.clew-tok-comment { color: var(--clew-tok-comment); font-style: italic; }
.clew-tok-number { color: var(--clew-tok-number); }
.clew-tok-type { color: var(--clew-tok-type); }
.clew-tok-call { color: var(--clew-tok-call); }

.clew-code-snippet {
  margin: 6px 0 0 0;
  padding: 6px 8px;
  border-radius: 4px;
  background: var(--clew-bg-code);
  border: 1px solid var(--clew-border-subtle);
  font-family: var(--clew-font-code);
  font-size: 11px;
  overflow-x: auto;
}

.clew-prose {
  font-size: 12px;
  margin: 4px 0 8px 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.clew-telemetry-line {
  font-family: var(--clew-font-code);
  font-size: 11px;
  color: var(--clew-text-muted);
  margin-top: 6px;
}

.clew-qa-q {
  font-size: 12px;
  font-weight: 600;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--clew-border-subtle);
  margin-bottom: 6px;
}

.clew-qa-form,
.clew-save-path-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  flex-shrink: 0;
}

.clew-qa-form {
  padding-top: 8px;
  border-top: 1px solid var(--clew-border-subtle);
}

.clew-md-root {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.clew-md-heading {
  font-size: 12px;
  font-weight: 600;
  color: var(--clew-text-primary);
  margin-top: 2px;
}

.clew-md-p {
  margin: 0;
  line-height: 1.45;
}

.clew-md-list {
  margin: 0;
  padding-left: 16px;
  line-height: 1.45;
}

.clew-inline-code {
  font-family: var(--clew-font-code);
  font-size: 11px;
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--clew-bg-elevated);
  border: 1px solid var(--clew-border-subtle);
}

.clew-btn-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.clew-status-pill {
  font-family: var(--clew-font-code);
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--clew-border-subtle);
}

.clew-status-pill.status-resolved {
  border-color: var(--clew-accent-verified);
  color: var(--clew-accent-verified);
}

.clew-status-pill.status-stale {
  border-color: var(--clew-accent-danger);
  color: var(--clew-accent-danger);
}

.clew-ann-reply {
  font-size: 11px;
  padding: 4px 6px;
  border-left: 2px solid var(--clew-border-strong);
  margin-top: 4px;
  color: var(--clew-text-secondary);
}

.clew-reply-form {
  margin-top: 6px;
}

.clew-reply-form .clew-input-xs {
  width: 100%;
}

.clew-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 12, 16, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
  padding: 16px;
}

.clew-modal {
  width: 100%;
  max-width: 480px;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  background: var(--clew-bg-surface);
  border: 1px solid var(--clew-border-strong);
  border-radius: 8px;
  overflow: hidden;
}

.clew-modal-lg {
  max-width: 680px;
}

.clew-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--clew-border-subtle);
}

.clew-modal-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.clew-modal-body {
  padding: 14px;
  overflow-y: auto;
}

.clew-modal-list {
  padding: 8px;
  overflow-y: auto;
  max-height: 55vh;
}

.clew-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.clew-field-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  margin: 8px 0 4px 0;
}

.clew-palette-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--clew-text-primary);
  padding: 7px 9px;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.clew-palette-row:hover,
.clew-palette-row.active {
  background: var(--clew-bg-elevated);
}

.clew-check-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.clew-log-box {
  background: var(--clew-bg-code);
  border: 1px solid var(--clew-border-subtle);
  border-radius: 6px;
  padding: 8px;
  max-height: 180px;
  overflow: auto;
}

.clew-log-line {
  font-size: 11px;
  color: var(--clew-text-secondary);
}

.clew-error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: rgba(185, 28, 28, 0.14);
  border-bottom: 1px solid var(--clew-accent-danger);
  font-size: 12px;
}

.clew-error-box {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--clew-accent-danger);
  background: rgba(185, 28, 28, 0.1);
  font-size: 12px;
}

.clew-tabs-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  padding: 0 8px;
  flex-shrink: 0;
}

.clew-peek-card {
  margin: 6px 10px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--clew-accent-primary);
  background: var(--clew-bg-elevated);
  flex-shrink: 0;
  max-height: 155px;
  overflow-y: auto;
}

.clew-peek-doc {
  margin-top: 4px;
  font-size: 11px;
  color: var(--clew-text-secondary);
  white-space: pre-wrap;
}

.clew-single-code-grid {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.clew-split-code-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

.clew-compare-pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-left: 1px solid var(--clew-border-strong);
  background: var(--clew-bg-code);
}

.clew-compare-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--clew-border-subtle);
  background: var(--clew-bg-surface);
}

.clew-compare-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 0;
}

.clew-status-select.status-core_entry {
  border-color: var(--clew-accent-primary);
  color: var(--clew-accent-primary);
}

.clew-status-select.status-deep_dive {
  border-color: var(--clew-accent-inferred);
  color: var(--clew-accent-inferred);
}

.clew-status-select.status-understood {
  border-color: var(--clew-accent-verified);
  color: var(--clew-accent-verified);
}

.clew-tree-status {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  flex-shrink: 0;
}

.clew-tree-status.status-core_entry { background: var(--clew-accent-primary); }
.clew-tree-status.status-deep_dive { background: var(--clew-accent-inferred); }
.clew-tree-status.status-understood { background: var(--clew-accent-verified); }

@media (max-width: 1360px) {
  .clew-topbar {
    gap: 6px;
    padding: 6px 8px;
  }
  .clew-goal-form {
    min-width: 180px;
  }
  .clew-btn {
    padding: 4px 8px;
    font-size: 11px;
  }
  .clew-graph-toolbar {
    gap: 5px;
    padding: 4px 8px;
  }
  .clew-center-pane {
    min-width: 280px;
  }
}
`;

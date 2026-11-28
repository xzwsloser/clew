export const CLEW_SCOPED_CSS = `
.clew-root {
  --clew-bg-canvas: var(--dsw-alias-bg-base, #F8F7F4);
  --clew-bg-surface: var(--dsw-alias-bg-layer-1, #FFFFFF);
  --clew-bg-elevated: var(--dsw-alias-bg-layer-2, #F1EFE9);
  --clew-border-subtle: var(--dsw-alias-border-l2, #E4E1DA);
  --clew-border-strong: var(--dsw-alias-border-l4, #CFCAC0);
  --clew-text-primary: var(--dsw-alias-label-primary, #16181D);
  --clew-text-secondary: var(--dsw-alias-label-secondary, #4B515C);
  --clew-text-muted: var(--dsw-alias-label-tertiary, #7A818E);
  --clew-accent-primary: #C85A17;
  --clew-accent-verified: #0F766E;
  --clew-font-sans: var(--dsw-font-family-sans, "Inter", "PingFang SC", "Noto Sans SC", system-ui, sans-serif);
  --clew-font-code: var(--dsw-font-family-code, "JetBrains Mono", "Fira Code", ui-monospace, monospace);

  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: calc(var(--dsw-frame-top-clearance, 0px) + 16px) 20px 20px 20px;
  background: var(--clew-bg-canvas);
  color: var(--clew-text-primary);
  font-family: var(--clew-font-sans);
  font-size: 13px;
  line-height: 1.5;
  overflow: auto;
}

body[data-ds-dark-theme] .clew-root {
  --clew-bg-canvas: var(--dsw-alias-bg-base, #111317);
  --clew-bg-surface: var(--dsw-alias-bg-layer-1, #181B21);
  --clew-bg-elevated: var(--dsw-alias-bg-layer-2, #1E222A);
  --clew-border-subtle: var(--dsw-alias-border-l2, #262A33);
  --clew-border-strong: var(--dsw-alias-border-l4, #353B47);
  --clew-text-primary: var(--dsw-alias-label-primary, #ECEEF2);
  --clew-text-secondary: var(--dsw-alias-label-secondary, #9AA2B1);
  --clew-text-muted: var(--dsw-alias-label-tertiary, #666F80);
  --clew-accent-primary: #E07A2F;
  --clew-accent-verified: #2DD4BF;
}

.clew-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--clew-border-subtle);
}

.clew-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.clew-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.clew-tagline {
  margin: 0;
  font-size: 12px;
  color: var(--clew-text-secondary);
}

.clew-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--clew-accent-primary);
  color: var(--clew-accent-primary);
  font-family: var(--clew-font-code);
  font-size: 11px;
  font-weight: 600;
}

.clew-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clew-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--clew-border-strong);
  background: var(--clew-bg-surface);
  color: var(--clew-text-primary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.clew-btn:hover {
  background: var(--clew-bg-elevated);
}

.clew-btn-primary,
.clew-btn-primary:hover {
  border-color: var(--clew-accent-primary);
  background: var(--clew-accent-primary);
  color: #FFFFFF;
}

.clew-btn-primary:hover {
  filter: brightness(1.08);
}

.clew-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.clew-card {
  background: var(--clew-bg-surface);
  border: 1px solid var(--clew-border-subtle);
  border-radius: 6px;
  padding: 14px;
}

.clew-card-title {
  margin: 0 0 10px 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--clew-text-secondary);
}

.clew-kv {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 0;
  border-bottom: 1px solid var(--clew-border-subtle);
  font-size: 12px;
}

.clew-kv:last-child {
  border-bottom: none;
}

.clew-mono {
  font-family: var(--clew-font-code);
  font-size: 12px;
}

.clew-pill {
  display: inline-block;
  margin: 0 6px 6px 0;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--clew-bg-elevated);
  border: 1px solid var(--clew-border-subtle);
  font-family: var(--clew-font-code);
  font-size: 11px;
}

.clew-status-ok {
  color: var(--clew-accent-verified);
  font-weight: 600;
}

.clew-error-box {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid #B91C1C;
  background: rgba(185, 28, 28, 0.08);
  font-size: 12px;
}
`;

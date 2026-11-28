import type { JobState, RepoRecord } from '@clew/shared/contracts';

export type CenterViewMode = 'split' | 'graph' | 'code';

interface TopBarProps {
  t: (key: string) => string;
  repos: RepoRecord[];
  activeRepoId: string | null;
  onSelectRepo: (repoId: string) => void;
  onOpenImport: () => void;
  goalInput: string;
  onGoalInputChange: (value: string) => void;
  onRunTrace: () => void;
  activeJob: JobState | null;
  onCancelJob: (jobId: string) => void;
  onOpenPalette: () => void;
  onOpenGlobalSearch: () => void;
  viewMode: CenterViewMode;
  onChangeViewMode: (mode: CenterViewMode) => void;
  onOpenDiagnostics: () => void;
  onToggleLeftRail: () => void;
  onToggleRightDrawer: () => void;
}

export function ClewBrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" aria-hidden="true">
      <rect x="16" y="16" width="224" height="224" rx="48" fill="#14171C" stroke="#2A303B" strokeWidth="6" />
      <circle cx="128" cy="108" r="56" stroke="#E07A2F" strokeWidth="10" />
      <ellipse cx="128" cy="108" rx="52" ry="28" transform="rotate(-32 128 108)" stroke="#F59E0B" strokeWidth="8" />
      <path
        d="M128 164C128 178 106 178 90 178C74 178 74 202 92 202H144L170 178L194 202"
        stroke="#E07A2F"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="144" cy="202" r="11" fill="#2DD4BF" />
      <circle cx="170" cy="178" r="11" fill="#2DD4BF" />
      <circle cx="194" cy="202" r="11" fill="#F4F1EA" />
    </svg>
  );
}

export function TopBar({
  t,
  repos,
  activeRepoId,
  onSelectRepo,
  onOpenImport,
  goalInput,
  onGoalInputChange,
  onRunTrace,
  activeJob,
  onCancelJob,
  onOpenPalette,
  onOpenGlobalSearch,
  viewMode,
  onChangeViewMode,
  onOpenDiagnostics,
  onToggleLeftRail,
  onToggleRightDrawer,
}: TopBarProps) {
  const isRunning =
    activeJob !== null &&
    activeJob.stage !== 'ready' &&
    activeJob.stage !== 'cancelled' &&
    activeJob.stage !== 'failed';

  return (
    <header className="clew-topbar">
      <div className="clew-topbar-left">
        <button
          type="button"
          className="clew-icon-btn"
          onClick={onToggleLeftRail}
          title={t('ui.toggleLeft')}
          aria-label={t('ui.toggleLeft')}
        >
          ◧
        </button>
        <div className="clew-brand-inline">
          <ClewBrandMark size={22} />
          <span className="clew-brand-name">{t('panel.label')}</span>
          <span className="clew-badge" title={t('ui.readOnlyTooltip')}>
            {t('panel.badge')}
          </span>
        </div>

        <select
          className="clew-select"
          value={activeRepoId ?? ''}
          onChange={(e) => onSelectRepo(e.target.value)}
          aria-label={t('ui.selectRepo')}
          data-testid="clew-repo-select"
        >
          {repos.length === 0 && <option value="">{t('ui.noRepoOption')}</option>}
          {repos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} {r.git.branch ? `(${r.git.branch})` : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="clew-btn"
          onClick={onOpenImport}
          data-testid="clew-import-btn"
        >
          + {t('ui.importRepo')}
        </button>
      </div>

      <form
        className="clew-goal-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (activeRepoId && goalInput.trim()) onRunTrace();
        }}
      >
        <input
          type="text"
          className="clew-goal-input"
          value={goalInput}
          onChange={(e) => onGoalInputChange(e.target.value)}
          placeholder={t('ui.goalPlaceholder')}
          disabled={!activeRepoId}
          data-testid="clew-goal-input"
        />
        {isRunning && activeJob ? (
          <button
            type="button"
            className="clew-btn clew-btn-danger"
            onClick={() => onCancelJob(activeJob.jobId)}
            data-testid="clew-cancel-job"
          >
            {t('ui.cancel')} ({activeJob.stage})
          </button>
        ) : (
          <button
            type="submit"
            className="clew-btn clew-btn-primary"
            disabled={!activeRepoId || !goalInput.trim()}
            data-testid="clew-trace-submit"
          >
            {t('ui.traceBtn')}
          </button>
        )}
      </form>

      <div className="clew-topbar-right">
        <button
          type="button"
          className="clew-btn"
          onClick={onOpenPalette}
          disabled={!activeRepoId}
          title="Cmd/Ctrl + P"
          data-testid="clew-cmd-p-btn"
        >
          ⌘P
        </button>
        <button
          type="button"
          className="clew-btn"
          onClick={onOpenGlobalSearch}
          disabled={!activeRepoId}
          title="Cmd/Ctrl + Shift + F"
          data-testid="clew-search-btn"
        >
          ⌘⇧F
        </button>
        <div className="clew-segmented" role="group" aria-label={t('ui.viewMode')}>
          {(['split', 'graph', 'code'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`clew-seg-btn ${viewMode === mode ? 'active' : ''}`}
              onClick={() => onChangeViewMode(mode)}
            >
              {t(`ui.view.${mode}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="clew-btn"
          onClick={onOpenDiagnostics}
          data-testid="clew-diagnostics-btn"
        >
          {t('ui.diagnostics')}
        </button>
        <button
          type="button"
          className="clew-icon-btn"
          onClick={onToggleRightDrawer}
          title={t('ui.toggleRight')}
          aria-label={t('ui.toggleRight')}
        >
          ◨
        </button>
      </div>
    </header>
  );
}

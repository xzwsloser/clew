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
      <rect x="16" y="16" width="224" height="224" rx="54" fill="#1B4332" stroke="#2D6A4F" strokeWidth="4" />
      <path
        d="M174 180 C142 174 100 160 100 124 C100 98 122 86 144 92 C160 97 166 114 154 126"
        stroke="#52B788"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d="M178 76 A72 72 0 1 0 178 180"
        stroke="#F6F4EE"
        strokeWidth="24"
        strokeLinecap="round"
      />
      <circle cx="134" cy="126" r="16" fill="#E87A24" />
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
          aria-label="Command Palette (Cmd/Ctrl+P)"
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
          aria-label="Global Search (Cmd/Ctrl+Shift+F)"
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

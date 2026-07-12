import { useCallback, useState, useEffect } from 'react';
import { Settings, Command, Inbox, WifiOff } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import { useActiveSavePersistenceStatus } from '@/shared/hooks/useActiveSavePersistenceStatus';
import { useSimAdvanceCoordinatorStatus } from '@/shared/hooks/useSimAdvanceExecutor';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { ContextualHelp } from '@/shared/components/ContextualHelp';
import { getContextualHelpForPath } from '@/shared/lib/routeGuidanceRegistry';
import { subscribeToNewsReadEvents } from '@/features/news/lib/newsEvents';
import {
  retryActiveSavePersistence,
  type ActiveSavePersistenceFailureKind,
} from '@/shared/lib/activeSavePersistence';
import type { SeasonFlowState } from './seasonFlow';
import { useActiveSaveRecoveryToast } from './activeSaveRecoveryToast';
import { formatSavePersistenceSummary } from './savePersistenceSummary';

function describeSaveFailure(failureKind: ActiveSavePersistenceFailureKind | null): string {
  switch (failureKind) {
    case 'quota':
      return 'Save failed — storage full';
    case 'unavailable':
      return 'Save failed — browser storage unavailable';
    case 'indexeddb':
      return 'Save failed — browser database error';
    case 'storage':
      return 'Save failed — storage error';
    case 'export':
      return 'Save failed — could not read game';
    default:
      return 'Save failed';
  }
}

function describeSimAdvanceStage(kind: ReturnType<typeof useSimAdvanceCoordinatorStatus>['kind']): string | null {
  switch (kind) {
    case 'idle': return null;
    case 'preparing': return 'Preparing verified simulation';
    case 'running': return 'Simulation in progress';
    case 'persisting': return 'Saving simulation result';
    case 'retry_wait': return 'Simulation paused — retry exact save';
    case 'publishing': return 'Updating saved simulation';
    case 'rolling_back': return 'Restoring last saved state';
    case 'fail_closed': return 'Reload required';
  }
}

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  return online;
}

interface TopBarProps {
  onOpenCommandPalette: () => void;
  flow: SeasonFlowState | null;
}

export function TopBar({ onOpenCommandPalette, flow }: TopBarProps) {
  const { season, day, phase, teamName, userTeamId, isInitialized, activeSaveId } = useGameStore();
  const worker = useWorker();
  const location = useLocation();
  const online = useOnlineStatus();
  const saveStatus = useActiveSavePersistenceStatus(activeSaveId);
  const simAdvanceStatus = useSimAdvanceCoordinatorStatus();
  useActiveSaveRecoveryToast(activeSaveId, saveStatus);
  const [unreadNewsIds, setUnreadNewsIds] = useState<Set<string>>(() => new Set());
  const helpContent = getContextualHelpForPath(location.pathname);
  const phaseLabel = flow?.phaseLabel ?? `Season ${season} — Day ${day}`;
  const detailLabel = flow?.detailLabel ?? phase;
  const progress = Math.round((flow?.progress ?? 0) * 100);
  const unreadNewsCount = unreadNewsIds.size;
  // The generic Saved/zero-pending string describes ordinary persistence only;
  // it must never imply a journalled post is durable while coordinator work is
  // still active.
  const saveSummaryVisible = activeSaveId != null && simAdvanceStatus.kind === 'idle';
  const saveSummary = formatSavePersistenceSummary(
    saveStatus.lastSavedAt,
    saveStatus.pendingWrites,
  );
  const saveStatusVisible = saveStatus.state !== 'idle' || simAdvanceStatus.kind !== 'idle';
  const saveStatusLabel = simAdvanceStatus.kind !== 'idle'
    ? describeSimAdvanceStage(simAdvanceStatus.kind)!
    : saveStatus.state === 'saving'
    ? 'Saving...'
    : saveStatus.state === 'failed'
      ? describeSaveFailure(saveStatus.failureKind)
      : 'Saved';
  const renderSaveStatus = (positionClass: string) => (
    <span
      data-testid="save-persistence-status"
      data-failure-kind={saveStatus.state === 'failed' ? saveStatus.failureKind ?? 'unknown' : undefined}
      title={saveStatus.state === 'failed' ? saveStatus.errorMessage ?? undefined : undefined}
      role="status"
      aria-live={saveStatus.state === 'failed' || simAdvanceStatus.kind === 'fail_closed' ? 'assertive' : 'polite'}
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-data text-[11px] ${positionClass} ${
        saveStatus.state === 'failed' || simAdvanceStatus.kind !== 'idle'
          ? 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger'
          : saveStatus.state === 'saving'
            ? 'border-accent-info/35 bg-accent-info/10 text-accent-info'
            : 'border-accent-success/35 bg-accent-success/10 text-accent-success'
      }`}
    >
      <span>{saveStatusLabel}</span>
      {(simAdvanceStatus.kind === 'idle' || simAdvanceStatus.kind === 'retry_wait')
        && saveStatus.state === 'failed' && saveStatus.canRetry ? (
        <button
          type="button"
          aria-label="Retry failed save"
          className="rounded border border-current px-1.5 py-0.5 font-heading text-[10px] uppercase"
          onClick={() => {
            void retryActiveSavePersistence(activeSaveId).catch(() => undefined);
          }}
        >
          Retry
        </button>
      ) : null}
    </span>
  );

  const refreshUnreadNews = useCallback(async () => {
    if (!isInitialized || !worker.isReady || typeof worker.getNews !== 'function') {
      setUnreadNewsIds(new Set());
      return;
    }

    try {
      const news = await worker.getNews(100);
      setUnreadNewsIds(new Set((news ?? []).filter((item) => !item.read).map((item) => item.id)));
    } catch {
      setUnreadNewsIds(new Set());
    }
  }, [isInitialized, worker]);

  useEffect(() => {
    void refreshUnreadNews();
  }, [day, phase, refreshUnreadNews, season]);

  useEffect(() => subscribeToNewsReadEvents((newsId) => {
    setUnreadNewsIds((current) => {
      if (!current.has(newsId)) return current;
      const next = new Set(current);
      next.delete(newsId);
      return next;
    });
  }), []);

  return (
    <header className="flex shrink-0 flex-wrap items-center border-b border-dynasty-border bg-dynasty-surface">
      {/* Left: Brand + Season context */}
      <div className="order-1 flex h-12 min-w-0 flex-1 items-center gap-3 pl-4">
        <span className="font-brand text-2xl tracking-wide text-accent-primary">
          MBD
        </span>
        {/* Mobile compact: just logo + phase */}
        <div className="flex items-center gap-2 sm:hidden">
          {userTeamId && <TeamLogo teamId={userTeamId} size="xs" />}
          <span className="truncate font-heading text-xs text-dynasty-muted">{detailLabel}</span>
        </div>
        {/* Desktop full: phase, team, progress */}
        <div className="hidden min-w-0 sm:block">
          <div className="truncate font-heading font-medium text-dynasty-text">
            {phaseLabel}
          </div>
          <div className="mt-1 flex items-center gap-2">
            {userTeamId && <TeamLogo teamId={userTeamId} size="xs" />}
            <span className="truncate font-heading text-xs text-dynasty-muted">{teamName}</span>
            <span className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">
              {detailLabel}
            </span>
            <span className="font-data text-[11px] text-dynasty-muted">{progress}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-dynasty-border">
            <div
              className="h-full bg-accent-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {saveSummaryVisible && (
        <span
          data-testid="save-persistence-summary"
          data-last-saved-at={saveStatus.lastSavedAt ?? ''}
          data-pending-writes={saveStatus.pendingWrites}
          aria-label={saveSummary}
          title={saveSummary}
          className="order-3 block w-full truncate border-t border-dynasty-border px-4 py-1.5 font-data text-[11px] text-dynasty-muted lg:order-2 lg:w-auto lg:max-w-[22rem] lg:border-t-0 lg:px-2 lg:py-0"
        >
          {saveSummary}
        </span>
      )}

      {saveStatusVisible && (saveStatus.state === 'failed' || simAdvanceStatus.kind === 'fail_closed')
        ? renderSaveStatus(
          'order-4 mx-4 mb-2 w-[calc(100%-2rem)] justify-between lg:order-3 lg:mx-0 lg:mb-0 lg:w-auto lg:justify-start',
        )
        : null}

      {/* Right: Help + Command palette trigger + Settings */}
      <div className="order-2 flex h-12 shrink-0 items-center gap-2 pr-4 lg:order-4">
        {saveStatusVisible && saveStatus.state !== 'failed' && simAdvanceStatus.kind !== 'fail_closed'
          ? renderSaveStatus('')
          : null}
        {!online && (
          <span
            className="flex items-center gap-1 rounded-md bg-accent-warning/10 px-2 py-1 font-data text-[11px] text-accent-warning"
            role="status"
          >
            <WifiOff className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Offline</span>
          </span>
        )}
        {helpContent && (
          <ContextualHelp
            title={helpContent.title}
            description={helpContent.description}
            actions={helpContent.actions}
          />
        )}
        {unreadNewsCount > 0 ? (
          <Link
            to="/news"
            className="focus-ring flex items-center gap-1.5 rounded-md border border-accent-info/35 bg-accent-info/10 px-2.5 py-1.5 text-xs text-accent-info transition-colors hover:border-accent-info/60"
            aria-label="News inbox unread count"
          >
            <Inbox className="h-3.5 w-3.5" />
            <span className="hidden font-heading sm:inline">News</span>
            <span className="font-data">{unreadNewsCount}</span>
          </Link>
        ) : null}
        <button
          onClick={onOpenCommandPalette}
          className="focus-ring flex items-center gap-1.5 rounded-md border border-dynasty-border px-2.5 py-1.5 text-xs text-dynasty-muted transition-colors hover:border-dynasty-muted hover:text-dynasty-text"
          aria-label="Open command palette"
        >
          <Command className="h-3.5 w-3.5" />
          <span className="hidden font-data sm:inline">K</span>
        </button>
        <Link
          to="/settings"
          className="focus-ring rounded-md p-1.5 text-dynasty-muted transition-colors hover:text-dynasty-text"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}

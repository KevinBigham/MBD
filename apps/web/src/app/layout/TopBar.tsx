import { useCallback, useState, useEffect } from 'react';
import { Settings, Command, Inbox, WifiOff } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { ContextualHelp, PAGE_HELP } from '@/shared/components/ContextualHelp';
import { subscribeToNewsReadEvents } from '@/features/news/lib/newsEvents';
import type { SeasonFlowState } from './seasonFlow';

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
  const { season, day, phase, teamName, userTeamId, isInitialized } = useGameStore();
  const worker = useWorker();
  const location = useLocation();
  const online = useOnlineStatus();
  const [unreadNewsIds, setUnreadNewsIds] = useState<Set<string>>(() => new Set());
  const helpContent = PAGE_HELP[location.pathname] ?? null;
  const phaseLabel = flow?.phaseLabel ?? `Season ${season} — Day ${day}`;
  const detailLabel = flow?.detailLabel ?? phase;
  const progress = Math.round((flow?.progress ?? 0) * 100);
  const unreadNewsCount = unreadNewsIds.size;

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
    <header className="flex h-12 items-center justify-between border-b border-dynasty-border bg-dynasty-surface px-4">
      {/* Left: Brand + Season context */}
      <div className="flex min-w-0 items-center gap-3">
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

      {/* Right: Help + Command palette trigger + Settings */}
      <div className="flex items-center gap-2">
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

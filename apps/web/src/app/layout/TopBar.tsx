import { Settings, Command } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { ContextualHelp, PAGE_HELP } from '@/shared/components/ContextualHelp';
import type { SeasonFlowState } from './seasonFlow';

interface TopBarProps {
  onOpenCommandPalette: () => void;
  flow: SeasonFlowState | null;
}

export function TopBar({ onOpenCommandPalette, flow }: TopBarProps) {
  const { season, day, phase, teamName, userTeamId } = useGameStore();
  const location = useLocation();
  const helpContent = PAGE_HELP[location.pathname] ?? null;
  const phaseLabel = flow?.phaseLabel ?? `Season ${season} — Day ${day}`;
  const detailLabel = flow?.detailLabel ?? phase;
  const progress = Math.round((flow?.progress ?? 0) * 100);

  return (
    <header className="flex h-12 items-center justify-between border-b border-dynasty-border bg-dynasty-surface px-4">
      {/* Left: Brand + Season context */}
      <div className="flex min-w-0 items-center gap-4">
        <span className="font-brand text-2xl tracking-wide text-accent-primary">
          MBD
        </span>
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
        {helpContent && (
          <ContextualHelp
            title={helpContent.title}
            description={helpContent.description}
            actions={helpContent.actions}
          />
        )}
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

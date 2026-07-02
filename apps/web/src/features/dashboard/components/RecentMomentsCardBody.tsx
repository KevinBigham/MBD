import { Link } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { TeamLogo } from '@/shared/components/TeamLogo';

export interface MomentShape {
  season: number;
  day?: number;
  description: string;
  type: string;
  isPlayoff: boolean;
  relevance: number;
}

export interface PlayerMomentView {
  kind: 'player';
  playerId: string;
  playerName: string;
  teamId: string;
  moment: MomentShape;
}

export interface TeamMomentView {
  kind: 'team';
  teamId: string;
  teamName: string;
  moment: MomentShape;
}

export type MergedMomentView = PlayerMomentView | TeamMomentView;

interface RecentMomentsCardBodyProps {
  loading: boolean;
  moments: MergedMomentView[];
}

function mergedKey(entry: MergedMomentView): string {
  const base = `${entry.moment.type}-${entry.moment.season}-${entry.moment.day ?? 0}`;
  return entry.kind === 'player' ? `p-${entry.playerId}-${base}` : `t-${entry.teamId}-${base}`;
}

export default function RecentMomentsCardBody({
  loading,
  moments,
}: RecentMomentsCardBodyProps) {
  if (loading) {
    return <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>;
  }

  if (moments.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
        No recent league-wide moments in the last seven sim days.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {moments.map((entry) => (entry.kind === 'player'
        ? <PlayerEntry key={mergedKey(entry)} entry={entry} />
        : <TeamEntry key={mergedKey(entry)} entry={entry} />
      ))}
    </div>
  );
}

function PlayerEntry({ entry }: { entry: PlayerMomentView }) {
  return (
    <Link
      to={`/players/${entry.playerId}?tab=moments`}
      className="block rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 transition-colors hover:border-accent-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {entry.teamId ? <TeamLogo teamId={entry.teamId} size="xs" /> : null}
            <span className="truncate font-heading text-sm text-dynasty-textBright">{entry.playerName}</span>
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">
            {entry.moment.description}
          </div>
          <div className="mt-2 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            Season {entry.moment.season}
            {entry.moment.day != null ? (
              <>
                {' '}&middot; Day {entry.moment.day}
              </>
            ) : null}
            {entry.moment.isPlayoff ? (
              <>
                {' '}&middot; Playoffs
              </>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function TeamEntry({ entry }: { entry: TeamMomentView }) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Flag className="h-3.5 w-3.5 text-accent-info" />
            <TeamLogo teamId={entry.teamId} size="xs" />
            <span className="truncate font-heading text-sm text-dynasty-textBright">{entry.teamName}</span>
            <span className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Team Identity</span>
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">
            {entry.moment.description}
          </div>
          <div className="mt-2 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            Season {entry.moment.season}
            {entry.moment.day != null ? (
              <>
                {' '}&middot; Day {entry.moment.day}
              </>
            ) : null}
            {entry.moment.isPlayoff ? (
              <>
                {' '}&middot; Playoffs
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

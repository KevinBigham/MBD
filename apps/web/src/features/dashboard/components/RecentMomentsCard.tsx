import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, Sparkles } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';

interface MomentShape {
  season: number;
  day?: number;
  description: string;
  type: string;
  isPlayoff: boolean;
  relevance: number;
}

interface PlayerMomentView {
  kind: 'player';
  playerId: string;
  playerName: string;
  teamId: string;
  moment: MomentShape;
}

interface TeamMomentView {
  kind: 'team';
  teamId: string;
  teamName: string;
  moment: MomentShape;
}

type MergedMomentView = PlayerMomentView | TeamMomentView;

const MAX_VISIBLE = 5;
const LOOKBACK_DAYS = 7;

function teamDisplayName(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId;
}

function absoluteDay(moment: MomentShape): number {
  return (moment.season * 1000) + (moment.day ?? 0);
}

function mergedKey(entry: MergedMomentView): string {
  const base = `${entry.moment.type}-${entry.moment.season}-${entry.moment.day ?? 0}`;
  return entry.kind === 'player' ? `p-${entry.playerId}-${base}` : `t-${entry.teamId}-${base}`;
}

export default function RecentMomentsCard() {
  const worker = useWorker();
  const { day, season } = useGameStore();
  const [moments, setMoments] = useState<MergedMomentView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMoments = useCallback(async () => {
    if (!worker.isReady
      || typeof worker.getRecentLeagueMoments !== 'function'
      || typeof worker.getRecentTeamMoments !== 'function'
    ) {
      setMoments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const sinceDay = Math.max(1, day - LOOKBACK_DAYS);
      const [playerData, teamData] = await Promise.all([
        worker.getRecentLeagueMoments(sinceDay),
        worker.getRecentTeamMoments(sinceDay),
      ]);

      const playerEntries: MergedMomentView[] = (playerData ?? []).map((entry) => ({
        kind: 'player',
        playerId: entry.playerId,
        playerName: entry.playerName,
        teamId: entry.teamId,
        moment: entry.moment as MomentShape,
      }));
      const teamEntries: MergedMomentView[] = (teamData ?? []).map((entry) => ({
        kind: 'team',
        teamId: entry.teamId,
        teamName: teamDisplayName(entry.teamId),
        moment: entry.moment as MomentShape,
      }));

      const merged = [...playerEntries, ...teamEntries].sort((left, right) => {
        const dayDelta = absoluteDay(right.moment) - absoluteDay(left.moment);
        if (dayDelta !== 0) return dayDelta;
        const relevanceDelta = right.moment.relevance - left.moment.relevance;
        if (relevanceDelta !== 0) return relevanceDelta;
        if (left.kind !== right.kind) return left.kind === 'team' ? -1 : 1;
        return left.moment.type.localeCompare(right.moment.type);
      });

      setMoments(merged.slice(0, MAX_VISIBLE));
    } finally {
      setLoading(false);
    }
  }, [day, worker]);

  useEffect(() => {
    void fetchMoments();
  }, [fetchMoments, season]);

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent-warning" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Signature Moments</h2>
      </div>

      {loading ? (
        <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>
      ) : moments.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
          No recent league-wide moments in the last seven sim days.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {moments.map((entry) => (entry.kind === 'player'
            ? <PlayerEntry key={mergedKey(entry)} entry={entry} />
            : <TeamEntry key={mergedKey(entry)} entry={entry} />
          ))}
        </div>
      )}
    </section>
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
            {entry.moment.day != null ? ` · Day ${entry.moment.day}` : ''}
            {entry.moment.isPlayoff ? ' · Playoffs' : ''}
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
            {entry.moment.day != null ? ` · Day ${entry.moment.day}` : ''}
            {entry.moment.isPlayoff ? ' · Playoffs' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

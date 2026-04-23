import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { TeamLogo } from '@/shared/components/TeamLogo';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';

// "Player Arcs of the Season" — surfaces the three player-scoped season
// narrative detectors (redemption_arc / late_career_peak / rookie_breakout)
// from the most recently resolved season. Reads persisted moment state only,
// no schema change, no engine mutation. Mid-season shows last season's arcs;
// season-end transition surfaces the freshly emitted arcs from the season
// that just wrapped.

type ArcType = 'redemption_arc' | 'late_career_peak' | 'rookie_breakout';

interface ArcMomentShape {
  season: number;
  day?: number;
  description: string;
  type: string;
  isPlayoff: boolean;
  relevance: number;
}

interface ArcEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  moment: ArcMomentShape;
}

const MAX_VISIBLE = 5;

const ARC_LABELS: Readonly<Record<ArcType, string>> = {
  redemption_arc: 'Redemption',
  late_career_peak: 'Late-Career Peak',
  rookie_breakout: 'Rookie Breakout',
};

function arcTypeLabel(type: string): string {
  if (type === 'redemption_arc' || type === 'late_career_peak' || type === 'rookie_breakout') {
    return ARC_LABELS[type];
  }
  return type.replace(/_/g, ' ');
}

function teamDisplayName(teamId: string): string {
  if (!teamId) return '';
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId;
}

function entryKey(entry: ArcEntry): string {
  return `${entry.playerId}-${entry.moment.type}-${entry.moment.season}`;
}

export default function PlayerArcOfSeasonCard() {
  const worker = useWorker();
  const { day, season } = useGameStore();
  const [entries, setEntries] = useState<ArcEntry[]>([]);
  const [targetSeason, setTargetSeason] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchArcs = useCallback(async () => {
    if (!worker.isReady || typeof worker.getPlayerArcsOfSeason !== 'function') {
      setEntries([]);
      setTargetSeason(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await worker.getPlayerArcsOfSeason();
      const mapped: ArcEntry[] = (data?.arcs ?? []).map((entry) => ({
        playerId: entry.playerId,
        playerName: entry.playerName,
        teamId: entry.teamId,
        moment: entry.moment as ArcMomentShape,
      }));

      setEntries(mapped.slice(0, MAX_VISIBLE));
      setTargetSeason(data?.season ?? 0);
    } finally {
      setLoading(false);
    }
  }, [worker]);

  useEffect(() => {
    void fetchArcs();
  }, [fetchArcs, day, season]);

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent-primary" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Player Arcs of the Season</h2>
        </div>
        {!loading && entries.length > 0 && targetSeason > 0 ? (
          <span className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            Season {targetSeason}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 font-heading text-sm text-dynasty-muted">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
          No player arcs from this season yet. Check back after the season wraps.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {entries.map((entry) => (
            <ArcRow key={entryKey(entry)} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

function ArcRow({ entry }: { entry: ArcEntry }) {
  const team = entry.teamId ? teamDisplayName(entry.teamId) : '';
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
            {team ? (
              <span className="truncate font-heading text-xs text-dynasty-muted">{team}</span>
            ) : null}
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">
            {entry.moment.description}
          </div>
          <div className="mt-2 flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            <span className="rounded-sm border border-accent-primary/40 bg-accent-primary/10 px-1.5 py-[1px] text-accent-primary">
              {arcTypeLabel(entry.moment.type)}
            </span>
            {entry.moment.day != null ? <span>Day {entry.moment.day}</span> : null}
            {entry.moment.isPlayoff ? <span>Playoffs</span> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

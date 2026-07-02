import { useCallback, useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import PlayerArcOfSeasonCardBody, {
  type ArcMomentShape,
  type PlayerArcEntryView,
} from './PlayerArcOfSeasonCardBody';

// "Player Arcs of the Season" — surfaces the three player-scoped season
// narrative detectors (redemption_arc / late_career_peak / rookie_breakout)
// from the most recently resolved season. Reads persisted moment state only,
// no schema change, no engine mutation. Mid-season shows last season's arcs;
// season-end transition surfaces the freshly emitted arcs from the season
// that just wrapped.

const MAX_VISIBLE = 5;

function teamDisplayName(teamId: string): string {
  if (!teamId) return '';
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId;
}

export default function PlayerArcOfSeasonCard() {
  const worker = useWorker();
  const { day, season } = useGameStore();
  const [entries, setEntries] = useState<PlayerArcEntryView[]>([]);
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
      const mapped: PlayerArcEntryView[] = (data?.arcs ?? []).map((entry) => ({
        playerId: entry.playerId,
        playerName: entry.playerName,
        teamId: entry.teamId,
        teamName: teamDisplayName(entry.teamId),
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

      <PlayerArcOfSeasonCardBody entries={entries} loading={loading} />
    </section>
  );
}

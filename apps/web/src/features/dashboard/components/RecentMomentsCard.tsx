import { useCallback, useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import RecentMomentsCardBody, {
  type MergedMomentView,
  type MomentShape,
} from './RecentMomentsCardBody';

const MAX_VISIBLE = 5;
const LOOKBACK_DAYS = 7;

function teamDisplayName(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId;
}

function absoluteDay(moment: MomentShape): number {
  return (moment.season * 1000) + (moment.day ?? 0);
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

      <RecentMomentsCardBody loading={loading} moments={moments} />
    </section>
  );
}

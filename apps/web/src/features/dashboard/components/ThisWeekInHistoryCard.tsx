import { useCallback, useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import ThisWeekInHistoryCardBody, {
  type HistoricalEntry,
  type HistoricalMomentShape,
} from './ThisWeekInHistoryCardBody';

// "This Week in History" surfaces signature moments from strictly-prior
// seasons whose `day` falls within ±DAY_WINDOW of the current day. Mirrors the
// narrative payoff of a franchise that remembers its own past — e.g. "2 years
// ago today, Rodriguez threw a no-hitter against Boston." Reads persisted
// state only; no schema change.

const DAY_WINDOW = 3;
const MAX_VISIBLE = 6;

function teamDisplayName(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId;
}

export default function ThisWeekInHistoryCard() {
  const worker = useWorker();
  const { day, season } = useGameStore();
  const [entries, setEntries] = useState<HistoricalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!worker.isReady || typeof worker.getThisWeekInHistory !== 'function') {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await worker.getThisWeekInHistory(DAY_WINDOW);
      const playerEntries: HistoricalEntry[] = (data?.playerMoments ?? []).map((entry) => ({
        kind: 'player',
        playerId: entry.playerId,
        playerName: entry.playerName,
        teamId: entry.teamId,
        yearsAgo: entry.yearsAgo,
        moment: entry.moment as HistoricalMomentShape,
      }));
      const teamEntries: HistoricalEntry[] = (data?.teamMoments ?? []).map((entry) => ({
        kind: 'team',
        teamId: entry.teamId,
        teamName: teamDisplayName(entry.teamId),
        yearsAgo: entry.yearsAgo,
        moment: entry.moment as HistoricalMomentShape,
      }));

      const merged = [...playerEntries, ...teamEntries].sort((left, right) =>
        left.yearsAgo - right.yearsAgo
        || right.moment.relevance - left.moment.relevance
        || left.kind.localeCompare(right.kind)
        || left.moment.type.localeCompare(right.moment.type),
      );

      setEntries(merged.slice(0, MAX_VISIBLE));
    } finally {
      setLoading(false);
    }
  }, [worker]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory, day, season]);

  return (
    <section className="rounded-xl border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-accent-info" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">This Week in History</h2>
      </div>

      <ThisWeekInHistoryCardBody loading={loading} entries={entries} />
    </section>
  );
}

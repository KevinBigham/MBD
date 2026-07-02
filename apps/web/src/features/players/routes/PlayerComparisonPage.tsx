import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, GitCompareArrows } from 'lucide-react';
import { PageShell } from '@/shared/components/PageShell';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { PlayerComparisonSearchPicker } from '../components/PlayerComparisonSearchPicker';
import { PlayerComparisonResultsPanel } from '../components/PlayerComparisonResultsPanel';
import { usePlayerComparisonRouteData } from '../hooks/usePlayerComparisonRouteData';

export default function PlayerComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const worker = useWorker();
  const { isInitialized } = useGameStore();

  const playerIdA = searchParams.get('a') ?? '';
  const playerIdB = searchParams.get('b') ?? '';
  const {
    data,
    loading,
    playerA,
    playerB,
  } = usePlayerComparisonRouteData({
    getPlayerComparison: worker.getPlayerComparison,
    isInitialized,
    playerIdA,
    playerIdB,
    workerReady: worker.isReady,
  });

  const setPlayer = useCallback((side: 'a' | 'b', id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id) {
      next.set(side, id);
    } else {
      next.delete(side);
    }
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            to="/players"
            className="inline-flex items-center gap-1 font-heading text-sm text-dynasty-muted hover:text-accent-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Players
          </Link>
          <span className="text-dynasty-border">/</span>
          <h1 className="font-brand text-2xl tracking-wide text-dynasty-textBright">Compare Players</h1>
        </div>

        {/* Player pickers */}
        <div className="grid gap-4 md:grid-cols-2">
          <PlayerComparisonSearchPicker
            label="Player A"
            searchPlayers={worker.searchPlayers}
            selected={playerA}
            onSelect={(id) => setPlayer('a', id)}
            workerReady={worker.isReady}
          />
          <PlayerComparisonSearchPicker
            label="Player B"
            searchPlayers={worker.searchPlayers}
            selected={playerB}
            onSelect={(id) => setPlayer('b', id)}
            workerReady={worker.isReady}
          />
        </div>

        {loading && (
          <div className="py-12 text-center font-data text-sm text-dynasty-muted">
            Comparing players...
          </div>
        )}

        {data && !loading && (
          <PlayerComparisonResultsPanel data={data} />
        )}

        {!data && !loading && playerIdA && playerIdB && (
          <div className="py-12 text-center font-heading text-sm text-dynasty-muted">
            Could not compare these players. They may not exist in the current save.
          </div>
        )}

        {!playerIdA && !playerIdB && (
          <div className="py-12 text-center">
            <GitCompareArrows className="mx-auto h-12 w-12 text-dynasty-border" />
            <p className="mt-4 font-heading text-sm text-dynasty-muted">
              Search for two players to compare their attributes, stats, and grades side by side.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}

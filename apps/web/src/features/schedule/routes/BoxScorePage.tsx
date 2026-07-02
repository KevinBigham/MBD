import { Suspense, lazy, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { getAudioEngine } from '@/shared/lib/audio';
import BoxScoreContentPanel from '../components/BoxScoreContentPanel';
import { useBoxScoreRouteData } from '../hooks/useBoxScoreRouteData';

const EnhancedPlayByPlay = lazy(() => import('../components/EnhancedPlayByPlay'));

export default function BoxScorePage() {
  const { gameIndex: gameIndexParam } = useParams<{ gameIndex: string }>();
  const numericGameIndex = Number(gameIndexParam);
  const gameRef = gameIndexParam != null && gameIndexParam.trim() !== '' && Number.isInteger(numericGameIndex)
    ? numericGameIndex
    : (gameIndexParam ?? '');
  const worker = useWorker();
  const { isInitialized } = useGameStore();
  const { data, loading } = useBoxScoreRouteData({
    gameRef,
    getGamePlayByPlay: worker.getGamePlayByPlay,
    isInitialized,
    workerReady: worker.isReady,
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    const walkOff = [data.recap, ...data.plays.map((play) => play.text)]
      .some((entry) => /walk[- ]off/i.test(entry));
    if (walkOff) {
      getAudioEngine().playEffect('walk_off');
    }
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="font-data text-sm text-dynasty-muted">Loading box score...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Link
          to="/schedule"
          className="focus-ring inline-flex items-center gap-1 rounded text-sm text-dynasty-muted transition-colors hover:text-dynasty-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Schedule
        </Link>
        <div className="py-12 text-center font-heading text-sm text-dynasty-muted">
          Game not found.
        </div>
      </div>
    );
  }

  return (
    <BoxScoreContentPanel
      data={data}
      enhancedPlayByPlaySlot={(
        <Suspense fallback={null}>
          {typeof gameRef === 'number' ? <EnhancedPlayByPlay gameIndex={gameRef} /> : null}
        </Suspense>
      )}
    />
  );
}

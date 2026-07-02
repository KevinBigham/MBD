import { Suspense, lazy } from 'react';

const MomentumPanel = lazy(() => import('../components/MomentumPanel'));
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { PlayoffsContentPanel } from '../components/PlayoffsContentPanel';
import { usePlayoffsPageController } from '../hooks/usePlayoffsPageController';

export default function PlayoffsPage() {
  const worker = useWorker();
  const { isInitialized, season, day, phase, updateFromSim } = useGameStore();
  const autosaveActiveGame = useActiveSaveAutosave();
  const {
    bracket,
    busyAction,
    dynastyScore,
    handleSimNextGame,
    handleSimRemainingPlayoffs,
    handleSimRound,
    handleSimSeries,
    playoffPreview,
  } = usePlayoffsPageController({
    autosaveActiveGame,
    day,
    getDynastyScore: worker.getDynastyScore,
    getPlayoffBracket: worker.getPlayoffBracket,
    getSeasonFlowState: worker.getSeasonFlowState,
    isInitialized,
    phase,
    season,
    simPlayoffGame: worker.simPlayoffGame,
    simPlayoffRound: worker.simPlayoffRound,
    simPlayoffSeries: worker.simPlayoffSeries,
    simRemainingPlayoffs: worker.simRemainingPlayoffs,
    updateFromSim,
    workerReady: worker.isReady,
  });

  return (
    <PlayoffsContentPanel
      bracket={bracket}
      busyAction={busyAction}
      dynastyScore={dynastyScore}
      momentumSlot={(
        <Suspense fallback={null}>
          <MomentumPanel />
        </Suspense>
      )}
      onSimNextGame={() => void handleSimNextGame()}
      onSimRemainingPlayoffs={() => void handleSimRemainingPlayoffs()}
      onSimRound={() => void handleSimRound()}
      onSimSeries={() => void handleSimSeries()}
      playoffPreview={playoffPreview}
    />
  );
}

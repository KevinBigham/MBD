import { useCallback, useEffect, useState } from 'react';
import type { PlayoffBracket } from '@mbd/sim-core';
import type { SeasonFlowPreviewSeries } from '@/app/layout/seasonFlow';
import type { DynastyScoreSummary } from '../components/PlayoffsContentPanel';

type PlayoffMutationResult = {
  season: number;
  day: number;
  phase: string;
  gamesPlayed: number;
};

type PlayoffBusyAction = 'game' | 'series' | 'round' | 'all';

function snapshotSaved(value: unknown): value is { saved: true } {
  return typeof value === 'object'
    && value !== null
    && 'saved' in value
    && (value as { saved?: unknown }).saved === true;
}

export interface PlayoffsPageControllerOptions {
  autosaveActiveGame: (options?: { season?: number }) => Promise<unknown>;
  day: number;
  getDynastyScore: () => Promise<DynastyScoreSummary | null | undefined>;
  getPlayoffBracket: () => Promise<PlayoffBracket | null | undefined>;
  getSeasonFlowState: () => Promise<{ playoffPreview?: SeasonFlowPreviewSeries[] } | null | undefined>;
  isInitialized: boolean;
  phase: string;
  season: number;
  simPlayoffGame: () => Promise<PlayoffMutationResult>;
  simPlayoffRound: () => Promise<PlayoffMutationResult>;
  simPlayoffSeries: () => Promise<PlayoffMutationResult>;
  simRemainingPlayoffs: () => Promise<PlayoffMutationResult>;
  updateFromSim: (result: PlayoffMutationResult) => void;
  workerReady: boolean;
}

export function usePlayoffsPageController({
  autosaveActiveGame,
  day,
  getDynastyScore,
  getPlayoffBracket,
  getSeasonFlowState,
  isInitialized,
  phase,
  season,
  simPlayoffGame,
  simPlayoffRound,
  simPlayoffSeries,
  simRemainingPlayoffs,
  updateFromSim,
  workerReady,
}: PlayoffsPageControllerOptions) {
  const [bracket, setBracket] = useState<PlayoffBracket | null>(null);
  const [playoffPreview, setPlayoffPreview] = useState<SeasonFlowPreviewSeries[]>([]);
  const [dynastyScore, setDynastyScore] = useState<DynastyScoreSummary | null>(null);
  const [busyAction, setBusyAction] = useState<PlayoffBusyAction | null>(null);

  const refreshPlayoffs = useCallback(async () => {
    if (!workerReady || !isInitialized) return;
    const [nextBracket, nextFlow, nextDynasty] = await Promise.all([
      getPlayoffBracket(),
      getSeasonFlowState(),
      getDynastyScore(),
    ]);
    setBracket(nextBracket ?? null);
    setPlayoffPreview(nextFlow?.playoffPreview ?? []);
    setDynastyScore(nextDynasty ?? null);
  }, [getDynastyScore, getPlayoffBracket, getSeasonFlowState, isInitialized, workerReady]);

  useEffect(() => {
    void refreshPlayoffs();
  }, [day, phase, refreshPlayoffs, season]);

  const runMutation = useCallback(async (
    key: PlayoffBusyAction,
    action: () => Promise<PlayoffMutationResult>,
  ) => {
    setBusyAction(key);
    try {
      const result = await action();
      if (!snapshotSaved(await autosaveActiveGame({ season: result.season }))) return;
      updateFromSim(result);
      await refreshPlayoffs();
    } finally {
      setBusyAction(null);
    }
  }, [autosaveActiveGame, refreshPlayoffs, updateFromSim]);

  const handleSimNextGame = useCallback(
    () => runMutation('game', simPlayoffGame),
    [runMutation, simPlayoffGame],
  );
  const handleSimSeries = useCallback(
    () => runMutation('series', simPlayoffSeries),
    [runMutation, simPlayoffSeries],
  );
  const handleSimRound = useCallback(
    () => runMutation('round', simPlayoffRound),
    [runMutation, simPlayoffRound],
  );
  const handleSimRemainingPlayoffs = useCallback(
    () => runMutation('all', simRemainingPlayoffs),
    [runMutation, simRemainingPlayoffs],
  );

  return {
    bracket,
    busyAction,
    dynastyScore,
    handleSimNextGame,
    handleSimRemainingPlayoffs,
    handleSimRound,
    handleSimSeries,
    playoffPreview,
    refreshPlayoffs,
  };
}

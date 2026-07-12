import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { PlayoffBracket } from '@mbd/sim-core';
import type { SeasonFlowPreviewSeries } from '@/app/layout/seasonFlow';
import {
  usePlayoffsPageController,
  type PlayoffsPageControllerOptions,
} from './usePlayoffsPageController';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = PlayoffsPageControllerOptions;
type HookResult = ReturnType<typeof usePlayoffsPageController>;

const bracket = {
  currentRound: 'DIVISION_SERIES',
  currentRoundSeries: [{
    id: 'AL-DS-1',
    round: 'DIVISION_SERIES',
    league: 'AL',
    bestOf: 5,
    higherSeed: { teamId: 'nym', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
    lowerSeed: { teamId: 'cle', seed: 3, wins: 94, losses: 68, league: 'AL', divisionWinner: true },
    games: [],
    higherSeedWins: 1,
    lowerSeedWins: 0,
    leaderSummary: 'NYM leads 1-0',
    status: 'in_progress',
    winnerId: null,
    loserId: null,
  }],
  completedRounds: [],
  series: [],
  champion: null,
  runnerUp: null,
} as unknown as PlayoffBracket;

const playoffPreview: SeasonFlowPreviewSeries[] = [{
  id: 'AL-DS-1',
  round: 'Division Series',
  bestOf: 5,
  home: {
    teamId: 'nym',
    teamName: 'New York Tycoons',
    abbreviation: 'NYT',
    seed: 1,
    placeholder: null,
  },
  away: {
    teamId: 'cle',
    teamName: 'Cleveland Forge',
    abbreviation: 'CLE',
    seed: 3,
    placeholder: null,
  },
}];

const dynastyScore = { score: 215, grade: 'B' };
const simResult = { season: 3, day: 2, phase: 'playoffs', gamesPlayed: 163 };

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(usePlayoffsPageController(options));
  return null;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

describe('usePlayoffsPageController', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      autosaveActiveGame: vi.fn().mockResolvedValue({ saved: true, saveName: 'Autosave' }),
      day: 1,
      getDynastyScore: vi.fn().mockResolvedValue(dynastyScore),
      getPlayoffBracket: vi.fn().mockResolvedValue(bracket),
      getSeasonFlowState: vi.fn().mockResolvedValue({ playoffPreview }),
      isInitialized: true,
      phase: 'playoffs',
      season: 3,
      simPlayoffGame: vi.fn().mockResolvedValue(simResult),
      simPlayoffRound: vi.fn().mockResolvedValue(simResult),
      simPlayoffSeries: vi.fn().mockResolvedValue(simResult),
      simRemainingPlayoffs: vi.fn().mockResolvedValue(simResult),
      updateFromSim: vi.fn(),
      workerReady: true,
      ...overrides,
    };
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  it('waits without querying until the game and worker are ready', async () => {
    const options = baseOptions({ workerReady: false });

    const result = await renderHook(options);

    expect(options.getPlayoffBracket).not.toHaveBeenCalled();
    expect(options.getSeasonFlowState).not.toHaveBeenCalled();
    expect(options.getDynastyScore).not.toHaveBeenCalled();
    expect(result.bracket).toBeNull();
    expect(result.playoffPreview).toEqual([]);
    expect(result.dynastyScore).toBeNull();
  });

  it('loads bracket, season-flow playoff preview, and dynasty score when ready', async () => {
    const options = baseOptions();

    const result = await renderHook(options);

    expect(options.getPlayoffBracket).toHaveBeenCalledTimes(1);
    expect(options.getSeasonFlowState).toHaveBeenCalledTimes(1);
    expect(options.getDynastyScore).toHaveBeenCalledTimes(1);
    expect(result.bracket).toBe(bracket);
    expect(result.playoffPreview).toBe(playoffPreview);
    expect(result.dynastyScore).toBe(dynastyScore);
  });

  it('refetches playoff route data when the calendar changes', async () => {
    const options = baseOptions();
    await renderHook(options);

    await renderHook({
      ...options,
      day: 2,
    });
    await renderHook({
      ...options,
      day: 1,
      phase: 'offseason',
      season: 4,
    });

    expect(options.getPlayoffBracket).toHaveBeenCalledTimes(3);
    expect(options.getSeasonFlowState).toHaveBeenCalledTimes(3);
    expect(options.getDynastyScore).toHaveBeenCalledTimes(3);
  });

  it('sets a busy action while simming, updates the store, then refreshes playoff data', async () => {
    const deferred = createDeferred<typeof simResult>();
    const options = baseOptions({
      simPlayoffSeries: vi.fn().mockReturnValue(deferred.promise),
    });
    await renderHook(options);

    let mutationPromise!: Promise<void>;
    await act(async () => {
      mutationPromise = latestResult?.handleSimSeries() ?? Promise.resolve();
      await Promise.resolve();
    });

    expect(latestResult?.busyAction).toBe('series');

    await act(async () => {
      deferred.resolve(simResult);
      await mutationPromise;
      await Promise.resolve();
    });

    expect(options.simPlayoffSeries).toHaveBeenCalledTimes(1);
    expect(options.updateFromSim).toHaveBeenCalledWith(simResult);
    expect(options.autosaveActiveGame).toHaveBeenCalledTimes(1);
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: simResult.season });
    expect(options.getPlayoffBracket).toHaveBeenCalledTimes(2);
    expect(options.getSeasonFlowState).toHaveBeenCalledTimes(2);
    expect(options.getDynastyScore).toHaveBeenCalledTimes(2);
    expect(latestResult?.busyAction).toBeNull();
  });

  it('autosaves after each playoff sim mutation with the simmed season', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleSimNextGame();
      await latestResult?.handleSimSeries();
      await latestResult?.handleSimRound();
      await latestResult?.handleSimRemainingPlayoffs();
    });

    expect(options.autosaveActiveGame).toHaveBeenCalledTimes(4);
    expect(vi.mocked(options.autosaveActiveGame).mock.calls).toEqual([
      [{ season: simResult.season }],
      [{ season: simResult.season }],
      [{ season: simResult.season }],
      [{ season: simResult.season }],
    ]);
  });

  it('publishes the playoff mirror only after the save is durable and before refreshing playoff data', async () => {
    const events: string[] = [];
    const options = baseOptions({
      updateFromSim: vi.fn(() => {
        events.push('update');
      }),
      autosaveActiveGame: vi.fn(async () => {
        events.push('autosave');
        return { saved: true, saveName: 'Autosave' };
      }),
      getPlayoffBracket: vi.fn(async () => {
        events.push('refresh');
        return bracket;
      }),
    });
    await renderHook(options);
    events.length = 0;

    await act(async () => {
      await latestResult?.handleSimNextGame();
    });

    expect(events).toEqual(['autosave', 'update', 'refresh']);
  });

  it('does not refresh playoff presentation when persistence resolves unsaved', async () => {
    const options = baseOptions({
      autosaveActiveGame: vi.fn().mockResolvedValue({ saved: false, saveName: null }),
    });
    await renderHook(options);
    vi.mocked(options.getPlayoffBracket).mockClear();
    vi.mocked(options.getSeasonFlowState).mockClear();
    vi.mocked(options.getDynastyScore).mockClear();

    await act(async () => {
      await latestResult?.handleSimNextGame();
    });

    expect(options.autosaveActiveGame).toHaveBeenCalledTimes(1);
    expect(options.getPlayoffBracket).not.toHaveBeenCalled();
    expect(options.getSeasonFlowState).not.toHaveBeenCalled();
    expect(options.getDynastyScore).not.toHaveBeenCalled();
    expect(latestResult?.busyAction).toBeNull();
  });

  it('does not autosave or rerun the mutation when a playoff sim fails', async () => {
    const options = baseOptions({
      simPlayoffGame: vi.fn().mockRejectedValue(new Error('sim failed')),
    });
    await renderHook(options);

    await act(async () => {
      await expect(latestResult?.handleSimNextGame()).rejects.toThrow('sim failed');
    });

    expect(options.simPlayoffGame).toHaveBeenCalledTimes(1);
    expect(options.updateFromSim).not.toHaveBeenCalled();
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();
    expect(options.getPlayoffBracket).toHaveBeenCalledTimes(1);
    expect(latestResult?.busyAction).toBeNull();
  });
});

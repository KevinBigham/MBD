import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { GMCareer, JobMarket, SignatureMoment } from '@mbd/contracts';
import { useGMCareerRouteData } from './useGMCareerRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useGMCareerRouteData>[0];
type HookResult = ReturnType<typeof useGMCareerRouteData>;

const career: GMCareer = {
  careerHistory: [
    {
      teamId: 'bos',
      seasons: 3,
      record: { wins: 250, losses: 236 },
      championships: 0,
      hiredSeason: 1,
      firedSeason: 3,
      firedReason: 'Missed playoffs three consecutive seasons.',
      reputation: 42,
    },
    {
      teamId: 'nym',
      seasons: 2,
      record: { wins: 190, losses: 134 },
      championships: 1,
      hiredSeason: 4,
      firedSeason: null,
      firedReason: null,
      reputation: 78,
    },
  ],
  currentTeamId: 'nym',
  reputation: 78,
  overallRecord: { wins: 440, losses: 370 },
  championships: 1,
  hiredSeason: 4,
  firedSeasons: [3],
  careerAchievements: ['Won 1 championship.'],
  jobSearchActive: false,
  lastFiredReason: null,
};

const jobMarket: JobMarket = {
  availableJobs: [],
  applicationDeadlineSeason: null,
};

const teamMoment: SignatureMoment = {
  season: 5,
  day: 120,
  timestamp: 'S5D120',
  type: 'deadline_buyer',
  description: 'The room doubled down on contention.',
  impact: 21,
  relevance: 0.91,
  isPlayoff: false,
  isEliminationGame: false,
  worldSeriesClincher: false,
  round: null,
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useGMCareerRouteData(options));
  return null;
}

describe('useGMCareerRouteData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latest = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function makeOptions(overrides: Partial<HookOptions> = {}) {
    const getGMCareer = vi.fn().mockResolvedValue(career);
    const getJobMarket = vi.fn().mockResolvedValue(jobMarket);
    const getTeamMoments = vi.fn().mockResolvedValue([teamMoment]);

    return {
      getGMCareer,
      getJobMarket,
      getTeamMoments,
      options: {
        day: 1,
        getGMCareer,
        getJobMarket,
        getTeamMoments,
        isInitialized: true,
        phase: 'regular_season',
        season: 5,
        workerReady: true,
        ...overrides,
      } satisfies HookOptions,
    };
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latest = result;
      }} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest).toBeTruthy();
    return latest as HookResult;
  }

  it('waits without querying until game state and worker are ready', async () => {
    const { getGMCareer, getJobMarket, getTeamMoments, options } = makeOptions({
      workerReady: false,
    });

    const result = await renderHook(options);

    expect(getGMCareer).not.toHaveBeenCalled();
    expect(getJobMarket).not.toHaveBeenCalled();
    expect(getTeamMoments).not.toHaveBeenCalled();
    expect(result.career).toBeNull();
    expect(result.jobMarket).toBeNull();
    expect(result.teamMoments).toEqual([]);
  });

  it('loads career data, job market data, and current-team identity moments', async () => {
    const { getGMCareer, getJobMarket, getTeamMoments, options } = makeOptions();

    const result = await renderHook(options);

    expect(getGMCareer).toHaveBeenCalledTimes(1);
    expect(getJobMarket).toHaveBeenCalledTimes(1);
    expect(getTeamMoments).toHaveBeenCalledWith('nym');
    expect(result.career).toBe(career);
    expect(result.jobMarket).toBe(jobMarket);
    expect(result.teamMoments).toEqual([teamMoment]);
  });

  it('skips team-moment loading when the career payload is unavailable', async () => {
    const unavailableCareer = vi.fn().mockResolvedValue(null);
    const { getTeamMoments, options } = makeOptions({
      getGMCareer: unavailableCareer,
    });

    const result = await renderHook(options);

    expect(unavailableCareer).toHaveBeenCalledTimes(1);
    expect(getTeamMoments).not.toHaveBeenCalled();
    expect(result.career).toBeNull();
    expect(result.teamMoments).toEqual([]);
  });

  it('refetches GM career route data when the game calendar changes', async () => {
    const { getGMCareer, getJobMarket, getTeamMoments, options } = makeOptions();
    await renderHook(options);

    await renderHook({
      ...options,
      day: 2,
    });
    await renderHook({
      ...options,
      day: 1,
      phase: 'offseason',
      season: 6,
    });

    expect(getGMCareer).toHaveBeenCalledTimes(3);
    expect(getJobMarket).toHaveBeenCalledTimes(3);
    expect(getTeamMoments).toHaveBeenCalledTimes(3);
  });
});

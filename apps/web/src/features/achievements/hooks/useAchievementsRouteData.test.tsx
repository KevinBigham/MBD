import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { AchievementView } from '../components/AchievementsContentPanel';
import { useAchievementsRouteData, type CeremonyScript } from './useAchievementsRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useAchievementsRouteData>[0];
type HookResult = ReturnType<typeof useAchievementsRouteData>;

const achievements: AchievementView[] = [
  {
    id: 'first_championship',
    category: 'dynasty',
    name: 'Ring Ceremony',
    description: 'Win your first championship.',
    unlocked: true,
    unlockedAt: 3,
    unlockSummary: 'Won the World Series in Season 3.',
    progress: null,
  },
  {
    id: 'moneyball_master',
    category: 'moneyball',
    name: 'Moneyball Master',
    description: 'Win 90+ games with a bottom-5 payroll.',
    unlocked: false,
    unlockedAt: null,
    unlockSummary: null,
    progress: { current: 82, target: 90, summary: '82 wins this season' },
  },
];

const ceremony: CeremonyScript = {
  season: 4,
  openingRemarks: 'Welcome to awards night.',
  closingRemarks: 'See you next season.',
  awards: [
    {
      awardId: 'mvp-al',
      awardName: 'AL MVP',
      winnerId: 'player-1',
      winnerName: 'Aaron Judge',
      headline: 'Judge wins the MVP.',
      votingSummary: 'Judge led the league in WAR.',
      historicalContext: 'A season for the record books.',
      reactionQuote: 'The work paid off.',
      runnerUpNames: ['Runner One', 'Runner Two'],
    },
  ],
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useAchievementsRouteData(options));
  return null;
}

describe('useAchievementsRouteData', () => {
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
    const getAchievements = vi.fn().mockResolvedValue(achievements);
    const getAwardCeremony = vi.fn().mockResolvedValue(ceremony);

    return {
      getAchievements,
      getAwardCeremony,
      options: {
        day: 88,
        getAchievements,
        getAwardCeremony,
        isInitialized: true,
        phase: 'regular_season',
        season: 4,
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
    });
    expect(latest).toBeTruthy();
    return latest as HookResult;
  }

  it('waits without querying until game state and worker are ready', async () => {
    const { getAchievements, getAwardCeremony, options } = makeOptions({ workerReady: false });

    const result = await renderHook(options);
    await act(async () => {
      await result.openCeremony();
    });

    expect(getAchievements).not.toHaveBeenCalled();
    expect(getAwardCeremony).not.toHaveBeenCalled();
    expect(result.loading).toBe(true);
    expect(result.achievements).toEqual([]);
    expect(result.filter).toBe('all');
  });

  it('loads achievements, updates filter state, and refetches when the game calendar changes', async () => {
    const { getAchievements, options } = makeOptions();
    const result = await renderHook(options);

    expect(getAchievements).toHaveBeenCalledTimes(1);
    expect(result.loading).toBe(false);
    expect(result.achievements).toEqual(achievements);

    await act(async () => {
      result.setFilter('moneyball');
      await Promise.resolve();
    });

    expect(latest?.filter).toBe('moneyball');

    await renderHook({ ...options, day: 89 });
    await renderHook({ ...options, day: 1, phase: 'offseason', season: 5 });

    expect(getAchievements).toHaveBeenCalledTimes(3);
  });

  it('keeps an empty achievement list when the worker returns no payload', async () => {
    const emptyGetAchievements = vi.fn().mockResolvedValue(null);
    const { options } = makeOptions({ getAchievements: emptyGetAchievements });

    const result = await renderHook(options);

    expect(emptyGetAchievements).toHaveBeenCalledTimes(1);
    expect(result.loading).toBe(false);
    expect(result.achievements).toEqual([]);
  });

  it('opens and closes award ceremony data through the route hook', async () => {
    const { getAwardCeremony, options } = makeOptions();
    await renderHook(options);

    await act(async () => {
      await latest?.openCeremony();
      await Promise.resolve();
    });

    expect(getAwardCeremony).toHaveBeenCalledTimes(1);
    expect(latest?.ceremonyLoading).toBe(false);
    expect(latest?.ceremony).toEqual(ceremony);

    await act(async () => {
      latest?.closeCeremony();
      await Promise.resolve();
    });

    expect(latest?.ceremony).toBeNull();
  });
});

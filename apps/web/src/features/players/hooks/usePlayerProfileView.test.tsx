import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { usePlayerProfileView } from './usePlayerProfileView';
import type { PlayerProfileView } from '../components/playerProfileShared';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof usePlayerProfileView>[0];
type HookResult = ReturnType<typeof usePlayerProfileView>;

const profileView: PlayerProfileView = {
  player: {
    id: 'player-1',
    firstName: 'Ramon',
    lastName: 'Iglesias',
    age: 24,
    position: 'CF',
    overallRating: 70,
    displayRating: 70,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId: 'kc',
    serviceTimeDays: 172,
    optionYearsUsed: 1,
    isOutOfOptions: false,
    minorLeagueLevel: null,
    ceiling: 78,
    floor: 61,
    developmentProgram: 'balanced',
    developmentTrajectory: 'on_track',
    contract: {
      years: 1,
      annualSalary: 3.2,
      totalValue: 3.2,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    extensionHistory: [],
    stats: null,
    advanced: null,
    historical: false,
    historicalSummary: null,
    activeStory: null,
    storyHistory: [],
  },
  personalityProfile: null,
  developmentReports: null,
  careerStats: null,
  moments: [],
  nicknames: null,
  storyArcs: [],
  milestoneAlerts: [],
  scoutConflict: null,
  scoutingReport: null,
  scoutingHistoryNote: '',
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  const result = usePlayerProfileView(options);
  onRender(result);
  return null;
}

describe('usePlayerProfileView', () => {
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
  });

  function makeOptions(overrides: Partial<HookOptions> = {}) {
    const worker = {
      getPlayerProfileView: vi.fn().mockResolvedValue(profileView),
    };

    return {
      options: {
        isInitialized: true,
        workerReady: true,
        playerId: 'player-1',
        day: 12,
        season: 3,
        worker,
        ...overrides,
      } as HookOptions,
      worker,
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
    return getLatest();
  }

  function getLatest() {
    expect(latest).toBeTruthy();
    return latest as HookResult;
  }

  it('waits without calling the worker until the profile can be loaded', async () => {
    const { options, worker } = makeOptions({ isInitialized: false });

    const result = await renderHook(options);

    expect(worker.getPlayerProfileView).not.toHaveBeenCalled();
    expect(result.loading).toBe(true);
    expect(result.view).toBeNull();
    expect(result.player).toBeNull();
  });

  it('loads and exposes the requested profile view', async () => {
    const { options, worker } = makeOptions();

    const result = await renderHook(options);

    expect(worker.getPlayerProfileView).toHaveBeenCalledWith('player-1');
    expect(result.loading).toBe(false);
    expect(result.view).toBe(profileView);
    expect(result.player).toBe(profileView.player);
  });

  it('refetches when the route day or season changes', async () => {
    const { options, worker } = makeOptions();
    await renderHook(options);

    await renderHook({
      ...options,
      day: 13,
    });
    await renderHook({
      ...options,
      day: 13,
      season: 4,
    });

    expect(worker.getPlayerProfileView).toHaveBeenCalledTimes(3);
  });
});

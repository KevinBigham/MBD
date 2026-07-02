import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useOffseasonRouteData, type OffseasonData } from './useOffseasonRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useOffseasonRouteData>[0];
type HookResult = ReturnType<typeof useOffseasonRouteData>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useOffseasonRouteData(options));
  return null;
}

function buildOffseasonState(overrides: Partial<OffseasonData> = {}): OffseasonData {
  const state: OffseasonData = {
    currentPhase: 'free_agency',
    phaseDay: 8,
    totalDay: 18,
    completed: false,
    phaseResults: {
      arbitrationResolved: [{ id: 'arb-1' }],
      tenderedPlayers: ['player-2'],
      nonTenderedPlayers: ['player-3'],
      extensions: [],
      qualifyingOffers: [],
      coachChanges: [],
      freeAgentSignings: [{ id: 'fa-1' }],
      draftPicks: [{ id: 'pick-1' }],
      ifaSignings: [{ id: 'ifa-1' }],
      retiredPlayers: [{ id: 'retire-1' }],
    },
    transactionGroups: [
      {
        phase: 'arbitration',
        label: 'Arbitration',
        rows: [
          {
            id: 'arb-1',
            tone: 'user',
            summary: 'Juan Soto signed for $12.4M/yr (1 year)',
          },
        ],
      },
      {
        phase: 'free_agency',
        label: 'Free Agency',
        rows: [
          {
            id: 'fa-1',
            tone: 'division_rival',
            summary: 'Corbin Burnes signed with Boston Noreasters for $28.5M/yr (5 years)',
          },
        ],
      },
    ],
    marketDaySummaries: [
      {
        id: 'market-fa-1',
        day: 18,
        category: 'signing',
        tone: 'user',
        headline: 'New York Tycoons commit $186.0M',
        detail: 'Juan Soto signed a 6-year deal at $31.0M/yr.',
        teamIds: ['nym'],
        playerIds: ['soto-1'],
        valueLabel: '$186.0M',
      },
    ],
    commandCenter: {
      checklist: [
        {
          id: 'free_agency',
          label: 'Free Agency',
          status: 'attention',
          detail: 'Market is open; fill the projected roster holes.',
        },
      ],
      warnings: [
        {
          id: 'budget-over-cap',
          severity: 'danger',
          title: 'Budget overage',
          detail: 'Projected payroll is above the owner budget.',
        },
      ],
      projectedOpeningDay: {
        activeRosterCount: 24,
        activeRosterLimit: 26,
        fortyManCount: 39,
        fortyManLimit: 40,
        payroll: 186,
        budget: 180,
        payrollSpace: -6,
        rosterHoleCount: 2,
      },
    },
  };
  return {
    ...state,
    ...overrides,
  };
}

describe('useOffseasonRouteData', () => {
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
      getExtensionCandidates: vi.fn().mockResolvedValue([
        {
          playerId: 'ext-1',
          playerName: 'Juan Cornerstone',
          willingness: 0.72,
          yearsRemaining: 1,
          currentSalary: 9.2,
        },
      ]),
      getOffseasonHeadline: vi.fn().mockResolvedValue({
        season: 4,
        headline: 'October left New York with a live title window',
      }),
      getOffseasonState: vi.fn().mockResolvedValue(buildOffseasonState()),
      getQualifyingOfferEligible: vi.fn().mockResolvedValue([
        {
          playerId: 'qo-1',
          playerName: 'Victor Veteran',
          projectedMarketValue: 24.8,
          qualifyingOfferSalary: 21.4,
          serviceYears: 6,
        },
      ]),
      getQualifyingOfferSalary: vi.fn().mockResolvedValue(21.4),
      getSeasonRecap: vi.fn().mockResolvedValue({
        season: 4,
        recap: 'A 94-68 run and a deep October push kept the contention window open.',
        storylines: ['Juan Soto anchored the lineup'],
      }),
      getSpringTrainingView: vi.fn().mockResolvedValue({
        rosterIssues: [],
        promotionCandidates: [],
        currentRosterSize: 26,
        rosterLimit: 26,
      }),
      isInitialized: true,
      phase: 'offseason',
      playEffect: vi.fn(),
      season: 4,
      userTeamId: 'nym',
      workerReady: true,
      ...overrides,
    };
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  async function waitForAssertion(assertion: () => void) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        assertion();
        return;
      } catch (error) {
        lastError = error;
      }
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      });
    }
    throw lastError;
  }

  it('loads the offseason page DTOs and opens new transaction groups', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.offseason?.currentPhase).toBe('free_agency');
      expect(latestResult?.extensionCandidates.map((candidate) => candidate.playerName)).toEqual(['Juan Cornerstone']);
      expect(latestResult?.qualifyingOfferEligible.map((player) => player.playerName)).toEqual(['Victor Veteran']);
      expect(latestResult?.qualifyingOfferSalary).toBe(21.4);
      expect(latestResult?.seasonRecap?.recap).toContain('94-68');
      expect(latestResult?.offseasonHeadline?.headline).toContain('live title window');
      expect(latestResult?.springTraining).toBeNull();
      expect(latestResult?.expandedPhases).toMatchObject({
        arbitration: true,
        free_agency: true,
      });
    });

    expect(options.getOffseasonState).toHaveBeenCalledTimes(1);
    expect(options.getExtensionCandidates).toHaveBeenCalledWith('nym');
    expect(options.getQualifyingOfferEligible).toHaveBeenCalledWith('nym');
    expect(options.getQualifyingOfferSalary).toHaveBeenCalledTimes(1);
    expect(options.getSeasonRecap).toHaveBeenCalledWith(4);
    expect(options.getOffseasonHeadline).toHaveBeenCalledWith(4);
    expect(options.getSpringTrainingView).not.toHaveBeenCalled();
  });

  it('loads spring training data only for the spring training phase', async () => {
    const springTraining = {
      rosterIssues: [
        { code: 'active_roster_over_limit', message: 'MLB roster has 28 players (limit 26).', severity: 'error' },
      ],
      promotionCandidates: [
        {
          playerId: 'prospect-1',
          playerName: 'Marco Callup',
          position: 'SS',
          overallRating: 340,
          currentLevel: 'AAA',
          score: 88,
          reason: 'Strong spring performance',
        },
      ],
      currentRosterSize: 28,
      rosterLimit: 26,
    };
    const options = baseOptions({
      getOffseasonState: vi.fn().mockResolvedValue(buildOffseasonState({ currentPhase: 'spring_training' })),
      getSpringTrainingView: vi.fn().mockResolvedValue(springTraining),
    });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.offseason?.currentPhase).toBe('spring_training');
      expect(latestResult?.springTraining).toEqual(springTraining);
    });

    expect(options.getSpringTrainingView).toHaveBeenCalledTimes(1);
  });

  it('does not call worker queries until the app and worker are ready', async () => {
    const options = baseOptions({ isInitialized: false, workerReady: false });
    await renderHook(options);

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestResult?.offseason).toBeNull();
    expect(latestResult?.extensionCandidates).toEqual([]);
    expect(latestResult?.qualifyingOfferEligible).toEqual([]);
    expect(latestResult?.qualifyingOfferSalary).toBeNull();
    expect(latestResult?.seasonRecap).toBeNull();
    expect(latestResult?.offseasonHeadline).toBeNull();
    expect(latestResult?.springTraining).toBeNull();
    expect(options.getOffseasonState).not.toHaveBeenCalled();
    expect(options.getExtensionCandidates).not.toHaveBeenCalled();
  });

  it('plays offseason result audio when loaded result counts increase', async () => {
    const playEffect = vi.fn();
    const options = baseOptions({ playEffect });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.offseason?.currentPhase).toBe('free_agency');
    });

    await act(async () => {
      latestResult?.applyOffseasonData(buildOffseasonState({
        phaseResults: {
          arbitrationResolved: [{ id: 'arb-1' }],
          tenderedPlayers: ['player-2'],
          nonTenderedPlayers: ['player-3'],
          extensions: [{ id: 'extension-1' }],
          qualifyingOffers: [],
          coachChanges: [],
          freeAgentSignings: [{ id: 'fa-1' }, { id: 'fa-2' }],
          draftPicks: [{ id: 'pick-1' }],
          ifaSignings: [{ id: 'ifa-1' }],
          retiredPlayers: [{ id: 'retire-1' }],
        },
      }));
    });

    expect(playEffect).toHaveBeenCalledWith('extension_signed');
    expect(playEffect).toHaveBeenCalledWith('free_agent_signed');
  });
});

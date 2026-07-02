import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useStaffRouteData } from './useStaffRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useStaffRouteData>[0];
type HookResult = ReturnType<typeof useStaffRouteData>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useStaffRouteData(options));
  return null;
}

const staff = [
  {
    id: 'coach-1',
    firstName: 'Ruben',
    lastName: 'Serrano',
    role: 'hitting_coach',
    specialty: 'contact',
    teachingAbility: 0.83,
    developmentBonus: 0.14,
    personalityFit: 0.75,
    annualSalary: 2.3,
  },
];

const market = [
  {
    id: 'coach-2',
    firstName: 'Nate',
    lastName: 'Braddock',
    role: 'pitching_coach',
    specialty: 'power',
    teachingAbility: 0.79,
    developmentBonus: 0.18,
    personalityFit: 0.71,
    annualSalary: 2.6,
  },
];

const impact = [
  {
    id: 'coach-1',
    role: 'hitting_coach',
    name: 'Ruben Serrano',
    specialty: 'contact',
    teachingAbility: 0.83,
    developmentBonus: 0.14,
    personalityFit: 0.75,
  },
];

const budget = {
  payroll: 11.2,
  budget: 13.4,
  remaining: 2.2,
};

const chemistry = {
  harmony: {
    overallScore: 72,
    synergies: [],
    weakestLink: null,
    strongestBond: null,
  },
  issues: [],
  playerAffinities: [
    {
      playerId: 'player-1',
      playerName: 'Milo Spark',
      position: 'CF',
      bestCoach: {
        coachId: 'coach-1',
        coachName: 'Ruben Serrano',
        affinityScore: 81,
        factors: ['Shared development language.'],
        developmentBonus: 0.06,
      },
    },
    {
      playerId: 'player-2',
      playerName: 'Elias Anchor',
      position: 'SS',
      bestCoach: {
        coachId: 'coach-2',
        coachName: 'Nate Braddock',
        affinityScore: 91,
        factors: ['Direct mechanical fit.'],
        developmentBonus: 0.08,
      },
    },
  ],
  coaches: [],
};

const mentorship = {
  mentorCount: 1,
  protegeeCount: 1,
  pairings: [
    {
      mentorId: 'mentor-1',
      protegeeId: 'protegee-1',
      mentorName: 'Elias Anchor',
      protegeeName: 'Milo Spark',
      quality: 88,
      developmentBonus: 0.13,
      compatibilityFactors: ['Same team context.'],
    },
  ],
};

describe('useStaffRouteData', () => {
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
      day: 1,
      getCoachMarket: vi.fn().mockResolvedValue(market),
      getCoachingChemistry: vi.fn().mockResolvedValue(chemistry),
      getCoachingImpact: vi.fn().mockResolvedValue(impact),
      getCoachingStaff: vi.fn().mockResolvedValue(staff),
      getMentorships: vi.fn().mockResolvedValue(mentorship),
      getStaffBudget: vi.fn().mockResolvedValue(budget),
      isInitialized: true,
      phase: 'offseason',
      season: 5,
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

  it('loads staff route data from the same worker queries', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.staff).toEqual(staff);
      expect(latestResult?.market).toEqual(market);
      expect(latestResult?.impact).toEqual(impact);
      expect(latestResult?.budget).toEqual(budget);
      expect(latestResult?.chemistry).toEqual(chemistry);
      expect(latestResult?.mentorship).toEqual(mentorship);
      expect(latestResult?.topAffinities.map((entry) => entry.playerName)).toEqual(['Elias Anchor', 'Milo Spark']);
    });

    expect(options.getCoachingStaff).toHaveBeenCalledWith('nym');
    expect(options.getCoachingImpact).toHaveBeenCalledWith('nym');
    expect(options.getStaffBudget).toHaveBeenCalledWith('nym');
    expect(options.getCoachMarket).toHaveBeenCalledTimes(1);
    expect(options.getCoachingChemistry).toHaveBeenCalledTimes(1);
    expect(options.getMentorships).toHaveBeenCalledTimes(1);
  });

  it('does not query worker data before initialization and readiness', async () => {
    const options = baseOptions({ isInitialized: false, workerReady: false });
    await renderHook(options);

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestResult?.staff).toEqual([]);
    expect(latestResult?.market).toEqual([]);
    expect(latestResult?.impact).toEqual([]);
    expect(latestResult?.budget).toBeNull();
    expect(latestResult?.chemistry).toBeNull();
    expect(latestResult?.mentorship).toBeNull();
    expect(options.getCoachingStaff).not.toHaveBeenCalled();
    expect(options.getCoachMarket).not.toHaveBeenCalled();
  });

  it('exposes a refresh callback for staff mutations', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.staff).toEqual(staff);
    });

    await act(async () => {
      await latestResult?.fetchStaffData();
    });

    expect(options.getCoachingStaff).toHaveBeenCalledTimes(2);
    expect(options.getCoachMarket).toHaveBeenCalledTimes(2);
    expect(options.getMentorships).toHaveBeenCalledTimes(2);
  });
});

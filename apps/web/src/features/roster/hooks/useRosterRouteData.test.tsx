import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { DayOneOpeningPlan, TeamChemistry } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { ExtensionCandidateView } from '../components/ExtensionCommandCenter';
import type { AffiliateOverviewView, PromotionCandidateView } from '../components/RosterMinorLeaguesPanel';
import type { RosterComplianceView } from '../components/RosterCompliancePanel';
import { useRosterRouteData } from './useRosterRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useRosterRouteData>[0];
type HookResult = ReturnType<typeof useRosterRouteData>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useRosterRouteData(options));
  return null;
}

function player(overrides: Partial<PlayerDTO> = {}): PlayerDTO {
  return {
    id: 'player-1',
    firstName: 'Aaron',
    lastName: 'Everyday',
    age: 28,
    position: 'CF',
    overallRating: 70,
    displayRating: 60,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId: 'nym',
    serviceTimeDays: 401,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: null,
    contract: {
      years: 2,
      annualSalary: 8,
      totalValue: 16,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    ceiling: 78,
    floor: 48,
    developmentProgram: null,
    developmentTrajectory: 'stable',
    personalityTraits: [],
    extensionHistory: [],
    stats: null,
    advanced: {
      war: 4.3,
      avg: null,
      obp: null,
      slg: null,
      ops: null,
      iso: null,
      woba: null,
      wrcPlus: null,
      opsPlus: null,
      fip: null,
      xfip: null,
      whip: null,
      kPer9: null,
      bbPer9: null,
      kBb: null,
    },
    ...overrides,
  };
}

const mlbRoster = [
  player(),
  player({ id: 'pitcher-1', firstName: 'Mina', lastName: 'Starter', position: 'SP', displayRating: 64 }),
];

const minors = {
  AAA: [player({
    id: 'aaa-1',
    firstName: 'Luis',
    lastName: 'Ascending',
    position: 'SS',
    rosterStatus: 'AAA',
    minorLeagueLevel: 'AAA',
  })],
  AA: [],
  A_PLUS: [],
  A: [],
  ROOKIE: [],
  INTERNATIONAL: [],
};

const chemistry: TeamChemistry = {
  teamId: 'nym',
  score: 68,
  tier: 'steady',
  trend: 'rising',
  summary: 'The room is stable.',
  reasons: ['Veteran core holding the room together.'],
};

const promotionCandidates: PromotionCandidateView[] = [{
  playerId: 'prospect-1',
  playerName: 'Luis Ascending',
  position: 'SS',
  currentLevel: 'AA',
  targetLevel: 'AAA',
  score: 61,
  reason: 'AA production and overall rating merit a look at AAA.',
}];

const compliance: RosterComplianceView = {
  activeRosterCount: 28,
  activeRosterLimit: 26,
  fortyManCount: 42,
  issues: [{
    code: 'forty_man_over_limit',
    severity: 'error',
    message: '40-man roster has 42 players (limit 40).',
  }],
  dfaRecommendations: [{
    playerId: 'dfa-1',
    playerName: 'Logan Depth',
    position: '1B',
    age: 29,
    salary: 2.2,
    score: 83,
    reason: 'Low-value 40-man bat relative to age and salary.',
  }],
};

const affiliateOverview: AffiliateOverviewView = {
  affiliates: [{
    teamId: 'nym',
    level: 'AAA',
    label: 'AAA',
    wins: 52,
    losses: 38,
    gamesPlayed: 90,
    runDifferential: 41,
    topPerformer: null,
  }],
  recentBoxScores: [{
    id: 'box-1',
    teamId: 'nym',
    day: 97,
    level: 'AAA',
    label: 'AAA',
    result: 'W',
    scoreline: '6-2 vs WOR',
    summary: 'Scranton beat Worcester 6-2.',
  }],
  waiverClaims: [{
    playerId: 'waive-1',
    playerName: 'Ben Fringe',
    fromTeamName: 'Boston Noreasters',
    toTeamName: null,
    status: 'pending',
    salary: 1.2,
    priorityIndex: 1,
  }],
};

const extensionCandidates: ExtensionCandidateView[] = [{
  playerId: 'ext-1',
  playerName: 'Diego Future',
  position: 'SS',
  yearsRemaining: 1,
  currentSalary: 6.8,
  willingness: 0.78,
  demandMultiplier: 1.12,
}];

const rosterPlan: DayOneOpeningPlan = {
  lineupPlayerIds: ['player-1'],
  rotationPlayerIds: ['pitcher-1'],
  bullpen: null,
};

describe('useRosterRouteData', () => {
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
      day: 97,
      getAffiliateOverview: vi.fn().mockResolvedValue(affiliateOverview),
      getExtensionCandidates: vi.fn().mockResolvedValue(extensionCandidates),
      getFullRoster: vi.fn().mockResolvedValue({ mlb: mlbRoster, minors }),
      getPromotionCandidates: vi.fn().mockResolvedValue(promotionCandidates),
      getRosterComplianceIssues: vi.fn().mockResolvedValue(compliance),
      getRosterPlan: vi.fn().mockResolvedValue(rosterPlan),
      getTeamChemistry: vi.fn().mockResolvedValue(chemistry),
      isInitialized: true,
      phase: 'regular',
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

  it('loads roster route data from the same worker queries', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.mlbRoster).toEqual(mlbRoster);
      expect(latestResult?.minors).toEqual(minors);
      expect(latestResult?.chemistry).toEqual(chemistry);
      expect(latestResult?.promotionCandidates).toEqual(promotionCandidates);
      expect(latestResult?.compliance).toEqual(compliance);
      expect(latestResult?.affiliateOverview).toEqual(affiliateOverview);
      expect(latestResult?.extensionCandidates).toEqual(extensionCandidates);
      expect(latestResult?.rosterPlan).toEqual(rosterPlan);
    });

    expect(options.getFullRoster).toHaveBeenCalledWith('nym');
    expect(options.getTeamChemistry).toHaveBeenCalledWith('nym');
    expect(options.getPromotionCandidates).toHaveBeenCalledWith('nym');
    expect(options.getRosterComplianceIssues).toHaveBeenCalledWith('nym');
    expect(options.getAffiliateOverview).toHaveBeenCalledWith('nym');
    expect(options.getExtensionCandidates).toHaveBeenCalledWith('nym');
    expect(options.getRosterPlan).toHaveBeenCalledTimes(1);
  });

  it('does not query worker data before initialization and readiness', async () => {
    const options = baseOptions({ isInitialized: false, workerReady: false });
    await renderHook(options);

    await act(async () => {
      await Promise.resolve();
    });

    expect(latestResult?.mlbRoster).toEqual([]);
    expect(latestResult?.minors).toEqual({});
    expect(latestResult?.chemistry).toBeNull();
    expect(latestResult?.promotionCandidates).toEqual([]);
    expect(latestResult?.compliance).toBeNull();
    expect(latestResult?.affiliateOverview).toBeNull();
    expect(latestResult?.extensionCandidates).toEqual([]);
    expect(latestResult?.rosterPlan).toBeNull();
    expect(options.getFullRoster).not.toHaveBeenCalled();
    expect(options.getTeamChemistry).not.toHaveBeenCalled();
  });

  it('exposes refresh and roster-plan setter for route-owned mutations', async () => {
    const options = baseOptions({ getRosterPlan: undefined });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.mlbRoster).toEqual(mlbRoster);
      expect(latestResult?.rosterPlan).toBeNull();
    });

    await act(async () => {
      latestResult?.setRosterPlan(rosterPlan);
    });

    expect(latestResult?.rosterPlan).toEqual(rosterPlan);

    await act(async () => {
      await latestResult?.fetchRoster();
    });

    expect(options.getFullRoster).toHaveBeenCalledTimes(2);
  });
});

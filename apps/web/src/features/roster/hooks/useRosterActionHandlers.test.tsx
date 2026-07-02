import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { AffiliateOverviewView, PromotionCandidateView } from '../components/RosterMinorLeaguesPanel';
import type { DFACandidateView } from '../components/RosterCompliancePanel';
import { useRosterActionHandlers } from './useRosterActionHandlers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useRosterActionHandlers>[0];
type HookResult = ReturnType<typeof useRosterActionHandlers>;

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

const promotionCandidate: PromotionCandidateView = {
  playerId: 'prospect-1',
  playerName: 'Luis Ascending',
  position: 'SS',
  currentLevel: 'AA',
  targetLevel: 'AAA',
  score: 61,
  reason: 'AA production and overall rating merit a look at AAA.',
};

const dfaCandidate: DFACandidateView = {
  playerId: 'dfa-1',
  playerName: 'Logan Depth',
  position: '1B',
  age: 29,
  salary: 2.2,
  score: 83,
  reason: 'Low-value 40-man bat relative to age and salary.',
};

const waiverClaim: AffiliateOverviewView['waiverClaims'][number] = {
  playerId: 'waive-1',
  playerName: 'Ben Fringe',
  fromTeamName: 'Boston Noreasters',
  toTeamName: null,
  status: 'pending',
  salary: 1.2,
  priorityIndex: 1,
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useRosterActionHandlers(options));
  return null;
}

describe('useRosterActionHandlers', () => {
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
      autosaveActiveGame: vi.fn().mockResolvedValue(undefined),
      claimOffWaivers: vi.fn().mockResolvedValue({ success: true }),
      demotePlayer: vi.fn().mockResolvedValue({ success: true }),
      designateForAssignment: vi.fn().mockResolvedValue({ success: true }),
      fetchRoster: vi.fn().mockResolvedValue(undefined),
      promotePlayer: vi.fn().mockResolvedValue({ success: true }),
      season: 5,
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

  it('opens a demotion confirmation and executes the worker mutation with refresh and autosave', async () => {
    const options = baseOptions();
    await renderHook(options);

    act(() => {
      latestResult?.openDemoteAction(player({
        id: 'demote-1',
        firstName: 'Mina',
        lastName: 'Starter',
        position: 'SP',
        letterGrade: 'A',
        optionYearsUsed: 2,
      }));
    });

    expect(latestResult?.pendingRosterAction).toEqual(expect.objectContaining({
      kind: 'demote',
      playerId: 'demote-1',
      playerName: 'Mina Starter',
      actionId: 'demote-demote-1',
      confirmLabel: 'Confirm Demotion',
    }));

    await act(async () => {
      await latestResult?.confirmRosterAction();
    });

    expect(options.demotePlayer).toHaveBeenCalledWith('demote-1');
    expect(options.fetchRoster).toHaveBeenCalledTimes(1);
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 5 });
    expect(latestResult?.pendingRosterAction).toBeNull();
    expect(latestResult?.busyAction).toBeNull();
    expect(latestResult?.actionMessage).toBeNull();
  });

  it('surfaces rejected roster moves without refreshing or autosaving', async () => {
    const options = baseOptions({
      designateForAssignment: vi.fn().mockResolvedValue({ success: false, error: '40-man roster would be illegal.' }),
    });
    await renderHook(options);

    act(() => {
      latestResult?.openDfaAction(dfaCandidate);
    });

    expect(latestResult?.pendingRosterAction).toEqual(expect.objectContaining({
      kind: 'dfa',
      actionId: 'dfa-dfa-1',
      detail: '1B | Age 29 | $2.2M',
    }));

    await act(async () => {
      await latestResult?.confirmRosterAction();
    });

    expect(options.designateForAssignment).toHaveBeenCalledWith('dfa-1');
    expect(options.fetchRoster).not.toHaveBeenCalled();
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();
    expect(latestResult?.actionMessage).toBe('40-man roster would be illegal.');
    expect(latestResult?.pendingRosterAction).toBeNull();
    expect(latestResult?.busyAction).toBeNull();
  });

  it('handles promotion candidates and waiver claims through the same action pipeline', async () => {
    const options = baseOptions();
    await renderHook(options);

    act(() => {
      latestResult?.openPromotionCandidateAction(promotionCandidate);
    });

    expect(latestResult?.pendingRosterAction).toEqual(expect.objectContaining({
      kind: 'promote',
      actionId: 'promote-prospect-1',
      detail: 'AA to AAA | Score 61',
    }));

    await act(async () => {
      await latestResult?.confirmRosterAction();
    });

    expect(options.promotePlayer).toHaveBeenCalledWith('prospect-1');
    expect(options.fetchRoster).toHaveBeenCalledTimes(1);
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 5 });

    await act(async () => {
      await latestResult?.claimWaiver(waiverClaim);
    });

    expect(options.claimOffWaivers).toHaveBeenCalledWith('waive-1');
    expect(options.fetchRoster).toHaveBeenCalledTimes(2);
    expect(options.autosaveActiveGame).toHaveBeenCalledTimes(2);
  });
});

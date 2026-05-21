import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import RosterPage from './RosterPage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('../components/LineupBuilder', () => ({
  default: ({
    players,
    onReorder,
  }: {
    players: Array<{ id: string; firstName: string; lastName: string }>;
    onReorder?: (orderedIds: string[]) => void;
  }) => (
    <div>
      {players.map((player) => (
        <span key={player.id}>{player.firstName} {player.lastName}</span>
      ))}
      {players.length > 1 ? (
        <button
          type="button"
          aria-label={`Move ${players[0]!.firstName} ${players[0]!.lastName} down`}
          onClick={() => onReorder?.(players.map((player) => player.id).reverse())}
        >
          Move {players[0]!.firstName} {players[0]!.lastName} down
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock('../components/DepthChartDnD', () => ({
  default: () => <div>Depth chart mock</div>,
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RosterPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 5,
      day: 97,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 96,
      isSimulating: false,
      setSeason: vi.fn(),
      setDay: vi.fn(),
      setPhase: vi.fn(),
      setSimulating: vi.fn(),
      setInitialized: vi.fn(),
      setUserTeamId: vi.fn(),
      updateFromSim: vi.fn(),
      initializeGame: vi.fn(),
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('shows promotion, compliance, and waiver controls for roster management', async () => {
    const promotePlayer = vi.fn().mockResolvedValue({ success: true });
    const designateForAssignment = vi.fn().mockResolvedValue({ success: true });
    const claimOffWaivers = vi.fn().mockResolvedValue({ success: true });

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getFullRoster: vi.fn().mockResolvedValue({
        mlb: [{
          id: 'mlb-1',
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
          stats: null,
          advanced: {
            war: 4.3,
            fip: null,
            xfip: null,
          },
        }],
        minors: {
          AAA: [],
          AA: [],
          A_PLUS: [],
          A: [],
          ROOKIE: [],
          INTERNATIONAL: [],
        },
      }),
      getTeamChemistry: vi.fn().mockResolvedValue({
        score: 68,
        tier: 'steady',
        trend: 'up',
        summary: 'The room is stable.',
        reasons: ['Veteran core holding the room together.'],
      }),
      getPromotionCandidates: vi.fn().mockResolvedValue([{
        playerId: 'prospect-1',
        playerName: 'Luis Ascending',
        position: 'SS',
        currentLevel: 'AA',
        targetLevel: 'AAA',
        score: 61,
        reason: 'AA production and overall rating merit a look at AAA.',
      }]),
      getRosterComplianceIssues: vi.fn().mockResolvedValue({
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
      }),
      getAffiliateOverview: vi.fn().mockResolvedValue({
        affiliates: [{
          level: 'AAA',
          wins: 52,
          losses: 38,
          gamesPlayed: 90,
          runDifferential: 41,
          topPerformer: null,
        }],
        recentBoxScores: [{
          id: 'box-1',
          day: 97,
          level: 'AAA',
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
      }),
      getExtensionCandidates: vi.fn().mockResolvedValue([]),
      getExtensionOffer: vi.fn().mockResolvedValue(null),
      negotiateExtension: vi.fn().mockResolvedValue(null),
      promotePlayer,
      designateForAssignment,
      claimOffWaivers,
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RosterPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('40-man roster has 42 players');
    expect(container.textContent).toContain('Logan Depth');
    expect(container.textContent).toContain('WAR');
    expect(container.textContent).toContain('4.3');

    let buttons = Array.from(container.querySelectorAll('button'));
    const dfaButton = buttons.find((button) => button.textContent?.includes('DFA Logan Depth'));

    await act(async () => {
      dfaButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Confirm Roster Move');
    expect(container.textContent).toContain('waiver-claim risk');

    let confirmButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Confirm DFA'),
    );

    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    buttons = Array.from(container.querySelectorAll('button'));
    const minorsTab = buttons.find((button) => button.textContent?.includes('Minor Leagues'));

    await act(async () => {
      minorsTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Promotion recommendations');
    expect(container.textContent).toContain('Luis Ascending');
    expect(container.textContent).toContain('Scranton beat Worcester 6-2.');
    expect(container.textContent).toContain('Ben Fringe');

    buttons = Array.from(container.querySelectorAll('button'));
    const promoteButton = buttons.find((button) => button.textContent?.includes('Promote'));
    const claimButton = buttons.find((button) => button.textContent?.includes('Claim Ben Fringe'));

    await act(async () => {
      promoteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Confirm Promotion');

    confirmButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Confirm Promotion'),
    );

    await act(async () => {
      confirmButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      claimButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(promotePlayer).toHaveBeenCalledWith('prospect-1');
    expect(designateForAssignment).toHaveBeenCalledWith('dfa-1');
    expect(claimOffWaivers).toHaveBeenCalledWith('waive-1');
  });

  it('opens the contracts tab and starts an extension negotiation flow', async () => {
    const getExtensionOffer = vi.fn().mockResolvedValue({
      years: 5,
      annualSalary: 18.4,
      totalValue: 92,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 2.5,
      buyoutAmount: 0,
      deferredMoney: [],
    });
    const negotiateExtension = vi.fn().mockResolvedValue({
      status: 'countered',
      counterOffer: {
        years: 5,
        annualSalary: 19.2,
        totalValue: 96,
        noTradeClause: false,
        noTradeClauseType: 'none',
        playerOption: false,
        teamOption: false,
        optOutYears: [],
        signingBonus: 2.5,
        buyoutAmount: 0,
        deferredMoney: [],
      },
      rounds: [{ round: 1, status: 'countered' }],
    });

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getFullRoster: vi.fn().mockResolvedValue({
        mlb: [],
        minors: { AAA: [], AA: [], A_PLUS: [], A: [], ROOKIE: [], INTERNATIONAL: [] },
      }),
      getTeamChemistry: vi.fn().mockResolvedValue(null),
      getPromotionCandidates: vi.fn().mockResolvedValue([]),
      getRosterComplianceIssues: vi.fn().mockResolvedValue(null),
      getAffiliateOverview: vi.fn().mockResolvedValue(null),
      getExtensionCandidates: vi.fn().mockResolvedValue([
        {
          playerId: 'ext-1',
          playerName: 'Diego Future',
          position: 'SS',
          yearsRemaining: 1,
          currentSalary: 6.8,
          willingness: 0.78,
          demandMultiplier: 1.12,
        },
      ]),
      getExtensionOffer,
      negotiateExtension,
      promotePlayer: vi.fn(),
      designateForAssignment: vi.fn(),
      claimOffWaivers: vi.fn(),
      demotePlayer: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RosterPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const contractsTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Contracts'),
    );

    await act(async () => {
      contractsTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Diego Future');
    expect(container.textContent).toContain('Willingness');

    const negotiateButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Negotiate'),
    );

    await act(async () => {
      negotiateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getExtensionOffer).toHaveBeenCalledWith('ext-1', 5);
    expect(container.textContent).toContain('Extension Negotiation');

    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Submit Offer'),
    );

    await act(async () => {
      submitButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(negotiateExtension).toHaveBeenCalled();
    expect(container.textContent).toContain('countered');
  });

  it('persists lineup planning through the roster plan worker action', async () => {
    const updateRosterPlan = vi.fn().mockResolvedValue({
      success: true,
      plan: {
        lineupPlayerIds: ['bat-2', 'bat-1'],
        rotationPlayerIds: [],
        bullpen: null,
      },
    });

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getFullRoster: vi.fn().mockResolvedValue({
        mlb: [
          {
            id: 'bat-1',
            firstName: 'First',
            lastName: 'Bat',
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
            stats: null,
            advanced: null,
          },
          {
            id: 'bat-2',
            firstName: 'Second',
            lastName: 'Bat',
            age: 29,
            position: 'SS',
            overallRating: 68,
            displayRating: 58,
            letterGrade: 'B',
            rosterStatus: 'MLB',
            teamId: 'nym',
            serviceTimeDays: 402,
            optionYearsUsed: 0,
            isOutOfOptions: false,
            minorLeagueLevel: null,
            stats: null,
            advanced: null,
          },
        ],
        minors: { AAA: [], AA: [], A_PLUS: [], A: [], ROOKIE: [], INTERNATIONAL: [] },
      }),
      getTeamChemistry: vi.fn().mockResolvedValue(null),
      getPromotionCandidates: vi.fn().mockResolvedValue([]),
      getRosterComplianceIssues: vi.fn().mockResolvedValue(null),
      getAffiliateOverview: vi.fn().mockResolvedValue(null),
      getExtensionCandidates: vi.fn().mockResolvedValue([]),
      getRosterPlan: vi.fn().mockResolvedValue({
        lineupPlayerIds: ['bat-1', 'bat-2'],
        rotationPlayerIds: [],
        bullpen: null,
      }),
      updateRosterPlan,
      getExtensionOffer: vi.fn().mockResolvedValue(null),
      negotiateExtension: vi.fn().mockResolvedValue(null),
      promotePlayer: vi.fn(),
      designateForAssignment: vi.fn(),
      claimOffWaivers: vi.fn(),
      demotePlayer: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RosterPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
      await vi.dynamicImportSettled();
    });

    const lineupTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Lineup Builder'),
    );

    await act(async () => {
      lineupTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await vi.dynamicImportSettled();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain('First Bat');
    const moveDown = container.querySelector('[aria-label="Move First Bat down"]') as HTMLButtonElement | null;
    expect(moveDown).not.toBeNull();
    await act(async () => {
      moveDown?.click();
      await Promise.resolve();
    });

    expect(updateRosterPlan).toHaveBeenCalledWith({ lineupPlayerIds: ['bat-2', 'bat-1'] });
  });
});

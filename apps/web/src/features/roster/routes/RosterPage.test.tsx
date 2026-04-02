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
      userTeamId: 'nyy',
      teamName: 'Yankees',
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
          teamId: 'nyy',
          serviceTimeDays: 401,
          optionYearsUsed: 0,
          isOutOfOptions: false,
          minorLeagueLevel: null,
          stats: null,
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
          fromTeamName: 'Boston Red Sox',
          toTeamName: null,
          status: 'pending',
          salary: 1.2,
          priorityIndex: 1,
        }],
      }),
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

    let buttons = Array.from(container.querySelectorAll('button'));
    const dfaButton = buttons.find((button) => button.textContent?.includes('DFA Logan Depth'));

    await act(async () => {
      dfaButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
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
      claimButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(promotePlayer).toHaveBeenCalledWith('prospect-1');
    expect(designateForAssignment).toHaveBeenCalledWith('dfa-1');
    expect(claimOffWaivers).toHaveBeenCalledWith('waive-1');
  });
});

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import DraftPage from './DraftPage';
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

describe('DraftPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 1,
      phase: 'offseason',
      isInitialized: true,
      userTeamId: 'nyy',
      teamName: 'Yankees',
      playerCount: 780,
      gamesPlayed: 162,
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
    vi.useRealTimers();
    container.remove();
    vi.clearAllMocks();
  });

  it('shows available, in-progress, and complete draft states with watch mode reveals', async () => {
    const availableView = {
      status: 'available',
      availableProspects: [],
      udfaProspects: [],
      completedPicks: [],
      currentPick: null,
      board: { teams: [], rounds: [] },
      counts: { totalRounds: 20, totalPicks: 0, picksMade: 0, picksRemaining: 0 },
      userDraftClass: null,
      userBigBoard: [],
    };

    const inProgressView = {
      status: 'in_progress',
      availableProspects: [
        {
          id: 'prospect-1',
          playerId: 'prospect-1',
          name: 'Eli Prospect',
          firstName: 'Eli',
          lastName: 'Prospect',
          position: 'SS',
          scoutingGrade: 61,
          consensusGrade: 58,
          looks: 2,
          slotValue: 2.4,
          askBonus: 2.8,
          background: 'high_school',
          bigBoardRank: 1,
          age: 18,
          origin: 'HS',
        },
      ],
      udfaProspects: [],
      completedPicks: [
        {
          slotId: 'standard:1:1:bos',
          round: 1,
          pickNumber: 1,
          teamId: 'bos',
          teamName: 'Boston Red Sox',
          teamAbbreviation: 'BOS',
          playerId: 'bos-1',
          playerName: 'Marcus Early',
          position: 'SP',
          scoutingGrade: 58,
          origin: 'College',
          tone: 'division_rival',
        },
      ],
      currentPick: {
        slotId: 'standard:1:2:nyy',
        round: 1,
        pickNumber: 2,
        pickInRound: 2,
        totalPicks: 3,
        teamId: 'nyy',
        teamName: 'New York Yankees',
        teamAbbreviation: 'NYY',
        userOnClock: true,
      },
      board: {
        teams: [
          { teamId: 'bos', teamName: 'Boston Red Sox', abbreviation: 'BOS', tone: 'division_rival' },
          { teamId: 'nyy', teamName: 'New York Yankees', abbreviation: 'NYY', tone: 'user' },
        ],
        rounds: [
          {
            round: 1,
            cells: [
              {
                slotId: 'standard:1:1:bos',
                round: 1,
                pickInRound: 1,
                teamId: 'bos',
                teamAbbreviation: 'BOS',
                tone: 'division_rival',
                pick: {
                  slotId: 'standard:1:1:bos',
                  round: 1,
                  pickNumber: 1,
                  teamId: 'bos',
                  teamName: 'Boston Red Sox',
                  teamAbbreviation: 'BOS',
                  playerId: 'bos-1',
                  playerName: 'Marcus Early',
                  position: 'SP',
                  scoutingGrade: 58,
                  origin: 'College',
                  tone: 'division_rival',
                },
              },
              {
                slotId: 'standard:1:2:nyy',
                round: 1,
                pickInRound: 2,
                teamId: 'nyy',
                teamAbbreviation: 'NYY',
                tone: 'user',
                pick: null,
              },
            ],
          },
        ],
      },
      counts: { totalRounds: 20, totalPicks: 3, picksMade: 1, picksRemaining: 1 },
      userDraftClass: {
        picks: [
          {
            playerId: 'user-1',
            playerName: 'Eli Prospect',
            position: 'SS',
            scoutingGrade: 61,
            origin: 'HS',
            slotValue: 2.4,
            askBonus: 2.8,
            signed: null,
            agreedBonus: null,
            assessment: 'Strong value with a realistic path to contributing.',
          },
        ],
        overallGrade: 'B',
        averageScoutingGrade: 61,
      },
      userBigBoard: ['prospect-1'],
    };

    const completeView = {
      ...inProgressView,
      status: 'complete',
      currentPick: null,
      availableProspects: [],
      completedPicks: [
        ...inProgressView.completedPicks,
        {
          slotId: 'standard:1:2:nyy',
          round: 1,
          pickNumber: 2,
          teamId: 'nyy',
          teamName: 'New York Yankees',
          teamAbbreviation: 'NYY',
          playerId: 'user-1',
          playerName: 'Eli Prospect',
          position: 'SS',
          scoutingGrade: 61,
          origin: 'HS',
          tone: 'user',
        },
        {
          slotId: 'standard:1:3:tb',
          round: 1,
          pickNumber: 3,
          teamId: 'tb',
          teamName: 'Tampa Bay Rays',
          teamAbbreviation: 'TBR',
          playerId: 'tb-1',
          playerName: 'Noah Closer',
          position: 'RP',
          scoutingGrade: 52,
          origin: 'College',
          tone: 'division_rival',
        },
      ],
      board: {
        teams: [
          ...inProgressView.board.teams,
          { teamId: 'tb', teamName: 'Tampa Bay Rays', abbreviation: 'TBR', tone: 'division_rival' },
        ],
        rounds: [
          {
            round: 1,
            cells: [
              inProgressView.board.rounds[0]!.cells[0]!,
              {
                slotId: 'standard:1:2:nyy',
                round: 1,
                pickInRound: 2,
                teamId: 'nyy',
                teamAbbreviation: 'NYY',
                tone: 'user',
                pick: {
                  slotId: 'standard:1:2:nyy',
                  round: 1,
                  pickNumber: 2,
                  teamId: 'nyy',
                  teamName: 'New York Yankees',
                  teamAbbreviation: 'NYY',
                  playerId: 'user-1',
                  playerName: 'Eli Prospect',
                  position: 'SS',
                  scoutingGrade: 61,
                  origin: 'HS',
                  tone: 'user',
                },
              },
              {
                slotId: 'standard:1:3:tb',
                round: 1,
                pickInRound: 3,
                teamId: 'tb',
                teamAbbreviation: 'TBR',
                tone: 'division_rival',
                pick: {
                  slotId: 'standard:1:3:tb',
                  round: 1,
                  pickNumber: 3,
                  teamId: 'tb',
                  teamName: 'Tampa Bay Rays',
                  teamAbbreviation: 'TBR',
                  playerId: 'tb-1',
                  playerName: 'Noah Closer',
                  position: 'RP',
                  scoutingGrade: 52,
                  origin: 'College',
                  tone: 'division_rival',
                },
              },
            ],
          },
        ],
      },
      counts: { totalRounds: 20, totalPicks: 3, picksMade: 3, picksRemaining: 0 },
    };

    const getDraftClass = vi.fn().mockResolvedValue(availableView);
    const startDraft = vi.fn().mockResolvedValue({
      success: true,
      draft: inProgressView,
      newPicks: inProgressView.completedPicks,
    });
    const makeDraftPick = vi.fn().mockResolvedValue({
      success: true,
      draft: inProgressView,
      newPicks: [],
    });
    const scoutDraftPlayer = vi.fn().mockResolvedValue({
      success: true,
      draft: inProgressView,
      newPicks: [],
    });
    const toggleDraftBigBoard = vi.fn().mockResolvedValue({
      success: true,
      draft: inProgressView,
      newPicks: [],
    });
    const signDraftPick = vi.fn().mockResolvedValue({
      success: true,
      draft: completeView,
      newPicks: [],
    });
    const simulateRemainingDraft = vi.fn().mockResolvedValue({
      success: true,
      draft: completeView,
      newPicks: completeView.completedPicks.slice(1),
    });

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getDraftClass,
      startDraft,
      makeDraftPick,
      scoutDraftPlayer,
      toggleDraftBigBoard,
      signDraftPick,
      simulateRemainingDraft,
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <DraftPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Draft Available');

    const startButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Start Draft'),
    );
    expect(startButton).toBeTruthy();

    await act(async () => {
      startButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Draft In Progress');
    expect(container.textContent).toContain('Marcus Early');

    const watchButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Watch Draft'),
    );
    expect(watchButton).toBeTruthy();

    await act(async () => {
      watchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain('Noah Closer');

    await act(async () => {
      vi.advanceTimersByTime(130);
    });
    expect(container.textContent).toContain('Eli Prospect');

    await act(async () => {
      vi.advanceTimersByTime(130);
    });

    expect(container.textContent).toContain('Noah Closer');
    expect(container.textContent).toContain('Draft Complete');
    expect(container.textContent).toContain('Your Draft Class');
    expect(container.textContent).toContain('Overall Grade B');
  });
});

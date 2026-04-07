import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import DraftPage from './DraftPage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import type { DraftRoomView } from '@/workers/sim.worker.helpers';

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
      userTeamId: 'nym',
      teamName: 'Tycoons',
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
    const availableView: DraftRoomView = {
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

    const inProgressView: DraftRoomView = {
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
          scoutConflict: null,
        },
      ],
      udfaProspects: [],
      completedPicks: [
        {
          slotId: 'standard:1:1:bos',
          round: 1,
          pickNumber: 1,
          teamId: 'bos',
          teamName: 'Boston Noreasters',
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
        teamId: 'nym',
        teamName: 'New York Tycoons',
        teamAbbreviation: 'NYT',
        userOnClock: true,
      },
      board: {
        teams: [
          { teamId: 'bos', teamName: 'Boston Noreasters', abbreviation: 'BOS', tone: 'division_rival' },
          { teamId: 'nym', teamName: 'New York Tycoons', abbreviation: 'NYT', tone: 'user' },
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
                  teamName: 'Boston Noreasters',
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
                teamId: 'nym',
                teamAbbreviation: 'NYT',
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

    const completeView: DraftRoomView = {
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
          teamId: 'nym',
          teamName: 'New York Tycoons',
          teamAbbreviation: 'NYT',
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
          teamId: 'orl',
          teamName: 'Orlando Thunder',
          teamAbbreviation: 'ORL',
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
          { teamId: 'orl', teamName: 'Orlando Thunder', abbreviation: 'ORL', tone: 'division_rival' },
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
                teamId: 'nym',
                teamAbbreviation: 'NYT',
                tone: 'user',
                pick: {
                  slotId: 'standard:1:2:nyy',
                  round: 1,
                  pickNumber: 2,
                  teamId: 'nym',
                  teamName: 'New York Tycoons',
                  teamAbbreviation: 'NYT',
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
                teamId: 'orl',
                teamAbbreviation: 'ORL',
                tone: 'division_rival',
                pick: {
                  slotId: 'standard:1:3:tb',
                  round: 1,
                  pickNumber: 3,
                  teamId: 'orl',
                  teamName: 'Orlando Thunder',
                  teamAbbreviation: 'ORL',
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

    const commentaryView = {
      heartbeat: 'NYY are live at pick 2 with 1 prospects still on the board.',
      entries: [
        {
          id: 'pick-1',
          pickNumber: 1,
          tag: 'analyst',
          headline: 'BOS stay on slot with Marcus Early',
          detail: 'Boston keeps the room moving with a clean pitching fit.',
          tone: 'division_rival',
          playerId: 'bos-1',
        },
        {
          id: 'clock-2',
          pickNumber: null,
          tag: 'scouting-director',
          headline: 'NYY are on the clock at 2nd',
          detail: 'Best names left for New York Tycoons: Eli Prospect.',
          tone: 'user',
          playerId: null,
        },
      ],
      buzz: [
        {
          id: 'slide-prospect-1',
          label: 'Value Slide',
          summary: 'Eli Prospect is still live with a 61 grade and the room has noticed.',
          trend: 'up',
          urgency: 'target',
          playerId: 'prospect-1',
          teamId: null,
        },
      ],
    };
    const reactionView = {
      playerId: 'prospect-1',
      headline: 'Eli Prospect looks like a board win if the card is ready',
      summary: 'Eli Prospect fits the zone where talent and cost can still balance out.',
      fit: 'New York Tycoons would be targeting an infielder who can stay in the middle of the diamond.',
      risk: 'The risk lives in the runway: high school profile, more development turns, more variance.',
      signability: 'The signability should play cleanly: $2.80M sits at or below the $2.40M slot.',
      recommendation: 'hover',
    };
    const gradesView = {
      userTeamId: 'nym',
      userTeamGrade: {
        teamId: 'nym',
        teamName: 'New York Tycoons',
        pickCount: 1,
        averageScoutingGrade: 61,
        grade: 'B',
        bestPickPlayerId: 'user-1',
        bestPickPlayerName: 'Eli Prospect',
        summary: 'New York Tycoons landed a steady class anchored by Eli Prospect.',
      },
      grades: [
        {
          teamId: 'nym',
          teamName: 'New York Tycoons',
          pickCount: 1,
          averageScoutingGrade: 61,
          grade: 'B',
          bestPickPlayerId: 'user-1',
          bestPickPlayerName: 'Eli Prospect',
          summary: 'New York Tycoons landed a steady class anchored by Eli Prospect.',
        },
        {
          teamId: 'bos',
          teamName: 'Boston Noreasters',
          pickCount: 1,
          averageScoutingGrade: 58,
          grade: 'C',
          bestPickPlayerId: 'bos-1',
          bestPickPlayerName: 'Marcus Early',
          summary: 'Boston Noreasters stayed on their board with Marcus Early.',
        },
      ],
    };

    let activeDraftView = availableView;
    let activeGradesView: typeof gradesView | null = null;

    const getDraftClass = vi.fn().mockImplementation(async () => activeDraftView);
    const getDraftCommentary = vi.fn().mockImplementation(async () => commentaryView);
    const getDraftProspectReaction = vi.fn().mockImplementation(async () => (
      activeDraftView.status === 'in_progress' ? reactionView : null
    ));
    const getDraftPostDraftGrades = vi.fn().mockImplementation(async () => activeGradesView);
    const startDraft = vi.fn().mockImplementation(async () => {
      activeDraftView = inProgressView;
      return {
        success: true,
        draft: inProgressView,
        newPicks: inProgressView.completedPicks,
      };
    });
    const makeDraftPick = vi.fn().mockImplementation(async () => ({
      success: true,
      draft: inProgressView,
      newPicks: [],
    }));
    const scoutDraftPlayer = vi.fn().mockImplementation(async () => ({
      success: true,
      draft: inProgressView,
      newPicks: [],
    }));
    const toggleDraftBigBoard = vi.fn().mockImplementation(async () => ({
      success: true,
      draft: inProgressView,
      newPicks: [],
    }));
    const signDraftPick = vi.fn().mockImplementation(async () => {
      activeDraftView = completeView;
      activeGradesView = gradesView;
      return {
        success: true,
        draft: completeView,
        newPicks: [],
      };
    });
    const simulateRemainingDraft = vi.fn().mockImplementation(async () => {
      activeDraftView = completeView;
      activeGradesView = gradesView;
      return {
        success: true,
        draft: completeView,
        newPicks: completeView.completedPicks.slice(1),
      };
    });

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getDraftClass,
      getDraftCommentary,
      getDraftProspectReaction,
      getDraftPostDraftGrades,
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
    expect(container.textContent).toContain('War Room');
    expect(container.textContent).toContain('Buzz Tracker');
    expect(container.textContent).toContain('Value Slide');

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
    expect(container.textContent).toContain('League Reaction Board');
  });

  it('labels compensatory picks with qualifying-offer context', async () => {
    const compensation = {
      compensationForPlayerId: 'qo-1',
      compensationForPlayerName: 'Victor Veteran',
      compensationFromTeamId: 'bos',
      compensationFromTeamName: 'Boston Noreasters',
    };

    const draftView = {
      status: 'complete',
      availableProspects: [],
      udfaProspects: [],
      completedPicks: [
        {
          slotId: 'comp-4-nyy-qo-1-1',
          round: 1,
          pickNumber: 31,
          teamId: 'nym',
          teamName: 'New York Tycoons',
          teamAbbreviation: 'NYT',
          playerId: 'pick-1',
          playerName: 'Miles Compensation',
          position: 'CF',
          scoutingGrade: 57,
          origin: 'College',
          slotKind: 'compensatory',
          compensation,
          tone: 'user',
        },
      ],
      currentPick: null,
      board: {
        teams: [
          { teamId: 'nym', teamName: 'New York Tycoons', abbreviation: 'NYT', tone: 'user' },
        ],
        rounds: [
          {
            round: 1,
            cells: [
              {
                slotId: 'comp-4-nyy-qo-1-1',
                round: 1,
                pickInRound: 31,
                teamId: 'nym',
                teamAbbreviation: 'NYT',
                tone: 'user',
                compensation,
                pick: {
                  slotId: 'comp-4-nyy-qo-1-1',
                  round: 1,
                  pickNumber: 31,
                  teamId: 'nym',
                  teamName: 'New York Tycoons',
                  teamAbbreviation: 'NYT',
                  playerId: 'pick-1',
                  playerName: 'Miles Compensation',
                  position: 'CF',
                  scoutingGrade: 57,
                  origin: 'College',
                  slotKind: 'compensatory',
                  compensation,
                  tone: 'user',
                },
              },
            ],
          },
        ],
      },
      counts: { totalRounds: 20, totalPicks: 31, picksMade: 31, picksRemaining: 0 },
      userDraftClass: {
        picks: [
          {
            playerId: 'pick-1',
            playerName: 'Miles Compensation',
            position: 'CF',
            scoutingGrade: 57,
            origin: 'College',
            slotValue: 2.1,
            askBonus: 2.3,
            signed: null,
            agreedBonus: null,
            assessment: 'On-slot selection with balanced risk and upside.',
          },
        ],
        overallGrade: 'B',
        averageScoutingGrade: 57,
      },
      userBigBoard: [],
    };

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getDraftClass: vi.fn().mockResolvedValue(draftView),
      getDraftCommentary: vi.fn().mockResolvedValue(null),
      getDraftProspectReaction: vi.fn().mockResolvedValue(null),
      getDraftPostDraftGrades: vi.fn().mockResolvedValue(null),
      startDraft: vi.fn(),
      makeDraftPick: vi.fn(),
      scoutDraftPlayer: vi.fn(),
      toggleDraftBigBoard: vi.fn(),
      signDraftPick: vi.fn(),
      simulateRemainingDraft: vi.fn(),
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

    expect(container.textContent).toContain('QO');
    expect(container.textContent).toContain('Victor Veteran');
    expect(container.textContent).toContain('Boston Noreasters');
  });
});

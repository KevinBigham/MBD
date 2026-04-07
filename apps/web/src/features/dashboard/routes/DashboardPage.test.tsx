import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { GameBoxScore } from '@mbd/sim-core';
import DashboardPage from './DashboardPage';
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

function createBoxScore(overrides: Partial<GameBoxScore>): GameBoxScore {
  return {
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeScore: 5,
    awayScore: 3,
    homeHits: 8,
    awayHits: 6,
    innings: 9,
    paResults: [],
    date: 'S4D88',
    isPlayoff: false,
    savePitcherId: null,
    ...overrides,
  };
}

const recentRecaps = [
  {
    gameIndex: 90,
    recap: 'New York takes the opener behind early power.',
    highlights: [{ type: 'homer', text: 'Judge ambushes a fastball in the first.' }],
    playByPlay: [
      { inning: 1, halfInning: 'bottom' as const, text: 'Judge ambushes a fastball in the first.', isHighlight: true },
    ],
    boxScore: createBoxScore({ homeTeamId: 'nym', awayTeamId: 'cha', homeScore: 6, awayScore: 2 }),
  },
  {
    gameIndex: 91,
    recap: 'Boston steals one late at the Stadium.',
    highlights: [{ type: 'clutch_k', text: 'Boston locks down the ninth.' }],
    playByPlay: [
      { inning: 9, halfInning: 'top' as const, text: 'Boston grabs the lead late.', isHighlight: true },
    ],
    boxScore: createBoxScore({ homeTeamId: 'nym', awayTeamId: 'bos', homeScore: 2, awayScore: 4 }),
  },
  {
    gameIndex: 92,
    recap: 'New York walks it off in the 10th.',
    highlights: [{ type: 'walkoff', text: 'Walk-off homer sends the Bronx home happy.' }],
    playByPlay: [
      { inning: 10, halfInning: 'bottom' as const, text: 'Walk-off homer sends the Bronx home happy.', isHighlight: true },
    ],
    boxScore: createBoxScore({
      homeTeamId: 'nym',
      awayTeamId: 'bos',
      homeScore: 3,
      awayScore: 2,
      innings: 10,
      paResults: [
        {
          outcome: 'HR',
          batterId: 'p1',
          pitcherId: 'p2',
          inning: 10,
          halfInning: 'bottom',
          outs: 1,
          runnersOn: 0,
          scoreBefore: [2, 2],
          scoreAfter: [2, 3],
          rbiOnPlay: 1,
          isWalkOff: true,
        },
      ],
    }),
  },
];

const playByPlayByGameIndex = new Map([
  [90, {
    gameIndex: 90,
    recap: 'New York takes the opener behind early power.',
    highlights: [{ type: 'homer', text: 'Judge ambushes a fastball in the first.' }],
    plays: [
      { inning: 1, halfInning: 'bottom' as const, text: 'Judge ambushes a fastball in the first.', isHighlight: true },
    ],
    boxScore: createBoxScore({ homeTeamId: 'nym', awayTeamId: 'cha', homeScore: 6, awayScore: 2 }),
  }],
  [91, {
    gameIndex: 91,
    recap: 'Boston steals one late at the Stadium.',
    highlights: [{ type: 'clutch_k', text: 'Boston locks down the ninth.' }],
    plays: [
      { inning: 9, halfInning: 'top' as const, text: 'Boston grabs the lead late.', isHighlight: true },
    ],
    boxScore: createBoxScore({ homeTeamId: 'nym', awayTeamId: 'bos', homeScore: 2, awayScore: 4 }),
  }],
  [92, {
    gameIndex: 92,
    recap: 'New York walks it off in the 10th.',
    highlights: [{ type: 'walkoff', text: 'Walk-off homer sends the Bronx home happy.' }],
    plays: [
      { inning: 10, halfInning: 'bottom' as const, text: 'Walk-off homer sends the Bronx home happy.', isHighlight: true },
    ],
    boxScore: createBoxScore({
      homeTeamId: 'nym',
      awayTeamId: 'bos',
      homeScore: 3,
      awayScore: 2,
      innings: 10,
      paResults: [
        {
          outcome: 'HR',
          batterId: 'p1',
          pitcherId: 'p2',
          inning: 10,
          halfInning: 'bottom',
          outs: 1,
          runnersOn: 0,
          scoreBefore: [2, 2],
          scoreAfter: [2, 3],
          rbiOnPlay: 1,
          isWalkOff: true,
        },
      ],
    }),
  }],
]);

describe('DashboardPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 88,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 87,
      isSimulating: false,
      activeSaveId: 'save-slot-1',
      setSeason: vi.fn(),
      setDay: vi.fn(),
      setPhase: vi.fn(),
      setSimulating: vi.fn(),
      setInitialized: vi.fn(),
      setUserTeamId: vi.fn(),
      updateFromSim: vi.fn(),
      initializeGame: vi.fn(),
      activeSaveSlot: 1,
    });

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getDashboardSummary: vi.fn().mockResolvedValue({
        franchise: {
          teamName: 'New York Tycoons',
          abbreviation: 'NYT',
          gmName: 'Alex Rivera',
          difficulty: 'hard',
          welcomeBriefingPending: true,
          season: 4,
          record: '50-38',
          division: 'AL_EAST',
          divisionRank: 1,
          dynasty: { score: 215, grade: 'B' },
          status: 'active',
          endReason: null,
          owner: {
            hotSeat: true,
            patience: 42,
            confidence: 45,
            summary: 'Ownership expected a stronger playoff pace.',
            satisfaction: 38,
          },
          chemistry: {
            score: 62,
            tier: 'connected',
            summary: 'Leadership is pulling the room together.',
          },
          frontOffice: {
            reputation: 64,
            summary: 'The front office has built real credibility around the league.',
          },
        },
        fanSentiment: {
          score: 63,
          trend: 'rising',
          summary: 'The city is buying into the push.',
        },
        challenge: null,
        momentum: {
          last10: '7-3',
          streak: 'W3',
          runDifferential: 21,
          seasonRunDiffPerGame: 0.24,
          last30RunDiffPerGame: 0.48,
          playoffProbability: 74,
        },
        roster: {
          topPerformers: [
            {
              playerId: 'p1',
              name: 'Aaron Judge',
              position: 'RF',
              label: '1.012 OPS',
              sparklineValues: [0.31, 0.42, 1.01],
              statLine: '101 H · 28 HR · 77 RBI',
            },
          ],
          injuredCount: 2,
          nextReturnDays: 4,
          payroll: 212.4,
          budget: 235,
          luxuryTax: 16.2,
        },
        intel: {
          tradeInboxCount: 3,
          expiringContracts: [
            { playerId: 'p2', name: 'Juan Soto', position: 'LF', salary: 31 },
          ],
          topProspect: {
            playerId: 'p3',
            name: 'Spencer Jones',
            position: 'CF',
            readiness: 410,
            level: 'AAA',
          },
          rivalries: [
            {
              id: 'nyy-bos',
              opponentTeamId: 'bos',
              intensity: 84,
              summary: 'Every series is carrying real postseason weight.',
              currentSeasonRecord: 'NYY 8-5 BOS',
              historicalRecord: 'NYY 144-132 BOS',
            },
          ],
        },
        tradeIntel: {
          daysUntilDeadline: 34,
          deadlineMode: false,
          activeTradeOffers: 3,
          recentSummary: 'Seattle Drizzle sent Drew Example to San Diego Surf Hounds for Chris Sample.',
          recentTrades: [
            {
              id: 'ticker-1',
              summary: 'Seattle Drizzle sent Drew Example to San Diego Surf Hounds for Chris Sample.',
              timestamp: 'S4D88',
            },
          ],
        },
        farmIntel: {
          topProspects: [
            {
              playerId: 'p3',
              name: 'Spencer Jones',
              position: 'CF',
              level: 'AAA',
              readiness: 410,
              trend: 'up',
              latestLineSummary: '.311 AVG · 14 HR · 51 RBI',
            },
          ],
          recentMoves: [
            {
              id: 'farm-1',
              headline: 'Spencer Jones is pushing for a promotion.',
              timestamp: 'S4D88',
            },
          ],
        },
        storylinesToWatch: [
          {
            playerId: 'p1',
            playerName: 'Aaron Judge',
            teamId: 'nym',
            teamName: 'New York Tycoons',
            arcType: 'dynasty_cornerstone',
            phase: 'climax',
            latestMilestone: 'All eyes on Aaron Judge as the dynasty cornerstone reaches a crescendo.',
          },
        ],
        divisionStandings: [
          {
            teamId: 'nym',
            teamName: 'New York Tycoons',
            abbreviation: 'NYT',
            wins: 50,
            losses: 38,
            pct: '.568',
            gamesBack: 0,
            streak: 'W3',
            runDifferential: 21,
            divisionRank: 1,
          },
        ],
        pressRoom: {
          latest: {
            id: 'brief-owner-heat',
            source: 'briefing',
            category: 'owner',
            tag: 'BREAKING',
            priority: 1,
            headline: 'Owner pressure is rising.',
            body: 'Ownership wants a stronger response this month.',
            timestamp: 'S4D88',
            relatedTeamIds: ['nym'],
            relatedPlayerIds: [],
          },
          feed: [
            {
              id: 'brief-owner-heat',
              source: 'briefing',
              category: 'owner',
              tag: 'BREAKING',
              priority: 1,
              headline: 'Owner pressure is rising.',
              body: 'Ownership wants a stronger response this month.',
              timestamp: 'S4D88',
              relatedTeamIds: ['nym'],
              relatedPlayerIds: [],
            },
            {
              id: 'news-deadline',
              source: 'news',
              category: 'rumor',
              tag: 'RUMOR',
              priority: 2,
              headline: 'Deadline buzz is building.',
              body: 'Clubs are circling the Yankees for bullpen help.',
              timestamp: 'S4D88',
              relatedTeamIds: ['nym'],
              relatedPlayerIds: [],
            },
          ],
          briefingCount: 4,
          newsCount: 8,
          unreadCount: 2,
        },
        thisDayInHistory: {
          season: 2,
          headline: 'Won the World Series',
          summary: '97-65 · Title season',
        },
      }),
      getRecentGameRecaps: vi.fn().mockResolvedValue(recentRecaps),
      getGamePlayByPlay: vi.fn().mockImplementation(async (gameIndex: number) => playByPlayByGameIndex.get(gameIndex) ?? null),
      getSeasonRecap: vi.fn().mockResolvedValue(null),
      getOffseasonHeadline: vi.fn().mockResolvedValue(null),
      dismissWelcomeBriefing: vi.fn().mockResolvedValue({ success: true }),
      getGMCareer: vi.fn().mockResolvedValue({
        currentTeamId: 'nym',
        reputation: 64,
        overallRecord: { wins: 312, losses: 254 },
        careerHistory: [{ teamId: 'nym', firedSeason: null }],
        jobSearchActive: false,
        lastFiredReason: null,
      }),
      getJobMarket: vi.fn().mockResolvedValue({
        availableJobs: [],
      }),
      applyForJob: vi.fn().mockResolvedValue({ success: true, teamId: 'bos', teamName: 'Boston Noreasters' }),
    } as unknown as ReturnType<typeof useWorker>);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders the franchise command center cards from the unified dashboard summary', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await vi.dynamicImportSettled();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain('Franchise Identity');
    expect(container.textContent).toContain('Welcome, GM Alex Rivera');
    expect(container.textContent).toContain('Sim Day');
    expect(container.textContent).toContain('Sim Week');
    expect(container.textContent).toContain('Sim Month');
    expect(container.textContent).toContain('Standings');
    expect(container.textContent).toContain('Roster Health');
    expect(container.textContent).toContain('Trade Intel');
    expect(container.textContent).toContain('Farm Report');
    expect(container.textContent).toContain('Financials');
    expect(container.textContent).toContain('Press Digest');
    expect(container.textContent).toContain('Active Storylines');
    expect(container.textContent).toContain('Rivalry Watch');
    expect(container.textContent).toContain('Game Day');
    expect(container.textContent).toContain('Broadcast Booth');
    expect(container.textContent).toContain('This Day in History');
    expect(container.textContent).toContain('NYY 8-5 BOS');
    expect(container.textContent).toContain('NYY 144-132 BOS');
    expect(container.textContent).toContain('Seattle Drizzle sent Drew Example to San Diego Surf Hounds for Chris Sample.');
    expect(container.textContent).toContain('Spencer Jones');
    expect(container.textContent).toContain('Aaron Judge');
    expect(container.textContent).toContain('dynasty cornerstone');
    expect(container.textContent).toContain('climax');
    expect(container.textContent).toContain('Press Room');
    expect(container.textContent).toContain('BREAKING');
    expect(container.textContent).toContain('Deadline buzz is building.');
    expect(container.textContent).toContain('Season 2');
    expect(container.textContent).toContain('New York walks it off in the 10th.');
    expect(container.textContent).toContain('Walk-off homer sends the Bronx home happy.');

    const bostonRecapButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Boston steals one late at the Stadium.'),
    );
    await act(async () => {
      bostonRecapButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Boston grabs the lead late.');
  });

  it('renders a loading skeleton before the dashboard summary resolves', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getDashboardSummary: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      getRecentGameRecaps: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      getGamePlayByPlay: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      getSeasonRecap: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      getOffseasonHeadline: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      dismissWelcomeBriefing: vi.fn().mockResolvedValue({ success: true }),
      getGMCareer: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      getJobMarket: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      applyForJob: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>,
      );
    });

    expect(container.querySelector('[data-testid="dashboard-loading"]')).toBeTruthy();
  });

  it('shows the career job market and lets the user take over a new team', async () => {
    const applyForJob = vi.fn().mockResolvedValue({ success: true, teamId: 'bos', teamName: 'Boston Noreasters' });
    const initializeGame = vi.fn();
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 88,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 87,
      isSimulating: false,
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      setSeason: vi.fn(),
      setDay: vi.fn(),
      setPhase: vi.fn(),
      setSimulating: vi.fn(),
      setInitialized: vi.fn(),
      setUserTeamId: vi.fn(),
      updateFromSim: vi.fn(),
      initializeGame,
    });
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getDashboardSummary: vi.fn().mockResolvedValue({
        franchise: {
          teamName: 'New York Tycoons',
          abbreviation: 'NYT',
          gmName: 'Alex Rivera',
          difficulty: 'hard',
          welcomeBriefingPending: false,
          season: 4,
          record: '50-38',
          division: 'AL_EAST',
          divisionRank: 1,
          dynasty: { score: 215, grade: 'B' },
          status: 'active',
          endReason: null,
          owner: null,
          chemistry: null,
          frontOffice: {
            reputation: 64,
            summary: 'The front office has built real credibility around the league.',
          },
        },
        fanSentiment: {
          score: 52,
          trend: 'stable',
          summary: 'The market is waiting to see the next move.',
        },
        challenge: null,
        momentum: {
          last10: '7-3',
          streak: 'W3',
          runDifferential: 21,
          seasonRunDiffPerGame: 0.24,
          last30RunDiffPerGame: 0.48,
          playoffProbability: 74,
        },
        roster: {
          topPerformers: [],
          injuredCount: 0,
          nextReturnDays: null,
          payroll: 212.4,
          budget: 235,
          luxuryTax: 16.2,
        },
        intel: {
          tradeInboxCount: 0,
          expiringContracts: [],
          topProspect: null,
          rivalries: [],
        },
        tradeIntel: {
          daysUntilDeadline: null,
          deadlineMode: false,
          activeTradeOffers: 0,
          recentSummary: null,
          recentTrades: [],
        },
        farmIntel: {
          topProspects: [],
          recentMoves: [],
        },
        storylinesToWatch: [],
        divisionStandings: [],
        pressRoom: {
          latest: null,
          feed: [],
          briefingCount: 0,
          newsCount: 0,
          unreadCount: 0,
        },
        thisDayInHistory: null,
      }),
      getRecentGameRecaps: vi.fn().mockResolvedValue([]),
      getGamePlayByPlay: vi.fn().mockResolvedValue(null),
      getSeasonRecap: vi.fn().mockResolvedValue(null),
      getOffseasonHeadline: vi.fn().mockResolvedValue(null),
      dismissWelcomeBriefing: vi.fn().mockResolvedValue({ success: true }),
      getGMCareer: vi.fn().mockResolvedValue({
        currentTeamId: 'nym',
        reputation: 58,
        overallRecord: { wins: 312, losses: 254 },
        careerHistory: [{ teamId: 'nym', firedSeason: 4 }],
        jobSearchActive: true,
        lastFiredReason: 'Owner fired the GM after satisfaction collapsed.',
      }),
      getJobMarket: vi.fn().mockResolvedValue({
        availableJobs: [
          {
            teamId: 'bos',
            budget: 'Premier budget',
            expectations: 'Win now',
            difficulty: 'High pressure',
            attractiveness: 88,
          },
        ],
      }),
      applyForJob,
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Career Crossroads');
    expect(container.textContent).toContain('Take Over BOS');

    const takeOverButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Take Over BOS'),
    );
    await act(async () => {
      takeOverButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(applyForJob).toHaveBeenCalledWith('bos');
    expect(initializeGame).toHaveBeenCalledWith(expect.objectContaining({
      userTeamId: 'bos',
      teamName: 'Boston Noreasters',
    }));
  });

  it('renders an offseason recap panel from dedicated narrative queries', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 165,
      phase: 'offseason',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 162,
      isSimulating: false,
      activeSaveId: 'save-slot-3',
      activeSaveSlot: 3,
      setSeason: vi.fn(),
      setDay: vi.fn(),
      setPhase: vi.fn(),
      setSimulating: vi.fn(),
      setInitialized: vi.fn(),
      setUserTeamId: vi.fn(),
      updateFromSim: vi.fn(),
      initializeGame: vi.fn(),
    });
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getDashboardSummary: vi.fn().mockResolvedValue({
        franchise: {
          teamName: 'New York Tycoons',
          abbreviation: 'NYT',
          gmName: 'Alex Rivera',
          difficulty: 'hard',
          welcomeBriefingPending: false,
          season: 4,
          record: '94-68',
          division: 'AL_EAST',
          divisionRank: 1,
          dynasty: { score: 228, grade: 'A-' },
          status: 'active',
          endReason: null,
          owner: null,
          chemistry: null,
          frontOffice: {
            reputation: 68,
            summary: 'The front office is coming off a strong October.',
          },
        },
        fanSentiment: {
          score: 70,
          trend: 'rising',
          summary: 'The city is waiting on the next move.',
        },
        challenge: null,
        momentum: {
          last10: '7-3',
          streak: 'W2',
          runDifferential: 0,
          seasonRunDiffPerGame: 0.55,
          last30RunDiffPerGame: 0.63,
          playoffProbability: 0,
        },
        roster: {
          topPerformers: [],
          injuredCount: 0,
          nextReturnDays: null,
          fatigueWarnings: [],
          payroll: 212.4,
          budget: 235,
          luxuryTax: 16.2,
        },
        intel: {
          tradeInboxCount: 0,
          expiringContracts: [],
          topProspect: null,
          rivalries: [],
        },
        tradeIntel: {
          daysUntilDeadline: null,
          deadlineMode: false,
          activeTradeOffers: 0,
          recentSummary: null,
          recentTrades: [],
        },
        farmIntel: {
          topProspects: [],
          recentMoves: [],
        },
        storylinesToWatch: [],
        divisionStandings: [],
        pressRoom: {
          latest: null,
          feed: [],
          briefingCount: 0,
          newsCount: 0,
          unreadCount: 0,
        },
        thisDayInHistory: null,
      }),
      getRecentGameRecaps: vi.fn().mockResolvedValue([]),
      getGamePlayByPlay: vi.fn().mockResolvedValue(null),
      getSeasonRecap: vi.fn().mockResolvedValue({
        season: 4,
        recap: 'A 94-68 season and a deep October run kept the Yankees in the center of the story.',
        storylines: [
          'Juan Soto anchored the lineup',
          'Deadline pitching depth changed the staff mix',
        ],
      }),
      getOffseasonHeadline: vi.fn().mockResolvedValue({
        season: 4,
        headline: 'October left New York with a live title window',
      }),
      dismissWelcomeBriefing: vi.fn().mockResolvedValue({ success: true }),
      getGMCareer: vi.fn().mockResolvedValue({
        currentTeamId: 'nym',
        reputation: 68,
        overallRecord: { wins: 312, losses: 254 },
        careerHistory: [{ teamId: 'nym', firedSeason: null }],
        jobSearchActive: false,
        lastFiredReason: null,
      }),
      getJobMarket: vi.fn().mockResolvedValue({
        availableJobs: [],
      }),
      applyForJob: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await vi.dynamicImportSettled();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain('Offseason Outlook');
    expect(container.textContent).toContain('October left New York with a live title window');
    expect(container.textContent).toContain('A 94-68 season and a deep October run kept the Yankees in the center of the story.');
  });
});

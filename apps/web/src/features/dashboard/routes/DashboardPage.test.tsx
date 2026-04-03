import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
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
      userTeamId: 'nyy',
      teamName: 'Yankees',
      playerCount: 780,
      gamesPlayed: 87,
      isSimulating: false,
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
          teamName: 'New York Yankees',
          abbreviation: 'NYY',
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
        divisionStandings: [
          {
            teamId: 'nyy',
            teamName: 'New York Yankees',
            abbreviation: 'NYY',
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
            relatedTeamIds: ['nyy'],
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
              relatedTeamIds: ['nyy'],
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
              relatedTeamIds: ['nyy'],
              relatedPlayerIds: [],
            },
          ],
          briefingCount: 4,
          newsCount: 8,
        },
      }),
      getTradeDeadlineState: vi.fn().mockResolvedValue({
        deadlineDay: 122,
        daysUntilDeadline: 34,
        deadlineMode: false,
        hotOffers: [],
        ticker: [
          {
            id: 'ticker-1',
            summary: 'Seattle Mariners sent Drew Example to San Diego Padres for Chris Sample.',
            timestamp: 'S4D88',
          },
        ],
        recap: null,
      }),
      dismissWelcomeBriefing: vi.fn().mockResolvedValue({ success: true }),
      getGMCareer: vi.fn().mockResolvedValue({
        currentTeamId: 'nyy',
        reputation: 64,
        overallRecord: { wins: 312, losses: 254 },
        careerHistory: [{ teamId: 'nyy', firedSeason: null }],
        jobSearchActive: false,
        lastFiredReason: null,
      }),
      getJobMarket: vi.fn().mockResolvedValue({
        availableJobs: [],
      }),
      applyForJob: vi.fn().mockResolvedValue({ success: true, teamId: 'bos', teamName: 'Boston Red Sox' }),
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
    });

    expect(container.textContent).toContain('Dynasty Score');
    expect(container.textContent).toContain('Welcome, GM Alex Rivera');
    expect(container.textContent).toContain('B');
    expect(container.textContent).toContain('Season Momentum');
    expect(container.textContent).toContain('Roster Snapshot');
    expect(container.textContent).toContain('Front Office Intel');
    expect(container.textContent).toContain('Trade Inbox');
    expect(container.textContent).toContain('Top Rivalry');
    expect(container.textContent).toContain('Rivalry Board');
    expect(container.textContent).toContain('NYY vs BOS');
    expect(container.textContent).toContain('NYY 8-5 BOS');
    expect(container.textContent).toContain('NYY 144-132 BOS');
    expect(container.textContent).toContain('34 days until trade deadline');
    expect(container.textContent).toContain('League Trade Ticker');
    expect(container.textContent).toContain('Seattle Mariners sent Drew Example to San Diego Padres for Chris Sample.');
    expect(container.textContent).toContain('Spencer Jones');
    expect(container.textContent).toContain('Aaron Judge');
    expect(container.textContent).toContain('Press Room');
    expect(container.textContent).toContain("Today's Headlines");
    expect(container.textContent).toContain('BREAKING');
    expect(container.textContent).toContain('Deadline buzz is building.');
    expect(container.textContent).toContain('Read more');
  });

  it('renders a loading skeleton before the dashboard summary resolves', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getDashboardSummary: vi.fn().mockImplementation(() => new Promise(() => undefined)),
      getTradeDeadlineState: vi.fn().mockImplementation(() => new Promise(() => undefined)),
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
    const applyForJob = vi.fn().mockResolvedValue({ success: true, teamId: 'bos', teamName: 'Boston Red Sox' });
    const initializeGame = vi.fn();
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 88,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nyy',
      teamName: 'Yankees',
      playerCount: 780,
      gamesPlayed: 87,
      isSimulating: false,
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
          teamName: 'New York Yankees',
          abbreviation: 'NYY',
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
        divisionStandings: [],
        pressRoom: {
          latest: null,
          feed: [],
          briefingCount: 0,
          newsCount: 0,
        },
      }),
      getTradeDeadlineState: vi.fn().mockResolvedValue(null),
      dismissWelcomeBriefing: vi.fn().mockResolvedValue({ success: true }),
      getGMCareer: vi.fn().mockResolvedValue({
        currentTeamId: 'nyy',
        reputation: 58,
        overallRecord: { wins: 312, losses: 254 },
        careerHistory: [{ teamId: 'nyy', firedSeason: 4 }],
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
      teamName: 'Boston Red Sox',
    }));
  });
});

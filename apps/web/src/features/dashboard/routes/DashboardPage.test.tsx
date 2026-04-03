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
          owner: {
            hotSeat: true,
            patience: 42,
            confidence: 45,
            summary: 'Ownership expected a stronger playoff pace.',
          },
          chemistry: {
            score: 62,
            tier: 'connected',
            summary: 'Leadership is pulling the room together.',
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
});

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PulsePage from './PulsePage';
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

const MOCK_PULSE_WITH_REPORT = {
  pendingReport: {
    id: 'report-june',
    monthLabel: 'June',
    monthRecord: { wins: 18, losses: 10 },
    overallRecord: { wins: 45, losses: 30 },
    divisionRank: 2,
    divisionMovement: 1,
    playerOfMonth: { name: 'Mike Trout', stat: '.345 / 8 HR / 22 RBI' },
    keyInjuries: ['Aaron Judge - hamstring (15-day IL)'],
    keyReturns: ['Gerrit Cole - returned from elbow'],
    tradeDeadlineCountdown: 28,
    scheduleDifficulty: 'Above Average',
  },
  decisionQueue: [
    {
      id: 'dec-1',
      title: 'Call up top prospect?',
      body: 'Rodriguez is crushing AAA. Ready for the show?',
      urgency: 'high' as const,
      route: '/minors',
    },
    {
      id: 'dec-2',
      title: 'Extension offer expiring',
      body: 'Contract deadline approaching for your ace.',
      urgency: 'medium' as const,
      route: '/finance',
    },
  ],
};

const MOCK_LEAGUE_EVENTS = [
  {
    type: 'gm_firing',
    season: 5,
    month: 6,
    teamIds: ['nym'],
    playerIds: [],
    headline: 'Tycoons dismiss veteran GM',
    description: 'Ownership opted for a midseason reset after a flat June.',
    gameplayEffect: 'Front-office relationships around the league just became less predictable.',
    effectData: {
      kind: 'gm_reset',
      magnitude: 25,
      newPersonality: 'aggressive',
    },
  },
];

describe('PulsePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 5,
      day: 80,
      phase: 'regular_season',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Kevin Bigham',
      playerCount: 780,
      gamesPlayed: 0,
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

  it('renders monthly report with record, injuries, and decisions', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getMonthlyPulse: vi.fn().mockResolvedValue(MOCK_PULSE_WITH_REPORT),
      getCurrentLeagueEvents: vi.fn().mockResolvedValue(MOCK_LEAGUE_EVENTS),
      acknowledgeMonthlyReport: vi.fn().mockResolvedValue({ success: true }),
      dismissDecisionSpotlight: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <PulsePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Monthly Pulse');
    expect(container.textContent).toContain('June Report');
    expect(container.textContent).toContain('18-10');
    expect(container.textContent).toContain('45-30');
    expect(container.textContent).toContain('#2');
    expect(container.textContent).toContain('Mike Trout');
    expect(container.textContent).toContain('Aaron Judge');
    expect(container.textContent).toContain('Gerrit Cole');
    expect(container.textContent).toContain('28d');
    expect(container.textContent).toContain('Call up top prospect?');
    expect(container.textContent).toContain('Extension offer expiring');
    expect(container.textContent).toContain('League Events');
    expect(container.textContent).toContain('Tycoons dismiss veteran GM');
    expect(container.textContent).toContain('Mark as Read');
  });

  it('shows empty state when no pulse data', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getMonthlyPulse: vi.fn().mockResolvedValue({ pendingReport: null, decisionQueue: [] }),
      getCurrentLeagueEvents: vi.fn().mockResolvedValue([]),
      acknowledgeMonthlyReport: vi.fn(),
      dismissDecisionSpotlight: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <PulsePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('No pending reports');
  });

  it('shows decisions only when no report but decisions exist', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getMonthlyPulse: vi.fn().mockResolvedValue({
        pendingReport: null,
        decisionQueue: MOCK_PULSE_WITH_REPORT.decisionQueue,
      }),
      getCurrentLeagueEvents: vi.fn().mockResolvedValue([]),
      acknowledgeMonthlyReport: vi.fn(),
      dismissDecisionSpotlight: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <PulsePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Decision Spotlights');
    expect(container.textContent).toContain('Call up top prospect?');
    expect(container.textContent).not.toContain('June Report');
  });

  it('shows league events when no report is pending', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getMonthlyPulse: vi.fn().mockResolvedValue({ pendingReport: null, decisionQueue: [] }),
      getCurrentLeagueEvents: vi.fn().mockResolvedValue(MOCK_LEAGUE_EVENTS),
      acknowledgeMonthlyReport: vi.fn(),
      dismissDecisionSpotlight: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <PulsePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('League Events');
    expect(container.textContent).toContain('Tycoons dismiss veteran GM');
    expect(container.textContent).not.toContain('No pending reports');
  });
});

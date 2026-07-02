import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPageContent from './DashboardPageContent';
import type { AttentionDeskItem } from './AttentionDesk';
import type { DashboardSummary } from '../lib/dashboardPageTransforms';

vi.mock('./GameAdvisor', () => ({
  default: () => <div>Game Advisor Mock</div>,
}));

vi.mock('./PlayByPlayPanel', () => ({
  default: () => <div>Broadcast Booth Mock</div>,
}));

vi.mock('./DashboardLazyIntelligenceGrid', () => ({
  default: () => <div>Intelligence Grid Mock</div>,
}));

const summary: DashboardSummary = {
  franchise: {
    teamName: 'New York Tycoons',
    abbreviation: 'NYT',
    gmName: 'Alex Rivera',
    difficulty: 'hard',
    welcomeBriefingPending: true,
    season: 1,
    record: '0-0',
    division: 'AL_EAST',
    divisionRank: 1,
    dynasty: { score: 12, grade: 'C' },
    status: 'active',
    endReason: null,
    owner: {
      hotSeat: false,
      patience: 58,
      confidence: 62,
      summary: 'Ownership wants a clean first month.',
      satisfaction: 61,
    },
    chemistry: null,
    frontOffice: null,
  },
  fanSentiment: {
    score: 55,
    trend: 'stable',
    summary: 'The city is waiting for first pitch.',
  },
  challenge: null,
  momentum: {
    last10: '0-0',
    streak: '-',
    runDifferential: 0,
    seasonRunDiffPerGame: 0,
    last30RunDiffPerGame: 0,
    playoffProbability: 0,
  },
  roster: {
    topPerformers: [],
    injuredCount: 0,
    nextReturnDays: null,
    fatigueWarnings: [],
    payroll: 182,
    budget: 210,
    luxuryTax: 0,
  },
  intel: {
    tradeInboxCount: 1,
    expiringContracts: [],
    topProspect: {
      playerId: 'p1',
      name: 'Spencer Jones',
      position: 'CF',
      readiness: 68,
      level: 'AAA',
    },
    rivalries: [
      {
        id: 'nyy-bos',
        opponentTeamId: 'bos',
        intensity: 81,
        summary: 'Boston series carry early heat.',
        currentSeasonRecord: 'NYY 0-0 BOS',
        historicalRecord: 'NYY 140-132 BOS',
      },
    ],
  },
  tradeIntel: {
    daysUntilDeadline: 91,
    deadlineMode: false,
    activeTradeOffers: 1,
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
  thisDayInHistory: {
    season: 0,
    headline: 'Franchise founded',
    summary: 'The first page of the book.',
  },
};

describe('DashboardPageContent', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders dashboard sections and delegates route callbacks', async () => {
    const attentionItems: AttentionDeskItem[] = [
      {
        id: 'trade-inbox',
        title: 'Trade inbox is active',
        detail: 'One offer needs a front-office call.',
        to: '/trade',
        tone: 'info',
      },
    ];
    const onDismissWelcomeBriefing = vi.fn();
    const onDismissDashboardNudge = vi.fn();
    const onSimDay = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <DashboardPageContent
            applyingTeamId={null}
            attentionItems={attentionItems}
            career={null}
            currentDashboardNudge="first_series_pointer"
            jobMarket={null}
            offseasonHeadline={null}
            onApplyForJob={vi.fn()}
            onDismissDashboardNudge={onDismissDashboardNudge}
            onDismissWelcomeBriefing={onDismissWelcomeBriefing}
            onExportGuidedStartBackup={vi.fn()}
            onSelectGame={vi.fn()}
            onSimDay={onSimDay}
            onSimMonth={vi.fn()}
            onSimWeek={vi.fn()}
            phase="regular"
            playByPlayLoading={false}
            recentRecaps={[]}
            season={1}
            seasonRecap={null}
            selectedGameDetail={null}
            selectedGameIndex={null}
            showOpeningDayChecklist
            simAction={null}
            summary={summary}
            userTeamId="nym"
          />
        </MemoryRouter>,
      );
      await vi.dynamicImportSettled();
    });

    expect(container.textContent).toContain('Franchise Identity');
    expect(container.textContent).toContain('Welcome, GM Alex Rivera');
    expect(container.textContent).toContain('Decision Desk');
    expect(container.textContent).toContain('Reports Hub');
    expect(container.querySelector('a[href="/trade?mode=history"]')?.textContent).toContain('Trade Ledger');
    expect(container.querySelector('a[href="/onboarding"]')?.textContent).toContain('Tutorial Day One');
    expect(container.textContent).toContain('Trade inbox is active');
    expect(container.textContent).toContain('Opening Day Checklist');
    expect(container.textContent).toContain('Rivalry Watch');
    expect(container.textContent).toContain('NYY 0-0 BOS');
    expect(container.textContent).toContain('Broadcast Booth Mock');
    expect(container.textContent).toContain('First pitch is waiting');

    const simDayButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Sim Day'),
    );
    const dismissBriefingButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent === 'Dismiss',
    );
    const dismissNudgeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent === 'Got it',
    );

    await act(async () => {
      simDayButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      dismissBriefingButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      dismissNudgeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSimDay).toHaveBeenCalledTimes(1);
    expect(onDismissWelcomeBriefing).toHaveBeenCalledTimes(1);
    expect(onDismissDashboardNudge).toHaveBeenCalledWith('first_series_pointer');
  });
});

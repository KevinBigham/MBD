import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { DashboardSummary } from '../lib/dashboardPageTransforms';
import DashboardLazyIntelligenceGrid from './DashboardLazyIntelligenceGrid';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./StandingsCard', () => ({
  default: ({ standings, userTeamId }: { standings: unknown[]; userTeamId: string | null | undefined }) => (
    <article data-card="standings">{`standings:${standings.length}:${userTeamId ?? 'none'}`}</article>
  ),
}));

vi.mock('./RosterHealthCard', () => ({
  default: ({
    injuredCount,
    nextReturnDays,
    fatigueWarnings,
  }: {
    injuredCount: number;
    nextReturnDays: number | null;
    fatigueWarnings: unknown[];
  }) => (
    <article data-card="roster-health">{`roster:${injuredCount}:${nextReturnDays ?? 'none'}:${fatigueWarnings.length}`}</article>
  ),
}));

vi.mock('./TradeIntelCard', () => ({
  default: ({
    daysUntilDeadline,
    phase,
    activeTradeOffers,
  }: {
    daysUntilDeadline: number | null;
    phase: string;
    activeTradeOffers: number;
  }) => (
    <article data-card="trade-intel">{`trade:${daysUntilDeadline ?? 'none'}:${phase}:${activeTradeOffers}`}</article>
  ),
}));

vi.mock('./FarmReportCard', () => ({
  default: ({ prospects, recentMoves }: { prospects: unknown[]; recentMoves: unknown[] }) => (
    <article data-card="farm-report">{`farm:${prospects.length}:${recentMoves.length}`}</article>
  ),
}));

vi.mock('./FinancialCard', () => ({
  default: ({
    payroll,
    budget,
    luxuryTax,
    annualBudget,
    payrollCap,
  }: {
    payroll: number;
    budget: number;
    luxuryTax: number;
    annualBudget?: number;
    payrollCap?: number;
  }) => (
    <article data-card="financials">{`financials:${payroll}:${budget}:${luxuryTax}:${annualBudget ?? 'none'}:${payrollCap ?? 'none'}`}</article>
  ),
}));

vi.mock('./PressDigestCard', () => ({
  default: ({ feed, unreadCount }: { feed: unknown[]; unreadCount: number }) => (
    <article data-card="press-digest">{`press:${feed.length}:${unreadCount}`}</article>
  ),
}));

vi.mock('./MilestoneTrackerCard', () => ({
  default: () => <article data-card="milestone-watch">milestone</article>,
}));

vi.mock('./ChaseWatchCard', () => ({
  default: () => <article data-card="chase-watch">chase</article>,
}));

vi.mock('./PennantRaceCard', () => ({
  default: () => <article data-card="pennant-race">pennant</article>,
}));

vi.mock('./AwardRaceCard', () => ({
  default: () => <article data-card="award-race">award</article>,
}));

vi.mock('./RecentMomentsCard', () => ({
  default: () => <article data-card="signature-moments">moments</article>,
}));

vi.mock('./ThisWeekInHistoryCard', () => ({
  default: () => <article data-card="this-week-history">history</article>,
}));

vi.mock('./PlayerArcOfSeasonCard', () => ({
  default: () => <article data-card="player-arcs">arcs</article>,
}));

vi.mock('./FranchiseLegacyCard', () => ({
  default: () => <article data-card="franchise-legacy">legacy</article>,
}));

vi.mock('./CareerRetrospectiveCard', () => ({
  default: () => <article data-card="career-retrospective">career</article>,
}));

const cardOrder = [
  'standings',
  'roster-health',
  'trade-intel',
  'farm-report',
  'financials',
  'press-digest',
  'milestone-watch',
  'chase-watch',
  'pennant-race',
  'award-race',
  'signature-moments',
  'this-week-history',
  'player-arcs',
  'franchise-legacy',
  'career-retrospective',
];

const dashboardSummary = {
  divisionStandings: [{ teamId: 'nym' }],
  farmIntel: {
    topProspects: [{ playerId: 'p1' }],
    recentMoves: [{ id: 'farm-1' }, { id: 'farm-2' }],
  },
  franchise: {
    owner: {
      annualBudget: 240,
      payrollCap: 260,
    },
  },
  pressRoom: {
    feed: [{ id: 'press-1' }, { id: 'press-2' }],
    unreadCount: 5,
  },
  roster: {
    budget: 235,
    fatigueWarnings: ['rotation'],
    injuredCount: 2,
    luxuryTax: 16.2,
    nextReturnDays: 4,
    payroll: 212.4,
  },
  tradeIntel: {
    activeTradeOffers: 3,
    daysUntilDeadline: 34,
    recentSummary: 'The market is moving.',
    recentTrades: [],
  },
} as unknown as DashboardSummary;

describe('DashboardLazyIntelligenceGrid', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderGrid(summary: DashboardSummary | null) {
    await act(async () => {
      root.render(
        <DashboardLazyIntelligenceGrid
          phase="regular"
          summary={summary}
          userTeamId="nym"
        />,
      );
    });
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await act(async () => {
        await Promise.resolve();
      });
      if (container.querySelectorAll('[data-card]').length === cardOrder.length) {
        return;
      }
    }
  }

  it('renders the lazy intelligence cards in dashboard order', async () => {
    await renderGrid(dashboardSummary);

    const renderedCards = Array.from(container.querySelectorAll('[data-card]')).map((card) =>
      card.getAttribute('data-card'),
    );

    expect(renderedCards).toEqual(cardOrder);
  });

  it('forwards route summary values and null-summary fallbacks to the cards', async () => {
    await renderGrid(dashboardSummary);

    expect(container.textContent).toContain('standings:1:nym');
    expect(container.textContent).toContain('roster:2:4:1');
    expect(container.textContent).toContain('trade:34:regular:3');
    expect(container.textContent).toContain('farm:1:2');
    expect(container.textContent).toContain('financials:212.4:235:16.2:240:260');
    expect(container.textContent).toContain('press:2:5');

    await renderGrid(null);

    expect(container.textContent).toContain('standings:0:nym');
    expect(container.textContent).toContain('roster:0:none:0');
    expect(container.textContent).toContain('trade:none:regular:0');
    expect(container.textContent).toContain('farm:0:0');
    expect(container.textContent).toContain('financials:0:0:0:none:none');
    expect(container.textContent).toContain('press:0:0');
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildAttentionItems,
  buildDashboardNudgeTriggers,
  getDashboardScheduleFlags,
  quickActionLabel,
  shouldAutoSkipFirstSeriesPointerNudge,
  shouldShowOpeningDayChecklist,
  type DashboardSummary,
} from './dashboardPageTransforms';

function makeDashboardSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    franchise: {
      teamName: 'New York Tycoons',
      abbreviation: 'NYT',
      gmName: 'Alex Rivera',
      difficulty: 'hard',
      welcomeBriefingPending: false,
      season: 1,
      record: '0-0',
      division: 'AL East',
      divisionRank: 1,
      dynasty: { score: 0, grade: 'F' },
      status: 'active',
      endReason: null,
      owner: null,
      chemistry: null,
      frontOffice: null,
    },
    fanSentiment: {
      score: 50,
      trend: 'stable',
      summary: 'The city is waiting.',
    },
    challenge: null,
    momentum: {
      last10: '0-0',
      streak: 'W0',
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
      payroll: 0,
      budget: 0,
      luxuryTax: 0,
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
      feed: [],
      latest: null,
      briefingCount: 0,
      newsCount: 0,
      unreadCount: 0,
    },
    thisDayInHistory: null,
    ...overrides,
  };
}

describe('dashboardPageTransforms', () => {
  it('builds capped decision-desk items in existing priority order', () => {
    const items = buildAttentionItems(
      makeDashboardSummary({
        roster: {
          topPerformers: [],
          injuredCount: 2,
          nextReturnDays: 5,
          fatigueWarnings: [
            {
              playerId: 'p1',
              name: 'Aaron Judge',
              position: 'RF',
              fatigueScore: 82,
              summary: 'Needs a rest day.',
            },
          ],
          payroll: 220,
          budget: 235,
          luxuryTax: 12,
        },
        tradeIntel: {
          daysUntilDeadline: 20,
          deadlineMode: false,
          activeTradeOffers: 3,
          recentSummary: null,
          recentTrades: [],
        },
        pressRoom: {
          feed: [],
          latest: null,
          briefingCount: 1,
          newsCount: 2,
          unreadCount: 4,
        },
        intel: {
          tradeInboxCount: 3,
          expiringContracts: [
            { playerId: 'p2', name: 'Juan Soto', position: 'LF', salary: 31 },
            { playerId: 'p3', name: 'Gerrit Cole', position: 'SP', salary: 36 },
          ],
          topProspect: {
            playerId: 'p4',
            name: 'Spencer Jones',
            position: 'CF',
            readiness: 75,
            level: 'AAA',
          },
          rivalries: [],
        },
        challenge: {
          scenarioId: 'opening-window',
          name: 'Opening Window',
          progress: 25,
          completed: false,
          failed: false,
          summary: 'Stay in the race through June.',
        },
      }),
      'regular',
      0,
      true,
    );

    expect(items).toHaveLength(5);
    expect(items.map((item) => item.id)).toEqual([
      'roster-health',
      'trade-inbox',
      'press-room',
      'contract-clock',
      'prospect-ready',
    ]);
    expect(items[0]).toMatchObject({
      title: 'Roster health needs attention',
      detail: '2 injured, 1 fatigue flag.',
      to: '/roster',
      tone: 'warning',
    });
    expect(items[3]?.detail).toBe('Juan Soto and 1 more expiring deal.');
    expect(items[4]?.detail).toBe('Spencer Jones carries a 75 OVR near-term grade in AAA.');
  });

  it('does not present prospect readiness as a percent', () => {
    const items = buildAttentionItems(
      makeDashboardSummary({
        intel: {
          tradeInboxCount: 0,
          expiringContracts: [],
          topProspect: {
            playerId: 'p4',
            name: 'Rafa Vega',
            position: 'CF',
            readiness: 410,
            level: 'AAA',
          },
          rivalries: [],
        },
      }),
      'regular',
      0,
      false,
    );

    expect(items).toContainEqual(expect.objectContaining({
      id: 'prospect-ready',
      detail: 'Rafa Vega carries a 65 OVR near-term grade in AAA.',
    }));
    expect(items.find((item) => item.id === 'prospect-ready')?.detail).not.toContain('% readiness');
  });

  it('adds the opening-day attention item when no higher-priority items exist', () => {
    const items = buildAttentionItems(makeDashboardSummary(), 'regular', 0, true);

    expect(items).toEqual([
      {
        id: 'first-sim',
        title: 'Opening Day is ready',
        detail: 'Run the first day once roster, staff, trade posture, and press room checks feel clean.',
        to: '/dashboard',
        tone: 'success',
      },
    ]);
  });

  it('summarizes dashboard schedule flags for guided-start decisions', () => {
    expect(getDashboardScheduleFlags(null, 2)).toEqual({
      completedUserGames: 0,
      hasCurrentDayGame: false,
      hasPriorScheduledGame: false,
      hasFutureScheduledGame: false,
    });

    expect(getDashboardScheduleFlags([
      { day: 1, isCompleted: true },
      { day: 3, isCompleted: false },
    ], 2)).toEqual({
      completedUserGames: 1,
      hasCurrentDayGame: false,
      hasPriorScheduledGame: true,
      hasFutureScheduledGame: true,
    });
  });

  it('derives guided-start triggers and skip behavior from schedule state', () => {
    const openingDayFlags = getDashboardScheduleFlags([{ day: 1, isCompleted: false }], 1);
    expect(buildDashboardNudgeTriggers({
      isInitialized: true,
      season: 1,
      phase: 'regular',
      scheduleLoaded: true,
      ...openingDayFlags,
    })).toEqual(['first_series_pointer']);

    const offdayFlags = getDashboardScheduleFlags([
      { day: 1, isCompleted: true },
      { day: 3, isCompleted: false },
    ], 2);
    expect(buildDashboardNudgeTriggers({
      isInitialized: true,
      season: 1,
      phase: 'regular',
      scheduleLoaded: true,
      ...offdayFlags,
    })).toEqual(['first_offday_autosave_prompt']);

    expect(shouldAutoSkipFirstSeriesPointerNudge({
      isInitialized: true,
      season: 1,
      phase: 'regular',
      scheduleLoaded: true,
      completedUserGames: 1,
    })).toBe(true);
  });

  it('keeps opening-day checklist and sim labels aligned with the route', () => {
    const seasonOneSummary = makeDashboardSummary();

    expect(shouldShowOpeningDayChecklist(seasonOneSummary, 'regular', 0)).toBe(true);
    expect(shouldShowOpeningDayChecklist(seasonOneSummary, 'regular', 1)).toBe(false);
    expect(shouldShowOpeningDayChecklist(seasonOneSummary, 'offseason', 0)).toBe(false);
    expect(quickActionLabel('day')).toBe('Sim Day');
    expect(quickActionLabel('week')).toBe('Sim Week');
    expect(quickActionLabel('month')).toBe('Sim Month');
  });
});

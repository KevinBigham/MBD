import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { LeagueEvent, MonthlyPulseState } from '@mbd/contracts';
import { usePulseRouteData } from './usePulseRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof usePulseRouteData>[0];
type HookResult = ReturnType<typeof usePulseRouteData>;

const pulseWithDecisions: MonthlyPulseState = {
  pendingReport: {
    id: 'report-june',
    season: 5,
    month: 6,
    monthLabel: 'June',
    startDay: 61,
    endDay: 90,
    teamRecord: '18-10',
    overallRecord: '45-30',
    divisionRank: 2,
    divisionMovement: 1,
    playerOfTheMonth: null,
    keyInjuries: [],
    keyReturns: [],
    tradeDeadlineCountdown: 28,
    upcomingScheduleDifficulty: {
      score: 62,
      label: 'Above Average',
      summary: 'Three division leaders on deck.',
    },
  },
  decisionQueue: [
    {
      id: 'dec-blue',
      title: 'Review scouting notes',
      body: 'Your scouts filed an update.',
      urgency: 'blue',
      route: '/scouting',
      actionLabel: 'Open Scouting',
    },
    {
      id: 'dec-red',
      title: 'Fix roster crunch',
      body: 'The active roster needs attention.',
      urgency: 'red',
      route: '/roster',
      actionLabel: 'Open Roster',
    },
  ],
};

const leagueEvent: LeagueEvent = {
  type: 'gm_firing',
  season: 5,
  month: 6,
  teamIds: ['nym'],
  playerIds: [],
  headline: 'Tycoons dismiss veteran GM',
  description: 'Ownership opted for a midseason reset.',
  gameplayEffect: null,
  effectData: {
    kind: 'gm_reset',
    magnitude: 25,
    newPersonality: 'aggressive',
  },
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(usePulseRouteData(options));
  return null;
}

describe('usePulseRouteData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latest = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function makeOptions(overrides: Partial<HookOptions> = {}) {
    const acknowledgeMonthlyReport = vi.fn().mockResolvedValue({ success: true });
    const dismissDecisionSpotlight = vi.fn().mockResolvedValue({ success: true });
    const getCurrentLeagueEvents = vi.fn().mockResolvedValue([leagueEvent]);
    const getMonthlyPulse = vi.fn().mockResolvedValue(pulseWithDecisions);

    return {
      acknowledgeMonthlyReport,
      dismissDecisionSpotlight,
      getCurrentLeagueEvents,
      getMonthlyPulse,
      options: {
        acknowledgeMonthlyReport,
        day: 80,
        dismissDecisionSpotlight,
        getCurrentLeagueEvents,
        getMonthlyPulse,
        isInitialized: true,
        phase: 'regular_season',
        season: 5,
        workerReady: true,
        ...overrides,
      } satisfies HookOptions,
    };
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latest = result;
      }} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest).toBeTruthy();
    return latest as HookResult;
  }

  it('waits without querying until game state and worker are ready', async () => {
    const { getMonthlyPulse, getCurrentLeagueEvents, options } = makeOptions({
      workerReady: false,
    });

    const result = await renderHook(options);

    expect(getMonthlyPulse).not.toHaveBeenCalled();
    expect(getCurrentLeagueEvents).not.toHaveBeenCalled();
    expect(result.loading).toBe(true);
    expect(result.pulse).toBeNull();
    expect(result.leagueEvents).toEqual([]);
    expect(result.hasContent).toBe(false);
  });

  it('loads pulse data, league events, and urgency-sorted decisions', async () => {
    const { getMonthlyPulse, getCurrentLeagueEvents, options } = makeOptions();

    const result = await renderHook(options);

    expect(getMonthlyPulse).toHaveBeenCalledTimes(1);
    expect(getCurrentLeagueEvents).toHaveBeenCalledTimes(1);
    expect(result.loading).toBe(false);
    expect(result.pulse).toBe(pulseWithDecisions);
    expect(result.leagueEvents).toEqual([leagueEvent]);
    expect(result.hasContent).toBe(true);
    expect(result.sortedDecisions.map((decision) => decision.id)).toEqual(['dec-red', 'dec-blue']);
  });

  it('acknowledges a pending report and refreshes route data', async () => {
    const { acknowledgeMonthlyReport, getMonthlyPulse, options } = makeOptions();
    const result = await renderHook(options);

    await act(async () => {
      await result.handleAcknowledge();
      await Promise.resolve();
    });

    expect(acknowledgeMonthlyReport).toHaveBeenCalledWith('report-june');
    expect(getMonthlyPulse).toHaveBeenCalledTimes(2);
  });

  it('dismisses decision spotlights and refreshes route data', async () => {
    const { dismissDecisionSpotlight, getMonthlyPulse, options } = makeOptions();
    const result = await renderHook(options);

    await act(async () => {
      await result.handleDismiss('dec-red');
      await Promise.resolve();
    });

    expect(dismissDecisionSpotlight).toHaveBeenCalledWith('dec-red');
    expect(getMonthlyPulse).toHaveBeenCalledTimes(2);
  });
});

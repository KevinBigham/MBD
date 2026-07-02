import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { TradeDeadlineStateView } from '@/workers/sim.worker.trade';
import type { RelationshipView } from '../components/TradeBuilderContextPanel';
import { useTradeMarketContext } from './useTradeMarketContext';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useTradeMarketContext>[0];
type HookResult = ReturnType<typeof useTradeMarketContext>;

function deadlineState(overrides: Partial<TradeDeadlineStateView> = {}): TradeDeadlineStateView {
  return {
    currentPhase: 'regular',
    deadlineDay: 120,
    daysUntilDeadline: 12,
    deadlineMode: false,
    teamMode: 'standing_pat',
    modeSummary: 'Listening',
    countdownLabel: '12 days',
    hotOffers: [],
    ticker: [],
    chatter: [],
    marketIntel: [],
    warRoom: {
      headline: 'Market pulse',
      detail: 'The room is open.',
      currentCheckpointDay: null,
      nextCheckpointDay: null,
      completedCheckpoints: 0,
      totalCheckpoints: 0,
      callsToAction: [],
    },
    recap: null,
    ...overrides,
  };
}

function relationship(teamId: string, tier: RelationshipView['tier']): RelationshipView {
  return {
    teamId,
    teamName: `${teamId.toUpperCase()} Baseball Club`,
    teamAbbreviation: teamId.toUpperCase(),
    score: 68,
    tier,
    tooltip: 'Recent trade memory',
    lastInteractionSeason: 2026,
    lastEventLabel: 'Checked in',
    latestMemoryDescription: 'Front offices have a workable line open.',
  };
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useTradeMarketContext(options));
  return null;
}

describe('useTradeMarketContext', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  it('builds regular-season market context and selected relationship lookup', async () => {
    const result = await renderHook({
      deadlineState: deadlineState(),
      phase: 'regular',
      relationships: [relationship('lad', 'trusted'), relationship('nyy', 'strained')],
      seasonFlowStatus: null,
      selectedTeam: 'lad',
      userTeamId: 'bos',
    });

    expect(result.otherTeams.some((team) => team.id === 'bos')).toBe(false);
    expect(result.effectivePhase).toBe('regular');
    expect(result.tradeMarketOpen).toBe(true);
    expect(result.marketCopy).toEqual({
      headline: '12 days until trade deadline',
      detail: 'Regular-season trade calls are open. Shape a package or resume an active talk.',
      disabledReason: '',
    });
    expect(result.relationshipsByTeamId.get('lad')?.tier).toBe('trusted');
    expect(result.selectedRelationship?.teamId).toBe('lad');
  });

  it('treats preseason season flow as spring training even when deadline state is regular', async () => {
    const result = await renderHook({
      deadlineState: deadlineState({ deadlineMode: true, daysUntilDeadline: 30 }),
      phase: 'regular',
      relationships: [relationship('lad', 'trusted')],
      seasonFlowStatus: 'preseason',
      selectedTeam: '',
      userTeamId: 'bos',
    });

    expect(result.effectivePhase).toBe('spring_training');
    expect(result.tradeMarketOpen).toBe(false);
    expect(result.marketCopy).toEqual({
      headline: 'Spring Training trade desk',
      detail: 'Clubs are listening and scouting fits. Formal trade proposals unlock on Opening Day.',
      disabledReason: 'Formal offers unlock on Opening Day.',
    });
    expect(result.selectedRelationship).toBeNull();
  });
});

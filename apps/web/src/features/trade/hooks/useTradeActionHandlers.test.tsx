import type { TradeAsset } from '@mbd/contracts';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TradeBuilderSelection } from '../lib/tradeBuilderTransforms';
import type {
  TradeAssetView,
  TradeNegotiationView,
  TradeOfferView,
} from '@/workers/sim.worker.trade';
import { useTradeActionHandlers } from './useTradeActionHandlers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useTradeActionHandlers>[0];
type HookResult = ReturnType<typeof useTradeActionHandlers>;

const offeringAssets: TradeAsset[] = [{ type: 'player', playerId: 'u-1' }];
const requestingAssets: TradeAsset[] = [{ type: 'player', playerId: 't-1' }];

function assetView(asset: TradeAsset, label: string): TradeAssetView {
  return {
    key: `${asset.type}:${label}`,
    type: asset.type,
    label,
    detail: label,
    asset,
    playerId: asset.type === 'player' ? asset.playerId : undefined,
  };
}

function negotiation(overrides: Partial<TradeNegotiationView> = {}): TradeNegotiationView {
  return {
    id: 'neg-1',
    teamId: 'bos',
    teamName: 'Boston Noreasters',
    teamAbbreviation: 'BOS',
    gmPersonality: 'aggressive',
    personalityLabel: 'Aggressive',
    negotiationPosture: 'Aggressive counter pressure',
    counterOfferSummary: null,
    phase: 'counter_1',
    roundsCompleted: 1,
    expiresAtDay: 101,
    dialogue: [],
    proposal: { offeringAssets, requestingAssets },
    counterOffer: null,
    isComplete: false,
    canAccept: true,
    canCounter: true,
    canReject: true,
    ...overrides,
  };
}

function tradeOffer(): TradeOfferView {
  return {
    id: 'offer-1',
    fromTeamId: 'bos',
    fromTeamName: 'Boston Noreasters',
    fromTeamAbbreviation: 'BOS',
    toTeamId: 'nym',
    toTeamName: 'New York Tycoons',
    toTeamAbbreviation: 'NYT',
    fairnessScore: 51,
    message: 'Boston wants to talk.',
    createdAt: '2026-06-14T00:00:00.000Z',
    offeringAssets: [assetView({ type: 'player', playerId: 'bos-1' }, 'Roman Anthony')],
    requestingAssets: [assetView({ type: 'player', playerId: 'nym-1' }, 'Anthony Volpe')],
  };
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useTradeActionHandlers(options));
  return null;
}

describe('useTradeActionHandlers', () => {
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
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      activeCounterOfferId: null,
      activeNegotiation: null,
      advanceNegotiation: vi.fn().mockResolvedValue({
        success: true,
        decision: 'countered',
        message: 'Boston countered.',
        negotiation: negotiation({ id: 'neg-advanced' }),
        tradeExecuted: false,
        review: null,
        flowStateChanged: true,
      }),
      applyNegotiationToBuilder: vi.fn(),
      applyTradeBuilderSelection: vi.fn(),
      loadOpenNegotiations: vi.fn().mockResolvedValue(undefined),
      loadTargetInventory: vi.fn().mockResolvedValue(undefined),
      loadTargetRoster: vi.fn().mockResolvedValue(undefined),
      loadTradeActivity: vi.fn().mockResolvedValue(undefined),
      loadUserInventory: vi.fn().mockResolvedValue(undefined),
      loadUserRoster: vi.fn().mockResolvedValue(undefined),
      offeringAssets,
      offeringIFAAmount: '',
      persistTradeSnapshot: vi.fn().mockResolvedValue(undefined),
      requestingAssets,
      requestingIFAAmount: '',
      resetBuilder: vi.fn(),
      resolveNegotiation: vi.fn().mockResolvedValue({
        success: false,
        decision: 'rejected',
        message: 'Talks ended.',
        negotiation: null,
        tradeExecuted: false,
        review: null,
        flowStateChanged: true,
      }),
      respondToTradeOffer: vi.fn().mockResolvedValue({
        success: true,
        decision: 'accepted',
        message: 'Accepted.',
        flowStateChanged: true,
      }),
      selectedTeam: 'bos',
      setActiveCounterOfferId: vi.fn(),
      setActiveNegotiation: vi.fn(),
      setSelectedTeam: vi.fn(),
      setTradeResult: vi.fn(),
      startNegotiation: vi.fn().mockResolvedValue({
        success: true,
        decision: 'countered',
        message: 'Boston countered.',
        negotiation: negotiation({ id: 'neg-started' }),
        tradeExecuted: false,
        review: null,
        flowStateChanged: true,
      }),
      targetInventory: { draftPicks: [], ifaRemaining: 2 },
      tradeMarketOpen: true,
      updateNegotiationDeepLink: vi.fn(),
      yourInventory: { draftPicks: [], ifaRemaining: 3 },
      ...overrides,
    };
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  it('submits a new negotiation, refreshes route data, and persists the trade snapshot', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      await latestResult?.submitTrade();
    });

    expect(options.startNegotiation).toHaveBeenCalledWith(offeringAssets, requestingAssets, 'bos');
    expect(options.setTradeResult).toHaveBeenCalledWith({
      status: 'counter',
      message: 'Boston countered.',
      review: null,
    });
    expect(options.setActiveNegotiation).toHaveBeenCalledWith(expect.objectContaining({ id: 'neg-started' }));
    expect(options.applyNegotiationToBuilder).toHaveBeenCalledWith(expect.objectContaining({ id: 'neg-started' }));
    expect(options.updateNegotiationDeepLink).toHaveBeenCalledWith('neg-started');
    expect(options.loadUserRoster).toHaveBeenCalledTimes(1);
    expect(options.loadTargetRoster).toHaveBeenCalledTimes(1);
    expect(options.loadUserInventory).toHaveBeenCalledTimes(1);
    expect(options.loadTargetInventory).toHaveBeenCalledTimes(1);
    expect(options.loadTradeActivity).toHaveBeenCalledTimes(1);
    expect(options.loadOpenNegotiations).toHaveBeenCalledTimes(1);
    expect(options.persistTradeSnapshot).toHaveBeenCalledTimes(1);
    expect(vi.mocked(options.persistTradeSnapshot).mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(options.loadUserRoster).mock.invocationCallOrder[0]!);
  });

  it('returns validation feedback before calling the worker when IFA pool space is overspent', async () => {
    const options = baseOptions({
      offeringIFAAmount: '3.5',
      yourInventory: { draftPicks: [], ifaRemaining: 1 },
    });
    await renderHook(options);

    await act(async () => {
      await latestResult?.submitTrade();
    });

    expect(options.setTradeResult).toHaveBeenCalledWith({
      status: 'rejected',
      message: 'You cannot offer more international pool space than you have remaining.',
    });
    expect(options.startNegotiation).not.toHaveBeenCalled();
    expect(options.persistTradeSnapshot).not.toHaveBeenCalled();
  });

  it('refreshes but skips persistence when a worker rejects a new negotiation without mutation success', async () => {
    const options = baseOptions({
      startNegotiation: vi.fn().mockResolvedValue({
        success: false,
        decision: 'rejected',
        message: 'The market is closed.',
        negotiation: null,
        tradeExecuted: false,
        review: null,
        flowStateChanged: false,
      }),
    });
    await renderHook(options);

    await act(async () => {
      await latestResult?.submitTrade();
    });

    expect(options.startNegotiation).toHaveBeenCalledWith(offeringAssets, requestingAssets, 'bos');
    expect(options.loadTradeActivity).toHaveBeenCalledTimes(1);
    expect(options.persistTradeSnapshot).not.toHaveBeenCalled();
  });

  it('resolves active talks and clears the builder when a negotiation is rejected', async () => {
    const activeNegotiation = negotiation({ id: 'neg-active' });
    const options = baseOptions({ activeNegotiation });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleResolveNegotiation('reject');
    });

    expect(options.resolveNegotiation).toHaveBeenCalledWith('neg-active', 'reject');
    expect(options.setTradeResult).toHaveBeenCalledWith({
      status: 'rejected',
      message: 'Talks ended.',
      review: null,
    });
    expect(options.setActiveNegotiation).toHaveBeenCalledWith(null);
    expect(options.updateNegotiationDeepLink).toHaveBeenCalledWith(null);
    expect(options.resetBuilder).toHaveBeenCalledTimes(1);
    expect(options.loadOpenNegotiations).toHaveBeenCalledTimes(1);
    expect(options.persistTradeSnapshot).toHaveBeenCalledTimes(1);
    expect(vi.mocked(options.persistTradeSnapshot).mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(options.loadTradeActivity).mock.invocationCallOrder[0]!);
  });

  it('skips persistence when resolving missing talks reports no state change', async () => {
    const activeNegotiation = negotiation({ id: 'neg-active' });
    const options = baseOptions({
      activeNegotiation,
      resolveNegotiation: vi.fn().mockResolvedValue({
        success: false,
        decision: 'rejected',
        message: 'Talks already expired.',
        negotiation: null,
        tradeExecuted: false,
        review: null,
        flowStateChanged: false,
      }),
    });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleResolveNegotiation('reject');
    });

    expect(options.resolveNegotiation).toHaveBeenCalledWith('neg-active', 'reject');
    expect(options.loadTradeActivity).toHaveBeenCalledTimes(1);
    expect(options.persistTradeSnapshot).not.toHaveBeenCalled();
  });

  it('maps incoming offer counters into the route builder without accepting the offer', async () => {
    const options = baseOptions();
    await renderHook(options);

    act(() => {
      latestResult?.handleCounterOffer(tradeOffer());
    });

    expect(options.setSelectedTeam).toHaveBeenCalledWith('bos');
    expect(options.applyTradeBuilderSelection).toHaveBeenCalledWith({
      offeringPlayerIds: ['nym-1'],
      requestingPlayerIds: ['bos-1'],
      offeringDraftPicks: [],
      requestingDraftPicks: [],
      offeringIFAAmount: '',
      requestingIFAAmount: '',
    } satisfies TradeBuilderSelection);
    expect(options.setActiveCounterOfferId).toHaveBeenCalledWith('offer-1');
    expect(options.setTradeResult).toHaveBeenCalledWith(null);
    expect(options.respondToTradeOffer).not.toHaveBeenCalled();
  });

  it('persists accepted incoming offers before refreshing trade state', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleAcceptOffer('offer-1');
    });

    expect(options.respondToTradeOffer).toHaveBeenCalledWith('offer-1', 'accept');
    expect(options.loadUserRoster).toHaveBeenCalledTimes(1);
    expect(options.loadTargetRoster).toHaveBeenCalledTimes(1);
    expect(options.loadUserInventory).toHaveBeenCalledTimes(1);
    expect(options.loadTargetInventory).toHaveBeenCalledTimes(1);
    expect(options.loadTradeActivity).toHaveBeenCalledTimes(1);
    expect(options.persistTradeSnapshot).toHaveBeenCalledTimes(1);
    expect(vi.mocked(options.persistTradeSnapshot).mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(options.loadUserRoster).mock.invocationCallOrder[0]!);
  });

  it('persists declined incoming offers without rerunning rejected responses', async () => {
    const options = baseOptions({
      respondToTradeOffer: vi.fn().mockResolvedValue({
        success: true,
        decision: 'declined',
        message: 'Offer declined.',
        flowStateChanged: true,
      }),
    });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleDeclineOffer('offer-1');
    });

    expect(options.respondToTradeOffer).toHaveBeenCalledWith('offer-1', 'decline');
    expect(options.loadTradeActivity).toHaveBeenCalledTimes(1);
    expect(options.persistTradeSnapshot).toHaveBeenCalledTimes(1);
    expect(vi.mocked(options.persistTradeSnapshot).mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(options.loadTradeActivity).mock.invocationCallOrder[0]!);
  });

  it('persists a rejected stale incoming offer when the worker removed it', async () => {
    const options = baseOptions({
      respondToTradeOffer: vi.fn().mockResolvedValue({
        success: false,
        decision: 'rejected',
        message: 'That offer is no longer actionable.',
        flowStateChanged: true,
      }),
    });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleAcceptOffer('offer-1');
    });

    expect(options.respondToTradeOffer).toHaveBeenCalledWith('offer-1', 'accept');
    expect(options.loadTradeActivity).toHaveBeenCalledTimes(1);
    expect(options.persistTradeSnapshot).toHaveBeenCalledTimes(1);
  });

  it('does not persist a rejected missing offer with no worker state change', async () => {
    const options = baseOptions({
      respondToTradeOffer: vi.fn().mockResolvedValue({
        success: false,
        decision: 'rejected',
        message: 'Trade offer no longer exists.',
        flowStateChanged: false,
      }),
    });
    await renderHook(options);

    await act(async () => {
      await latestResult?.handleAcceptOffer('missing-offer');
    });

    expect(options.persistTradeSnapshot).not.toHaveBeenCalled();
    expect(options.loadTradeActivity).toHaveBeenCalledTimes(1);
  });

  it('does not start workspace reads after trade persistence rejects', async () => {
    const persistenceError = new Error('trade snapshot not durable');
    const options = baseOptions({
      persistTradeSnapshot: vi.fn().mockRejectedValue(persistenceError),
    });
    await renderHook(options);
    let rejection: unknown;

    await act(async () => {
      try {
        await latestResult?.submitTrade();
      } catch (error) {
        rejection = error;
      }
    });

    expect(rejection).toBe(persistenceError);
    expect(options.loadUserRoster).not.toHaveBeenCalled();
    expect(options.loadTradeActivity).not.toHaveBeenCalled();
    expect(latestResult?.proposing).toBe(false);
  });

  it('does not start trade refresh reads while accepted snapshot persistence is held', async () => {
    let releasePersistence!: () => void;
    const options = baseOptions({
      persistTradeSnapshot: vi.fn(() => new Promise<void>((resolve) => {
        releasePersistence = resolve;
      })),
    });
    await renderHook(options);
    let pending!: Promise<void>;

    await act(async () => {
      pending = latestResult!.submitTrade();
      await vi.waitFor(() => expect(options.persistTradeSnapshot).toHaveBeenCalledTimes(1));
    });
    expect(options.setTradeResult).not.toHaveBeenCalled();
    expect(options.setActiveNegotiation).not.toHaveBeenCalled();
    expect(options.loadUserRoster).not.toHaveBeenCalled();
    expect(options.loadTradeActivity).not.toHaveBeenCalled();

    await act(async () => {
      releasePersistence();
      await pending;
    });
    expect(options.loadUserRoster).toHaveBeenCalledTimes(1);
    expect(options.loadTradeActivity).toHaveBeenCalledTimes(1);
  });
});

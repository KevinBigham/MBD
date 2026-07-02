import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TradeNegotiationView } from '@/workers/sim.worker.trade';
import { useTradeBuilderCoordinator } from './useTradeBuilderCoordinator';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useTradeBuilderCoordinator>[0];
type HookResult = ReturnType<typeof useTradeBuilderCoordinator>;

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
    proposal: { offeringAssets: [], requestingAssets: [] },
    counterOffer: null,
    isComplete: false,
    canAccept: true,
    canCounter: true,
    canReject: true,
    ...overrides,
  };
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useTradeBuilderCoordinator(options));
  return null;
}

describe('useTradeBuilderCoordinator', () => {
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
      addOfferingPlayer: vi.fn(),
      applyNegotiationToBuilderState: vi.fn(),
      applyTradeBuilderSelection: vi.fn(),
      clearTradeState: vi.fn(),
      preselectedPlayerId: null,
      resetBuilderState: vi.fn(),
      resetTradeAssets: vi.fn(),
      resumeNegotiationState: vi.fn(),
      selectTradePartnerState: vi.fn(),
      yourRoster: [{ id: 'u-1' }, { id: 'u-2' }],
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

  it('adds only roster-backed preselected players to the outgoing package', async () => {
    const options = baseOptions({ preselectedPlayerId: 'u-2' });

    await renderHook(options);

    expect(options.addOfferingPlayer).toHaveBeenCalledTimes(1);
    expect(options.addOfferingPlayer).toHaveBeenCalledWith('u-2');

    await renderHook({ ...options, preselectedPlayerId: 'missing-player' });

    expect(options.addOfferingPlayer).toHaveBeenCalledTimes(1);
  });

  it('bridges route callbacks to negotiation state and builder selection helpers', async () => {
    const activeNegotiation = negotiation();
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      latestResult?.resetBuilder();
      latestResult?.clearTrade();
      latestResult?.applyNegotiationToBuilder(activeNegotiation);
      latestResult?.resumeNegotiation(activeNegotiation);
      latestResult?.selectTradePartner('lad');
    });

    expect(options.resetBuilderState).toHaveBeenCalledWith(options.resetTradeAssets);
    expect(options.clearTradeState).toHaveBeenCalledWith(options.resetTradeAssets);
    expect(options.applyNegotiationToBuilderState).toHaveBeenCalledWith(
      activeNegotiation,
      options.applyTradeBuilderSelection,
    );
    expect(options.resumeNegotiationState).toHaveBeenCalledWith(
      activeNegotiation,
      options.applyTradeBuilderSelection,
    );
    expect(options.selectTradePartnerState).toHaveBeenCalledWith('lad', options.resetTradeAssets);
  });

  it('passes null negotiations through so callers can share the same bridge', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      latestResult?.applyNegotiationToBuilder(null);
    });

    expect(options.applyNegotiationToBuilderState).toHaveBeenCalledWith(
      null,
      options.applyTradeBuilderSelection,
    );
  });
});

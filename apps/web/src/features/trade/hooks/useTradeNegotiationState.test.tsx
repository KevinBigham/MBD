import type { TradeAsset } from '@mbd/contracts';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TradeNegotiationView } from '@/workers/sim.worker.trade';
import { useTradeNegotiationState } from './useTradeNegotiationState';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookResult = ReturnType<typeof useTradeNegotiationState>;
type HarnessOptions = {
  initialSelectedTeam?: string;
};

const offeringAssets: TradeAsset[] = [{ type: 'player', playerId: 'u-1' }];
const requestingAssets: TradeAsset[] = [{ type: 'player', playerId: 't-1' }];

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

function HookHarness({
  options,
  onRender,
}: {
  options: HarnessOptions;
  onRender: (result: HookResult, search: string) => void;
}) {
  const [selectedTeam, setSelectedTeam] = useState(options.initialSelectedTeam ?? '');
  const result = useTradeNegotiationState({
    selectedTeam,
    setSelectedTeam,
  });
  const location = useLocation();
  onRender(result, location.search);
  return null;
}

function RouterHarness({
  initialPath,
  options,
  onRender,
}: {
  initialPath: string;
  options: HarnessOptions;
  onRender: (result: HookResult, search: string) => void;
}) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <HookHarness options={options} onRender={onRender} />
    </MemoryRouter>
  );
}

describe('useTradeNegotiationState', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;
  let latestSearch: string;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
    latestSearch = '';
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HarnessOptions> = {}): HarnessOptions {
    return { ...overrides };
  }

  async function renderHook(options: HarnessOptions, initialPath = '/trade') {
    await act(async () => {
      root.render(<RouterHarness
        initialPath={initialPath}
        options={options}
        onRender={(result, search) => {
          latestResult = result;
          latestSearch = search;
        }}
      />);
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  it('resumes linked negotiations into the builder while preserving unrelated query params', async () => {
    const options = baseOptions();
    const applyTradeBuilderSelection = vi.fn();
    await renderHook(options, '/trade?playerId=u-1&negotiationId=neg-1');

    await act(async () => {
      latestResult?.resumeLinkedNegotiation([negotiation()], false, applyTradeBuilderSelection);
    });

    expect(latestResult?.selectedTeam).toBe('bos');
    expect(latestResult?.activeNegotiation?.id).toBe('neg-1');
    expect(latestResult?.tradeResult).toEqual({
      status: 'counter',
      message: 'Resumed active talks with Boston Noreasters. Adjust the package or use the negotiation controls.',
    });
    expect(applyTradeBuilderSelection).toHaveBeenCalledWith({
      offeringPlayerIds: ['u-1'],
      requestingPlayerIds: ['t-1'],
      offeringDraftPicks: [],
      requestingDraftPicks: [],
      offeringIFAAmount: '',
      requestingIFAAmount: '',
    });
    const params = new URLSearchParams(latestSearch);
    expect(params.get('playerId')).toBe('u-1');
    expect(params.get('negotiationId')).toBe('neg-1');
  });

  it('clears active talks and removes only the negotiation deep link on reset', async () => {
    const options = baseOptions();
    const applyTradeBuilderSelection = vi.fn();
    const resetTradeAssets = vi.fn();
    await renderHook(options, '/trade?playerId=u-1&negotiationId=neg-1');

    await act(async () => {
      latestResult?.resumeNegotiation(negotiation(), applyTradeBuilderSelection);
    });
    expect(new URLSearchParams(latestSearch).get('negotiationId')).toBe('neg-1');

    await act(async () => {
      latestResult?.clearTrade(resetTradeAssets);
    });

    expect(resetTradeAssets).toHaveBeenCalledTimes(1);
    expect(latestResult?.activeNegotiation).toBeNull();
    expect(latestResult?.activeCounterOfferId).toBeNull();
    expect(latestResult?.tradeResult).toBeNull();
    const params = new URLSearchParams(latestSearch);
    expect(params.get('playerId')).toBe('u-1');
    expect(params.get('negotiationId')).toBeNull();
  });
});

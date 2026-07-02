import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtensionCandidateView } from '../components/ExtensionCommandCenter';
import type { ExtensionOfferView, ExtensionResponseView } from '../components/RosterExtensionNegotiationModal';
import { useRosterExtensionNegotiation } from './useRosterExtensionNegotiation';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useRosterExtensionNegotiation>[0];
type HookResult = ReturnType<typeof useRosterExtensionNegotiation>;

const candidate: ExtensionCandidateView = {
  playerId: 'ext-1',
  playerName: 'Diego Future',
  position: 'SS',
  yearsRemaining: 1,
  currentSalary: 6.8,
  willingness: 0.78,
  demandMultiplier: 1.12,
};

const offer: ExtensionOfferView = {
  years: 5,
  annualSalary: 12.5,
  totalValue: 62.5,
  noTradeClause: true,
  noTradeClauseType: 'full',
  playerOption: false,
  teamOption: false,
  optOutYears: [4],
  signingBonus: 2,
  buyoutAmount: 0,
  deferredMoney: [],
};

const acceptedResponse: ExtensionResponseView = {
  status: 'accepted',
  rounds: [{ round: 1, status: 'accepted' }],
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useRosterExtensionNegotiation(options));
  return null;
}

describe('useRosterExtensionNegotiation', () => {
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
      autosaveActiveGame: vi.fn().mockResolvedValue(undefined),
      fetchRoster: vi.fn().mockResolvedValue(undefined),
      getExtensionOffer: vi.fn().mockResolvedValue(offer),
      negotiateExtension: vi.fn().mockResolvedValue(acceptedResponse),
      season: 5,
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

  it('opens an extension file from the worker offer and seeds the form controls', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      await latestResult?.openNegotiation(candidate);
    });

    expect(options.getExtensionOffer).toHaveBeenCalledWith('ext-1', 5);
    expect(latestResult?.selectedExtension).toEqual(candidate);
    expect(latestResult?.extensionOffer).toEqual(offer);
    expect(latestResult?.offerYears).toBe(5);
    expect(latestResult?.offerSalary).toBe('12.5');
    expect(latestResult?.offerSigningBonus).toBe('2.0');
    expect(latestResult?.offerNoTrade).toBe(true);
    expect(latestResult?.offerOptOut).toBe(true);
    expect(latestResult?.negotiationResponse).toBeNull();
  });

  it('submits parsed offer terms, autosaves, and refreshes roster data when accepted', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      await latestResult?.openNegotiation(candidate);
    });
    act(() => {
      latestResult?.setOfferYears(4);
      latestResult?.setOfferSalary('15.25');
      latestResult?.setOfferSigningBonus('3.5');
      latestResult?.setOfferNoTrade(false);
      latestResult?.setOfferOptOut(true);
    });

    await act(async () => {
      await latestResult?.submitExtensionOffer();
    });

    expect(options.negotiateExtension).toHaveBeenCalledWith('ext-1', expect.objectContaining({
      years: 4,
      annualSalary: 15.25,
      totalValue: 61,
      signingBonus: 3.5,
      noTradeClause: false,
      noTradeClauseType: 'none',
      optOutYears: [3],
    }));
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 5 });
    expect(options.fetchRoster).toHaveBeenCalledTimes(1);
    expect(latestResult?.negotiationResponse).toEqual(acceptedResponse);
    expect(latestResult?.extensionBusyAction).toBeNull();
  });

  it('does not open a negotiation when the worker has no offer', async () => {
    const options = baseOptions({ getExtensionOffer: vi.fn().mockResolvedValue(null) });
    await renderHook(options);

    await act(async () => {
      await latestResult?.openNegotiation(candidate);
    });

    expect(latestResult?.selectedExtension).toBeNull();
    expect(latestResult?.extensionOffer).toBeNull();
    expect(options.negotiateExtension).not.toHaveBeenCalled();
  });
});

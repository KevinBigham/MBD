import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useOffseasonActionHandlers } from './useOffseasonActionHandlers';
import type { OffseasonData } from './useOffseasonRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useOffseasonActionHandlers>[0];
type HookResult = ReturnType<typeof useOffseasonActionHandlers>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useOffseasonActionHandlers(options));
  return null;
}

function buildOffseasonState(overrides: Partial<OffseasonData> = {}): OffseasonData {
  return {
    currentPhase: 'free_agency',
    phaseDay: 8,
    totalDay: 18,
    completed: false,
    phaseResults: {
      arbitrationResolved: [],
      tenderedPlayers: [],
      nonTenderedPlayers: [],
      extensions: [],
      qualifyingOffers: [],
      coachChanges: [],
      freeAgentSignings: [],
      draftPicks: [],
      ifaSignings: [],
      retiredPlayers: [],
    },
    ...overrides,
  };
}

describe('useOffseasonActionHandlers', () => {
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
      advanceOffseason: vi.fn().mockResolvedValue(buildOffseasonState({ currentPhase: 'draft' })),
      applyOffseasonData: vi.fn(),
      autosaveActiveGame: vi.fn().mockResolvedValue(undefined),
      fetchOffseason: vi.fn().mockResolvedValue(buildOffseasonState()),
      issueQualifyingOffer: vi.fn().mockResolvedValue({ success: true }),
      lockRule5Protection: vi.fn().mockResolvedValue(buildOffseasonState({ currentPhase: 'rule5_draft' })),
      makeRule5Pick: vi.fn().mockResolvedValue({ success: true }),
      passRule5Pick: vi.fn().mockResolvedValue({ success: true }),
      resolveQualifyingOffers: vi.fn().mockResolvedValue({ resolved: [] }),
      resolveRule5OfferBack: vi.fn().mockResolvedValue({ success: true }),
      season: 5,
      skipOffseasonPhase: vi.fn().mockResolvedValue(buildOffseasonState({ currentPhase: 'arbitration' })),
      toggleRule5Protection: vi.fn().mockResolvedValue({ success: true }),
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

  it('applies returned offseason state and autosaves when advancing phases', async () => {
    const nextState = buildOffseasonState({ currentPhase: 'draft' });
    const options = baseOptions({
      advanceOffseason: vi.fn().mockResolvedValue(nextState),
    });
    const hook = await renderHook(options);

    await act(async () => {
      await hook.handleAdvance();
    });

    expect(options.advanceOffseason).toHaveBeenCalledTimes(1);
    expect(options.applyOffseasonData).toHaveBeenCalledWith(nextState);
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 5 });
    expect(latestResult?.advancing).toBe(false);
  });

  it('fetches fresh offseason data and autosaves after successful qualifying-offer actions', async () => {
    const options = baseOptions();
    const hook = await renderHook(options);

    await act(async () => {
      await hook.handleIssueQualifyingOffer('qo-1');
      await hook.handleResolveQualifyingOffers();
    });

    expect(options.issueQualifyingOffer).toHaveBeenCalledWith('qo-1');
    expect(options.resolveQualifyingOffers).toHaveBeenCalledTimes(1);
    expect(options.fetchOffseason).toHaveBeenCalledTimes(2);
    expect(options.autosaveActiveGame).toHaveBeenCalledTimes(2);
  });

  it('does not autosave targeted actions when worker results are not successful', async () => {
    const options = baseOptions({
      makeRule5Pick: vi.fn().mockResolvedValue({ success: false }),
      passRule5Pick: vi.fn().mockResolvedValue({}),
      toggleRule5Protection: vi.fn().mockResolvedValue(null),
    });
    const hook = await renderHook(options);

    await act(async () => {
      await hook.handleToggleProtection('risk-1');
      await hook.handleRule5Pick('pool-1');
      await hook.handlePassRule5Pick();
    });

    expect(options.fetchOffseason).not.toHaveBeenCalled();
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();
    expect(latestResult?.advancing).toBe(false);
  });

  it('forwards Rule 5 offer-back decisions and refreshes successful results', async () => {
    const options = baseOptions();
    const hook = await renderHook(options);

    await act(async () => {
      await hook.handleResolveOfferBack('offer-1', true);
    });

    expect(options.resolveRule5OfferBack).toHaveBeenCalledWith('offer-1', true);
    expect(options.fetchOffseason).toHaveBeenCalledTimes(1);
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 5 });
  });
});

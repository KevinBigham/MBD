import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  useFreeAgencyMarketIntelData,
  type FreeAgencyMarketIntelligenceData,
} from './useFreeAgencyMarketIntelData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useFreeAgencyMarketIntelData>[0];
type HookResult = ReturnType<typeof useFreeAgencyMarketIntelData>;

const marketIntelData: FreeAgencyMarketIntelligenceData = {
  totalFreeAgents: 42,
  summary: {
    totalProjectedSpending: 612.4,
    hottestPosition: 'SP',
    topFreeAgents: [
      { name: 'Marco Reyes', projectedAAV: 34.2 },
      { name: 'Jonah Price', projectedAAV: 27.5 },
    ],
    positionDemand: { SP: 7, CF: 4 },
  },
  reports: [
    {
      playerId: 'fa-market-1',
      playerName: 'Marco Reyes',
      position: 'SP',
      age: 30,
      projectedValue: 36.1,
      demandLevel: 'bidding_war',
      interestedTeamCount: 6,
      signingPrediction: {
        likelyTeamId: 'nym',
        projectedYears: 6,
        projectedAAV: 34.2,
        confidence: 'high',
      },
      comparableContracts: [],
    },
  ],
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useFreeAgencyMarketIntelData(options));
  return null;
}

describe('useFreeAgencyMarketIntelData', () => {
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
    const getFreeAgencyMarketIntelligence = vi.fn().mockResolvedValue(marketIntelData);

    return {
      getFreeAgencyMarketIntelligence,
      options: {
        getFreeAgencyMarketIntelligence,
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

  it('loads free agency market intelligence from the existing worker query', async () => {
    const { getFreeAgencyMarketIntelligence, options } = makeOptions();

    const result = await renderHook(options);

    expect(getFreeAgencyMarketIntelligence).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual(marketIntelData);
    expect(result.loading).toBe(false);
  });

  it('keeps the market intel slot empty when the worker payload is unavailable', async () => {
    const getFreeAgencyMarketIntelligence = vi.fn().mockResolvedValue(null);
    const { options } = makeOptions({ getFreeAgencyMarketIntelligence });

    const result = await renderHook(options);

    expect(getFreeAgencyMarketIntelligence).toHaveBeenCalledTimes(1);
    expect(result.data).toBeNull();
    expect(result.loading).toBe(false);
  });

  it('refetches market intelligence when the worker callable changes', async () => {
    const { getFreeAgencyMarketIntelligence, options } = makeOptions();
    await renderHook(options);

    const nextGetFreeAgencyMarketIntelligence = vi.fn().mockResolvedValue({
      ...marketIntelData,
      totalFreeAgents: 12,
    });
    const result = await renderHook({
      getFreeAgencyMarketIntelligence: nextGetFreeAgencyMarketIntelligence,
    });

    expect(getFreeAgencyMarketIntelligence).toHaveBeenCalledTimes(1);
    expect(nextGetFreeAgencyMarketIntelligence).toHaveBeenCalledTimes(1);
    expect(result.data?.totalFreeAgents).toBe(12);
  });
});

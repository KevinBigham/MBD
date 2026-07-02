import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { FreeAgencyMarketAgent } from '../components/FreeAgencyMarketBoardPanel';
import {
  useFreeAgencyOfferActions,
  type FreeAgencyOfferActionsOptions,
  type FreeAgencyOfferActionsResult,
} from './useFreeAgencyOfferActions';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const powerBat: FreeAgencyMarketAgent = {
  id: 'fa-1',
  firstName: 'Power',
  lastName: 'Bat',
  position: '1B',
  age: 31,
  displayRating: 66,
  letterGrade: 'A',
  marketValue: 22,
  demandLevel: 'elite',
};

function HookHarness({
  options,
  onRender,
}: {
  options: FreeAgencyOfferActionsOptions;
  onRender: (result: FreeAgencyOfferActionsResult) => void;
}) {
  onRender(useFreeAgencyOfferActions(options));
  return null;
}

describe('useFreeAgencyOfferActions', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: FreeAgencyOfferActionsResult | null;

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

  function makeOptions(overrides: Partial<FreeAgencyOfferActionsOptions> = {}) {
    return {
      options: {
        autosaveActiveGame: vi.fn().mockResolvedValue(undefined),
        fetchFreeAgents: vi.fn().mockResolvedValue(undefined),
        finance: {
          totalPayroll: 120,
          budget: 160,
          capSpace: 30,
        },
        makeContractOffer: vi.fn().mockResolvedValue({ accepted: true }),
        playEffect: vi.fn(),
        removeAgentById: vi.fn(),
        season: 6,
        ...overrides,
      } satisfies FreeAgencyOfferActionsOptions,
    };
  }

  async function renderHook(options: FreeAgencyOfferActionsOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latest = result;
      }} />);
      await Promise.resolve();
    });
    expect(latest).toBeTruthy();
    return latest as FreeAgencyOfferActionsResult;
  }

  it('derives budget impact from the current offer salary and clears stale results when selecting a player', async () => {
    const { options } = makeOptions();
    let result = await renderHook(options);

    expect(result.offerBudget).toEqual({
      projectedPayroll: 130,
      budgetRoom: 30,
      taxRoom: 20,
    });

    await act(async () => {
      result.setOfferSalary(24);
      await Promise.resolve();
    });
    result = latest as FreeAgencyOfferActionsResult;
    expect(result.offerBudget).toEqual({
      projectedPayroll: 144,
      budgetRoom: 16,
      taxRoom: 6,
    });

    await act(async () => {
      result.handleSelectPlayer(powerBat);
      await Promise.resolve();
    });
    await act(async () => {
      await latest?.handleOffer();
      await Promise.resolve();
    });
    result = latest as FreeAgencyOfferActionsResult;
    expect(result.offerResult).toBe('Signed! Power Bat joins your team.');

    await act(async () => {
      result.handleSelectPlayer(powerBat);
      await Promise.resolve();
    });
    result = latest as FreeAgencyOfferActionsResult;
    expect(result.selectedPlayer).toBe(powerBat);
    expect(result.offerResult).toBeNull();
  });

  it('submits accepted offers, removes the signed player, autosaves, and refreshes the market', async () => {
    const { options } = makeOptions();
    const result = await renderHook(options);

    await act(async () => {
      result.handleSelectPlayer(powerBat);
      await Promise.resolve();
    });

    await act(async () => {
      await latest?.handleOffer();
      await Promise.resolve();
    });

    expect(options.makeContractOffer).toHaveBeenCalledWith('fa-1', 3, 10);
    expect(options.playEffect).toHaveBeenCalledWith('free_agent_signed');
    expect(options.removeAgentById).toHaveBeenCalledWith('fa-1');
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 6 });
    expect(options.fetchFreeAgents).toHaveBeenCalledTimes(1);
    expect(latest?.selectedPlayer).toBeNull();
    expect(latest?.offerResult).toBe('Signed! Power Bat joins your team.');
  });

  it('surfaces rejected offers without audio, autosave, row removal, or refresh', async () => {
    const { options } = makeOptions({
      makeContractOffer: vi.fn().mockResolvedValue({ accepted: false, reason: 'Needs more years.' }),
    });
    const result = await renderHook(options);

    await act(async () => {
      result.handleSelectPlayer(powerBat);
      await Promise.resolve();
    });

    await act(async () => {
      await latest?.handleOffer();
      await Promise.resolve();
    });

    expect(options.makeContractOffer).toHaveBeenCalledWith('fa-1', 3, 10);
    expect(options.playEffect).not.toHaveBeenCalled();
    expect(options.removeAgentById).not.toHaveBeenCalled();
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();
    expect(options.fetchFreeAgents).not.toHaveBeenCalled();
    expect(latest?.selectedPlayer).toBe(powerBat);
    expect(latest?.offerResult).toBe('Rejected: Needs more years.');
  });

  it('uses the unavailable copy when the worker offer path throws', async () => {
    const { options } = makeOptions({
      makeContractOffer: vi.fn().mockRejectedValue(new Error('not ready')),
    });
    const result = await renderHook(options);

    await act(async () => {
      result.handleSelectPlayer(powerBat);
      await Promise.resolve();
    });

    await act(async () => {
      await latest?.handleOffer();
      await Promise.resolve();
    });

    expect(options.autosaveActiveGame).not.toHaveBeenCalled();
    expect(options.fetchFreeAgents).not.toHaveBeenCalled();
    expect(latest?.offerResult).toBe('Contract offers not available yet.');
  });
});

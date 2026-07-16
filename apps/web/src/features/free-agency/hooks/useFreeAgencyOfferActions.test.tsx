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
        autosaveActiveGame: vi.fn().mockResolvedValue({ saved: true }),
        fetchFreeAgents: vi.fn().mockResolvedValue(undefined),
        finance: {
          totalPayroll: 120,
          budget: 160,
          capSpace: 30,
          ownerPayrollPolicy: {
            archetype: 'win_now',
            floor: 75,
            softCeiling: 150,
            totalPayroll: 120,
            ownerBand: 'on_plan',
            floorShortfall: 0,
            softCeilingRoom: 30,
            softCeilingOverage: 0,
            taxThreshold: 230,
            luxuryTaxPayroll: 100,
            taxBand: 'clear',
            taxRoom: 130,
            taxOverage: 0,
            projectedTax: 0,
          },
        },
        makeContractOffer: vi.fn().mockResolvedValue({ accepted: true }),
        playEffect: vi.fn(),
        publishDurablePresentation: vi.fn(),
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
      ownerFloor: 75,
      ownerSoftCeilingRoom: 20,
      taxLine: 230,
      taxRoom: 120,
    });

    await act(async () => {
      result.setOfferSalary(24);
      await Promise.resolve();
    });
    result = latest as FreeAgencyOfferActionsResult;
    expect(result.offerBudget).toEqual({
      projectedPayroll: 144,
      budgetRoom: 16,
      ownerFloor: 75,
      ownerSoftCeilingRoom: 6,
      taxLine: 230,
      taxRoom: 106,
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

  it('publishes accepted exact-save offers without a second autosave lane', async () => {
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
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();
    expect(options.publishDurablePresentation).toHaveBeenCalledTimes(1);
    expect(options.fetchFreeAgents).toHaveBeenCalledTimes(1);
    expect(vi.mocked(options.publishDurablePresentation).mock.invocationCallOrder[0]!)
      .toBeLessThan(vi.mocked(options.fetchFreeAgents).mock.invocationCallOrder[0]!);
    expect(latest?.selectedPlayer).toBeNull();
    expect(latest?.offerResult).toBe('Signed! Power Bat joins your team.');
  });

  it('does not publish the signing ceremony until the exact offer snapshot is durable', async () => {
    let resolveExactOffer!: (value: { accepted: true; reason?: string }) => void;
    const pendingOffer = new Promise<{ accepted: true; reason?: string }>((resolve) => { resolveExactOffer = resolve; });
    const { options } = makeOptions({
      makeContractOffer: vi.fn().mockReturnValue(pendingOffer),
    });
    const result = await renderHook(options);
    await act(async () => {
      result.handleSelectPlayer(powerBat);
      await Promise.resolve();
    });

    let offer: Promise<void> | undefined;
    await act(async () => {
      offer = latest?.handleOffer();
      await Promise.resolve();
    });
    expect(options.publishDurablePresentation).not.toHaveBeenCalled();
    expect(latest?.offerResult).toBeNull();

    await act(async () => {
      resolveExactOffer({
        accepted: true,
        reason: 'At age 31, the $10.00M AAV and recent playoff standing led the decision.',
      });
      await offer;
    });
    expect(options.publishDurablePresentation).toHaveBeenCalledTimes(1);
    expect(latest?.offerResult).toBe(
      'Signed! Power Bat joins your team. Decision: At age 31, the $10.00M AAV and recent playoff standing led the decision.',
    );
  });

  it('publishes the durable award-and-forfeiture consequence from the accepted worker receipt', async () => {
    const { options } = makeOptions({
      makeContractOffer: vi.fn().mockResolvedValue({
        accepted: true,
        qualifyingOfferCompensation: {
          tier: 'premium',
          forfeitedRound: 1,
          forfeitedOriginalTeamId: 'nym',
        },
      }),
    });
    const result = await renderHook(options);
    await act(async () => {
      result.handleSelectPlayer(powerBat);
      await Promise.resolve();
    });
    await act(async () => {
      await latest?.handleOffer();
    });
    expect(latest?.offerResult).toContain('premium award issued');
    expect(latest?.offerResult).toContain('Round 1 (NYM origin) forfeited');
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
    expect(options.publishDurablePresentation).not.toHaveBeenCalled();
    expect(options.fetchFreeAgents).not.toHaveBeenCalled();
    expect(latest?.selectedPlayer).toBe(powerBat);
    expect(latest?.offerResult).toBe('Rejected: Needs more years.');
  });

  it('does not publish or refresh when exact persistence returns no accepted result', async () => {
    const { options } = makeOptions({
      makeContractOffer: vi.fn().mockResolvedValue({ accepted: false, reason: 'The signing could not be saved.' }),
    });
    const result = await renderHook(options);
    await act(async () => {
      result.handleSelectPlayer(powerBat);
      await Promise.resolve();
    });
    await act(async () => {
      await latest?.handleOffer();
    });

    expect(options.playEffect).not.toHaveBeenCalled();
    expect(options.publishDurablePresentation).not.toHaveBeenCalled();
    expect(options.removeAgentById).not.toHaveBeenCalled();
    expect(options.fetchFreeAgents).not.toHaveBeenCalled();
    expect(latest?.selectedPlayer).toBe(powerBat);
    expect(latest?.offerResult).toBe('Rejected: The signing could not be saved.');
  });

  it('keeps the market unchanged when the exact offer path throws', async () => {
    const { options } = makeOptions({
      makeContractOffer: vi.fn().mockRejectedValue(new Error('disk full')),
    });
    const result = await renderHook(options);
    await act(async () => {
      result.handleSelectPlayer(powerBat);
      await Promise.resolve();
    });
    await act(async () => {
      await latest?.handleOffer();
    });

    expect(options.playEffect).not.toHaveBeenCalled();
    expect(options.publishDurablePresentation).not.toHaveBeenCalled();
    expect(options.removeAgentById).not.toHaveBeenCalled();
    expect(options.fetchFreeAgents).not.toHaveBeenCalled();
    expect(latest?.selectedPlayer).toBe(powerBat);
    expect(latest?.offerResult).toBe('Contract offers not available yet.');
  });

  it('keeps durable signing success when the follow-up market refresh throws', async () => {
    const { options } = makeOptions({
      fetchFreeAgents: vi.fn().mockRejectedValue(new Error('refresh unavailable')),
    });
    const result = await renderHook(options);
    await act(async () => {
      result.handleSelectPlayer(powerBat);
      await Promise.resolve();
    });
    await act(async () => {
      await latest?.handleOffer();
    });

    expect(options.playEffect).toHaveBeenCalledWith('free_agent_signed');
    expect(options.publishDurablePresentation).toHaveBeenCalledTimes(1);
    expect(options.removeAgentById).toHaveBeenCalledWith(powerBat.id);
    expect(options.fetchFreeAgents).toHaveBeenCalledTimes(1);
    expect(latest?.selectedPlayer).toBeNull();
    expect(latest?.offerResult).toBe('Signed! Power Bat joins your team.');
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
    expect(options.publishDurablePresentation).not.toHaveBeenCalled();
    expect(options.fetchFreeAgents).not.toHaveBeenCalled();
    expect(latest?.offerResult).toBe('Contract offers not available yet.');
  });
});

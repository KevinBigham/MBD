import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { DraftPickAsset } from '../components/TradeAssetSelectionGrid';
import { useTradeAssetBuilder } from './useTradeAssetBuilder';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useTradeAssetBuilder>[0];
type HookResult = ReturnType<typeof useTradeAssetBuilder>;

const firstRoundPick: DraftPickAsset = {
  type: 'draft_pick',
  season: 2026,
  round: 1,
  originalTeamId: 'nym',
};

function player(id: string, teamId: string, position = 'SS', age = 25, rating = 70): PlayerDTO {
  return {
    id,
    firstName: 'Test',
    lastName: id,
    age,
    position,
    overallRating: rating,
    displayRating: rating,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId,
    contract: {
      years: 3,
      annualSalary: 20,
      totalValue: 60,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    stats: null,
  } as unknown as PlayerDTO;
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useTradeAssetBuilder(options));
  return null;
}

describe('useTradeAssetBuilder', () => {
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
      onTradeResultChange: vi.fn(),
      season: 4,
      targetRoster: [
        player('t-1', 'bos', 'SP', 27, 73),
        player('t-2', 'bos', 'CF', 22, 68),
      ],
      yourRoster: [
        player('u-1', 'nym', 'SS', 28, 70),
        player('u-2', 'nym', 'SP', 23, 72),
      ],
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

  it('tracks selected trade assets and clears stale trade results only on user edits', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      latestResult?.addOfferingPlayer('u-2');
      latestResult?.addOfferingPlayer('u-2');
    });

    expect(latestResult?.offering).toEqual(['u-2']);
    expect(options.onTradeResultChange).not.toHaveBeenCalled();

    await act(async () => {
      latestResult?.toggleOffer('u-1');
      latestResult?.toggleRequest('t-1');
      latestResult?.toggleOfferingPick(firstRoundPick);
      latestResult?.setOfferingIFAAmount('1.25');
    });

    expect(options.onTradeResultChange).toHaveBeenCalledTimes(4);
    expect(options.onTradeResultChange).toHaveBeenCalledWith(null);
    expect(latestResult?.offering).toEqual(['u-2', 'u-1']);
    expect(latestResult?.requesting).toEqual(['t-1']);
    expect(latestResult?.offeringPicks).toEqual([firstRoundPick]);
    expect(latestResult?.offeringAssets).toEqual([
      { type: 'player', playerId: 'u-2' },
      { type: 'player', playerId: 'u-1' },
      firstRoundPick,
      { type: 'ifa_pool_space', amount: 1.25 },
    ]);

    await act(async () => {
      latestResult?.resetTradeAssets();
    });

    expect(latestResult?.offering).toEqual([]);
    expect(latestResult?.requesting).toEqual([]);
    expect(latestResult?.offeringPicks).toEqual([]);
    expect(latestResult?.requestingPicks).toEqual([]);
    expect(latestResult?.offeringIFAAmount).toBe('');
    expect(latestResult?.requestingIFAAmount).toBe('');
  });

  it('applies worker-backed selections and filters roster rows from selected assets', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      latestResult?.setYourAssetFilter('selected');
      latestResult?.applyTradeBuilderSelection({
        offeringDraftPicks: [firstRoundPick],
        offeringIFAAmount: '0.5',
        offeringPlayerIds: ['u-2'],
        requestingDraftPicks: [],
        requestingIFAAmount: '0.25',
        requestingPlayerIds: ['t-2'],
      });
    });

    expect(options.onTradeResultChange).not.toHaveBeenCalled();
    expect(latestResult?.offering).toEqual(['u-2']);
    expect(latestResult?.requesting).toEqual(['t-2']);
    expect(latestResult?.filteredYourRoster.map((candidate) => candidate.id)).toEqual(['u-2']);
    expect(latestResult?.requestingAssets).toEqual([
      { type: 'player', playerId: 't-2' },
      { type: 'ifa_pool_space', amount: 0.25 },
    ]);
  });

  it('authors and resumes exact player-linked retention and cash terms', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      latestResult?.toggleOffer('u-1');
      latestResult?.setOfferingFinancialTerm('u-1', 'retainedSalary', '5');
      latestResult?.setOfferingFinancialTerm('u-1', 'cashConsideration', '2');
    });

    expect(latestResult?.offeringAssets).toEqual([{
      type: 'player',
      playerId: 'u-1',
      contractReference: { annualSalary: 20, contractEndSeasonExclusive: 7 },
      retainedSalary: { annualAmount: 5, startSeason: 4, endSeasonExclusive: 7 },
      cashConsideration: { amount: 2, season: 4 },
    }]);

    await act(async () => {
      latestResult?.applyTradeBuilderSelection({
        offeringPlayerIds: ['u-2'],
        requestingPlayerIds: [],
        offeringDraftPicks: [],
        requestingDraftPicks: [],
        offeringIFAAmount: '',
        requestingIFAAmount: '',
        offeringFinancialTerms: {
          'u-2': { retainedSalary: '4.5', cashConsideration: '1.25' },
        },
      });
    });

    expect(latestResult?.offeringFinancialTerms).toEqual({
      'u-2': { retainedSalary: '4.5', cashConsideration: '1.25' },
    });
    expect(latestResult?.offeringAssets[0]).toMatchObject({
      playerId: 'u-2',
      retainedSalary: { annualAmount: 4.5 },
      cashConsideration: { amount: 1.25 },
    });
  });
});

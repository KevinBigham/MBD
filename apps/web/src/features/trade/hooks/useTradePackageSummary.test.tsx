import type { TradeAsset } from '@mbd/contracts';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import { useTradePackageSummary } from './useTradePackageSummary';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useTradePackageSummary>[0];
type HookResult = ReturnType<typeof useTradePackageSummary>;

function player(id: string, teamId: string, firstName: string, lastName: string, position: string, age: number, rating: number): PlayerDTO {
  return {
    id,
    firstName,
    lastName,
    age,
    position,
    overallRating: rating,
    displayRating: rating,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId,
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
  onRender(useTradePackageSummary(options));
  return null;
}

describe('useTradePackageSummary', () => {
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

  it('builds player lookup, package summary rows, and package totals from both rosters', async () => {
    const offeringAssets: TradeAsset[] = [
      { type: 'player', playerId: 'u-1' },
      { type: 'ifa_pool_space', amount: 1.25 },
    ];
    const requestingAssets: TradeAsset[] = [
      { type: 'player', playerId: 't-1' },
      { type: 'draft_pick', season: 2026, round: 2, originalTeamId: 'bos' },
    ];

    const result = await renderHook({
      offeringAssets,
      requestingAssets,
      season: 2026,
      targetRoster: [
        player('t-1', 'bos', 'Mookie', 'Target', 'CF', 29, 80),
      ],
      yourRoster: [
        player('u-1', 'nym', 'Pete', 'Offer', '1B', 24, 70),
      ],
    });

    expect(result.playerById('u-1')?.lastName).toBe('Offer');
    expect(result.playerById('t-1')?.lastName).toBe('Target');
    expect(result.playerById('missing')).toBeUndefined();
    expect(result.offeringSummary).toEqual([
      { key: 'player:u-1', label: 'P. Offer · 1B' },
      { key: 'ifa:1.25', label: 'IFA Pool · $1.25M' },
    ]);
    expect(result.requestingSummary).toEqual([
      { key: 'player:t-1', label: 'M. Target · CF' },
      { key: 'draft:2026:2:bos', label: 'R2 2026 · BOS original' },
    ]);
    expect(result.offerTotal).toBeCloseTo(80);
    expect(result.requestTotal).toBeCloseTo(139.6);
  });
});

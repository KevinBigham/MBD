import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  usePlayerComparisonRouteData,
  type PlayerComparisonData,
} from './usePlayerComparisonRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof usePlayerComparisonRouteData>[0];
type HookResult = ReturnType<typeof usePlayerComparisonRouteData>;

const comparisonData: PlayerComparisonData = {
  comparison: {
    attributeComparison: [
      {
        attribute: 'power',
        label: 'Power',
        playerAValue: 62,
        playerBValue: 68,
        advantage: 'playerB',
        differenceDisplay: 6,
        significantGap: true,
      },
    ],
    overallAdvantage: 'playerB',
    advantageMargin: 8.4,
    headToHeadSummary: 'Bea has the stronger bat.',
  },
  statComparison: [
    {
      statName: 'WAR',
      playerAValue: '3.2',
      playerBValue: '4.1',
      advantage: 'playerB',
    },
  ],
  summary: 'Bea Bat brings more immediate star impact.',
  rankedA: [
    { attribute: 'command', label: 'Command', displayRating: 64, letterGrade: 'B+' },
  ],
  rankedB: [
    { attribute: 'power', label: 'Power', displayRating: 68, letterGrade: 'A-' },
  ],
  playerA: {
    id: 'player-a',
    name: 'Ada Ace',
    position: 'SP',
    age: 27,
    teamId: 'nym',
  },
  playerB: {
    id: 'player-b',
    name: 'Bea Bat',
    position: 'RF',
    age: 25,
    teamId: 'bos',
  },
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(usePlayerComparisonRouteData(options));
  return null;
}

describe('usePlayerComparisonRouteData', () => {
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
    const getPlayerComparison = vi.fn().mockResolvedValue(comparisonData);

    return {
      getPlayerComparison,
      options: {
        getPlayerComparison,
        isInitialized: true,
        playerIdA: 'player-a',
        playerIdB: 'player-b',
        workerReady: true,
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

  it('waits without querying until the comparison route can load both players', async () => {
    const { getPlayerComparison, options } = makeOptions({
      playerIdB: '',
    });

    const result = await renderHook(options);

    expect(getPlayerComparison).not.toHaveBeenCalled();
    expect(result.loading).toBe(false);
    expect(result.data).toBeNull();
    expect(result.playerA).toBeNull();
    expect(result.playerB).toBeNull();
  });

  it('loads comparison data and exposes selected player refs', async () => {
    const { getPlayerComparison, options } = makeOptions();

    const result = await renderHook(options);

    expect(getPlayerComparison).toHaveBeenCalledWith('player-a', 'player-b');
    expect(result.loading).toBe(false);
    expect(result.data).toBe(comparisonData);
    expect(result.playerA).toBe(comparisonData.playerA);
    expect(result.playerB).toBe(comparisonData.playerB);
  });

  it('refetches when either selected player changes', async () => {
    const { getPlayerComparison, options } = makeOptions();
    await renderHook(options);

    await renderHook({
      ...options,
      playerIdA: 'player-c',
    });
    await renderHook({
      ...options,
      playerIdA: 'player-c',
      playerIdB: 'player-d',
    });

    expect(getPlayerComparison).toHaveBeenNthCalledWith(1, 'player-a', 'player-b');
    expect(getPlayerComparison).toHaveBeenNthCalledWith(2, 'player-c', 'player-b');
    expect(getPlayerComparison).toHaveBeenNthCalledWith(3, 'player-c', 'player-d');
  });
});

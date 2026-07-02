import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { GamePlayByPlayView } from '../components/BoxScoreContentPanel';
import { useBoxScoreRouteData } from './useBoxScoreRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useBoxScoreRouteData>[0];
type HookResult = ReturnType<typeof useBoxScoreRouteData>;

const boxScoreView: GamePlayByPlayView = {
  gameIndex: 17,
  recap: 'A tight rivalry win.',
  highlights: [],
  plays: [
    { inning: 1, halfInning: 'top', text: 'Smith singles to center.', isHighlight: false },
  ],
  boxScore: {
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeScore: 5,
    awayScore: 3,
    innings: 9,
    homeHits: 10,
    awayHits: 7,
  },
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useBoxScoreRouteData(options));
  return null;
}

describe('useBoxScoreRouteData', () => {
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
    const getGamePlayByPlay = vi.fn().mockResolvedValue(boxScoreView);

    return {
      getGamePlayByPlay,
      options: {
        gameRef: 17,
        getGamePlayByPlay,
        isInitialized: true,
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

  it('waits without querying until game state and worker are ready', async () => {
    const { getGamePlayByPlay, options } = makeOptions({ workerReady: false });

    const result = await renderHook(options);

    expect(getGamePlayByPlay).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.loading).toBe(true);
  });

  it('loads the requested game play-by-play from the existing worker query', async () => {
    const { getGamePlayByPlay, options } = makeOptions();

    const result = await renderHook(options);

    expect(getGamePlayByPlay).toHaveBeenCalledWith(17);
    expect(result.data).toEqual(boxScoreView);
    expect(result.loading).toBe(false);
  });

  it('shows a completed empty state when the worker payload is unavailable', async () => {
    const getGamePlayByPlay = vi.fn().mockResolvedValue(null);
    const { options } = makeOptions({ getGamePlayByPlay });

    const result = await renderHook(options);

    expect(getGamePlayByPlay).toHaveBeenCalledWith(17);
    expect(result.data).toBeNull();
    expect(result.loading).toBe(false);
  });

  it('refetches box score route data when the URL game index changes', async () => {
    const { getGamePlayByPlay, options } = makeOptions();

    await renderHook(options);
    await renderHook({ ...options, gameRef: 18 });

    expect(getGamePlayByPlay).toHaveBeenCalledTimes(2);
    expect(getGamePlayByPlay).toHaveBeenNthCalledWith(2, 18);
  });

  it('loads archived game ids without numeric coercion', async () => {
    const { getGamePlayByPlay, options } = makeOptions({
      gameRef: 'archived-game-s6-d120-nym-bos-rivalry',
    });

    await renderHook(options);

    expect(getGamePlayByPlay).toHaveBeenCalledWith('archived-game-s6-d120-nym-bos-rivalry');
  });
});

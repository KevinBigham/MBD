import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  useEnhancedPlayByPlayData,
  type EnhancedPlayByPlayData,
} from './useEnhancedPlayByPlayData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useEnhancedPlayByPlayData>[0];
type HookResult = ReturnType<typeof useEnhancedPlayByPlayData>;

const enhancedData: EnhancedPlayByPlayData = {
  gameIndex: 21,
  homeTeamId: 'nym',
  awayTeamId: 'bos',
  entries: [
    {
      text: 'Jones hammers a go-ahead double.',
      excitement: 4,
      isHighlight: true,
      situation: 'tie_game_late',
    },
  ],
  highlightCount: 1,
  maxExcitement: 4,
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useEnhancedPlayByPlayData(options));
  return null;
}

describe('useEnhancedPlayByPlayData', () => {
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
    const getEnhancedGamePlayByPlay = vi.fn().mockResolvedValue(enhancedData);

    return {
      getEnhancedGamePlayByPlay,
      options: {
        gameIndex: 21,
        getEnhancedGamePlayByPlay,
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
    const { getEnhancedGamePlayByPlay, options } = makeOptions({ workerReady: false });

    const result = await renderHook(options);

    expect(getEnhancedGamePlayByPlay).not.toHaveBeenCalled();
    expect(result.data).toBeNull();
    expect(result.loading).toBe(true);
  });

  it('loads enhanced play-by-play from the existing worker query', async () => {
    const { getEnhancedGamePlayByPlay, options } = makeOptions();

    const result = await renderHook(options);

    expect(getEnhancedGamePlayByPlay).toHaveBeenCalledWith(21);
    expect(result.data).toEqual(enhancedData);
    expect(result.loading).toBe(false);
  });

  it('keeps the loaded slot empty when the worker payload is unavailable', async () => {
    const getEnhancedGamePlayByPlay = vi.fn().mockResolvedValue(null);
    const { options } = makeOptions({ getEnhancedGamePlayByPlay });

    const result = await renderHook(options);

    expect(getEnhancedGamePlayByPlay).toHaveBeenCalledWith(21);
    expect(result.data).toBeNull();
    expect(result.loading).toBe(false);
  });

  it('refetches enhanced play-by-play when the URL game index changes', async () => {
    const { getEnhancedGamePlayByPlay, options } = makeOptions();

    await renderHook(options);
    await renderHook({ ...options, gameIndex: 22 });

    expect(getEnhancedGamePlayByPlay).toHaveBeenCalledTimes(2);
    expect(getEnhancedGamePlayByPlay).toHaveBeenNthCalledWith(2, 22);
  });
});

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useTradeResultAudio } from './useTradeResultAudio';
import type { TradeResultView } from '../components/TradeResultBanner';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useTradeResultAudio>[0];

function HookHarness({ options }: { options: HookOptions }) {
  useTradeResultAudio(options);
  return null;
}

describe('useTradeResultAudio', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} />);
      await Promise.resolve();
    });
  }

  it('plays the completed-trade effect only when a trade result is accepted', async () => {
    const playEffect = vi.fn();

    await renderHook({
      tradeResult: null,
      playEffect,
    });
    expect(playEffect).not.toHaveBeenCalled();

    await renderHook({
      tradeResult: {
        status: 'counter',
        message: 'Adjust the package and send it back.',
      },
      playEffect,
    });
    expect(playEffect).not.toHaveBeenCalled();

    await renderHook({
      tradeResult: {
        status: 'accepted',
        message: 'Deal completed.',
      },
      playEffect,
    });

    expect(playEffect).toHaveBeenCalledTimes(1);
    expect(playEffect).toHaveBeenCalledWith('trade_completed');
  });

  it('plays again for a new accepted result object from a later action', async () => {
    const playEffect = vi.fn();
    const firstResult: TradeResultView = {
      status: 'accepted',
      message: 'First deal completed.',
    };
    const secondResult: TradeResultView = {
      status: 'accepted',
      message: 'Second deal completed.',
    };

    await renderHook({
      tradeResult: firstResult,
      playEffect,
    });
    await renderHook({
      tradeResult: firstResult,
      playEffect,
    });
    await renderHook({
      tradeResult: secondResult,
      playEffect,
    });

    expect(playEffect).toHaveBeenCalledTimes(2);
    expect(playEffect).toHaveBeenNthCalledWith(1, 'trade_completed');
    expect(playEffect).toHaveBeenNthCalledWith(2, 'trade_completed');
  });
});

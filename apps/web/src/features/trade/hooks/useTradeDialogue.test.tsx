import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useTradeDialogue } from './useTradeDialogue';
import type { TradeDialogueView } from '../components/TradeActivityColumn';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useTradeDialogue>[0];

function makeDialogue(headline: string): TradeDialogueView {
  return {
    mode: 'buyer',
    urgency: 'medium',
    headline,
    lines: ['The value needs to line up before the room moves.'],
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (dialogue: TradeDialogueView | null) => void;
}) {
  onRender(useTradeDialogue(options));
  return null;
}

describe('useTradeDialogue', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: TradeDialogueView | null;

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
  });

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(dialogue) => {
        latest = dialogue;
      }} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    return latest;
  }

  it('clears dialogue and skips worker calls when the market is unavailable', async () => {
    const getTradeDialogue = vi.fn().mockResolvedValue(makeDialogue('Boston keeps the call alive'));

    let dialogue = await renderHook({
      selectedTeam: 'bos',
      isInitialized: true,
      workerReady: true,
      tradeMarketOpen: true,
      offerTotal: 42,
      requestTotal: 44,
      activeCounterOfferId: null,
      getTradeDialogue,
    });

    expect(dialogue?.headline).toBe('Boston keeps the call alive');
    expect(getTradeDialogue).toHaveBeenCalledTimes(1);

    dialogue = await renderHook({
      selectedTeam: 'bos',
      isInitialized: true,
      workerReady: true,
      tradeMarketOpen: false,
      offerTotal: 42,
      requestTotal: 44,
      activeCounterOfferId: null,
      getTradeDialogue,
    });

    expect(dialogue).toBeNull();
    expect(getTradeDialogue).toHaveBeenCalledTimes(1);
  });

  it('loads proposal and counter dialogue with the current package values', async () => {
    const getTradeDialogue = vi.fn().mockResolvedValue(makeDialogue('Boston counter posture'));

    await renderHook({
      selectedTeam: 'bos',
      isInitialized: true,
      workerReady: true,
      tradeMarketOpen: true,
      offerTotal: 37,
      requestTotal: 46,
      activeCounterOfferId: 'offer-9',
      getTradeDialogue,
    });

    expect(getTradeDialogue).toHaveBeenCalledWith('bos', 37, 46, 'counter');
  });

  it('ignores stale dialogue responses after the selected team changes', async () => {
    const first = createDeferred<TradeDialogueView>();
    const second = createDeferred<TradeDialogueView>();
    const getTradeDialogue = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const baseOptions = {
      isInitialized: true,
      workerReady: true,
      tradeMarketOpen: true,
      offerTotal: 30,
      requestTotal: 31,
      activeCounterOfferId: null,
      getTradeDialogue,
    };

    await renderHook({
      ...baseOptions,
      selectedTeam: 'bos',
    });
    await renderHook({
      ...baseOptions,
      selectedTeam: 'sea',
    });

    await act(async () => {
      first.resolve(makeDialogue('Boston stale call'));
      second.resolve(makeDialogue('Seattle current call'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latest?.headline).toBe('Seattle current call');
    expect(getTradeDialogue).toHaveBeenNthCalledWith(1, 'bos', 30, 31, 'proposal');
    expect(getTradeDialogue).toHaveBeenNthCalledWith(2, 'sea', 30, 31, 'proposal');
  });
});

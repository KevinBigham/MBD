import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  PlayerComparisonSearchPicker,
  type PlayerComparisonSearchResult,
} from './PlayerComparisonSearchPicker';
import type { ComparisonPlayerRef } from '../hooks/usePlayerComparisonRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const selectedPlayer: ComparisonPlayerRef = {
  id: 'player-a',
  name: 'Ada Ace',
  position: 'SP',
  age: 27,
  teamId: 'nym',
};

const searchResult: PlayerComparisonSearchResult = {
  id: 'player-b',
  firstName: 'Bea',
  lastName: 'Bat',
  position: 'RF',
  teamId: 'bos',
};

describe('PlayerComparisonSearchPicker', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('searches debounced player results and delegates selection', async () => {
    const onSelect = vi.fn();
    const searchPlayers = vi.fn().mockResolvedValue([searchResult]);

    await act(async () => {
      root.render(
        <PlayerComparisonSearchPicker
          label="Player B"
          onSelect={onSelect}
          searchPlayers={searchPlayers}
          selected={null}
          workerReady
        />,
      );
    });

    const input = container.querySelector('input[placeholder="Search players..."]') as HTMLInputElement;
    expect(input.getAttribute('data-mobile-critical-control')).toBe('player-comparison-search-input');
    expect(input.className).toContain('mobile-critical-control');
    expect(input.className).toContain('focus-ring');

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'Bea');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      vi.advanceTimersByTime(250);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(searchPlayers).toHaveBeenCalledWith('Bea', 10);
    expect(container.textContent).toContain('Bea Bat');
    expect(container.textContent).toContain('RF');

    const resultButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Bea Bat'),
    );

    expect(resultButton?.getAttribute('data-mobile-critical-control')).toBe('player-comparison-result');
    expect(resultButton?.className).toContain('mobile-critical-control');
    expect(resultButton?.className).toContain('focus-ring');

    await act(async () => {
      resultButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(onSelect).toHaveBeenCalledWith('player-b');
    expect(container.querySelector('input')?.getAttribute('value') ?? '').toBe('');
  });

  it('renders a selected player card and delegates clearing the side', async () => {
    const onSelect = vi.fn();

    await act(async () => {
      root.render(
        <PlayerComparisonSearchPicker
          label="Player A"
          onSelect={onSelect}
          searchPlayers={vi.fn()}
          selected={selectedPlayer}
          workerReady
        />,
      );
    });

    expect(container.textContent).toContain('Ada Ace');
    expect(container.textContent).toContain('SP · Age 27');
    expect(container.textContent).toContain('Change');

    const changeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Change'),
    );

    expect(changeButton?.getAttribute('data-mobile-critical-control')).toBe('player-comparison-change');
    expect(changeButton?.className).toContain('mobile-critical-control');
    expect(changeButton?.className).toContain('focus-ring');

    await act(async () => {
      changeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith('');
  });
});

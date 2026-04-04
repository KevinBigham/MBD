import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { GameBoxScore } from '@mbd/sim-core';
import GameRecapCard from './GameRecapCard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createBoxScore(): GameBoxScore {
  return {
    homeTeamId: 'nyy',
    awayTeamId: 'bos',
    homeScore: 5,
    awayScore: 3,
    homeHits: 9,
    awayHits: 7,
    innings: 9,
    isPlayoff: false,
    date: 'S4D88',
    savePitcherId: null,
    paResults: [],
  };
}

describe('GameRecapCard', () => {
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
  });

  it('renders score context and calls onSelect when activated', async () => {
    const onSelect = vi.fn();

    await act(async () => {
      root.render(
        <GameRecapCard
          recap={{
            gameIndex: 14,
            recap: 'Yankees close the door late.',
            highlights: [
              { type: 'homer', text: 'Judge homers in the first.' },
              { type: 'clutch_k', text: 'Closer strands the tying run.' },
            ],
            playByPlay: [],
            boxScore: createBoxScore(),
          }}
          selected={true}
          onSelect={onSelect}
        />,
      );
    });

    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('NYY');
    expect(container.textContent).toContain('3-5');
    expect(container.textContent).toContain('2 highlights');
    expect(container.innerHTML).toContain('border-accent-primary/50');

    const button = container.querySelector('button');
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalledWith(14);
  });
});

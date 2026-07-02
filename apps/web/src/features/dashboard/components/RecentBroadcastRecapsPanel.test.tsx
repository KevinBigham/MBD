import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { GameBoxScore } from '@mbd/sim-core';
import RecentBroadcastRecapsPanel from './RecentBroadcastRecapsPanel';
import type { GameRecapView } from './gameDayBroadcast';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createBoxScore(gameIndex: number): GameBoxScore {
  return {
    homeTeamId: 'nym',
    awayTeamId: gameIndex === 21 ? 'bos' : 'phi',
    homeScore: gameIndex === 21 ? 5 : 2,
    awayScore: gameIndex === 21 ? 3 : 6,
    homeHits: gameIndex === 21 ? 9 : 5,
    awayHits: gameIndex === 21 ? 7 : 11,
    innings: 9,
    isPlayoff: false,
    date: `S4D${80 + gameIndex}`,
    savePitcherId: null,
    paResults: [],
  };
}

function createRecap(gameIndex: number, recap: string): GameRecapView {
  return {
    gameIndex,
    recap,
    highlights: [{ type: 'go-ahead', text: `${recap} highlight.` }],
    playByPlay: [],
    boxScore: createBoxScore(gameIndex),
  };
}

async function flushLazyImports(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await vi.dynamicImportSettled();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

describe('RecentBroadcastRecapsPanel', () => {
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

  it('renders recent game recaps and forwards selection changes', async () => {
    const onSelectGame = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RecentBroadcastRecapsPanel
            recaps={[
              createRecap(21, 'Tycoons close the door late.'),
              createRecap(22, 'Keystones ambush the division rival.'),
            ]}
            selectedGameIndex={22}
            onSelectGame={onSelectGame}
          />
        </MemoryRouter>,
      );
    });
    await flushLazyImports();

    expect(container.textContent).toContain('Game Day');
    expect(container.textContent).toContain('Recent Broadcast Recaps');
    expect(container.textContent).toContain('Last 2');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('PHI');
    expect(container.textContent).toContain('Tycoons close the door late.');
    expect(container.textContent).toContain('Keystones ambush the division rival.');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);

    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons).toHaveLength(2);
    expect(buttons[1]?.className).toContain('border-accent-primary/50');

    await act(async () => {
      buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectGame).toHaveBeenCalledWith(21);
  });

  it('renders the empty broadcast state with the roster action', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <RecentBroadcastRecapsPanel recaps={[]} selectedGameIndex={null} onSelectGame={vi.fn()} />
        </MemoryRouter>,
      );
    });
    await flushLazyImports();

    expect(container.textContent).toContain('Last 0');
    expect(container.textContent).toContain('No recent user-team games');
    expect(container.textContent).toContain('Sim a few regular-season days');

    const rosterLink = container.querySelector('a');
    expect(rosterLink?.getAttribute('href')).toBe('/roster');
    expect(rosterLink?.textContent).toContain('View Roster');
  });
});

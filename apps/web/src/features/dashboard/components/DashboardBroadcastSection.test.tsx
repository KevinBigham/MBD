import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { GameBoxScore } from '@mbd/sim-core';
import DashboardBroadcastSection from './DashboardBroadcastSection';
import type { GameRecapView } from './gameDayBroadcast';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createBoxScore(gameIndex: number): GameBoxScore {
  return {
    homeTeamId: 'nym',
    awayTeamId: gameIndex === 31 ? 'bos' : 'phi',
    homeScore: gameIndex === 31 ? 4 : 2,
    awayScore: gameIndex === 31 ? 3 : 7,
    homeHits: gameIndex === 31 ? 8 : 4,
    awayHits: gameIndex === 31 ? 6 : 12,
    innings: 9,
    isPlayoff: false,
    date: `S5D${90 + gameIndex}`,
    savePitcherId: null,
    paResults: [],
  };
}

function createRecap(gameIndex: number, recap: string): GameRecapView {
  return {
    gameIndex,
    recap,
    highlights: [{ type: 'late-rally', text: `${recap} highlight.` }],
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

describe('DashboardBroadcastSection', () => {
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

  it('renders recaps beside the route-provided play-by-play slot and delegates recap selection', async () => {
    const onSelectGame = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <DashboardBroadcastSection
            playByPlaySlot={<section data-testid="play-by-play-slot">Broadcast Booth Slot</section>}
            recaps={[
              createRecap(31, 'Tycoons walk off under pressure.'),
              createRecap(32, 'Keystones win the rubber game.'),
            ]}
            selectedGameIndex={32}
            onSelectGame={onSelectGame}
          />
        </MemoryRouter>,
      );
    });
    await flushLazyImports();

    expect(container.textContent).toContain('Recent Broadcast Recaps');
    expect(container.textContent).toContain('Tycoons walk off under pressure.');
    expect(container.textContent).toContain('Keystones win the rubber game.');
    expect(container.textContent).toContain('Broadcast Booth Slot');

    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons).toHaveLength(2);

    await act(async () => {
      buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectGame).toHaveBeenCalledWith(31);
  });

  it('keeps the broadcast booth slot visible when there are no recent recaps', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <DashboardBroadcastSection
            playByPlaySlot={<section data-testid="play-by-play-slot">Broadcast Booth Slot</section>}
            recaps={[]}
            selectedGameIndex={null}
            onSelectGame={vi.fn()}
          />
        </MemoryRouter>,
      );
    });
    await flushLazyImports();

    expect(container.textContent).toContain('No recent user-team games');
    expect(container.textContent).toContain('Broadcast Booth Slot');
  });
});

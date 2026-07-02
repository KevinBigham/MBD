import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { GameBoxScore } from '@mbd/sim-core';
import type { GameRecapView } from './gameDayBroadcast';
import GameRecapCardBody from './GameRecapCardBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createRecap(overrides: Partial<GameRecapView> = {}): GameRecapView {
  const boxScore: GameBoxScore = {
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeScore: 5,
    awayScore: 3,
    homeHits: 9,
    awayHits: 7,
    innings: 10,
    isPlayoff: false,
    date: 'S4D88',
    savePitcherId: null,
    paResults: [],
  };

  return {
    gameIndex: 14,
    recap: 'Tycoons close the door late.',
    highlights: [
      { type: 'homer', text: 'Judge homers in the first.' },
      { type: 'clutch_k', text: 'Closer strands the tying run.' },
    ],
    playByPlay: [],
    boxScore,
    ...overrides,
  };
}

describe('GameRecapCardBody', () => {
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

  async function renderBody(recap = createRecap(), selected = true) {
    await act(async () => {
      root.render(<GameRecapCardBody recap={recap} selected={selected} />);
    });
  }

  it('renders matchup, score context, innings, and lead highlight', async () => {
    await renderBody();

    const text = container.textContent ?? '';
    expect(text).toContain('BOS at NYT');
    expect(text).toContain('Tycoons close the door late.');
    expect(text).toContain('Boston Noreasters');
    expect(text).toContain('New York Tycoons');
    expect(text).toContain('3-5');
    expect(text).toContain('Final/10');
    expect(text).toContain('2 highlights');
    expect(text).toContain('Judge homers in the first.');
    expect(container.innerHTML).toContain('text-accent-primary');
  });

  it('uses muted radio tone and singular highlight copy for unselected one-highlight recaps', async () => {
    await renderBody(createRecap({
      highlights: [{ type: 'walk_off', text: 'Walk-off single ends it.' }],
    }), false);

    expect(container.textContent).toContain('1 highlight');
    expect(container.textContent).toContain('Walk-off single ends it.');
    expect(container.innerHTML).toContain('text-dynasty-muted');
    expect(container.innerHTML).not.toContain('text-accent-primary');
  });
});

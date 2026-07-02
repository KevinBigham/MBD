import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import SeasonRecapTransactionsSlide from './SeasonRecapTransactionsSlide';
import type { SeasonRecapData } from './SeasonRecapModalBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const baseData: SeasonRecapData = {
  season: 12,
  teamName: 'New York Tycoons',
  teamId: 'nym',
  record: '98-64',
  winPct: '.605',
  divisionRank: 1,
  gamesBack: 0,
  playoffResult: 'Won World Series',
  isChampion: true,
  statLeaders: {
    hr: null,
    rbi: null,
    avg: null,
    era: null,
    k: null,
    w: null,
  },
  awards: [],
  keyTransactions: Array.from({ length: 10 }, (_, index) => ({
    description: `Move ${index + 1}`,
  })),
  narrative: 'A complete roster turned a strong summer into a franchise-defining fall.',
  storylines: [],
  fanSentiment: null,
  payroll: '$245.0M',
};

describe('SeasonRecapTransactionsSlide', () => {
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

  it('renders key moves while preserving the eight-transaction cap', async () => {
    await act(async () => {
      root.render(<SeasonRecapTransactionsSlide data={baseData} />);
    });

    expect(container.textContent).toContain('Key Moves');
    expect(container.textContent).toContain('Move 1');
    expect(container.textContent).toContain('Move 8');
    expect(container.textContent).not.toContain('Move 9');
    expect(container.textContent).not.toContain('Move 10');
  });
});

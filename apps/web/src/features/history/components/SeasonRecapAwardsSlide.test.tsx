import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import SeasonRecapAwardsSlide from './SeasonRecapAwardsSlide';
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
  awards: [
    { award: 'MVP', playerName: 'Rafael Cruz' },
    { award: 'Cy Young', playerName: 'Mina Stone' },
  ],
  keyTransactions: [],
  narrative: 'A complete roster turned a strong summer into a franchise-defining fall.',
  storylines: [],
  fanSentiment: null,
  payroll: '$245.0M',
};

describe('SeasonRecapAwardsSlide', () => {
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

  it('renders award hardware rows with player names', async () => {
    await act(async () => {
      root.render(<SeasonRecapAwardsSlide data={baseData} />);
    });

    expect(container.textContent).toContain('Hardware');
    expect(container.textContent).toContain('MVP');
    expect(container.textContent).toContain('Rafael Cruz');
    expect(container.textContent).toContain('Cy Young');
    expect(container.textContent).toContain('Mina Stone');
  });
});

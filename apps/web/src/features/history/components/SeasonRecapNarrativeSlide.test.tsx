import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import SeasonRecapNarrativeSlide from './SeasonRecapNarrativeSlide';
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
  keyTransactions: [],
  narrative: 'A complete roster turned a strong summer into a franchise-defining fall.',
  storylines: ['A rookie breakout stabilized the lineup.', 'The bullpen carried October.'],
  fanSentiment: 91,
  payroll: '$245.0M',
};

describe('SeasonRecapNarrativeSlide', () => {
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

  it('renders narrative storylines and fan sentiment', async () => {
    await act(async () => {
      root.render(<SeasonRecapNarrativeSlide data={baseData} />);
    });

    expect(container.textContent).toContain('The Story');
    expect(container.textContent).toContain('franchise-defining fall');
    expect(container.textContent).toContain('rookie breakout');
    expect(container.textContent).toContain('bullpen carried October');
    expect(container.textContent).toContain('Fan Sentiment');
    expect(container.textContent).toContain('91');
  });
});

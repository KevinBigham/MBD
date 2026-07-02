import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  getVisibleSeasonRecapSlides,
  SeasonRecapModalBody,
  type SeasonRecapData,
} from './SeasonRecapModalBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const recapData: SeasonRecapData = {
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
    hr: { name: 'Rafael Cruz', value: '44' },
    rbi: { name: 'Rafael Cruz', value: '121' },
    avg: { name: 'Luis Ortega', value: '.316' },
    era: { name: 'Mina Stone', value: '2.44' },
    k: { name: 'Mina Stone', value: '226' },
    w: { name: 'Diego Alvarez', value: '18' },
  },
  awards: [{ award: 'MVP', playerName: 'Rafael Cruz' }],
  keyTransactions: [{ description: 'Acquired a deadline ace for the playoff push.' }],
  narrative: 'A complete roster turned a strong summer into a franchise-defining fall.',
  storylines: ['A rookie breakout stabilized the lineup.', 'The bullpen carried October.'],
  fanSentiment: 91,
  payroll: '$245.0M',
};

describe('SeasonRecapModalBody', () => {
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

  async function renderBody(slideId: Parameters<typeof SeasonRecapModalBody>[0]['slideId']) {
    await act(async () => {
      root.render(<SeasonRecapModalBody data={recapData} slideId={slideId} reducedMotion />);
    });
  }

  it('renders each year-in-review slide from modal-owned state', async () => {
    await renderBody('title');
    expect(container.textContent ?? '').toContain('Season 12');
    expect(container.textContent ?? '').toContain('World Series Champions');

    await renderBody('record');
    expect(container.textContent ?? '').toContain('98-64');
    expect(container.textContent ?? '').toContain('Won World Series');

    await renderBody('leaders');
    expect(container.textContent ?? '').toContain('Team Leaders');
    expect(container.textContent ?? '').toContain('Rafael Cruz');

    await renderBody('awards');
    expect(container.textContent ?? '').toContain('Hardware');
    expect(container.textContent ?? '').toContain('MVP');

    await renderBody('transactions');
    expect(container.textContent ?? '').toContain('Key Moves');
    expect(container.textContent ?? '').toContain('deadline ace');

    await renderBody('narrative');
    expect(container.textContent ?? '').toContain('A complete roster turned a strong summer');
    expect(container.textContent ?? '').toContain('Fan Sentiment');
  });

  it('keeps optional slide visibility derived from recap data', () => {
    expect(getVisibleSeasonRecapSlides(recapData).map((slide) => slide.id)).toEqual([
      'title',
      'record',
      'leaders',
      'awards',
      'transactions',
      'narrative',
    ]);

    expect(
      getVisibleSeasonRecapSlides({
        ...recapData,
        statLeaders: { hr: null, rbi: null, avg: null, era: null, k: null, w: null },
        awards: [],
        keyTransactions: [],
      }).map((slide) => slide.id),
    ).toEqual(['title', 'record', 'narrative']);
  });
});

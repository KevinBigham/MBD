import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import SeasonRecapLeadersSlide from './SeasonRecapLeadersSlide';
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
    hr: { name: 'Rafael Cruz', value: '44' },
    rbi: null,
    avg: { name: 'Luis Ortega', value: '.316' },
    era: { name: 'Mina Stone', value: '2.44' },
    k: null,
    w: { name: 'Diego Alvarez', value: '18' },
  },
  awards: [],
  keyTransactions: [],
  narrative: 'A complete roster turned a strong summer into a franchise-defining fall.',
  storylines: [],
  fanSentiment: null,
  payroll: '$245.0M',
};

describe('SeasonRecapLeadersSlide', () => {
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

  it('renders only populated team leader categories', async () => {
    await act(async () => {
      root.render(<SeasonRecapLeadersSlide data={baseData} />);
    });

    expect(container.textContent).toContain('Team Leaders');
    expect(container.textContent).toContain('HR');
    expect(container.textContent).toContain('44');
    expect(container.textContent).toContain('Rafael Cruz');
    expect(container.textContent).toContain('AVG');
    expect(container.textContent).toContain('.316');
    expect(container.textContent).toContain('Luis Ortega');
    expect(container.textContent).toContain('ERA');
    expect(container.textContent).toContain('2.44');
    expect(container.textContent).toContain('Mina Stone');
    expect(container.textContent).toContain('W');
    expect(container.textContent).toContain('18');
    expect(container.textContent).toContain('Diego Alvarez');
    expect(container.textContent).not.toContain('RBI');
    expect(container.textContent).not.toContain('K');
  });
});

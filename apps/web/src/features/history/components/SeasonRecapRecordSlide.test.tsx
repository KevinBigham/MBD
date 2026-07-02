import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import SeasonRecapRecordSlide from './SeasonRecapRecordSlide';
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
  divisionRank: 4,
  gamesBack: 7,
  playoffResult: null,
  isChampion: false,
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
  narrative: 'A transition year.',
  storylines: [],
  fanSentiment: null,
  payroll: '$184.0M',
};

describe('SeasonRecapRecordSlide', () => {
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

  it('renders record, division ordinal, games back, postseason fallback, and payroll', async () => {
    await act(async () => {
      root.render(<SeasonRecapRecordSlide data={baseData} />);
    });

    expect(container.textContent).toContain('Final Record');
    expect(container.textContent).toContain('98-64');
    expect(container.textContent).toContain('.605 WIN%');
    expect(container.textContent).toContain('4th');
    expect(container.textContent).toContain('7 GB');
    expect(container.textContent).toContain('Did Not Qualify');
    expect(container.textContent).toContain('Payroll:');
    expect(container.textContent).toContain('$184.0M');
  });

  it('omits games-back and payroll copy when the season has neither', async () => {
    await act(async () => {
      root.render(
        <SeasonRecapRecordSlide
          data={{
            ...baseData,
            divisionRank: 1,
            gamesBack: 0,
            playoffResult: 'Won Wild Card',
            payroll: null,
          }}
        />,
      );
    });

    expect(container.textContent).toContain('1st');
    expect(container.textContent).toContain('Won Wild Card');
    expect(container.textContent).not.toContain('GB');
    expect(container.textContent).not.toContain('Payroll:');
  });
});

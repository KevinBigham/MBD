import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DynastyScorePanel, { type DynastyScoreSummary } from './DynastyScorePanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DynastyScorePanel', () => {
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

  it('renders the grade, total score, and dynasty breakdown', async () => {
    const summary: DynastyScoreSummary = {
      score: 742,
      grade: 'A',
      breakdown: {
        championships: 3,
        worldSeriesAppearances: 5,
        playoffAppearances: 9,
        ninetyWinSeasons: 7,
        divisionTitles: 6,
        losingSeasons: 1,
        awardWinners: 12,
      },
    };

    await act(async () => {
      root.render(<DynastyScorePanel dynastyScore={summary} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Dynasty Score');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('A');
    expect(container.textContent).toContain('742 total points');
    expect(container.textContent).toContain('Titles: 3');
    expect(container.textContent).toContain('Pennants: 5');
    expect(container.textContent).toContain('Playoff trips: 9');
    expect(container.textContent).toContain('Division crowns: 6');
    expect(container.textContent).toContain('90-win years: 7');
    expect(container.textContent).toContain('Award winners: 12');
  });

  it('renders fallback values before the dynasty score loads', async () => {
    await act(async () => {
      root.render(<DynastyScorePanel dynastyScore={null} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('F');
    expect(container.textContent).toContain('0 total points');
    expect(container.textContent).toContain('Titles: 0');
    expect(container.textContent).toContain('Award winners: 0');
  });
});

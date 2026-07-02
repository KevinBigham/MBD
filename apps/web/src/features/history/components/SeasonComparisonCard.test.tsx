import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { SeasonArchiveEntry } from '@mbd/contracts';
import SeasonComparisonCard, { type SeasonComparisonView } from './SeasonComparisonCard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function seasonArchive(season: number, wins: number, payroll: number, budget: number): SeasonArchiveEntry {
  return {
    season,
    standings: [
      {
        teamId: 'team-user',
        wins,
        losses: 162 - wins,
        gamesBack: 0,
        divisionRank: 1,
      },
    ],
    playoffSeries: [],
    awards: [],
    transactions: [],
    draftClass: [],
    financials: [
      {
        teamId: 'team-user',
        payroll,
        budget,
      },
    ],
    timelineEvents: [],
    userSummary: {
      teamId: 'team-user',
      record: `${wins}-${162 - wins}`,
      playoffResult: 'Won World Series',
      storylines: ['Won the World Series'],
    },
    statLeaders: {
      hr: [],
      rbi: [],
      avg: [],
      era: [],
      k: [],
      w: [],
    },
  } as SeasonArchiveEntry;
}

describe('SeasonComparisonCard', () => {
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

  it('renders archived season deltas and current financial values', async () => {
    const comparison: SeasonComparisonView = {
      userTeamId: 'team-user',
      left: seasonArchive(1, 88, 220, 235),
      right: seasonArchive(2, 97, 245, 255),
      deltas: {
        wins: 9,
        payroll: 25,
        budget: 20,
      },
    };

    await act(async () => {
      root.render(<SeasonComparisonCard seasonComparison={comparison} />);
    });

    expect(container.textContent).toContain('Compare Seasons');
    expect(container.textContent).toContain('Season 2 vs Season 1');
    expect(container.textContent).toContain('+9 wins');
    expect(container.textContent).toContain('$245.0M');
    expect(container.textContent).toContain('$25.0M');
    expect(container.textContent).toContain('$255.0M');
    expect(container.textContent).toContain('$20.0M');
  });

  it('renders an empty state until two seasons are selected', async () => {
    await act(async () => {
      root.render(<SeasonComparisonCard seasonComparison={null} />);
    });

    expect(container.textContent).toContain('Compare Seasons');
    expect(container.textContent).toContain('Pick two archived seasons to compare.');
  });
});

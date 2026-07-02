import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { PlayerComparisonResultsPanel } from './PlayerComparisonResultsPanel';
import type { PlayerComparisonData } from '../hooks/usePlayerComparisonRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const comparisonData: PlayerComparisonData = {
  comparison: {
    attributeComparison: [
      {
        attribute: 'power',
        label: 'Power',
        playerAValue: 62,
        playerBValue: 68,
        advantage: 'playerB',
        differenceDisplay: 6,
        significantGap: true,
      },
    ],
    overallAdvantage: 'playerB',
    advantageMargin: 8.4,
    headToHeadSummary: 'Bea has the stronger bat.',
  },
  statComparison: [
    {
      statName: 'WAR',
      playerAValue: '3.2',
      playerBValue: '4.1',
      advantage: 'playerB',
    },
  ],
  summary: 'Bea Bat brings more immediate star impact.',
  rankedA: [
    { attribute: 'command', label: 'Command', displayRating: 64, letterGrade: 'B+' },
  ],
  rankedB: [
    { attribute: 'power', label: 'Power', displayRating: 68, letterGrade: 'A-' },
  ],
  playerA: {
    id: 'player-a',
    name: 'Ada Ace',
    position: 'SP',
    age: 27,
    teamId: 'nym',
  },
  playerB: {
    id: 'player-b',
    name: 'Bea Bat',
    position: 'RF',
    age: 25,
    teamId: 'bos',
  },
};

describe('PlayerComparisonResultsPanel', () => {
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

  it('renders summary, edge, attribute bars, stats, and ranked grades', async () => {
    await act(async () => {
      root.render(<PlayerComparisonResultsPanel data={comparisonData} />);
    });

    expect(container.textContent).toContain('Bea Bat brings more immediate star impact.');
    expect(container.textContent).toContain('Edge: Bea Bat (+8.4%)');
    expect(container.textContent).toContain('Attribute Comparison');
    expect(container.textContent).toContain('Ada Ace');
    expect(container.textContent).toContain('Bea Bat');
    expect(container.textContent).toContain('Power');
    expect(container.textContent).toContain('62');
    expect(container.textContent).toContain('68');
    expect(container.textContent).toContain('Season Stats');
    expect(container.textContent).toContain('WAR');
    expect(container.textContent).toContain('3.2');
    expect(container.textContent).toContain('4.1');
    expect(container.textContent).toContain('Ada Ace - Tool Grades');
    expect(container.textContent).toContain('Command');
    expect(container.textContent).toContain('B+');
  });

  it('omits the edge badge when the comparison is even', async () => {
    await act(async () => {
      root.render(
        <PlayerComparisonResultsPanel
          data={{
            ...comparisonData,
            comparison: {
              ...comparisonData.comparison,
              overallAdvantage: 'even',
              advantageMargin: 0,
            },
          }}
        />,
      );
    });

    expect(container.textContent).not.toContain('Edge:');
  });
});

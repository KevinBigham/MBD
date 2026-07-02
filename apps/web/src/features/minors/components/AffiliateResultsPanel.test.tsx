import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import AffiliateResultsPanel, {
  type AffiliateBoxScoreView,
  type AffiliateResultView,
} from './AffiliateResultsPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const recentBoxScores: AffiliateResultView[] = [
  {
    id: 'box-aaa',
    teamId: 'nym',
    day: 92,
    level: 'AAA',
    label: 'Newark Market Makers',
    shortName: 'Market Makers',
    result: 'W',
    scoreline: '6-3 vs BOS',
    summary: 'The lineup controlled the zone all night.',
  },
  {
    id: 'box-aa',
    teamId: 'nym',
    day: 91,
    level: 'AA',
    label: 'Albany Blue Chips',
    shortName: 'Blue Chips',
    result: 'L',
    scoreline: '4-5 at PHI',
    summary: 'Late bullpen traffic spoiled the comeback.',
  },
];

const selectedBoxScore: AffiliateBoxScoreView = {
  id: 'box-aaa',
  season: 5,
  day: 92,
  level: 'AAA',
  label: 'AAA',
  homeTeamId: 'nym',
  awayTeamId: 'bos',
  homeTeamName: 'Tycoons',
  awayTeamName: 'Noreasters',
  homeShortName: 'Market Makers',
  awayShortName: 'Harbor Fog',
  homeScore: 6,
  awayScore: 3,
  summary: 'The lineup controlled the zone all night.',
  notablePlayers: [
    {
      playerId: 'prospect-1',
      playerName: 'Marco Ascension',
      position: 'SS',
    },
  ],
};

describe('AffiliateResultsPanel', () => {
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

  it('renders recent results, highlights the selected result, delegates result selection, and shows the selected box score', async () => {
    const onSelectBoxScore = vi.fn();

    await act(async () => {
      root.render(
        <AffiliateResultsPanel
          recentBoxScores={recentBoxScores}
          selectedBoxScore={selectedBoxScore}
          selectedBoxScoreId="box-aaa"
          onSelectBoxScore={onSelectBoxScore}
        />,
      );
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('Recent affiliate results');
    expect(content).toContain('Newark Market Makers');
    expect(content).toContain('Day 92');
    expect(content).toContain('W');
    expect(content).toContain('6-3 vs BOS');
    expect(content).toContain('Albany Blue Chips');
    expect(content).toContain('Late bullpen traffic');
    expect(content).toContain('Selected box score');
    expect(content).toContain('Noreasters at Tycoons');
    expect(content).toContain('3-6');
    expect(content).toContain('Notable performers');
    expect(content).toContain('Marco Ascension');
    expect(content).toContain('SS');
    expect(container.querySelector('[data-testid="affiliate-result-mark-nym-box-aaa"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="boxscore-team-mark-bos"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="boxscore-team-mark-nym"]')).not.toBeNull();

    const selectedButton = container.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
    expect(selectedButton?.textContent).toContain('Newark Market Makers');

    const [, secondButton] = Array.from(container.querySelectorAll('button'));
    if (!secondButton) {
      throw new Error('Expected a second affiliate result button to click.');
    }
    await act(async () => {
      secondButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectBoxScore).toHaveBeenCalledWith('box-aa');
  });

  it('renders empty result and selected-score states', async () => {
    await act(async () => {
      root.render(
        <AffiliateResultsPanel
          recentBoxScores={[]}
          selectedBoxScore={null}
          selectedBoxScoreId={null}
          onSelectBoxScore={vi.fn()}
        />,
      );
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('No affiliate box scores yet.');
    expect(content).toContain('Select an affiliate result to inspect the latest box score summary.');
  });
});

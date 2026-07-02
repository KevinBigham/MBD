import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { PlayoffSeriesState } from '@mbd/sim-core';
import type { SeasonFlowPreviewSeries } from '@/app/layout/seasonFlow';
import PlayoffPreviewGrid from './PlayoffPreviewGrid';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const playoffPreview: SeasonFlowPreviewSeries[] = [
  {
    id: 'AL-DS-1',
    round: 'Division Series',
    bestOf: 5,
    home: {
      teamId: 'nym',
      teamName: 'New York Tycoons',
      abbreviation: 'NYT',
      seed: 1,
      placeholder: null,
    },
    away: {
      teamId: 'cle',
      teamName: 'Cleveland Forge',
      abbreviation: 'CLE',
      seed: 3,
      placeholder: null,
    },
  },
  {
    id: 'WS-1',
    round: 'World Series',
    bestOf: 7,
    home: {
      teamId: null,
      teamName: 'AL Champion',
      abbreviation: 'TBD',
      seed: null,
      placeholder: 'AL Champion',
    },
    away: {
      teamId: null,
      teamName: 'NL Champion',
      abbreviation: 'TBD',
      seed: null,
      placeholder: 'NL Champion',
    },
  },
];

const liveSeries = new Map<string, PlayoffSeriesState>([
  [
    'AL-DS-1',
    {
      id: 'AL-DS-1',
      round: 'DIVISION_SERIES',
      league: 'AL',
      bestOf: 5,
      higherSeed: {
        teamId: 'nym',
        seed: 1,
        wins: 101,
        losses: 61,
        league: 'AL',
        divisionWinner: true,
      },
      lowerSeed: {
        teamId: 'cle',
        seed: 3,
        wins: 94,
        losses: 68,
        league: 'AL',
        divisionWinner: true,
      },
      games: [],
      higherSeedWins: 1,
      lowerSeedWins: 0,
      leaderSummary: 'NYY leads 1-0',
      status: 'in_progress',
      winnerId: null,
      loserId: null,
      deficitReached: null,
      deficitTeamId: null,
    },
  ],
]);

describe('PlayoffPreviewGrid', () => {
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

  it('renders round cards from season-flow previews and live bracket series', async () => {
    await act(async () => {
      root.render(
        <PlayoffPreviewGrid
          liveSeries={liveSeries}
          playoffPreview={playoffPreview}
        />,
      );
    });

    expect(container.textContent).toContain('Wild Card');
    expect(container.textContent).toContain('Division Series');
    expect(container.textContent).toContain('AL-DS-1');
    expect(container.textContent).toContain('Best of 5');
    expect(container.textContent).toContain('1 NYM');
    expect(container.textContent).toContain('3 CLE');
    expect(container.textContent).toContain('NYY leads 1-0');
    expect(container.textContent).toContain('World Series');
    expect(container.textContent).toContain('AL Champion');
    expect(container.textContent).toContain('Awaiting matchup');
    expect(container.textContent).toContain('Round will populate once the bracket is set.');
  });
});

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { AwardRaces } from '@mbd/sim-core';
import type { RecordWatchEntry, Rivalry } from '@mbd/contracts';
import HistoryRecordsTabPanel from './HistoryRecordsTabPanel';
import type { RecordBookView } from './RecordsPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const awardRaces: AwardRaces = {
  mvp: [
    { playerId: 'mvp-1', teamId: 'nym', score: 95, summary: 'League-leading OPS and 38 homers.' },
  ],
  cyYoung: [],
  roy: [],
};

const rivalries: Rivalry[] = [
  {
    id: 'nym-bos',
    teamA: 'nym',
    teamB: 'bos',
    intensity: 78,
    summary: 'A heated October rematch has carried into the current pennant race.',
    reasons: ['Playoff rematch'],
    origin: 'playoff',
    currentSeasonWinsA: 4,
    currentSeasonWinsB: 2,
    historicalWinsA: 23,
    historicalWinsB: 19,
  },
];

const recordBook: RecordBookView = {
  franchise: [
    {
      id: 'franchise-hr',
      scope: 'franchise',
      teamId: 'nym',
      category: 'individual_single_season',
      stat: 'hr',
      label: 'Single-season HR',
      qualifier: 'Franchise',
      holders: [
        {
          playerId: 'slugger-1',
          playerName: null,
          teamId: 'nym',
          season: 8,
          value: 61,
          displayValue: '61',
        },
      ],
      trackingFromSeason: 1,
      note: null,
    },
  ],
  league: [],
};

const recordWatch: RecordWatchEntry[] = [
  {
    id: 'watch-hr',
    recordId: 'franchise-hr',
    playerId: 'slugger-2',
    playerName: 'Milo Slugger',
    teamId: 'bos',
    recordLabel: 'Single-season HR',
    currentValue: 55,
    projectedValue: 64,
    holderValue: 61,
    progressRatio: 0.92,
    summary: 'On pace to challenge the franchise mark.',
  },
];

function playerName(playerId: string): string {
  if (playerId === 'mvp-1') return 'Maya Torres';
  if (playerId === 'slugger-1') return 'Arlo Hammer';
  if (playerId === 'slugger-2') return 'Milo Slugger';
  return 'Unknown Player';
}

function teamName(teamId: string | null): string {
  if (teamId === 'nym') return 'New York Tycoons';
  if (teamId === 'bos') return 'Boston Pilgrims';
  return 'Unknown Club';
}

function teamAbbreviation(teamId: string): string {
  if (teamId === 'nym') return 'NYT';
  if (teamId === 'bos') return 'BOS';
  return teamId.toUpperCase();
}

describe('HistoryRecordsTabPanel', () => {
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

  it('composes award watch, rivalry watch, and record panels for the records tab', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <HistoryRecordsTabPanel
            awardRaces={awardRaces}
            playerName={playerName}
            recordBook={recordBook}
            recordWatch={recordWatch}
            rivalries={rivalries}
            teamAbbreviation={teamAbbreviation}
            teamName={teamName}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Current Award Watch');
    expect(container.textContent).toContain('Maya Torres');
    expect(container.textContent).toContain('Rivalry Watch');
    expect(container.textContent).toContain('New York Tycoons vs Boston Pilgrims');
    expect(container.textContent).toContain('Records');
    expect(container.textContent).toContain('Single-season HR');
    expect(container.textContent).toContain('Arlo Hammer');
    expect(container.textContent).toContain('Milo Slugger');
    expect(container.querySelector('a[href="/players/slugger-1"]')).toBeTruthy();
    expect(container.querySelector('a[href="/players/slugger-2"]')).toBeTruthy();
  });
});

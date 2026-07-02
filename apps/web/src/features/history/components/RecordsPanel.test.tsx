import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { RecordBookEntry, RecordWatchEntry } from '@mbd/contracts';
import RecordsPanel, { type RecordBookView } from './RecordsPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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
    {
      id: 'team-wins',
      scope: 'franchise',
      teamId: 'nym',
      category: 'team_single_season',
      stat: 'wins',
      label: 'Team Wins',
      qualifier: null,
      holders: [
        {
          playerId: null,
          playerName: null,
          teamId: 'nym',
          season: 9,
          value: 108,
          displayValue: '108',
        },
      ],
      trackingFromSeason: 1,
      note: null,
    },
  ],
  league: [
    {
      id: 'league-era',
      scope: 'league',
      teamId: null,
      category: 'career',
      stat: 'era',
      label: 'Career ERA',
      qualifier: null,
      holders: [],
      trackingFromSeason: 4,
      note: null,
    },
  ],
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
  if (playerId === 'slugger-1') return 'Arlo Hammer';
  if (playerId === 'slugger-2') return 'Milo Slugger';
  return 'Unknown Player';
}

function teamName(teamId: string | null): string {
  if (teamId === 'nym') return 'New York Tycoons';
  if (teamId === 'bos') return 'Boston Pilgrims';
  return 'Unknown Club';
}

describe('RecordsPanel', () => {
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

  it('renders record book columns and active record-watch entries', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <RecordsPanel
            playerName={playerName}
            recordBook={recordBook}
            recordWatch={recordWatch}
            teamName={teamName}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Records');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Franchise Record Book');
    expect(container.textContent).toContain('Single-season HR');
    expect(container.textContent).toContain('Franchise');
    expect(container.textContent).toContain('Arlo Hammer');
    expect(container.querySelector('a[href="/players/slugger-1"]')).toBeTruthy();
    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('Team Wins');
    expect(container.textContent).toContain('108');
    expect(container.textContent).toContain('League Record Book');
    expect(container.textContent).toContain('Career ERA');
    expect(container.textContent).toContain('Tracking from Season 4.');
    expect(container.textContent).toContain('Active Record Watch');
    expect(container.textContent).toContain('Milo Slugger');
    expect(container.querySelector('a[href="/players/slugger-2"]')).toBeTruthy();
    expect(container.textContent).toContain('Boston Pilgrims');
    expect(container.textContent).toContain('55 now');
    expect(container.textContent).toContain('64 projected');
    expect(container.textContent).toContain('On pace to challenge the franchise mark.');
  });

  it('renders empty record book and watch copy', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <RecordsPanel
            playerName={playerName}
            recordBook={{ franchise: [], league: [] }}
            recordWatch={[]}
            teamName={teamName}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Records');
    expect(container.textContent?.match(/No records tracked yet\./g)).toHaveLength(2);
    expect(container.textContent).toContain('No one is within record range right now.');
  });
});

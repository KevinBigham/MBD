import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { ArchivedSeason, SeasonArchiveEntry } from '@mbd/contracts';
import SeasonDraftPanel from './SeasonDraftPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const emptyLeaders = {
  hr: [],
  rbi: [],
  avg: [],
  era: [],
  k: [],
  w: [],
};

const fullArchive: SeasonArchiveEntry = {
  season: 7,
  standings: [],
  playoffSeries: [],
  awards: [],
  transactions: [],
  draftClass: [
    {
      pickNumber: 3,
      teamId: 'team-user',
      playerId: 'slugger-1',
      playerName: 'Marco Solis',
      currentStatus: 'AA',
    },
    {
      pickNumber: 18,
      teamId: 'team-rival',
      playerId: 'pitcher-1',
      playerName: 'Ian Mercer',
      currentStatus: 'MLB',
    },
  ],
  financials: [],
  timelineEvents: [],
  userSummary: {
    teamId: 'team-user',
    record: '90-72',
    playoffResult: 'Won Wild Card',
    storylines: [],
  },
  statLeaders: emptyLeaders,
};

const emptyDraftArchive: SeasonArchiveEntry = {
  ...fullArchive,
  draftClass: [],
};

const archivedSeason: ArchivedSeason = {
  season: 3,
  standings: [],
  userRecord: { wins: 79, losses: 83 },
  playoffResult: 'Missed playoffs',
  championshipWon: false,
  championTeamId: null,
  mvpName: null,
  cyYoungName: null,
  statLeaders: emptyLeaders,
  dynastyScore: 62,
};

function teamName(teamId: string | null): string {
  if (teamId === 'team-user') return 'User Club';
  if (teamId === 'team-rival') return 'Rival Club';
  return 'Unknown Club';
}

describe('SeasonDraftPanel', () => {
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

  it('renders full archive draft picks with team labels and current statuses', async () => {
    await act(async () => {
      root.render(<SeasonDraftPanel seasonView={fullArchive} teamName={teamName} />);
    });

    expect(container.textContent).toContain('Pick 3');
    expect(container.textContent).toContain('Marco Solis');
    expect(container.textContent).toContain('User Club');
    expect(container.textContent).toContain('AA');
    expect(container.textContent).toContain('Pick 18');
    expect(container.textContent).toContain('Ian Mercer');
    expect(container.textContent).toContain('Rival Club');
    expect(container.textContent).toContain('MLB');
  });

  it('renders full archive empty draft copy', async () => {
    await act(async () => {
      root.render(<SeasonDraftPanel seasonView={emptyDraftArchive} teamName={teamName} />);
    });

    expect(container.textContent).toContain('No draft class has been archived for this season yet.');
  });

  it('renders compact archived-season draft copy', async () => {
    await act(async () => {
      root.render(<SeasonDraftPanel seasonView={archivedSeason} teamName={teamName} />);
    });

    expect(container.textContent).toContain('Detailed draft logs were archived for this season.');
  });
});

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { ArchivedSeason, SeasonArchiveEntry } from '@mbd/contracts';
import SeasonAwardsPanel from './SeasonAwardsPanel';

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
  season: 5,
  standings: [],
  playoffSeries: [],
  awards: [
    {
      season: 5,
      award: 'MVP',
      league: 'AL',
      playerId: 'slugger-1',
      teamId: 'team-user',
      summary: 'A 48-homer season carried the lineup.',
    },
    {
      season: 5,
      award: 'CY_YOUNG',
      league: 'NL',
      playerId: 'pitcher-1',
      teamId: 'team-rival',
      summary: 'A 2.08 ERA led the league.',
    },
  ],
  transactions: [],
  draftClass: [],
  financials: [],
  timelineEvents: [],
  userSummary: {
    teamId: 'team-user',
    record: '95-67',
    playoffResult: 'Won World Series',
    storylines: [],
  },
  statLeaders: emptyLeaders,
};

const archivedSeason: ArchivedSeason = {
  season: 2,
  standings: [],
  userRecord: { wins: 86, losses: 76 },
  playoffResult: 'Missed playoffs',
  championshipWon: false,
  championTeamId: 'team-rival',
  mvpName: null,
  cyYoungName: 'Ace Winters',
  statLeaders: emptyLeaders,
  dynastyScore: 88,
};

function playerName(playerId: string): string {
  if (playerId === 'slugger-1') return 'Riley Stone';
  if (playerId === 'pitcher-1') return 'Elena Vargas';
  return 'Unknown Player';
}

function teamName(teamId: string | null): string {
  if (teamId === 'team-user') return 'User Club';
  if (teamId === 'team-rival') return 'Rival Club';
  return 'Unknown Club';
}

function formatAwardLabel(award: string): string {
  return award === 'CY_YOUNG' ? 'Cy Young' : award;
}

describe('SeasonAwardsPanel', () => {
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

  it('renders full archive award rows with resolved labels', async () => {
    await act(async () => {
      root.render(
        <SeasonAwardsPanel
          seasonView={fullArchive}
          formatAwardLabel={formatAwardLabel}
          playerName={playerName}
          teamName={teamName}
        />,
      );
    });

    expect(container.textContent).toContain('Season 5 AL MVP');
    expect(container.textContent).toContain('User Club');
    expect(container.textContent).toContain('Riley Stone');
    expect(container.textContent).toContain('48-homer season');
    expect(container.textContent).toContain('Season 5 NL Cy Young');
    expect(container.textContent).toContain('Rival Club');
    expect(container.textContent).toContain('Elena Vargas');
  });

  it('renders compact archived-season MVP and Cy Young summaries', async () => {
    await act(async () => {
      root.render(
        <SeasonAwardsPanel
          seasonView={archivedSeason}
          formatAwardLabel={formatAwardLabel}
          playerName={playerName}
          teamName={teamName}
        />,
      );
    });

    expect(container.textContent).toContain('MVP');
    expect(container.textContent).toContain('No archived MVP summary');
    expect(container.textContent).toContain('Cy Young');
    expect(container.textContent).toContain('Ace Winters');
  });
});

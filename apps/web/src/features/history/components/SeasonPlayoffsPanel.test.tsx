import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { ArchivedSeason, SeasonArchiveEntry } from '@mbd/contracts';
import SeasonPlayoffsPanel from './SeasonPlayoffsPanel';

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
  season: 4,
  standings: [],
  playoffSeries: [
    {
      round: 'Division Series',
      winnerTeamId: 'team-user',
      loserTeamId: 'team-rival',
      result: '3-1',
    },
    {
      round: 'World Series',
      winnerTeamId: 'team-other',
      loserTeamId: 'team-user',
      result: '4-2',
    },
  ],
  awards: [],
  transactions: [],
  draftClass: [],
  financials: [],
  timelineEvents: [],
  userSummary: {
    teamId: 'team-user',
    record: '94-68',
    playoffResult: 'Lost World Series',
    storylines: [],
  },
  statLeaders: emptyLeaders,
};

const archivedSeason: ArchivedSeason = {
  season: 1,
  standings: [],
  userRecord: { wins: 90, losses: 72 },
  playoffResult: null,
  championshipWon: true,
  championTeamId: 'team-user',
  mvpName: null,
  cyYoungName: null,
  statLeaders: emptyLeaders,
  dynastyScore: 120,
};

const teamName = (teamId: string | null): string => {
  if (teamId === 'team-user') return 'User Club';
  if (teamId === 'team-rival') return 'Rival Club';
  if (teamId === 'team-other') return 'Other Club';
  return 'Unknown Club';
};

describe('SeasonPlayoffsPanel', () => {
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

  it('renders full archive playoff series cards', async () => {
    await act(async () => {
      root.render(<SeasonPlayoffsPanel seasonView={fullArchive} teamName={teamName} />);
    });

    expect(container.textContent).toContain('Division Series');
    expect(container.textContent).toContain('3-1');
    expect(container.textContent).toContain('User Club def. Rival Club');
    expect(container.textContent).toContain('World Series');
    expect(container.textContent).toContain('Other Club def. User Club');
  });

  it('renders compact archived-season playoff result and champion', async () => {
    await act(async () => {
      root.render(<SeasonPlayoffsPanel seasonView={archivedSeason} teamName={teamName} />);
    });

    expect(container.textContent).toContain('Won World Series');
    expect(container.textContent).toContain('Champion: User Club');
  });
});

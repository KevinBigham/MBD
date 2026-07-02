import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { ArchivedSeason, SeasonArchiveEntry } from '@mbd/contracts';
import SeasonTransactionsPanel from './SeasonTransactionsPanel';

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
  season: 6,
  standings: [],
  playoffSeries: [],
  awards: [],
  transactions: [
    {
      headline: 'Deadline ace lands in Queens',
      summary: 'The rotation stabilized after a three-player blockbuster.',
      playerIds: ['ace-1'],
      teamIds: ['team-user'],
      impactScore: 8.42,
    },
    {
      headline: 'Prospect package resets rival',
      summary: 'A division rival pivoted toward a longer rebuild.',
      playerIds: ['prospect-1'],
      teamIds: ['team-rival'],
      impactScore: 5,
    },
  ],
  draftClass: [],
  financials: [],
  timelineEvents: [],
  userSummary: {
    teamId: 'team-user',
    record: '96-66',
    playoffResult: 'Lost Championship Series',
    storylines: [],
  },
  statLeaders: emptyLeaders,
};

const archivedSeason: ArchivedSeason = {
  season: 2,
  standings: [],
  userRecord: { wins: 82, losses: 80 },
  playoffResult: 'Missed playoffs',
  championshipWon: false,
  championTeamId: null,
  mvpName: null,
  cyYoungName: null,
  statLeaders: emptyLeaders,
  dynastyScore: 74,
};

describe('SeasonTransactionsPanel', () => {
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

  it('renders full archive transaction headlines, impact, and summaries', async () => {
    await act(async () => {
      root.render(<SeasonTransactionsPanel seasonView={fullArchive} />);
    });

    expect(container.textContent).toContain('Deadline ace lands in Queens');
    expect(container.textContent).toContain('8.4 impact');
    expect(container.textContent).toContain('rotation stabilized');
    expect(container.textContent).toContain('Prospect package resets rival');
    expect(container.textContent).toContain('5.0 impact');
    expect(container.textContent).toContain('longer rebuild');
  });

  it('renders compact archived-season transaction copy', async () => {
    await act(async () => {
      root.render(<SeasonTransactionsPanel seasonView={archivedSeason} />);
    });

    expect(container.textContent).toContain('Detailed transaction logs were archived for this season.');
  });
});

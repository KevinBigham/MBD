import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { ArchivedSeason, SeasonArchiveEntry } from '@mbd/contracts';
import SeasonFinancialsPanel from './SeasonFinancialsPanel';

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
  season: 8,
  standings: [],
  playoffSeries: [],
  awards: [],
  transactions: [],
  draftClass: [],
  financials: [
    {
      teamId: 'team-user',
      payroll: 148.4,
      budget: 174.2,
    },
    {
      teamId: 'team-rival',
      payroll: 211,
      budget: 225.8,
    },
  ],
  timelineEvents: [],
  userSummary: {
    teamId: 'team-user',
    record: '94-68',
    playoffResult: 'Won Division',
    storylines: [],
  },
  statLeaders: emptyLeaders,
};

const archivedSeason: ArchivedSeason = {
  season: 2,
  standings: [],
  userRecord: { wins: 81, losses: 81 },
  playoffResult: 'Missed playoffs',
  championshipWon: false,
  championTeamId: null,
  mvpName: null,
  cyYoungName: null,
  statLeaders: emptyLeaders,
  dynastyScore: 56,
};

function teamName(teamId: string | null): string {
  if (teamId === 'team-user') return 'User Club';
  if (teamId === 'team-rival') return 'Rival Club';
  return 'Unknown Club';
}

function formatMoney(value: number | null | undefined): string {
  return value == null ? '--' : `$${value.toFixed(1)}M`;
}

describe('SeasonFinancialsPanel', () => {
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

  it('renders full archive payroll and budget rows with team labels', async () => {
    await act(async () => {
      root.render(
        <SeasonFinancialsPanel
          seasonView={fullArchive}
          teamName={teamName}
          formatMoney={formatMoney}
        />,
      );
    });

    expect(container.textContent).toContain('User Club');
    expect(container.textContent).toContain('$148.4M');
    expect(container.textContent).toContain('Budget $174.2M');
    expect(container.textContent).toContain('Rival Club');
    expect(container.textContent).toContain('$211.0M');
    expect(container.textContent).toContain('Budget $225.8M');
  });

  it('renders compact archived-season payroll copy', async () => {
    await act(async () => {
      root.render(
        <SeasonFinancialsPanel
          seasonView={archivedSeason}
          teamName={teamName}
          formatMoney={formatMoney}
        />,
      );
    });

    expect(container.textContent).toContain('Detailed payroll archives were compressed for this season.');
  });
});

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type {
  AwardHistoryEntry,
  SeasonArchiveDraftPick,
  SeasonArchiveFinancial,
  SeasonArchivePlayoffSeries,
  SeasonArchiveStanding,
  SeasonArchiveTransaction,
} from '@mbd/contracts';
import SeasonStandingsPanel, { type SeasonStandingsGroup } from './SeasonStandingsPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const groups: SeasonStandingsGroup[] = [
  {
    division: 'AL_EAST',
    label: 'AL EAST',
    entries: [
      {
        teamId: 'team-user',
        wins: 96,
        losses: 66,
        divisionRank: 1,
        gamesBack: 0,
      },
      {
        teamId: 'team-rival',
        wins: 89,
        losses: 73,
        divisionRank: 2,
        gamesBack: 7,
      },
    ],
  },
  {
    division: 'NL_WEST',
    label: 'NL WEST',
    entries: [
      {
        teamId: 'team-west',
        wins: 101,
        losses: 61,
        divisionRank: 1,
        gamesBack: 0,
      },
    ],
  },
];

const selectedStanding: SeasonArchiveStanding = {
  teamId: 'team-user',
  wins: 96,
  losses: 66,
  divisionRank: 1,
  gamesBack: 0,
};

const financial: SeasonArchiveFinancial = {
  teamId: 'team-user',
  payroll: 228,
  budget: 245,
};

const playoffSeries: SeasonArchivePlayoffSeries[] = [
  {
    round: 'World Series',
    winnerTeamId: 'team-user',
    loserTeamId: 'team-west',
    result: '4-1',
  },
];

const awards: AwardHistoryEntry[] = [
  {
    season: 8,
    award: 'mvp',
    league: 'AL',
    playerId: 'player-mvp',
    teamId: 'team-user',
    summary: 'Carried the lineup.',
  },
];

const transactions: SeasonArchiveTransaction[] = [
  { headline: 'Added a deadline ace', summary: '', playerIds: [], teamIds: ['team-user'], impactScore: 8.5 },
];

const draftPicks: SeasonArchiveDraftPick[] = [
  {
    pickNumber: 18,
    playerId: 'draft-1',
    playerName: 'Cornerstone Arm',
    teamId: 'team-user',
    currentStatus: 'AAA',
  },
];

function teamName(teamId: string | null): string {
  if (teamId === 'team-user') return 'User Club';
  if (teamId === 'team-rival') return 'Rival Club';
  if (teamId === 'team-west') return 'West Club';
  return 'Unknown Club';
}

describe('SeasonStandingsPanel', () => {
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

  it('renders standings groups and route-derived selected team detail', async () => {
    const onSelectTeam = vi.fn();

    await act(async () => {
      root.render(
        <SeasonStandingsPanel
          awards={awards}
          divisionLabelForTeam={() => 'AL East'}
          draftPicks={draftPicks}
          financial={financial}
          formatAwardLabel={(award) => award.toUpperCase()}
          formatMoney={(value) => value == null ? '--' : `$${value.toFixed(1)}M`}
          groups={groups}
          onSelectTeam={onSelectTeam}
          playoffSeries={playoffSeries}
          selectedTeamId="team-user"
          standing={selectedStanding}
          teamName={teamName}
          transactions={transactions}
        />,
      );
    });

    expect(container.textContent).toContain('AL EAST');
    expect(container.textContent).toContain('NL WEST');
    expect(container.textContent).toContain('User Club');
    expect(container.textContent).toContain('Rank 1 · GB 0');
    expect(container.textContent).toContain('96-66');
    expect(container.textContent).toContain('Rival Club');
    expect(container.textContent).toContain('Rank 2 · GB 7');
    expect(container.textContent).toContain('West Club');
    expect(container.textContent).toContain('Team Season Detail');
    expect(container.textContent).toContain('AL East · 96-66');
    expect(container.textContent).toContain('$228.0M');
    expect(container.textContent).toContain('World Series · User Club def. West Club (4-1)');
    expect(container.textContent).toContain('AL MVP');
    expect(container.textContent).toContain('Added a deadline ace');
    expect(container.textContent).toContain('Pick 18: Cornerstone Arm · AAA');

    const rivalButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Rival Club'),
    );
    expect(rivalButton).toBeTruthy();

    await act(async () => {
      rivalButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectTeam).toHaveBeenCalledWith('team-rival');
  });

  it('passes through the no-team-selected prompt from the detail card', async () => {
    await act(async () => {
      root.render(
        <SeasonStandingsPanel
          awards={[]}
          divisionLabelForTeam={() => 'Unknown'}
          draftPicks={[]}
          financial={null}
          formatAwardLabel={(award) => award}
          formatMoney={() => '--'}
          groups={groups}
          onSelectTeam={() => undefined}
          playoffSeries={[]}
          selectedTeamId={null}
          standing={null}
          teamName={teamName}
          transactions={[]}
        />,
      );
    });

    expect(container.textContent).toContain('Pick a team from the standings to inspect that season.');
  });
});

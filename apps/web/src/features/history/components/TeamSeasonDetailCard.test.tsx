import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type {
  AwardHistoryEntry,
  SeasonArchiveDraftPick,
  SeasonArchiveFinancial,
  SeasonArchivePlayoffSeries,
  SeasonArchiveStanding,
  SeasonArchiveTransaction,
} from '@mbd/contracts';
import TeamSeasonDetailCard from './TeamSeasonDetailCard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const standing: SeasonArchiveStanding = {
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
    loserTeamId: 'team-rival',
    result: '4-2',
  },
];

const awards: AwardHistoryEntry[] = [
  {
    season: 3,
    award: 'mvp',
    league: 'AL',
    playerId: 'player-mvp',
    teamId: 'team-user',
    summary: 'Led the league in everything that mattered.',
  },
];

const transactions: SeasonArchiveTransaction[] = [
  { headline: 'Acquired a playoff ace', summary: '', playerIds: [], teamIds: ['team-user'], impactScore: 9.1 },
  { headline: 'Extended the captain', summary: '', playerIds: [], teamIds: ['team-user'], impactScore: 7.2 },
  { headline: 'Promoted a rookie closer', summary: '', playerIds: [], teamIds: ['team-user'], impactScore: 5.5 },
  { headline: 'Fourth headline hidden', summary: '', playerIds: [], teamIds: ['team-user'], impactScore: 4.1 },
];

const draftPicks: SeasonArchiveDraftPick[] = [
  {
    pickNumber: 12,
    playerId: 'draft-1',
    playerName: 'Future Star',
    teamId: 'team-user',
    currentStatus: 'AA breakout',
  },
];

describe('TeamSeasonDetailCard', () => {
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

  it('renders selected team season details from route-derived archive data', async () => {
    await act(async () => {
      root.render(
        <TeamSeasonDetailCard
          awards={awards}
          divisionLabelForTeam={() => 'AL East'}
          draftPicks={draftPicks}
          financial={financial}
          formatAwardLabel={(award) => award.toUpperCase()}
          formatMoney={(value) => `$${(value ?? 0).toFixed(1)}M`}
          playoffSeries={playoffSeries}
          selectedTeamId="team-user"
          standing={standing}
          teamName={(teamId) => teamId === 'team-rival' ? 'Rival Club' : 'User Club'}
          transactions={transactions}
        />,
      );
    });

    expect(container.textContent).toContain('Team Season Detail');
    expect(container.textContent).toContain('User Club');
    expect(container.textContent).toContain('AL East · 96-66');
    expect(container.textContent).toContain('$228.0M');
    expect(container.textContent).toContain('$245.0M');
    expect(container.textContent).toContain('World Series · User Club def. Rival Club (4-2)');
    expect(container.textContent).toContain('AL MVP');
    expect(container.textContent).toContain('Acquired a playoff ace');
    expect(container.textContent).toContain('Extended the captain');
    expect(container.textContent).toContain('Promoted a rookie closer');
    expect(container.textContent).not.toContain('Fourth headline hidden');
    expect(container.textContent).toContain('Pick 12: Future Star · AA breakout');
  });

  it('renders a pick-team prompt when no team standing is selected', async () => {
    await act(async () => {
      root.render(
        <TeamSeasonDetailCard
          awards={[]}
          divisionLabelForTeam={() => 'Unknown'}
          draftPicks={[]}
          financial={null}
          formatAwardLabel={(award) => award}
          formatMoney={() => '$0.0M'}
          playoffSeries={[]}
          selectedTeamId={null}
          standing={null}
          teamName={(teamId) => teamId ?? 'Unknown'}
          transactions={[]}
        />,
      );
    });

    expect(container.textContent).toContain('Pick a team from the standings to inspect that season.');
  });
});

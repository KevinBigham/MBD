import { describe, expect, it } from 'vitest';
import type {
  ArchivedSeason,
  AwardHistoryEntry,
  RecordWatchEntry,
  Rivalry,
  SeasonArchiveEntry,
  SeasonHistoryEntry,
} from '@mbd/contracts';
import type { AwardRaces } from '@mbd/sim-core';
import type { RecordBookView } from '../components/RecordsPanel';
import type { DynastyTimelineEntryLike } from './buildDynastyTimelineChapters';
import type { HallOfFameEntryView } from '../components/HallOfFamePanel';
import {
  buildSeasonRecapData,
  collectHistoryIds,
  formatMoney,
  groupArchiveStandings,
  sortSeasonsDescending,
} from './historyPageTransforms';

const emptyLeaders = {
  hr: [],
  rbi: [],
  avg: [],
  era: [],
  k: [],
  w: [],
};

describe('historyPageTransforms', () => {
  it('sorts seasons newest-first without mutating the original list', () => {
    const seasons = [4, 1, 7, 3];

    expect(sortSeasonsDescending(seasons)).toEqual([7, 4, 3, 1]);
    expect(seasons).toEqual([4, 1, 7, 3]);
  });

  it('collects unique player and team ids across history surfaces', () => {
    const ids = collectHistoryIds(
      {
        mvp: [{ playerId: 'player-award-race', teamId: 'team-race', score: 10, summary: 'MVP race' }],
        cyYoung: [],
        roy: [],
      } as AwardRaces,
      [
        { playerId: 'player-award', teamId: 'team-award' },
      ] as AwardHistoryEntry[],
      [
        {
          awards: [{ playerId: 'player-award', teamId: 'team-award' }],
          statLeaders: {
            ...emptyLeaders,
            hr: [{ playerId: 'player-hr', teamId: 'team-hr', value: '44', summary: '44 HR' }],
          },
          notableRetirements: [{ playerId: 'player-retired', teamId: 'team-retired' }],
          blockbusterTrades: [{ playerIds: ['player-traded'], teamIds: ['team-traded-a', 'team-traded-b'] }],
          championTeamId: 'team-champ',
          runnerUpTeamId: 'team-runner-up',
        },
      ] as unknown as SeasonHistoryEntry[],
      [
        {
          playerMomentBeats: [
            { playerId: 'player-moment', teamId: 'team-moment' },
          ],
          teamMomentBeats: [
            { teamId: 'team-memory-primary', teamIds: ['team-memory-primary', 'team-memory-rival'] },
          ],
        },
      ] as unknown as DynastyTimelineEntryLike[],
      [
        {
          awards: [{ playerId: 'player-archive-award', teamId: 'team-archive-award' }],
          statLeaders: emptyLeaders,
          standings: [{ teamId: 'team-standings' }],
          playoffSeries: [{ winnerTeamId: 'team-series-winner', loserTeamId: 'team-series-loser' }],
          transactions: [{ playerIds: ['player-tx'], teamIds: ['team-tx'] }],
          draftClass: [{ playerId: 'player-draft', teamId: 'team-draft' }],
          financials: [{ teamId: 'team-finance' }],
          userSummary: { teamId: 'team-user-summary' },
        },
      ] as unknown as SeasonArchiveEntry[],
      [
        {
          standings: [{ teamId: 'team-archived-standing' }],
          championTeamId: 'team-archived-champ',
          statLeaders: {
            ...emptyLeaders,
            k: [{ playerId: 'player-k', teamId: 'team-k', value: '210', summary: '210 K' }],
          },
        },
      ] as unknown as ArchivedSeason[],
      {
        franchise: [
          { holders: [{ playerId: 'player-record', teamId: 'team-record' }] },
        ],
        league: [],
      } as unknown as RecordBookView,
      [
        { playerId: 'player-watch', teamId: 'team-watch' },
      ] as RecordWatchEntry[],
      [
        { teamA: 'team-rival-a', teamB: 'team-rival-b' },
      ] as Rivalry[],
      [
        { playerId: 'player-hof', teamIds: ['team-hof-a', 'team-hof-b'] },
      ] as HallOfFameEntryView[],
    );

    expect(ids.playerIds).toEqual([
      'player-award-race',
      'player-award',
      'player-hof',
      'player-moment',
      'player-record',
      'player-watch',
      'player-hr',
      'player-retired',
      'player-traded',
      'player-archive-award',
      'player-tx',
      'player-draft',
      'player-k',
    ]);
    expect(ids.teamIds).toContain('team-race');
    expect(ids.teamIds).toContain('team-hof-a');
    expect(ids.teamIds).toContain('team-series-winner');
    expect(ids.teamIds).toContain('team-memory-rival');
    expect(ids.teamIds).toContain('team-rival-b');
    expect(ids.teamIds.filter((teamId) => teamId === 'team-award')).toHaveLength(1);
  });

  it('builds user-team recap data from a full season archive', () => {
    const archive = {
      season: 10,
      standings: [
        { teamId: 'user-team', wins: 94, losses: 68, divisionRank: 1, gamesBack: 0 },
      ],
      playoffSeries: [],
      awards: [
        { award: 'MVP', playerId: 'player-mvp', teamId: 'user-team' },
        { award: 'Cy Young', playerId: 'player-other', teamId: 'other-team' },
      ],
      statLeaders: {
        ...emptyLeaders,
        hr: [{ playerId: 'player-slugger', teamId: 'user-team', value: '49', summary: '49 HR' }],
      },
      transactions: [
        { headline: 'Added a deadline starter' },
      ],
      draftClass: [],
      financials: [
        { teamId: 'user-team', payroll: 188.4 },
      ],
      userSummary: {
        teamId: 'user-team',
        record: '94-68',
        playoffResult: 'Won the division',
        storylines: ['A young core arrived early.'],
      },
    } as unknown as SeasonArchiveEntry;
    const seasonHistory = {
      season: 10,
      championTeamId: 'user-team',
      summary: 'The city has a new October standard.',
      keyMoments: ['Closed out the pennant race.'],
      userSeason: null,
    } as unknown as SeasonHistoryEntry;

    const recap = buildSeasonRecapData(archive, seasonHistory, 'user-team', {
      players: {
        'player-mvp': 'Maya Power',
        'player-slugger': 'Riley Anchor',
      },
      teams: {},
    });

    expect(recap).toMatchObject({
      season: 10,
      teamName: 'user-team',
      record: '94-68',
      winPct: '0.580',
      playoffResult: 'Won the division',
      isChampion: true,
      payroll: '$188.4M',
    });
    expect(recap.statLeaders.hr).toEqual({ name: 'Riley Anchor', value: '49' });
    expect(recap.awards).toEqual([{ award: 'MVP', playerName: 'Maya Power' }]);
    expect(recap.keyTransactions).toEqual([{ description: 'Added a deadline starter' }]);
    expect(recap.narrative).toContain('The city has a new October standard.');
    expect(recap.storylines).toEqual(['A young core arrived early.']);
  });

  it('groups archive standings by division and formats nullable money values', () => {
    const groups = groupArchiveStandings({
      standings: [
        { teamId: 'alpha', wins: 80, losses: 82, divisionRank: 2 },
        { teamId: 'beta', wins: 90, losses: 72, divisionRank: 1 },
      ],
    } as unknown as SeasonArchiveEntry);

    expect(groups).toEqual([
      {
        division: 'LEAGUE',
        label: 'LEAGUE',
        entries: [
          { teamId: 'beta', wins: 90, losses: 72, divisionRank: 1 },
          { teamId: 'alpha', wins: 80, losses: 82, divisionRank: 2 },
        ],
      },
    ]);
    expect(formatMoney(12.345)).toBe('$12.3M');
    expect(formatMoney(null)).toBe('--');
  });
});

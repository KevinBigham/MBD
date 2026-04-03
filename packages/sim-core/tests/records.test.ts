import { describe, expect, it } from 'vitest';
import {
  backfillLegacyRecordBook,
  getRecordWatchList,
  updateRecordBook,
} from '../src/league/records.js';

describe('records', () => {
  it('backfills only derivable legacy records and leaves missing categories tracking prospectively', () => {
    const recordBook = backfillLegacyRecordBook({
      currentSeason: 4,
      franchiseTeamId: 'nyy',
      franchiseTimeline: [
        {
          season: 2,
          teamId: 'nyy',
          record: '97-65',
          winTotal: 97,
          playoffResult: 'Champion',
          championship: true,
          worldSeriesAppearance: true,
          playoffAppearance: true,
          divisionTitle: true,
          awardWinnerCount: 1,
          keyAcquisitions: [],
          keyDepartures: [],
          dynastyScore: 212,
        },
      ],
      seasonHistory: [],
      careerStats: [
        {
          playerId: 'player-1',
          playerName: 'Legacy Slugger',
          position: 'RF',
          seasonsPlayed: 10,
          teamIds: ['nyy'],
          peakOverall: 76,
          championshipRings: 1,
          allStarSelections: 3,
          gamesPlayed: 1450,
          saves: 0,
          war: 39.2,
          batting: {
            hits: 1812,
            hr: 322,
            rbi: 1044,
          },
          pitching: null,
        },
      ],
    });

    const winsRecord = recordBook.find((entry) => entry.id === 'franchise:nyy:team_single_season:wins');
    const careerHrRecord = recordBook.find((entry) => entry.id === 'franchise:nyy:career:hr');
    const stolenBaseRecord = recordBook.find((entry) => entry.id === 'franchise:nyy:team_single_season:stolen_bases');

    expect(winsRecord?.holders[0]?.value).toBe(97);
    expect(careerHrRecord?.holders[0]?.playerName).toBe('Legacy Slugger');
    expect(stolenBaseRecord?.holders).toEqual([]);
    expect(stolenBaseRecord?.trackingFromSeason).toBe(4);
  });

  it('updates franchise and league records and preserves ties', () => {
    const { recordBook, brokenRecords } = updateRecordBook(backfillLegacyRecordBook({
      currentSeason: 5,
      franchiseTeamId: 'nyy',
      franchiseTimeline: [],
      seasonHistory: [],
      careerStats: [],
    }), {
      currentSeason: 5,
      franchiseTeamId: 'nyy',
      currentStandings: [
        { teamId: 'nyy', wins: 101, losses: 61, streak: 9, playoffAppearances: 4 },
        { teamId: 'bos', wins: 101, losses: 61, streak: -6, playoffAppearances: 2 },
      ],
      playerSeasons: [
        {
          playerId: 'slugger-a',
          playerName: 'Aaron Thunder',
          teamId: 'nyy',
          position: 'RF',
          isPitcher: false,
          gamesPlayed: 158,
          pa: 701,
          ab: 602,
          hits: 189,
          hr: 58,
          rbi: 131,
          wins: 0,
          saves: 0,
          strikeouts: 0,
          ipOuts: 0,
          earnedRuns: 0,
          war: 8.3,
        },
        {
          playerId: 'slugger-b',
          playerName: 'Miguel Hammer',
          teamId: 'lad',
          position: 'DH',
          isPitcher: false,
          gamesPlayed: 160,
          pa: 715,
          ab: 610,
          hits: 180,
          hr: 58,
          rbi: 126,
          wins: 0,
          saves: 0,
          strikeouts: 0,
          ipOuts: 0,
          earnedRuns: 0,
          war: 7.8,
        },
      ],
      careerStats: [],
    });

    const franchiseHr = recordBook.find((entry) => entry.id === 'franchise:nyy:individual_single_season:hr');
    const leagueWins = recordBook.find((entry) => entry.id === 'league:team_single_season:wins');

    expect(franchiseHr?.holders).toHaveLength(1);
    expect(franchiseHr?.holders[0]?.playerName).toBe('Aaron Thunder');
    expect(leagueWins?.holders).toHaveLength(2);
    expect(brokenRecords.some((record) => record.entryId === 'franchise:nyy:individual_single_season:hr')).toBe(true);
  });

  it('creates record watches for players above the 85 percent pace threshold', () => {
    const recordBook = updateRecordBook(backfillLegacyRecordBook({
      currentSeason: 6,
      franchiseTeamId: 'nyy',
      franchiseTimeline: [],
      seasonHistory: [],
      careerStats: [],
    }), {
      currentSeason: 6,
      franchiseTeamId: 'nyy',
      currentStandings: [
        { teamId: 'nyy', wins: 95, losses: 67, streak: 4, playoffAppearances: 3 },
      ],
      playerSeasons: [
        {
          playerId: 'historic-slugger',
          playerName: 'Historic Slugger',
          teamId: 'nyy',
          position: 'RF',
          isPitcher: false,
          gamesPlayed: 162,
          pa: 720,
          ab: 620,
          hits: 184,
          hr: 60,
          rbi: 138,
          wins: 0,
          saves: 0,
          strikeouts: 0,
          ipOuts: 0,
          earnedRuns: 0,
          war: 9.1,
        },
      ],
      careerStats: [],
    }).recordBook;

    const watches = getRecordWatchList(recordBook, {
      currentSeason: 7,
      teamGamesPlayed: new Map([['nyy', 81]]),
      playerSeasons: [
        {
          playerId: 'pace-bat',
          playerName: 'Pace Bat',
          teamId: 'nyy',
          position: 'RF',
          isPitcher: false,
          gamesPlayed: 81,
          pa: 354,
          ab: 305,
          hits: 94,
          hr: 31,
          rbi: 77,
          wins: 0,
          saves: 0,
          strikeouts: 0,
          ipOuts: 0,
          earnedRuns: 0,
          war: 4.2,
        },
      ],
    });

    expect(watches.some((watch) => watch.recordId === 'franchise:nyy:individual_single_season:hr')).toBe(true);
    expect(watches.find((watch) => watch.recordId === 'franchise:nyy:individual_single_season:hr')?.projectedValue).toBe(62);
  });

  it('requires batting average qualifiers before surfacing a watch', () => {
    const { recordBook } = updateRecordBook(backfillLegacyRecordBook({
      currentSeason: 8,
      franchiseTeamId: 'nyy',
      franchiseTimeline: [],
      seasonHistory: [],
      careerStats: [],
    }), {
      currentSeason: 8,
      franchiseTeamId: 'nyy',
      currentStandings: [{ teamId: 'nyy', wins: 89, losses: 73, streak: 2, playoffAppearances: 1 }],
      playerSeasons: [
        {
          playerId: 'qualified-avg',
          playerName: 'Qualified Avg',
          teamId: 'nyy',
          position: '2B',
          isPitcher: false,
          gamesPlayed: 162,
          pa: 648,
          ab: 552,
          hits: 197,
          hr: 18,
          rbi: 70,
          wins: 0,
          saves: 0,
          strikeouts: 0,
          ipOuts: 0,
          earnedRuns: 0,
          war: 6.8,
        },
      ],
      careerStats: [],
    });

    const watches = getRecordWatchList(recordBook, {
      currentSeason: 9,
      teamGamesPlayed: new Map([['nyy', 40]]),
      playerSeasons: [
        {
          playerId: 'small-sample',
          playerName: 'Small Sample',
          teamId: 'nyy',
          position: 'SS',
          isPitcher: false,
          gamesPlayed: 22,
          pa: 77,
          ab: 62,
          hits: 28,
          hr: 1,
          rbi: 9,
          wins: 0,
          saves: 0,
          strikeouts: 0,
          ipOuts: 0,
          earnedRuns: 0,
          war: 1.0,
        },
      ],
    });

    expect(watches.some((watch) => watch.recordId === 'franchise:nyy:individual_single_season:batting_average')).toBe(false);
  });

  it('requires ERA qualifiers before surfacing a watch', () => {
    const { recordBook } = updateRecordBook(backfillLegacyRecordBook({
      currentSeason: 10,
      franchiseTeamId: 'nyy',
      franchiseTimeline: [],
      seasonHistory: [],
      careerStats: [],
    }), {
      currentSeason: 10,
      franchiseTeamId: 'nyy',
      currentStandings: [{ teamId: 'nyy', wins: 88, losses: 74, streak: 1, playoffAppearances: 2 }],
      playerSeasons: [
        {
          playerId: 'ace',
          playerName: 'Old Ace',
          teamId: 'nyy',
          position: 'SP',
          isPitcher: true,
          gamesPlayed: 33,
          pa: 0,
          ab: 0,
          hits: 0,
          hr: 0,
          rbi: 0,
          wins: 19,
          saves: 0,
          strikeouts: 244,
          ipOuts: 615,
          earnedRuns: 57,
          war: 7.4,
        },
      ],
      careerStats: [],
    });

    const watches = getRecordWatchList(recordBook, {
      currentSeason: 11,
      teamGamesPlayed: new Map([['nyy', 50]]),
      playerSeasons: [
        {
          playerId: 'short-burst',
          playerName: 'Short Burst',
          teamId: 'nyy',
          position: 'RP',
          isPitcher: true,
          gamesPlayed: 16,
          pa: 0,
          ab: 0,
          hits: 0,
          hr: 0,
          rbi: 0,
          wins: 2,
          saves: 0,
          strikeouts: 48,
          ipOuts: 75,
          earnedRuns: 4,
          war: 1.5,
        },
      ],
    });

    expect(watches.some((watch) => watch.recordId === 'franchise:nyy:individual_single_season:era')).toBe(false);
  });

  it('tracks career games, saves, and war records from expanded ledgers', () => {
    const { recordBook } = updateRecordBook(backfillLegacyRecordBook({
      currentSeason: 12,
      franchiseTeamId: 'nyy',
      franchiseTimeline: [],
      seasonHistory: [],
      careerStats: [
        {
          playerId: 'closer',
          playerName: 'Iron Closer',
          position: 'CL',
          seasonsPlayed: 15,
          teamIds: ['nyy'],
          peakOverall: 74,
          championshipRings: 2,
          allStarSelections: 5,
          gamesPlayed: 802,
          saves: 411,
          war: 28.6,
          batting: null,
          pitching: {
            wins: 52,
            strikeouts: 1138,
            inningsPitched: 921.2,
            earnedRuns: 241,
          },
        },
      ],
    }), {
      currentSeason: 12,
      franchiseTeamId: 'nyy',
      currentStandings: [],
      playerSeasons: [],
      careerStats: [
        {
          playerId: 'closer',
          playerName: 'Iron Closer',
          position: 'CL',
          seasonsPlayed: 15,
          teamIds: ['nyy'],
          peakOverall: 74,
          championshipRings: 2,
          allStarSelections: 5,
          gamesPlayed: 802,
          saves: 411,
          war: 28.6,
          batting: null,
          pitching: {
            wins: 52,
            strikeouts: 1138,
            inningsPitched: 921.2,
            earnedRuns: 241,
          },
        },
      ],
    });

    expect(recordBook.find((entry) => entry.id === 'franchise:nyy:career:games_played')?.holders[0]?.value).toBe(802);
    expect(recordBook.find((entry) => entry.id === 'franchise:nyy:career:saves')?.holders[0]?.value).toBe(411);
    expect(recordBook.find((entry) => entry.id === 'franchise:nyy:career:war')?.holders[0]?.displayValue).toBe('28.6');
  });
});

import { describe, expect, it } from 'vitest';
import {
  CAREER_SHUTOUT_MILESTONE,
  GameRNG,
  buildRookieOfTheYearVotingEntries,
  detectComebackPlayer,
  detectPlayoffGauntlet,
  detectRookieSensation,
  detectSeasonIdentityMoments,
  generatePlayer,
  recordCareerShutout,
  type GameBoxScore,
  type GeneratedPlayer,
  type PlayerGameStats,
  type SeasonIdentityMomentDetectionContext,
  type TeamSeasonSummary,
} from '../src/index.js';

function makePlayer(
  seed: number,
  teamId: string,
  position: GeneratedPlayer['position'] = 'CF',
  overrides: Partial<GeneratedPlayer> = {},
): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), position, teamId, 'MLB'),
    ...overrides,
  };
}

function stats(playerId: string, teamId: string, overrides: Partial<PlayerGameStats> = {}): PlayerGameStats {
  return {
    playerId,
    teamId,
    gamesPlayed: 120,
    pa: 540,
    ab: 480,
    hits: 170,
    doubles: 30,
    triples: 2,
    hr: 28,
    rbi: 104,
    bb: 60,
    k: 108,
    runs: 94,
    hbp: 2,
    sacFlies: 5,
    ip: 0,
    earnedRuns: 0,
    strikeouts: 0,
    walks: 0,
    hitsAllowed: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    flyBallsAllowed: 0,
    wins: 0,
    saves: 0,
    losses: 0,
    gamesMissedToInjury: 0,
    ...overrides,
  };
}

function teamSummary(teamId: string): TeamSeasonSummary {
  return {
    teamId,
    wins: 92,
    losses: 70,
    madePlayoffs: true,
    isChampion: false,
    divisionRank: 1,
    priorSeasonsSummary: [],
  };
}

function playoffGame(overrides: Partial<GameBoxScore> = {}): GameBoxScore {
  return {
    homeTeamId: 'nym',
    awayTeamId: 'lax',
    homeScore: 3,
    awayScore: 0,
    innings: 9,
    homeHits: 7,
    awayHits: 4,
    paResults: [],
    winningPitcherId: 'pitcher-1',
    losingPitcherId: 'pitcher-2',
    savePitcherId: null,
    date: 'S8D180',
    isPlayoff: true,
    ...overrides,
  };
}

describe('narrative depth wave 4 integration', () => {
  it('exercises all six wave-4 paths under deterministic inputs', () => {
    const comeback = makePlayer(1, 'nym', 'LF', { priorSeasonGamesMissed: 62 });
    const rookie = makePlayer(2, 'nym', 'CF', { age: 22, developmentPhase: 'Prospect' });
    const alRunnerUp = makePlayer(3, 'bos', 'RF', { age: 22, developmentPhase: 'Prospect' });
    const alThird = makePlayer(4, 'det', 'SS', { age: 22, developmentPhase: 'Prospect' });
    const nlWinner = makePlayer(5, 'lax', 'CF', { age: 22, developmentPhase: 'Prospect' });
    const nlRunnerUp = makePlayer(6, 'atl', 'RF', { age: 22, developmentPhase: 'Prospect' });
    const nlThird = makePlayer(7, 'hou', 'SS', { age: 22, developmentPhase: 'Prospect' });
    const veteranOne = makePlayer(8, 'nym', '1B', {
      rosterStatus: 'RETIRED',
      age: 37,
      teamTenures: [{ teamId: 'nym', startSeason: 1, endSeason: 8 }],
    });
    const veteranTwo = makePlayer(9, 'nym', '2B', {
      rosterStatus: 'RETIRED',
      age: 38,
      teamTenures: [{ teamId: 'nym', startSeason: 1, endSeason: 9 }],
    });
    const veteranThree = makePlayer(10, 'nym', '3B', {
      rosterStatus: 'RETIRED',
      age: 39,
      teamTenures: [{ teamId: 'nym', startSeason: 1, endSeason: 10 }],
    });
    const shutoutPitcher = makePlayer(11, 'nym', 'SP', { careerShutouts: CAREER_SHUTOUT_MILESTONE - 1 });

    const players = [
      comeback,
      rookie,
      alRunnerUp,
      alThird,
      nlWinner,
      nlRunnerUp,
      nlThird,
      veteranOne,
      veteranTwo,
      veteranThree,
      shutoutPitcher,
    ];
    const statsByPlayer = new Map<string, PlayerGameStats>([
      [comeback.id, stats(comeback.id, 'nym')],
      [rookie.id, stats(rookie.id, 'nym', { hr: 31, rbi: 112, hits: 178 })],
      [alRunnerUp.id, stats(alRunnerUp.id, 'bos', { hr: 24, rbi: 90, hits: 160 })],
      [alThird.id, stats(alThird.id, 'det', { hr: 20, rbi: 80, hits: 150 })],
      [nlWinner.id, stats(nlWinner.id, 'lax', { hr: 29, rbi: 108, hits: 172 })],
      [nlRunnerUp.id, stats(nlRunnerUp.id, 'atl', { hr: 23, rbi: 88, hits: 157 })],
      [nlThird.id, stats(nlThird.id, 'hou', { hr: 18, rbi: 77, hits: 145 })],
    ]);

    const seasonIdentityContext: SeasonIdentityMomentDetectionContext = {
      season: 8,
      day: 181,
      teams: [teamSummary('nym')],
      retiredPlayers: [veteranOne, veteranTwo, veteranThree],
      monthlyRecordSplits: {
        nym: {
          9: { wins: 22, losses: 6 },
        },
      },
    };
    const teamMoments = detectSeasonIdentityMoments(seasonIdentityContext);
    const rookieVoting = buildRookieOfTheYearVotingEntries(8, players, statsByPlayer);
    const rookieMoments = detectRookieSensation('nym', players, rookieVoting, 8, 181);
    const comebackMoment = detectComebackPlayer(comeback, statsByPlayer.get(comeback.id), 8, 181);
    const gauntletMoment = detectPlayoffGauntlet({
      season: 8,
      round: 'CHAMPIONSHIP_SERIES',
      higherSeedTeamId: 'lax',
      lowerSeedTeamId: 'nym',
      bestOf: 7,
      deficitReached: '1-3',
      deficitTeamId: 'nym',
      winnerTeamId: 'nym',
    }, 181);
    const shutoutResult = recordCareerShutout(
      shutoutPitcher,
      playoffGame(),
      stats(shutoutPitcher.id, 'nym', {
        ip: 27,
        earnedRuns: 0,
        strikeouts: 10,
        wins: 1,
        pa: 0,
        ab: 0,
        hits: 0,
        hr: 0,
        rbi: 0,
        bb: 0,
        runs: 0,
      }),
    );

    expect(new Set(teamMoments.map((entry) => entry.moment.type))).toEqual(new Set([
      'veteran_core_retires',
      'september_heroics',
    ]));
    expect(rookieMoments.map((entry) => entry.moment.type)).toEqual(['rookie_sensation']);
    expect(comebackMoment?.moment.type).toBe('comeback_player');
    expect(gauntletMoment?.moment.type).toBe('playoff_gauntlet');
    expect(shutoutResult.crossedMilestone).toBe(true);
    expect(shutoutResult.player.careerShutouts).toBe(CAREER_SHUTOUT_MILESTONE);
  });
});

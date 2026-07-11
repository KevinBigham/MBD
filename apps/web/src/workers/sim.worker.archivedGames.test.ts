// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameBoxScore, PlayoffBracket } from '@mbd/sim-core';

vi.mock('comlink', () => ({
  expose: () => {},
}));

vi.mock('../shared/lib/saveSystem.js', () => ({
  listBranches: vi.fn(),
  loadGameById: vi.fn(),
  saveGameById: vi.fn(),
}));

import { api } from './sim.worker';
import { requireState, setState } from './sim.worker.helpers';
import { syncArchivedMajorGames } from './sim.worker.archivedGames';

function startGame(seed: number, userTeamId: string = 'nym') {
  return api.newGame({
    seed,
    userTeamId,
    gmName: 'General Manager',
    difficulty: 'standard',
    saveSlot: 1,
  });
}

function makeBoxScore(overrides: Partial<GameBoxScore> = {}): GameBoxScore {
  return {
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeScore: 5,
    awayScore: 4,
    innings: 9,
    homeHits: 8,
    awayHits: 7,
    paResults: [],
    winningPitcherId: undefined,
    losingPitcherId: undefined,
    savePitcherId: null,
    date: 'S6D120',
    isPlayoff: false,
    ...overrides,
  };
}

describe('syncArchivedMajorGames', () => {
  afterEach(() => {
    setState(null);
    vi.clearAllMocks();
  });

  it('captures only qualifying compact game archives and remains idempotent', () => {
    startGame(2211, 'nym');
    const state = requireState();
    const pitcher = state.players.find((player) => player.teamId === 'nym' && player.pitcherAttributes != null)!;
    const hitter = state.players.find((player) => player.teamId === 'nym' && player.pitcherAttributes == null)!;

    state.season = 6;
    state.rivalries.set('nym:bos', {
      id: 'nym:bos',
      teamA: 'nym',
      teamB: 'bos',
      intensity: 91,
      summary: 'Boston and New York have become appointment viewing.',
      reasons: ['October history'],
      eventHistory: [],
    });
    state.playerMoments.set(hitter.id, [{
      season: 6,
      day: 120,
      timestamp: 'S6D120',
      type: 'milestone_500hr',
      description: 'A franchise slugger reached 500 home runs.',
      impact: 100,
      relevance: 1,
      isPlayoff: false,
      isEliminationGame: false,
      worldSeriesClincher: false,
      round: null,
    }]);
    state.seasonState.gameLog.splice(0, state.seasonState.gameLog.length,
      makeBoxScore({
        date: 'S6D118',
        homeScore: 7,
        awayScore: 1,
      }),
      makeBoxScore({
        date: 'S6D119',
        homeScore: 5,
        awayScore: 4,
      }),
      makeBoxScore({
        date: 'S6D120',
        winningPitcherId: pitcher.id,
        paResults: [{
          inning: 9,
          halfInning: 'bottom',
          batterId: hitter.id,
          pitcherId: 'bos-pitcher',
          outcome: 'HR',
          outs: 2,
          runnersOn: 0,
          scoreBefore: [4, 4],
          scoreAfter: [4, 5],
          rbiOnPlay: 1,
          isWalkOff: true,
        }],
      }),
      makeBoxScore({
        date: 'S6D121',
        homeScore: 4,
        awayScore: 0,
        homeHits: 6,
        awayHits: 0,
        winningPitcherId: pitcher.id,
        paResults: [{
          inning: 1,
          halfInning: 'top',
          batterId: 'bos-batter',
          pitcherId: pitcher.id,
          outcome: 'K',
          outs: 0,
          runnersOn: 0,
          scoreBefore: [0, 0],
          scoreAfter: [0, 0],
          rbiOnPlay: 0,
          isWalkOff: false,
        }],
      }),
    );

    const rngCallsBefore = state.rng.getState().callCount;
    syncArchivedMajorGames(state);
    const firstArchive = [...state.archivedGames];
    syncArchivedMajorGames(state);

    expect(state.rng.getState().callCount).toBe(rngCallsBefore);
    expect(state.archivedGames).toEqual(firstArchive);
    expect(state.archivedGames.map((game) => game.kind)).toEqual(['rivalry', 'milestone', 'perfect_game']);
    expect(state.archivedGames[0]).toMatchObject({
      id: 'archived-game-s6-s6d119-bos-nym-rivalry',
      season: 6,
      day: 119,
      teamIds: ['bos', 'nym'],
    });
    expect(state.archivedGames[1]).toMatchObject({
      id: 'archived-game-s6-s6d120-bos-nym-milestone',
      season: 6,
      day: 120,
      playerIds: expect.arrayContaining([hitter.id]),
      lineScore: expect.arrayContaining([
        { inning: 9, awayRuns: 0, homeRuns: 1 },
      ]),
    });
    expect(state.archivedGames[2]).toMatchObject({
      id: 'archived-game-s6-s6d121-bos-nym-perfect_game',
      season: 6,
      day: 121,
      winningPitcherId: pitcher.id,
    });
  });

  it('captures World Series clinchers from the playoff bracket even when live gameLog is empty', () => {
    startGame(2211, 'nym');
    const state = requireState();
    const boxScore = makeBoxScore({
      date: 'WS-NYM-BOS-G7',
      isPlayoff: true,
      homeScore: 6,
      awayScore: 5,
      paResults: [{
        inning: 10,
        halfInning: 'bottom',
        batterId: 'nym-clincher',
        pitcherId: 'bos-reliever',
        outcome: 'SINGLE',
        outs: 2,
        runnersOn: 2,
        scoreBefore: [5, 5],
        scoreAfter: [5, 6],
        rbiOnPlay: 1,
        isWalkOff: true,
      }],
    });

    state.season = 6;
    state.seasonState.gameLog.splice(0, state.seasonState.gameLog.length);
    state.playoffBracket = {
      seeds: [],
      currentRound: 'WORLD_SERIES',
      currentRoundSeries: [{
        id: 'world-series-nym-bos',
        round: 'WORLD_SERIES',
        league: 'MLB',
        bestOf: 7,
        higherSeed: { teamId: 'nym', seed: 1, wins: 101, losses: 61, league: 'NL', divisionWinner: true },
        lowerSeed: { teamId: 'bos', seed: 1, wins: 99, losses: 63, league: 'AL', divisionWinner: true },
        games: [{
          gameNumber: 7,
          winnerId: 'nym',
          loserId: 'bos',
          homeTeamId: 'nym',
          awayTeamId: 'bos',
          homeScore: 6,
          awayScore: 5,
          innings: 10,
          keyPerformers: [],
          boxScore,
        }],
        higherSeedWins: 4,
        lowerSeedWins: 3,
        leaderSummary: 'NYM won 4-3',
        status: 'complete',
        winnerId: 'nym',
        loserId: 'bos',
        deficitReached: null,
        deficitTeamId: null,
      }],
      completedRounds: [],
      series: [],
      champion: 'nym',
      runnerUp: 'bos',
    } satisfies PlayoffBracket;

    syncArchivedMajorGames(state);

    expect(state.archivedGames).toHaveLength(1);
    expect(state.archivedGames[0]).toMatchObject({
      id: 'archived-game-s6-ws-nym-bos-g7-bos-nym-championship',
      kind: 'championship',
      season: 6,
      day: null,
      isPlayoff: true,
      round: 'WORLD_SERIES',
      gameNumber: 7,
    });
  });
});

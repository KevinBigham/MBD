import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  type GameBoxScore,
  type GameTeam,
  type GeneratedPlayer,
  type PlayerGameStats,
  GameRNG,
  HITTER_POSITIONS,
  PITCHER_POSITIONS,
  generateTeamRoster,
  simulateGame,
} from '../src/index.js';
import {
  type Moment,
  type MomentDetectionContext,
  BLOWN_WS_SAVE_IMPACT,
  CYCLE_IMPACT,
  FIRST_CAREER_HR_IMPACT,
  FOUR_HR_GAME_IMPACT,
  MAX_MOMENTS_PER_PLAYER,
  MILESTONE_3000_HIT_IMPACT,
  MILESTONE_300_WIN_IMPACT,
  MILESTONE_500_HR_IMPACT,
  MOMENT_IMPACT_THRESHOLD,
  MOMENT_RELEVANCE_DECAY_RATE,
  NO_HITTER_ATTRIBUTE_BONUS,
  NO_HITTER_IMPACT,
  PERFECT_GAME_IMPACT,
  PERMANENT_CLUTCH_WALK_OFF_COUNT,
  PLAYOFF_ERROR_IMPACT,
  PLAYOFF_WALK_OFF_BONUS,
  PRESSURE_CLUTCH_BONUS,
  PRESSURE_SCARRED_PENALTY,
  TWENTY_K_GAME_IMPACT,
  WORLD_SERIES_CLINCHER_BONUS,
  applyMomentEffects,
  decayMoments,
  detectMoment,
  formatMomentDescription,
} from '../src/moments/momentDetector.js';

function buildTeam(teamId: string, rng: GameRNG): GameTeam {
  const roster = generateTeamRoster(rng, teamId);
  const mlb = roster.filter((player) => player.rosterStatus === 'MLB');
  const hitters = mlb
    .filter((player) => (HITTER_POSITIONS as readonly string[]).includes(player.position))
    .sort((left, right) => right.overallRating - left.overallRating);
  const pitchers = mlb
    .filter((player) => (PITCHER_POSITIONS as readonly string[]).includes(player.position))
    .sort((left, right) => right.overallRating - left.overallRating);

  return {
    teamId,
    lineup: hitters.slice(0, 9),
    pitcher: pitchers.find((player) => player.position === 'SP') ?? pitchers[0]!,
    bullpen: pitchers.filter((player) => player.position !== 'SP'),
  };
}

function createBoxScore(overrides: Partial<GameBoxScore> = {}): GameBoxScore {
  return {
    homeTeamId: 'bos',
    awayTeamId: 'nym',
    homeScore: 5,
    awayScore: 4,
    innings: 9,
    homeHits: 8,
    awayHits: 7,
    paResults: [],
    winningPitcherId: 'pitcher-home',
    losingPitcherId: 'pitcher-away',
    savePitcherId: null,
    date: 'S5D120',
    isPlayoff: false,
    ...overrides,
  };
}

function createPlayerGameStats(overrides: Partial<PlayerGameStats> = {}): PlayerGameStats {
  return {
    playerId: 'player-1',
    teamId: 'bos',
    gamesPlayed: 1,
    pa: 4,
    ab: 4,
    hits: 1,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    bb: 0,
    k: 0,
    runs: 0,
    hbp: 0,
    sacFlies: 0,
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
    ...overrides,
  };
}

function createContext(overrides: Partial<MomentDetectionContext> = {}): MomentDetectionContext {
  return {
    currentSeason: 5,
    existingMomentsByPlayer: new Map(),
    careerTotalsBeforeGameByPlayer: new Map(),
    round: null,
    isPlayoff: false,
    isEliminationGame: false,
    worldSeriesClincher: false,
    decisiveErrorPlayerId: null,
    blownSavePitcherId: null,
    ...overrides,
  };
}

function createMoment(overrides: Partial<Moment> = {}): Moment {
  return {
    season: 5,
    type: 'walk_off_hr',
    description: 'This player ended the game with one swing.',
    impact: 65,
    relevance: 65,
    isPlayoff: false,
    isEliminationGame: false,
    worldSeriesClincher: false,
    round: null,
    ...overrides,
  };
}

function createStatsMap(entries: PlayerGameStats[]): Map<string, PlayerGameStats> {
  return new Map(entries.map((entry) => [entry.playerId, entry]));
}

function findMoment(updates: ReturnType<typeof detectMoment>, type: Moment['type']): Moment | undefined {
  return updates.flatMap((update) => update.newMoments).find((moment) => moment.type === type);
}

describe('detectMoment', () => {
  it('exports the plan constants with the expected values', () => {
    expect(MOMENT_IMPACT_THRESHOLD).toBe(60);
    expect(MOMENT_RELEVANCE_DECAY_RATE).toBe(0.8);
    expect(MAX_MOMENTS_PER_PLAYER).toBe(8);
    expect(PERMANENT_CLUTCH_WALK_OFF_COUNT).toBe(3);
    expect(FIRST_CAREER_HR_IMPACT).toBe(62);
    expect(FOUR_HR_GAME_IMPACT).toBe(90);
    expect(CYCLE_IMPACT).toBe(70);
    expect(NO_HITTER_IMPACT).toBe(85);
    expect(PERFECT_GAME_IMPACT).toBe(100);
    expect(TWENTY_K_GAME_IMPACT).toBe(88);
    expect(PLAYOFF_ERROR_IMPACT).toBe(-80);
    expect(BLOWN_WS_SAVE_IMPACT).toBe(-85);
    expect(MILESTONE_500_HR_IMPACT).toBe(95);
    expect(MILESTONE_3000_HIT_IMPACT).toBe(95);
    expect(MILESTONE_300_WIN_IMPACT).toBe(95);
    expect(PLAYOFF_WALK_OFF_BONUS).toBe(15);
    expect(WORLD_SERIES_CLINCHER_BONUS).toBe(10);
    expect(PRESSURE_CLUTCH_BONUS).toBe(10);
    expect(PRESSURE_SCARRED_PENALTY).toBe(15);
    expect(NO_HITTER_ATTRIBUTE_BONUS).toBe(5);
  });

  it('detects a regular-season walk-off home run', () => {
    const boxScore = createBoxScore({
      paResults: [
        {
          outcome: 'HR',
          batterId: 'slugger',
          pitcherId: 'closer',
          inning: 9,
          halfInning: 'bottom',
          outs: 1,
          runnersOn: 1,
          scoreBefore: [4, 3],
          scoreAfter: [4, 5],
          rbiOnPlay: 2,
          isWalkOff: true,
        },
      ],
    });
    const stats = createStatsMap([
      createPlayerGameStats({
        playerId: 'slugger',
        teamId: 'bos',
        hr: 1,
        hits: 1,
        rbi: 2,
        runs: 1,
      }),
    ]);

    const updates = detectMoment(
      boxScore,
      stats,
      createContext({
        careerTotalsBeforeGameByPlayer: new Map([
          ['slugger', { hr: 10, hits: 1200, wins: 0 }],
        ]),
      }),
      new GameRNG(11),
    );

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      playerId: 'slugger',
      newMoments: [
        {
          type: 'walk_off_hr',
          impact: 65,
          relevance: 65,
        },
      ],
    });
  });

  it('adds the playoff bonus to a playoff walk-off home run', () => {
    const boxScore = createBoxScore({
      isPlayoff: true,
      paResults: [
        {
          outcome: 'HR',
          batterId: 'slugger',
          pitcherId: 'closer',
          inning: 10,
          halfInning: 'bottom',
          outs: 2,
          runnersOn: 2,
          scoreBefore: [3, 1],
          scoreAfter: [3, 4],
          rbiOnPlay: 3,
          isWalkOff: true,
        },
      ],
    });
    const stats = createStatsMap([
      createPlayerGameStats({
        playerId: 'slugger',
        teamId: 'bos',
        hr: 1,
        hits: 1,
      }),
    ]);

    const updates = detectMoment(
      boxScore,
      stats,
      createContext({ isPlayoff: true, round: 'DS' }),
      new GameRNG(12),
    );

    expect(findMoment(updates, 'walk_off_hr')?.impact).toBe(65 + PLAYOFF_WALK_OFF_BONUS);
  });

  it('adds the World Series clincher bonus on top of the playoff bonus', () => {
    const boxScore = createBoxScore({
      isPlayoff: true,
      paResults: [
        {
          outcome: 'HR',
          batterId: 'slugger',
          pitcherId: 'closer',
          inning: 9,
          halfInning: 'bottom',
          outs: 1,
          runnersOn: 0,
          scoreBefore: [2, 2],
          scoreAfter: [2, 3],
          rbiOnPlay: 1,
          isWalkOff: true,
        },
      ],
    });
    const stats = createStatsMap([
      createPlayerGameStats({
        playerId: 'slugger',
        teamId: 'bos',
        hr: 1,
        hits: 1,
      }),
    ]);

    const updates = detectMoment(
      boxScore,
      stats,
      createContext({
        isPlayoff: true,
        round: 'WS',
        worldSeriesClincher: true,
      }),
      new GameRNG(13),
    );

    expect(findMoment(updates, 'walk_off_hr')?.impact).toBe(65 + PLAYOFF_WALK_OFF_BONUS + WORLD_SERIES_CLINCHER_BONUS);
  });

  it('detects a four-home-run game', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'slugger',
          hr: 4,
          hits: 4,
          pa: 5,
          ab: 5,
        }),
      ]),
      createContext(),
      new GameRNG(14),
    );

    expect(findMoment(updates, 'four_hr_game')).toMatchObject({
      impact: FOUR_HR_GAME_IMPACT,
      relevance: FOUR_HR_GAME_IMPACT,
    });
  });

  it('does not detect a four-home-run game when the hitter stops at three', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'slugger',
          hr: 3,
          hits: 3,
        }),
      ]),
      createContext(),
      new GameRNG(15),
    );

    expect(findMoment(updates, 'four_hr_game')).toBeUndefined();
  });

  it('detects a cycle', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'batter',
          hits: 4,
          doubles: 1,
          triples: 1,
          hr: 1,
          ab: 4,
          pa: 4,
        }),
      ]),
      createContext(),
      new GameRNG(16),
    );

    expect(findMoment(updates, 'cycle')).toMatchObject({
      impact: CYCLE_IMPACT,
      relevance: CYCLE_IMPACT,
    });
  });

  it('does not detect a cycle when the hitter does not record a triple', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'batter',
          hits: 4,
          doubles: 2,
          triples: 0,
          hr: 1,
          ab: 4,
          pa: 4,
        }),
      ]),
      createContext(),
      new GameRNG(17),
    );

    expect(findMoment(updates, 'cycle')).toBeUndefined();
  });

  it('detects a first career home run from pregame totals', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'rookie',
          hits: 1,
          hr: 1,
        }),
      ]),
      createContext({
        careerTotalsBeforeGameByPlayer: new Map([
          ['rookie', { hr: 0, hits: 15, wins: 0 }],
        ]),
      }),
      new GameRNG(18),
    );

    expect(findMoment(updates, 'first_career_hr')).toMatchObject({
      impact: FIRST_CAREER_HR_IMPACT,
      relevance: FIRST_CAREER_HR_IMPACT,
    });
  });

  it('does not detect a first career home run once the player already has one', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'veteran',
          hits: 1,
          hr: 1,
        }),
      ]),
      createContext({
        careerTotalsBeforeGameByPlayer: new Map([
          ['veteran', { hr: 1, hits: 100, wins: 0 }],
        ]),
      }),
      new GameRNG(19),
    );

    expect(findMoment(updates, 'first_career_hr')).toBeUndefined();
  });

  it('detects the 500th home run milestone when crossed during the game', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'slugger',
          hits: 1,
          hr: 1,
        }),
      ]),
      createContext({
        careerTotalsBeforeGameByPlayer: new Map([
          ['slugger', { hr: 499, hits: 2500, wins: 0 }],
        ]),
      }),
      new GameRNG(20),
    );

    expect(findMoment(updates, 'milestone_500hr')).toMatchObject({
      impact: MILESTONE_500_HR_IMPACT,
    });
  });

  it('detects the 3000th hit milestone when crossed during the game', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'hitter',
          hits: 2,
        }),
      ]),
      createContext({
        careerTotalsBeforeGameByPlayer: new Map([
          ['hitter', { hr: 350, hits: 2998, wins: 0 }],
        ]),
      }),
      new GameRNG(21),
    );

    expect(findMoment(updates, 'milestone_3000h')).toMatchObject({
      impact: MILESTONE_3000_HIT_IMPACT,
    });
  });

  it('detects the 300th win milestone when crossed during the game', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'ace',
          teamId: 'bos',
          ip: 27,
          wins: 1,
        }),
      ]),
      createContext({
        careerTotalsBeforeGameByPlayer: new Map([
          ['ace', { hr: 0, hits: 0, wins: 299 }],
        ]),
      }),
      new GameRNG(22),
    );

    expect(findMoment(updates, 'milestone_300w')).toMatchObject({
      impact: MILESTONE_300_WIN_IMPACT,
    });
  });

  it('does not duplicate a milestone that was already reached before the game', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'legend',
          hits: 1,
          hr: 1,
        }),
      ]),
      createContext({
        careerTotalsBeforeGameByPlayer: new Map([
          ['legend', { hr: 500, hits: 3000, wins: 0 }],
        ]),
      }),
      new GameRNG(23),
    );

    expect(findMoment(updates, 'milestone_500hr')).toBeUndefined();
    expect(findMoment(updates, 'milestone_3000h')).toBeUndefined();
  });

  it('detects a no-hitter for a complete-game pitcher who allows zero hits', () => {
    const updates = detectMoment(
      createBoxScore({ awayHits: 0 }),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'ace',
          teamId: 'bos',
          ip: 27,
          hitsAllowed: 0,
          walks: 3,
          hitBatters: 0,
          strikeouts: 11,
          wins: 1,
        }),
      ]),
      createContext(),
      new GameRNG(24),
    );

    expect(findMoment(updates, 'no_hitter')).toMatchObject({
      impact: NO_HITTER_IMPACT,
    });
  });

  it('detects a perfect game instead of a no-hitter when the pitcher allows no baserunners', () => {
    const updates = detectMoment(
      createBoxScore({ awayHits: 0 }),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'ace',
          teamId: 'bos',
          ip: 27,
          hitsAllowed: 0,
          walks: 0,
          hitBatters: 0,
          strikeouts: 13,
          wins: 1,
        }),
      ]),
      createContext(),
      new GameRNG(25),
    );

    expect(findMoment(updates, 'perfect_game')).toMatchObject({
      impact: PERFECT_GAME_IMPACT,
    });
    expect(findMoment(updates, 'no_hitter')).toBeUndefined();
  });

  it('does not detect a no-hitter when the pitcher does not finish nine innings', () => {
    const updates = detectMoment(
      createBoxScore({ awayHits: 0 }),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'ace',
          teamId: 'bos',
          ip: 24,
          hitsAllowed: 0,
          walks: 1,
          strikeouts: 9,
          wins: 1,
        }),
      ]),
      createContext(),
      new GameRNG(26),
    );

    expect(findMoment(updates, 'no_hitter')).toBeUndefined();
    expect(findMoment(updates, 'perfect_game')).toBeUndefined();
  });

  it('detects a twenty-strikeout game', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'ace',
          teamId: 'bos',
          ip: 27,
          strikeouts: 20,
          walks: 2,
          hitsAllowed: 2,
          wins: 1,
        }),
      ]),
      createContext(),
      new GameRNG(27),
    );

    expect(findMoment(updates, 'twenty_k_game')).toMatchObject({
      impact: TWENTY_K_GAME_IMPACT,
    });
  });

  it('does not detect a twenty-strikeout game at nineteen strikeouts', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'ace',
          teamId: 'bos',
          ip: 27,
          strikeouts: 19,
          wins: 1,
        }),
      ]),
      createContext(),
      new GameRNG(28),
    );

    expect(findMoment(updates, 'twenty_k_game')).toBeUndefined();
  });

  it('detects a playoff error that costs elimination', () => {
    const updates = detectMoment(
      createBoxScore({ isPlayoff: true }),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'goat-horns',
          teamId: 'bos',
        }),
      ]),
      createContext({
        isPlayoff: true,
        isEliminationGame: true,
        round: 'CS',
        decisiveErrorPlayerId: 'goat-horns',
      }),
      new GameRNG(29),
    );

    expect(findMoment(updates, 'playoff_error')).toMatchObject({
      impact: PLAYOFF_ERROR_IMPACT,
      isEliminationGame: true,
    });
  });

  it('does not detect a playoff error without elimination context', () => {
    const updates = detectMoment(
      createBoxScore({ isPlayoff: true }),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'infielder',
          teamId: 'bos',
        }),
      ]),
      createContext({
        isPlayoff: true,
        isEliminationGame: false,
        decisiveErrorPlayerId: 'infielder',
      }),
      new GameRNG(30),
    );

    expect(findMoment(updates, 'playoff_error')).toBeUndefined();
  });

  it('detects a blown World Series save from context', () => {
    const updates = detectMoment(
      createBoxScore({ isPlayoff: true }),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'closer',
          teamId: 'bos',
          ip: 1,
          saves: 0,
          losses: 1,
          earnedRuns: 2,
        }),
      ]),
      createContext({
        isPlayoff: true,
        round: 'WS',
        blownSavePitcherId: 'closer',
      }),
      new GameRNG(31),
    );

    expect(findMoment(updates, 'blown_ws_save')).toMatchObject({
      impact: BLOWN_WS_SAVE_IMPACT,
      round: 'WS',
    });
  });

  it('does not detect a blown World Series save outside the World Series', () => {
    const updates = detectMoment(
      createBoxScore({ isPlayoff: true }),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'closer',
          teamId: 'bos',
        }),
      ]),
      createContext({
        isPlayoff: true,
        round: 'CS',
        blownSavePitcherId: 'closer',
      }),
      new GameRNG(32),
    );

    expect(findMoment(updates, 'blown_ws_save')).toBeUndefined();
  });

  it('groups multiple new moments for the same player into one update', () => {
    const boxScore = createBoxScore({
      paResults: [
        {
          outcome: 'HR',
          batterId: 'hero',
          pitcherId: 'closer',
          inning: 9,
          halfInning: 'bottom',
          outs: 1,
          runnersOn: 0,
          scoreBefore: [4, 4],
          scoreAfter: [4, 5],
          rbiOnPlay: 1,
          isWalkOff: true,
        },
      ],
    });
    const updates = detectMoment(
      boxScore,
      createStatsMap([
        createPlayerGameStats({
          playerId: 'hero',
          hits: 4,
          doubles: 1,
          triples: 1,
          hr: 1,
          pa: 4,
          ab: 4,
        }),
      ]),
      createContext({
        careerTotalsBeforeGameByPlayer: new Map([
          ['hero', { hr: 0, hits: 100, wins: 0 }],
        ]),
      }),
      new GameRNG(33),
    );

    expect(updates).toHaveLength(1);
    expect(updates[0]?.newMoments.map((moment) => moment.type)).toEqual([
      'walk_off_hr',
      'cycle',
      'first_career_hr',
    ]);
  });

  it('caps stored moments at eight records with FIFO trimming', () => {
    const existingMoments = Array.from({ length: 8 }, (_, index) =>
      createMoment({
        season: index + 1,
        type: 'walk_off_hr',
        description: `Moment ${index + 1}`,
        impact: 65,
        relevance: 65,
      }),
    );
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'slugger',
          hr: 4,
          hits: 4,
        }),
      ]),
      createContext({
        careerTotalsBeforeGameByPlayer: new Map([
          ['slugger', { hr: 10, hits: 120, wins: 0 }],
        ]),
        existingMomentsByPlayer: new Map([
          ['slugger', existingMoments],
        ]),
      }),
      new GameRNG(34),
    );

    expect(updates[0]?.updatedMoments).toHaveLength(MAX_MOMENTS_PER_PLAYER);
    expect(updates[0]?.updatedMoments[0]?.season).toBe(2);
    expect(updates[0]?.updatedMoments.at(-1)?.type).toBe('four_hr_game');
  });

  it('preserves prior moments when the player stays under the cap', () => {
    const existingMoments = [createMoment({ season: 4, description: 'Earlier highlight' })];
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'slugger',
          hr: 4,
          hits: 4,
        }),
      ]),
      createContext({
        careerTotalsBeforeGameByPlayer: new Map([
          ['slugger', { hr: 10, hits: 120, wins: 0 }],
        ]),
        existingMomentsByPlayer: new Map([
          ['slugger', existingMoments],
        ]),
      }),
      new GameRNG(35),
    );

    expect(updates[0]?.updatedMoments).toHaveLength(2);
    expect(updates[0]?.updatedMoments[0]?.description).toBe('Earlier highlight');
  });

  it('returns updates sorted by player id for deterministic output', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'z-player',
          hr: 4,
          hits: 4,
        }),
        createPlayerGameStats({
          playerId: 'a-player',
          hits: 4,
          doubles: 1,
          triples: 1,
          hr: 1,
          pa: 4,
          ab: 4,
        }),
      ]),
      createContext(),
      new GameRNG(36),
    );

    expect(updates.map((update) => update.playerId)).toEqual(['a-player', 'z-player']);
  });

  it('drops players with no detected moments from the result', () => {
    const updates = detectMoment(
      createBoxScore(),
      createStatsMap([
        createPlayerGameStats({
          playerId: 'quiet-night',
          hits: 1,
          hr: 0,
          strikeouts: 3,
        }),
      ]),
      createContext(),
      new GameRNG(37),
    );

    expect(updates).toEqual([]);
  });

  it('supports a simulateGame-backed walk-off scan', () => {
    const rng = new GameRNG(500);
    const away = buildTeam('nym', rng.fork());
    const home = buildTeam('bos', rng.fork());
    const result = simulateGame(rng, away, home, 'S5D155', false, {
      awayOffenseModifier: 0.97,
      homeOffenseModifier: 1.03,
    });

    const updates = detectMoment(
      result.boxScore,
      result.playerStats,
      createContext({ currentSeason: 5 }),
      new GameRNG(501),
    );

    expect(Array.isArray(updates)).toBe(true);
    expect(updates.every((update) => update.updatedMoments.length >= update.newMoments.length)).toBe(true);
  });

  it('only emits positive-impact moments above the threshold in non-playoff games', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10 }), (homeRuns) => {
        const updates = detectMoment(
          createBoxScore(),
          createStatsMap([
            createPlayerGameStats({
              playerId: 'slugger',
              hits: Math.max(1, homeRuns),
              hr: homeRuns,
            }),
          ]),
          createContext(),
          new GameRNG(600 + homeRuns),
        );

        for (const moment of updates.flatMap((update) => update.newMoments)) {
          expect(moment.isPlayoff).toBe(false);
          expect(moment.impact).toBeGreaterThan(MOMENT_IMPACT_THRESHOLD);
        }
      }),
      { numRuns: 25 },
    );
  });
});

describe('decayMoments', () => {
  it('multiplies relevance by the offseason decay rate', () => {
    const [moment] = decayMoments([createMoment({ relevance: 50 })]);

    expect(moment?.relevance).toBe(40);
  });

  it('rounds relevance to three decimal places', () => {
    const [moment] = decayMoments([createMoment({ relevance: 12.3456 })]);

    expect(moment?.relevance).toBe(9.876);
  });

  it('does not round tiny decayed relevance above its original value', () => {
    const originalRelevance = 0.000625;
    const [moment] = decayMoments([createMoment({ relevance: originalRelevance })]);

    expect(moment?.relevance).toBeLessThanOrEqual(originalRelevance);
  });

  it('does not mutate the input array or records', () => {
    const original = [createMoment({ relevance: 80 })];
    const snapshot = structuredClone(original);

    const decayed = decayMoments(original);

    expect(original).toEqual(snapshot);
    expect(decayed).not.toBe(original);
    expect(decayed[0]).not.toBe(original[0]);
  });

  it('never increases relevance for non-negative inputs', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }), (relevance) => {
        const [moment] = decayMoments([createMoment({ relevance })]);
        expect(moment!.relevance).toBeLessThanOrEqual(relevance);
      }),
      { numRuns: 25 },
    );
  });
});

describe('applyMomentEffects', () => {
  const hitter: Pick<GeneratedPlayer, 'position'> = { position: 'RF' };
  const pitcher: Pick<GeneratedPlayer, 'position'> = { position: 'SP' };

  it('applies the no-hitter bonus only in the achievement season', () => {
    const active = applyMomentEffects(hitter, [createMoment({ type: 'no_hitter', season: 5, impact: 85, relevance: 85 })], 5);
    const expired = applyMomentEffects(hitter, [createMoment({ type: 'no_hitter', season: 5, impact: 85, relevance: 85 })], 6);

    expect(active.hitterAttributeDelta).toBe(NO_HITTER_ATTRIBUTE_BONUS);
    expect(active.pitcherAttributeDelta).toBe(NO_HITTER_ATTRIBUTE_BONUS);
    expect(expired.hitterAttributeDelta).toBe(0);
  });

  it('applies the World Series walk-off pressure bonus in the next two seasons only', () => {
    const moments = [createMoment({
      type: 'walk_off_hr',
      season: 5,
      worldSeriesClincher: true,
      isPlayoff: true,
      round: 'WS',
    })];

    expect(applyMomentEffects(hitter, moments, 5).pressureDelta).toBe(0);
    expect(applyMomentEffects(hitter, moments, 6).pressureDelta).toBe(PRESSURE_CLUTCH_BONUS);
    expect(applyMomentEffects(hitter, moments, 7).pressureDelta).toBe(PRESSURE_CLUTCH_BONUS);
    expect(applyMomentEffects(hitter, moments, 8).pressureDelta).toBe(0);
  });

  it('marks the player as clutch during the temporary World Series walk-off window', () => {
    const effects = applyMomentEffects(
      hitter,
      [createMoment({
        type: 'walk_off_hr',
        season: 5,
        worldSeriesClincher: true,
        isPlayoff: true,
        round: 'WS',
      })],
      6,
    );

    expect(effects.activeTraits).toContain('clutch');
  });

  it('applies the scarred pressure penalty only in the following season', () => {
    const moments = [createMoment({
      type: 'playoff_error',
      season: 5,
      impact: PLAYOFF_ERROR_IMPACT,
      relevance: 80,
      isPlayoff: true,
      isEliminationGame: true,
      round: 'DS',
    })];

    expect(applyMomentEffects(hitter, moments, 5).pressureDelta).toBe(0);
    expect(applyMomentEffects(hitter, moments, 6).pressureDelta).toBe(-PRESSURE_SCARRED_PENALTY);
    expect(applyMomentEffects(hitter, moments, 7).pressureDelta).toBe(0);
  });

  it('adds a redemption-arc story flag after the scarred window expires', () => {
    const effects = applyMomentEffects(
      hitter,
      [createMoment({
        type: 'playoff_error',
        season: 5,
        impact: PLAYOFF_ERROR_IMPACT,
        relevance: 80,
        isPlayoff: true,
        isEliminationGame: true,
      })],
      7,
    );

    expect(effects.storyFlags).toContain('redemption_arc');
  });

  it('grants permanent clutch after three lifetime walk-off home runs', () => {
    const effects = applyMomentEffects(
      hitter,
      [
        createMoment({ type: 'walk_off_hr', season: 3 }),
        createMoment({ type: 'walk_off_hr', season: 4 }),
        createMoment({ type: 'walk_off_hr', season: 5 }),
      ],
      20,
    );

    expect(effects.activeTraits).toContain('clutch');
  });

  it('does not grant permanent clutch before the third walk-off', () => {
    const effects = applyMomentEffects(
      hitter,
      [
        createMoment({ type: 'walk_off_hr', season: 4 }),
        createMoment({ type: 'walk_off_hr', season: 5 }),
      ],
      20,
    );

    expect(effects.activeTraits).not.toContain('clutch');
  });

  it('returns the same no-hitter attribute bonus shape for pitchers', () => {
    const effects = applyMomentEffects(
      pitcher,
      [createMoment({ type: 'no_hitter', season: 5, impact: 85, relevance: 85 })],
      5,
    );

    expect(effects.hitterAttributeDelta).toBe(NO_HITTER_ATTRIBUTE_BONUS);
    expect(effects.pitcherAttributeDelta).toBe(NO_HITTER_ATTRIBUTE_BONUS);
  });

  it('does not mutate the supplied moments array', () => {
    const moments = [createMoment({ type: 'no_hitter', season: 5, relevance: 85 })];
    const snapshot = structuredClone(moments);

    applyMomentEffects(hitter, moments, 5);

    expect(moments).toEqual(snapshot);
  });

  it('treats walk-off permanence monotonically as more walk-off moments are added', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 6 }), (count) => {
        const moments = Array.from({ length: count }, (_, index) =>
          createMoment({ type: 'walk_off_hr', season: index + 1 }),
        );
        const effects = applyMomentEffects(hitter, moments, 20);
        expect(effects.activeTraits.includes('clutch')).toBe(count >= PERMANENT_CLUTCH_WALK_OFF_COUNT);
      }),
      { numRuns: 20 },
    );
  });
});

describe('formatMomentDescription', () => {
  it('includes the player name for every moment type', () => {
    const types: Moment['type'][] = [
      'walk_off_hr',
      'no_hitter',
      'perfect_game',
      'four_hr_game',
      'playoff_error',
      'first_career_hr',
      'milestone_500hr',
      'milestone_3000h',
      'milestone_300w',
      'blown_ws_save',
      'cycle',
      'twenty_k_game',
    ];

    for (const type of types) {
      const description = formatMomentDescription(
        createMoment({ type }),
        'Pat Legend',
        new GameRNG(700 + types.indexOf(type)),
      );

      expect(description).toContain('Pat Legend');
      expect(description.length).toBeGreaterThan(10);
    }
  });

  it('is deterministic for the same seed and input', () => {
    const moment = createMoment({ type: 'walk_off_hr' });
    const first = formatMomentDescription(moment, 'Pat Legend', new GameRNG(801));
    const second = formatMomentDescription(moment, 'Pat Legend', new GameRNG(801));

    expect(first).toBe(second);
  });
});

describe('moments barrel exports', () => {
  it('re-exports the moments APIs from sim-core root', async () => {
    const root = await import('../src/index.js');

    expect(root.detectMoment).toBeTypeOf('function');
    expect(root.applyMomentEffects).toBeTypeOf('function');
    expect(root.decayMoments).toBeTypeOf('function');
    expect(root.formatMomentDescription).toBeTypeOf('function');
    expect(root.MAX_MOMENTS_PER_PLAYER).toBe(MAX_MOMENTS_PER_PLAYER);
  });
});

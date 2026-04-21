import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import {
  assignPlayerToTeam,
  seedInitialTeamTenure,
} from '../src/player/teamTenures.js';
import {
  detectVeteranCoreRetires,
  type SeasonIdentityMomentDetectionContext,
  type TeamSeasonSummary,
} from '../src/moments/seasonIdentityMoments.js';

function makePlayer(
  seed: number,
  overrides: Partial<GeneratedPlayer> = {},
  position: GeneratedPlayer['position'] = 'SS',
  teamId: string = 'nym',
  rosterStatus: GeneratedPlayer['rosterStatus'] = 'MLB',
): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), position, teamId, rosterStatus),
    ...overrides,
  };
}

function summary(overrides: Partial<TeamSeasonSummary> & { teamId: string }): TeamSeasonSummary {
  return {
    teamId: overrides.teamId,
    wins: 81,
    losses: 81,
    madePlayoffs: false,
    isChampion: false,
    divisionRank: null,
    priorSeasonsSummary: [],
    ...overrides,
  };
}

function context(
  overrides: Partial<SeasonIdentityMomentDetectionContext> = {},
): SeasonIdentityMomentDetectionContext {
  return {
    season: 8,
    day: 1,
    teams: [],
    ...overrides,
  };
}

describe('team tenure tracking', () => {
  it('seeds an opening-day tenure for assigned players', () => {
    const player = makePlayer(1, {}, 'SS', 'nym', 'MLB');

    const seeded = seedInitialTeamTenure(player, 1);

    expect(seeded.teamTenures).toEqual([
      { teamId: 'nym', startSeason: 1, endSeason: null },
    ]);
  });

  it('closes the old tenure and opens a new one on trade', () => {
    const player = seedInitialTeamTenure(makePlayer(2, {}, 'CF', 'nym', 'MLB'), 1);

    const traded = assignPlayerToTeam(player, 'bos', 5);

    expect(traded.teamId).toBe('bos');
    expect(traded.teamTenures).toEqual([
      { teamId: 'nym', startSeason: 1, endSeason: 5 },
      { teamId: 'bos', startSeason: 5, endSeason: null },
    ]);
  });
});

describe('detectVeteranCoreRetires', () => {
  function veteran(seed: number, seasonsWithTeam: number): GeneratedPlayer {
    return makePlayer(seed, {
      age: 36,
      rosterStatus: 'RETIRED',
      teamId: 'nym',
      teamTenures: [{
        teamId: 'nym',
        startSeason: 1,
        endSeason: seasonsWithTeam,
      }],
    });
  }

  it('fires when three retirees each spent eight or more seasons with the same franchise', () => {
    const result = detectVeteranCoreRetires(
      summary({ teamId: 'nym' }),
      context({
        retiredPlayers: [veteran(11, 8), veteran(12, 9), veteran(13, 10)],
      }),
    );

    expect(result).not.toBeNull();
    expect(result?.teamId).toBe('nym');
    expect(result?.moment.type).toBe('veteran_core_retires');
    expect(result?.moment.description).toContain('ending a veteran core');
  });

  it('does not fire for only two long-tenured retirees', () => {
    const result = detectVeteranCoreRetires(
      summary({ teamId: 'nym' }),
      context({
        retiredPlayers: [veteran(21, 8), veteran(22, 9)],
      }),
    );

    expect(result).toBeNull();
  });

  it('does not fire when one of the retirees falls short of the tenure threshold', () => {
    const result = detectVeteranCoreRetires(
      summary({ teamId: 'nym' }),
      context({
        retiredPlayers: [veteran(31, 8), veteran(32, 8), veteran(33, 7)],
      }),
    );

    expect(result).toBeNull();
  });

  it('does not re-fire when the team already recorded the moment that season', () => {
    const result = detectVeteranCoreRetires(
      summary({ teamId: 'nym' }),
      context({
        retiredPlayers: [veteran(41, 8), veteran(42, 8), veteran(43, 8)],
        teamMoments: new Map([
          ['nym', [{
            season: 8,
            day: 1,
            timestamp: 'S8D1',
            type: 'veteran_core_retires',
            description: 'already recorded',
            impact: 55,
            relevance: 0.8,
            isPlayoff: false,
            isEliminationGame: false,
            worldSeriesClincher: false,
            round: null,
          }]],
        ]),
      }),
    );

    expect(result).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import { buildRookieOfTheYearVotingEntries } from '../src/league/awards.js';
import { detectRookieSensation } from '../src/moments/signatureMoments.js';
import { generatePlayer, type GeneratedPlayer } from '../src/player/generation.js';
import type { PlayerGameStats } from '../src/sim/gameSimulator.js';

function makePlayer(
  seed: number,
  teamId: string,
  position: GeneratedPlayer['position'] = 'CF',
  overrides: Partial<GeneratedPlayer> = {},
): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), position, teamId, 'MLB'),
    age: 22,
    developmentPhase: 'Prospect',
    ...overrides,
  };
}

function stats(playerId: string, teamId: string, overrides: Partial<PlayerGameStats> = {}): PlayerGameStats {
  return {
    playerId,
    teamId,
    gamesPlayed: 120,
    pa: 520,
    ab: 470,
    hits: 155,
    doubles: 28,
    triples: 3,
    hr: 22,
    rbi: 88,
    bb: 58,
    k: 101,
    runs: 82,
    hbp: 2,
    sacFlies: 4,
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

describe('buildRookieOfTheYearVotingEntries', () => {
  it('persists the top three rookie voting placements for both leagues', () => {
    const alPlayers = [
      makePlayer(1, 'nym'),
      makePlayer(2, 'bos'),
      makePlayer(3, 'det'),
    ];
    const nlPlayers = [
      makePlayer(4, 'lax'),
      makePlayer(5, 'atl'),
      makePlayer(6, 'hou'),
    ];
    const players = [...alPlayers, ...nlPlayers];
    const statsByPlayer = new Map<string, PlayerGameStats>([
      [alPlayers[0]!.id, stats(alPlayers[0]!.id, 'nym', { hr: 30, rbi: 110, hits: 175 })],
      [alPlayers[1]!.id, stats(alPlayers[1]!.id, 'bos', { hr: 24, rbi: 92, hits: 160 })],
      [alPlayers[2]!.id, stats(alPlayers[2]!.id, 'det', { hr: 20, rbi: 80, hits: 148 })],
      [nlPlayers[0]!.id, stats(nlPlayers[0]!.id, 'lax', { hr: 28, rbi: 105, hits: 170 })],
      [nlPlayers[1]!.id, stats(nlPlayers[1]!.id, 'atl', { hr: 23, rbi: 90, hits: 156 })],
      [nlPlayers[2]!.id, stats(nlPlayers[2]!.id, 'hou', { hr: 19, rbi: 78, hits: 145 })],
    ]);

    const voting = buildRookieOfTheYearVotingEntries(8, players, statsByPlayer);

    expect(voting).toHaveLength(2);
    expect(voting.map((entry) => [entry.leagueId, entry.placements.length])).toEqual([
      ['AL', 3],
      ['NL', 3],
    ]);
    expect(voting[0]?.placements.map((placement) => placement.rank)).toEqual([1, 2, 3]);
    expect(voting[1]?.placements.map((placement) => placement.rank)).toEqual([1, 2, 3]);
  });
});

describe('detectRookieSensation', () => {
  const other = makePlayer(21, 'bos');

  it('fires for a first-place rookie on the user team', () => {
    const player = makePlayer(11, 'nym');
    const detected = detectRookieSensation('nym', [player], [{
      season: 8,
      leagueId: 'AL',
      placements: [{ rank: 1, playerId: player.id, points: 91 }],
    }], 8, 1);

    expect(detected).toHaveLength(1);
    expect(detected[0]?.moment.type).toBe('rookie_sensation');
  });

  it('fires for a second-place rookie on the user team', () => {
    const player = makePlayer(12, 'nym');
    const detected = detectRookieSensation('nym', [player], [{
      season: 8,
      leagueId: 'AL',
      placements: [{ rank: 2, playerId: player.id, points: 72 }],
    }], 8, 1);

    expect(detected).toHaveLength(1);
  });

  it('fires for a third-place rookie on the user team', () => {
    const player = makePlayer(13, 'nym');
    const detected = detectRookieSensation('nym', [player], [{
      season: 8,
      leagueId: 'AL',
      placements: [{ rank: 3, playerId: player.id, points: 55 }],
    }], 8, 1);

    expect(detected).toHaveLength(1);
  });

  it('skips players outside the top three', () => {
    const player = makePlayer(14, 'nym');
    const detected = detectRookieSensation('nym', [player], [{
      season: 8,
      leagueId: 'AL',
      placements: [{ rank: 4, playerId: player.id, points: 31 }],
    }], 8, 1);

    expect(detected).toHaveLength(0);
  });

  it('skips rookies on non-user teams', () => {
    const detected = detectRookieSensation('nym', [other], [{
      season: 8,
      leagueId: 'AL',
      placements: [{ rank: 1, playerId: other.id, points: 84 }],
    }], 8, 1);

    expect(detected).toHaveLength(0);
  });
});

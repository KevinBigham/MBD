import { describe, expect, it } from 'vitest';
import type { PlayoffSeriesHistoryEntry } from '@mbd/contracts';
import {
  GameRNG,
  type GeneratedPlayer,
  type PlayoffSeriesState,
  detectPlayoffGauntlet,
  generateLeaguePlayers,
  simPlayoffGame,
} from '../src/index.js';

function buildPlayers(): GeneratedPlayer[] {
  return generateLeaguePlayers(new GameRNG(77), ['nym', 'lax']);
}

function buildSeries(
  overrides: Partial<PlayoffSeriesState> = {},
): PlayoffSeriesState {
  return {
    id: 'SERIES-1',
    round: 'DIVISION_SERIES',
    league: 'AL',
    bestOf: 5,
    higherSeed: {
      teamId: 'nym',
      seed: 1,
      wins: 99,
      losses: 63,
      league: 'AL',
      divisionWinner: true,
    },
    lowerSeed: {
      teamId: 'lax',
      seed: 4,
      wins: 90,
      losses: 72,
      league: 'AL',
      divisionWinner: false,
    },
    games: [],
    higherSeedWins: 0,
    lowerSeedWins: 0,
    leaderSummary: 'Series tied 0-0',
    status: 'in_progress',
    winnerId: null,
    loserId: null,
    deficitReached: null,
    deficitTeamId: null,
    ...overrides,
  };
}

function findSeedForWinner(
  series: PlayoffSeriesState,
  players: GeneratedPlayer[],
  expectedWinnerId: string,
): number {
  for (let seed = 1; seed <= 5000; seed += 1) {
    const updated = simPlayoffGame(series, players, new GameRNG(seed));
    if (updated.games[0]?.winnerId === expectedWinnerId) {
      return seed;
    }
  }
  throw new Error(`Expected a deterministic seed for ${expectedWinnerId}`);
}

function historyEntry(
  overrides: Partial<PlayoffSeriesHistoryEntry> = {},
): PlayoffSeriesHistoryEntry {
  return {
    season: 8,
    round: 'DIVISION_SERIES',
    higherSeedTeamId: 'nym',
    lowerSeedTeamId: 'lax',
    bestOf: 5,
    deficitReached: '0-2',
    deficitTeamId: 'nym',
    winnerTeamId: 'nym',
    ...overrides,
  };
}

describe('playoff gauntlet tracking', () => {
  it('marks a best-of-five series when a team first falls behind 0-2', () => {
    const players = buildPlayers();
    const series = buildSeries({ higherSeedWins: 0, lowerSeedWins: 1, leaderSummary: 'LAX leads 1-0' });
    const seed = findSeedForWinner(series, players, 'lax');

    const updated = simPlayoffGame(series, players, new GameRNG(seed));

    expect(updated.deficitReached).toBe('0-2');
    expect(updated.deficitTeamId).toBe('nym');
  });

  it('does not emit a gauntlet moment when the team that trailed lost the series', () => {
    const result = detectPlayoffGauntlet(
      historyEntry({
        deficitReached: '0-2',
        deficitTeamId: 'lax',
        winnerTeamId: 'nym',
      }),
      12,
    );

    expect(result).toBeNull();
  });

  it('marks a best-of-seven series when a team first falls behind 1-3', () => {
    const players = buildPlayers();
    const series = buildSeries({
      bestOf: 7,
      round: 'CHAMPIONSHIP_SERIES',
      higherSeedWins: 0,
      lowerSeedWins: 3,
      leaderSummary: 'LAX leads 3-0',
    });
    const seed = findSeedForWinner(series, players, 'nym');

    const updated = simPlayoffGame(series, players, new GameRNG(seed));

    expect(updated.deficitReached).toBe('1-3');
    expect(updated.deficitTeamId).toBe('nym');
  });

  it('does not set a comeback marker for a sweep in the other direction', () => {
    const players = buildPlayers();
    const series = buildSeries({ higherSeedWins: 2, lowerSeedWins: 0, leaderSummary: 'NYM leads 2-0' });
    const seed = findSeedForWinner(series, players, 'nym');

    const updated = simPlayoffGame(series, players, new GameRNG(seed));

    expect(updated.deficitReached).toBeNull();
    expect(updated.deficitTeamId).toBeNull();
  });

  it('fires a gauntlet moment for a recorded comeback series win', () => {
    const result = detectPlayoffGauntlet(
      historyEntry({
        deficitReached: '1-3',
        deficitTeamId: 'nym',
        winnerTeamId: 'nym',
        bestOf: 7,
        round: 'CHAMPIONSHIP_SERIES',
      }),
      18,
    );

    expect(result).not.toBeNull();
    expect(result?.teamId).toBe('nym');
    expect(result?.moment.type).toBe('playoff_gauntlet');
    expect(result?.moment.description).toContain('down 3-1');
  });

  it('is deterministic for the same seed and series state', () => {
    const players = buildPlayers();
    const series = buildSeries({ higherSeedWins: 0, lowerSeedWins: 1, leaderSummary: 'LAX leads 1-0' });
    const seed = findSeedForWinner(series, players, 'lax');

    const first = simPlayoffGame(series, players, new GameRNG(seed));
    const second = simPlayoffGame(series, players, new GameRNG(seed));

    expect(second.deficitReached).toBe(first.deficitReached);
    expect(second.deficitTeamId).toBe(first.deficitTeamId);
    expect(second.leaderSummary).toBe(first.leaderSummary);
  });
});

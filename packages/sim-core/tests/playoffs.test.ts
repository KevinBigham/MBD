import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  generateLeaguePlayers,
  initializePlayoffBracket,
  buildPlayoffPreview,
  simPlayoffGame,
  advancePlayoffRound,
  isPlayoffComplete,
  type PlayoffBracket,
  type StandingsEntry,
} from '../src/index.js';

function entry(teamId: string, wins: number, losses: number): StandingsEntry {
  return {
    teamId,
    wins,
    losses,
    pct: wins / (wins + losses),
    gamesBack: 0,
    runsScored: wins * 6,
    runsAllowed: losses * 5,
    runDifferential: wins - losses,
    streak: 'W2',
    last10Wins: 7,
    last10Losses: 3,
  };
}

function standingsFixture(): Record<string, StandingsEntry[]> {
  return {
    AL_EAST: [
      entry('nym', 101, 61),
      entry('bal', 95, 67),
      entry('bos', 89, 73),
      entry('wsh', 84, 78),
      entry('phi', 78, 84),
    ],
    AL_CENTRAL: [
      entry('cle', 96, 66),
      entry('det', 90, 72),
      entry('chi', 88, 74),
      entry('col', 80, 82),
      entry('pit', 72, 90),
    ],
    AL_WEST: [
      entry('kc', 98, 64),
      entry('msp', 93, 69),
      entry('stl', 87, 75),
      entry('ind', 83, 79),
      entry('mil', 76, 86),
      entry('nas', 70, 92),
    ],
    NL_EAST: [
      entry('atl', 102, 60),
      entry('cha', 98, 64),
      entry('orl', 86, 76),
      entry('ral', 82, 80),
      entry('mia', 74, 88),
    ],
    NL_CENTRAL: [
      entry('hou', 97, 65),
      entry('dal', 91, 71),
      entry('sat', 85, 77),
      entry('den', 79, 83),
      entry('aus', 71, 91),
    ],
    NL_WEST: [
      entry('lax', 100, 62),
      entry('sdg', 94, 68),
      entry('phx', 89, 73),
      entry('sea', 81, 81),
      entry('sfb', 74, 88),
      entry('por', 66, 96),
    ],
  };
}

function winnersById(bracket: PlayoffBracket): string[] {
  return bracket.series.map((series) => series.winnerId);
}

describe('playoff bracket state', () => {
  it('builds league-local wild card matchups and later-round placeholders', () => {
    const bracket = initializePlayoffBracket(standingsFixture(), new GameRNG(17));
    const preview = buildPlayoffPreview(bracket.seeds);

    expect(bracket.currentRound).toBe('WILD_CARD');
    expect(bracket.currentRoundSeries).toHaveLength(4);

    expect(bracket.currentRoundSeries.map((series) => ({
      id: series.id,
      round: series.round,
      league: series.league,
      bestOf: series.bestOf,
      high: `${series.higherSeed.seed}-${series.higherSeed.teamId}`,
      low: `${series.lowerSeed.seed}-${series.lowerSeed.teamId}`,
    }))).toEqual([
      { id: 'AL-WC-1', round: 'WILD_CARD', league: 'AL', bestOf: 3, high: '3-cle', low: '6-det' },
      { id: 'AL-WC-2', round: 'WILD_CARD', league: 'AL', bestOf: 3, high: '4-bal', low: '5-msp' },
      { id: 'NL-WC-1', round: 'WILD_CARD', league: 'NL', bestOf: 3, high: '3-hou', low: '6-dal' },
      { id: 'NL-WC-2', round: 'WILD_CARD', league: 'NL', bestOf: 3, high: '4-cha', low: '5-sdg' },
    ]);

    expect(preview.map((series) => ({
      id: series.id,
      round: series.round,
      bestOf: series.bestOf,
      homeSeed: series.home.seed,
      awaySeed: series.away.seed,
      homePlaceholder: series.home.placeholder,
      awayPlaceholder: series.away.placeholder,
    }))).toEqual([
      { id: 'AL-WC-1', round: 'WILD_CARD', bestOf: 3, homeSeed: 3, awaySeed: 6, homePlaceholder: null, awayPlaceholder: null },
      { id: 'AL-WC-2', round: 'WILD_CARD', bestOf: 3, homeSeed: 4, awaySeed: 5, homePlaceholder: null, awayPlaceholder: null },
      { id: 'AL-DS-1', round: 'DIVISION_SERIES', bestOf: 5, homeSeed: 1, awaySeed: null, homePlaceholder: null, awayPlaceholder: 'Lowest remaining AL wild card' },
      { id: 'AL-DS-2', round: 'DIVISION_SERIES', bestOf: 5, homeSeed: 2, awaySeed: null, homePlaceholder: null, awayPlaceholder: 'Highest remaining AL wild card' },
      { id: 'AL-CS-1', round: 'CHAMPIONSHIP_SERIES', bestOf: 7, homeSeed: null, awaySeed: null, homePlaceholder: 'Winner of AL DS 1', awayPlaceholder: 'Winner of AL DS 2' },
      { id: 'NL-WC-1', round: 'WILD_CARD', bestOf: 3, homeSeed: 3, awaySeed: 6, homePlaceholder: null, awayPlaceholder: null },
      { id: 'NL-WC-2', round: 'WILD_CARD', bestOf: 3, homeSeed: 4, awaySeed: 5, homePlaceholder: null, awayPlaceholder: null },
      { id: 'NL-DS-1', round: 'DIVISION_SERIES', bestOf: 5, homeSeed: 1, awaySeed: null, homePlaceholder: null, awayPlaceholder: 'Lowest remaining NL wild card' },
      { id: 'NL-DS-2', round: 'DIVISION_SERIES', bestOf: 5, homeSeed: 2, awaySeed: null, homePlaceholder: null, awayPlaceholder: 'Highest remaining NL wild card' },
      { id: 'NL-CS-1', round: 'CHAMPIONSHIP_SERIES', bestOf: 7, homeSeed: null, awaySeed: null, homePlaceholder: 'Winner of NL DS 1', awayPlaceholder: 'Winner of NL DS 2' },
      { id: 'WS-1', round: 'WORLD_SERIES', bestOf: 7, homeSeed: null, awaySeed: null, homePlaceholder: 'AL Champion', awayPlaceholder: 'NL Champion' },
    ]);
  });

  it('sims one playoff game with key performers and updates series score', () => {
    const rng = new GameRNG(23);
    const players = generateLeaguePlayers(rng.fork(), [
      'nym', 'bal', 'bos', 'wsh', 'phi',
      'cle', 'det', 'chi', 'col', 'pit',
      'kc', 'msp', 'stl', 'ind', 'mil', 'nas',
      'atl', 'cha', 'orl', 'ral', 'mia',
      'hou', 'dal', 'sat', 'den', 'aus',
      'lax', 'sdg', 'phx', 'sea', 'sfb', 'por',
    ]);
    const bracket = initializePlayoffBracket(standingsFixture(), rng.fork());

    const updatedSeries = simPlayoffGame(bracket.currentRoundSeries[0]!, players, rng.fork());

    expect(updatedSeries.games).toHaveLength(1);
    expect(updatedSeries.games[0]?.gameNumber).toBe(1);
    expect(updatedSeries.games[0]?.keyPerformers.length).toBeGreaterThan(0);
    expect(updatedSeries.higherSeedWins + updatedSeries.lowerSeedWins).toBe(1);
    expect(updatedSeries.leaderSummary).toMatch(/leads 1-0|won 1-0|Series tied 0-0/);
    expect(updatedSeries.status).toBe('in_progress');
  });

  it('awards a depleted-roster forfeit to the team that can still field a lineup', () => {
    const rng = new GameRNG(29);
    const players = generateLeaguePlayers(rng.fork(), [
      'nym', 'bal', 'bos', 'wsh', 'phi',
      'cle', 'det', 'chi', 'col', 'pit',
      'kc', 'msp', 'stl', 'ind', 'mil', 'nas',
      'atl', 'cha', 'orl', 'ral', 'mia',
      'hou', 'dal', 'sat', 'den', 'aus',
      'lax', 'sdg', 'phx', 'sea', 'sfb', 'por',
    ]);
    const bracket = initializePlayoffBracket(standingsFixture(), rng.fork());
    const series = bracket.currentRoundSeries[0]!;
    const strippedPlayers = players.filter((player) =>
      !(player.teamId === series.higherSeed.teamId
        && player.rosterStatus === 'MLB'
        && player.pitcherAttributes == null),
    );

    const forfeitedSeries = simPlayoffGame(series, strippedPlayers, rng.fork());

    expect(forfeitedSeries.status).toBe('complete');
    expect(forfeitedSeries.winnerId).toBe(series.lowerSeed.teamId);
    expect(forfeitedSeries.loserId).toBe(series.higherSeed.teamId);
    expect(forfeitedSeries.lowerSeedWins).toBe(2);
    expect(forfeitedSeries.higherSeedWins).toBe(0);
    expect(forfeitedSeries.leaderSummary).toContain('won 2-0');
  });

  it('advances rounds, preserves completed-series history, and finishes the bracket', () => {
    const rng = new GameRNG(31);
    const players = generateLeaguePlayers(rng.fork(), [
      'nym', 'bal', 'bos', 'wsh', 'phi',
      'cle', 'det', 'chi', 'col', 'pit',
      'kc', 'msp', 'stl', 'ind', 'mil', 'nas',
      'atl', 'cha', 'orl', 'ral', 'mia',
      'hou', 'dal', 'sat', 'den', 'aus',
      'lax', 'sdg', 'phx', 'sea', 'sfb', 'por',
    ]);
    let bracket = initializePlayoffBracket(standingsFixture(), rng.fork());

    while (!isPlayoffComplete(bracket)) {
      bracket = advancePlayoffRound(bracket, players, rng.fork());
    }

    expect(isPlayoffComplete(bracket)).toBe(true);
    expect(bracket.champion).toBeTruthy();
    expect(bracket.completedRounds.map((round) => round.round)).toEqual([
      'WILD_CARD',
      'DIVISION_SERIES',
      'CHAMPIONSHIP_SERIES',
      'WORLD_SERIES',
    ]);
    expect(bracket.series).toHaveLength(11);
    expect(winnersById(bracket)).toContain(bracket.champion!);
  });
});

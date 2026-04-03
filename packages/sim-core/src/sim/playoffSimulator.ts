/**
 * @module playoffSimulator
 * Interactive postseason bracket simulation with per-series state.
 */

import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { HITTER_POSITIONS, PITCHER_POSITIONS } from '../player/generation.js';
import type { StandingsEntry } from '../league/standings.js';
import { getTeamById } from '../league/teams.js';
import type { GameBoxScore, GameTeam, PlayerGameStats } from './gameSimulator.js';
import { simulateGame } from './gameSimulator.js';

export type LeagueId = 'AL' | 'NL';

export interface PlayoffSeed {
  readonly teamId: string;
  readonly seed: number;
  readonly wins: number;
  readonly losses: number;
  readonly league: LeagueId;
  readonly divisionWinner: boolean;
}

export interface PlayoffKeyPerformer {
  readonly playerId: string;
  readonly playerName: string;
  readonly teamId: string;
  readonly statLine: string;
}

export interface PlayoffGameResult {
  readonly gameNumber: number;
  readonly winnerId: string;
  readonly loserId: string;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly innings: number;
  readonly keyPerformers: PlayoffKeyPerformer[];
  readonly boxScore: GameBoxScore;
}

export interface SeriesResult {
  readonly winnerId: string;
  readonly loserId: string;
  readonly winnerWins: number;
  readonly loserWins: number;
  readonly games: GameBoxScore[];
  readonly round: PlayoffRound;
}

export type PlayoffRound =
  | 'WILD_CARD'
  | 'DIVISION_SERIES'
  | 'CHAMPIONSHIP_SERIES'
  | 'WORLD_SERIES';

export interface PlayoffSeriesState {
  readonly id: string;
  readonly round: PlayoffRound;
  readonly league: LeagueId | 'MLB';
  readonly bestOf: 3 | 5 | 7;
  readonly higherSeed: PlayoffSeed;
  readonly lowerSeed: PlayoffSeed;
  readonly games: PlayoffGameResult[];
  readonly higherSeedWins: number;
  readonly lowerSeedWins: number;
  readonly leaderSummary: string;
  readonly status: 'in_progress' | 'complete';
  readonly winnerId: string | null;
  readonly loserId: string | null;
}

export interface CompletedRoundResult {
  readonly round: PlayoffRound;
  readonly series: PlayoffSeriesState[];
}

export interface PlayoffBracket {
  readonly seeds: PlayoffSeed[];
  readonly currentRound: PlayoffRound;
  readonly currentRoundSeries: PlayoffSeriesState[];
  readonly completedRounds: CompletedRoundResult[];
  readonly series: SeriesResult[];
  readonly champion: string | null;
  readonly runnerUp: string | null;
}

export interface PlayoffPreviewTeamSlot {
  readonly teamId: string | null;
  readonly seed: number | null;
  readonly placeholder: string | null;
}

export interface PlayoffPreviewSeries {
  readonly id: string;
  readonly round: PlayoffRound;
  readonly bestOf: 3 | 5 | 7;
  readonly home: PlayoffPreviewTeamSlot;
  readonly away: PlayoffPreviewTeamSlot;
}

export interface PlayoffSimulationOptions {
  readonly teamModifiers?: Map<string, number>;
}

const LEAGUES: readonly LeagueId[] = ['AL', 'NL'];

function leagueFromDivision(division: string): LeagueId {
  return division.startsWith('AL') ? 'AL' : 'NL';
}

function standingsSort(left: StandingsEntry, right: StandingsEntry): number {
  if (right.pct !== left.pct) return right.pct - left.pct;
  if (right.wins !== left.wins) return right.wins - left.wins;
  if (left.losses !== right.losses) return left.losses - right.losses;
  return left.teamId.localeCompare(right.teamId);
}

function seriesSort(left: PlayoffSeriesState, right: PlayoffSeriesState): number {
  return left.id.localeCompare(right.id);
}

function compareSeeds(left: PlayoffSeed, right: PlayoffSeed): number {
  if (left.seed !== right.seed) return left.seed - right.seed;
  if (right.wins !== left.wins) return right.wins - left.wins;
  if (left.losses !== right.losses) return left.losses - right.losses;
  return left.teamId.localeCompare(right.teamId);
}

function sortForHomeField(left: PlayoffSeed, right: PlayoffSeed): number {
  if (right.wins !== left.wins) return right.wins - left.wins;
  if (left.losses !== right.losses) return left.losses - right.losses;
  return compareSeeds(left, right);
}

function getWinsNeeded(bestOf: 3 | 5 | 7): number {
  return Math.ceil(bestOf / 2);
}

function getHomePattern(bestOf: 3 | 5 | 7): readonly 1[] | readonly (1 | 2)[] {
  if (bestOf === 3) {
    return [1, 1, 1];
  }
  if (bestOf === 5) {
    return [1, 1, 2, 2, 1];
  }
  return [1, 1, 2, 2, 2, 1, 1];
}

function slotFromSeed(seed: PlayoffSeed | undefined): PlayoffPreviewTeamSlot {
  return {
    teamId: seed?.teamId ?? null,
    seed: seed?.seed ?? null,
    placeholder: null,
  };
}

function placeholderSlot(placeholder: string): PlayoffPreviewTeamSlot {
  return {
    teamId: null,
    seed: null,
    placeholder,
  };
}

function teamAbbreviation(teamId: string | null): string {
  if (!teamId) return 'TBD';
  return getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase();
}

function winnerSeed(series: PlayoffSeriesState): PlayoffSeed {
  if (series.winnerId === series.higherSeed.teamId) return series.higherSeed;
  return series.lowerSeed;
}

function loserSeed(series: PlayoffSeriesState): PlayoffSeed {
  if (series.loserId === series.higherSeed.teamId) return series.higherSeed;
  return series.lowerSeed;
}

function toLegacySeries(series: PlayoffSeriesState): SeriesResult {
  return {
    winnerId: series.winnerId ?? series.higherSeed.teamId,
    loserId: series.loserId ?? series.lowerSeed.teamId,
    winnerWins: Math.max(series.higherSeedWins, series.lowerSeedWins),
    loserWins: Math.min(series.higherSeedWins, series.lowerSeedWins),
    games: series.games.map((game) => game.boxScore),
    round: series.round,
  };
}

function buildLeaderSummary(series: PlayoffSeriesState): string {
  const higherAbbr = teamAbbreviation(series.higherSeed.teamId);
  const lowerAbbr = teamAbbreviation(series.lowerSeed.teamId);

  if (series.status === 'complete') {
    const winner = series.winnerId === series.higherSeed.teamId ? higherAbbr : lowerAbbr;
    const winnerWins = Math.max(series.higherSeedWins, series.lowerSeedWins);
    const loserWins = Math.min(series.higherSeedWins, series.lowerSeedWins);
    return `${winner} won ${winnerWins}-${loserWins}`;
  }

  if (series.higherSeedWins === series.lowerSeedWins) {
    return `Series tied ${series.higherSeedWins}-${series.lowerSeedWins}`;
  }

  if (series.higherSeedWins > series.lowerSeedWins) {
    return `${higherAbbr} leads ${series.higherSeedWins}-${series.lowerSeedWins}`;
  }

  return `${lowerAbbr} leads ${series.lowerSeedWins}-${series.higherSeedWins}`;
}

function createSeries(
  id: string,
  round: PlayoffRound,
  league: LeagueId | 'MLB',
  bestOf: 3 | 5 | 7,
  higherSeed: PlayoffSeed,
  lowerSeed: PlayoffSeed,
): PlayoffSeriesState {
  const base: PlayoffSeriesState = {
    id,
    round,
    league,
    bestOf,
    higherSeed,
    lowerSeed,
    games: [],
    higherSeedWins: 0,
    lowerSeedWins: 0,
    leaderSummary: 'Series tied 0-0',
    status: 'in_progress',
    winnerId: null,
    loserId: null,
  };
  return {
    ...base,
    leaderSummary: buildLeaderSummary(base),
  };
}

function buildGameTeam(teamId: string, allPlayers: GeneratedPlayer[]): GameTeam {
  const mlbPlayers = allPlayers.filter((player) => player.teamId === teamId && player.rosterStatus === 'MLB');
  const hitters = mlbPlayers
    .filter((player) => (HITTER_POSITIONS as readonly string[]).includes(player.position))
    .sort((left, right) => right.overallRating - left.overallRating);
  const pitchers = mlbPlayers
    .filter((player) => (PITCHER_POSITIONS as readonly string[]).includes(player.position))
    .sort((left, right) => right.overallRating - left.overallRating);

  const lineup = hitters.slice(0, 9);
  while (lineup.length < 9 && lineup.length > 0) {
    lineup.push(lineup[0]!);
  }

  const starter = pitchers.find((player) => player.position === 'SP') ?? pitchers[0] ?? lineup[0]!;
  const bullpen = pitchers.filter((player) => player !== starter);

  return {
    teamId,
    lineup,
    pitcher: starter,
    bullpen,
  };
}

function playerPerformanceScore(stats: PlayerGameStats): number {
  const hitting = stats.hits * 2 + stats.hr * 5 + stats.rbi * 1.5 + stats.runs + stats.bb * 0.5;
  const pitching = stats.ip + stats.strikeouts * 1.5 - stats.earnedRuns * 2 - stats.walks * 0.5 + stats.wins * 4;
  return hitting + pitching;
}

function formatStatLine(stats: PlayerGameStats): string {
  if (stats.ip > 0) {
    return `${(stats.ip / 3).toFixed(1)} IP, ${stats.strikeouts} K, ${stats.earnedRuns} ER`;
  }
  return `${stats.hits}-${stats.ab}, ${stats.hr} HR, ${stats.rbi} RBI`;
}

function deriveKeyPerformers(
  allPlayers: GeneratedPlayer[],
  playerStats: Map<string, PlayerGameStats>,
): PlayoffKeyPerformer[] {
  return Array.from(playerStats.values())
    .filter((stats) => playerPerformanceScore(stats) > 0)
    .sort((left, right) => playerPerformanceScore(right) - playerPerformanceScore(left))
    .slice(0, 3)
    .map((stats) => {
      const player = allPlayers.find((candidate) => candidate.id === stats.playerId);
      return {
        playerId: stats.playerId,
        playerName: player ? `${player.firstName} ${player.lastName}` : stats.playerId,
        teamId: stats.teamId,
        statLine: formatStatLine(stats),
      };
    });
}

function syncLegacyBracket(bracket: Omit<PlayoffBracket, 'series' | 'champion' | 'runnerUp'>): PlayoffBracket {
  const dedupedCompletedSeries = new Map<string, PlayoffSeriesState>();
  for (const series of [
    ...bracket.completedRounds.flatMap((round) => round.series),
    ...bracket.currentRoundSeries.filter((series) => series.status === 'complete'),
  ]) {
    dedupedCompletedSeries.set(series.id, series);
  }
  const allCompletedSeries = Array.from(dedupedCompletedSeries.values()).sort(seriesSort);
  const series = allCompletedSeries.map(toLegacySeries);
  const worldSeries = allCompletedSeries.find((item) => item.round === 'WORLD_SERIES');

  return {
    ...bracket,
    series,
    champion: worldSeries?.winnerId ?? null,
    runnerUp: worldSeries?.loserId ?? null,
  };
}

function createBracketFromSeeds(seeds: PlayoffSeed[]): PlayoffBracket {
  const currentRoundSeries: PlayoffSeriesState[] = [];

  for (const league of LEAGUES) {
    const leagueSeeds = seeds
      .filter((seed) => seed.league === league)
      .sort(compareSeeds);
    if (leagueSeeds.length < 6) continue;

    currentRoundSeries.push(
      createSeries(`${league}-WC-1`, 'WILD_CARD', league, 3, leagueSeeds[2]!, leagueSeeds[5]!),
      createSeries(`${league}-WC-2`, 'WILD_CARD', league, 3, leagueSeeds[3]!, leagueSeeds[4]!),
    );
  }

  return syncLegacyBracket({
    seeds,
    currentRound: 'WILD_CARD',
    currentRoundSeries: currentRoundSeries.sort(seriesSort),
    completedRounds: [],
  });
}

function getRoundWinners(rounds: CompletedRoundResult[], round: PlayoffRound, league: LeagueId | 'MLB'): PlayoffSeed[] {
  const entry = rounds.find((candidate) => candidate.round === round);
  if (!entry) return [];
  return entry.series
    .filter((series) => series.league === league)
    .map(winnerSeed)
    .sort(compareSeeds);
}

function buildNextRoundSeries(bracket: PlayoffBracket): PlayoffSeriesState[] {
  if (bracket.currentRound === 'WILD_CARD') {
    const next: PlayoffSeriesState[] = [];
    for (const league of LEAGUES) {
      const leagueSeeds = bracket.seeds
        .filter((seed) => seed.league === league)
        .sort(compareSeeds);
      const wcWinners = getRoundWinners(
        [...bracket.completedRounds, { round: 'WILD_CARD' as const, series: bracket.currentRoundSeries }],
        'WILD_CARD',
        league,
      ).sort((left, right) => right.seed - left.seed);
      if (leagueSeeds.length < 2 || wcWinners.length < 2) continue;
      next.push(
        createSeries(`${league}-DS-1`, 'DIVISION_SERIES', league, 5, leagueSeeds[0]!, wcWinners[0]!),
        createSeries(`${league}-DS-2`, 'DIVISION_SERIES', league, 5, leagueSeeds[1]!, wcWinners[1]!),
      );
    }
    return next.sort(seriesSort);
  }

  if (bracket.currentRound === 'DIVISION_SERIES') {
    const next: PlayoffSeriesState[] = [];
    const rounds = [...bracket.completedRounds, { round: 'DIVISION_SERIES' as const, series: bracket.currentRoundSeries }];
    for (const league of LEAGUES) {
      const winners = getRoundWinners(rounds, 'DIVISION_SERIES', league);
      if (winners.length < 2) continue;
      const ordered = [...winners].sort(compareSeeds);
      next.push(
        createSeries(`${league}-CS-1`, 'CHAMPIONSHIP_SERIES', league, 7, ordered[0]!, ordered[1]!),
      );
    }
    return next.sort(seriesSort);
  }

  if (bracket.currentRound === 'CHAMPIONSHIP_SERIES') {
    const rounds = [...bracket.completedRounds, { round: 'CHAMPIONSHIP_SERIES' as const, series: bracket.currentRoundSeries }];
    const alChampion = getRoundWinners(rounds, 'CHAMPIONSHIP_SERIES', 'AL')[0];
    const nlChampion = getRoundWinners(rounds, 'CHAMPIONSHIP_SERIES', 'NL')[0];
    if (!alChampion || !nlChampion) return [];
    const ordered = [alChampion, nlChampion].sort(sortForHomeField);
    return [
      createSeries('WS-1', 'WORLD_SERIES', 'MLB', 7, ordered[0]!, ordered[1]!),
    ];
  }

  return [];
}

function simulateSeriesState(
  series: PlayoffSeriesState,
  allPlayers: GeneratedPlayer[],
  rng: GameRNG,
  options: PlayoffSimulationOptions = {},
): PlayoffSeriesState {
  let current = series;
  while (current.status !== 'complete') {
    current = simPlayoffGame(current, allPlayers, rng.fork(), options);
  }
  return current;
}

export function determinePlayoffSeeds(
  standings: Record<string, StandingsEntry[]>,
): PlayoffSeed[] {
  const seeds: PlayoffSeed[] = [];

  for (const league of LEAGUES) {
    const leagueEntries = Object.entries(standings)
      .filter(([division]) => leagueFromDivision(division) === league);
    const divisionWinners = leagueEntries
      .map(([, entries]) => entries[0])
      .filter((entry): entry is StandingsEntry => entry != null)
      .sort(standingsSort);
    const wildCardPool = leagueEntries
      .flatMap(([, entries]) => entries.slice(1))
      .sort(standingsSort)
      .slice(0, 3);

    divisionWinners.forEach((winner, index) => {
      seeds.push({
        teamId: winner.teamId,
        seed: index + 1,
        wins: winner.wins,
        losses: winner.losses,
        league,
        divisionWinner: true,
      });
    });

    wildCardPool.forEach((team, index) => {
      seeds.push({
        teamId: team.teamId,
        seed: index + 4,
        wins: team.wins,
        losses: team.losses,
        league,
        divisionWinner: false,
      });
    });
  }

  return seeds.sort((left, right) => {
    if (left.league !== right.league) return left.league.localeCompare(right.league);
    return compareSeeds(left, right);
  });
}

export function buildPlayoffPreview(seeds: PlayoffSeed[]): PlayoffPreviewSeries[] {
  const series: PlayoffPreviewSeries[] = [];

  for (const league of LEAGUES) {
    const leagueSeeds = seeds.filter((seed) => seed.league === league).sort(compareSeeds);
    if (leagueSeeds.length < 6) continue;

    series.push(
      {
        id: `${league}-WC-1`,
        round: 'WILD_CARD',
        bestOf: 3,
        home: slotFromSeed(leagueSeeds[2]),
        away: slotFromSeed(leagueSeeds[5]),
      },
      {
        id: `${league}-WC-2`,
        round: 'WILD_CARD',
        bestOf: 3,
        home: slotFromSeed(leagueSeeds[3]),
        away: slotFromSeed(leagueSeeds[4]),
      },
      {
        id: `${league}-DS-1`,
        round: 'DIVISION_SERIES',
        bestOf: 5,
        home: slotFromSeed(leagueSeeds[0]),
        away: placeholderSlot(`Lowest remaining ${league} wild card`),
      },
      {
        id: `${league}-DS-2`,
        round: 'DIVISION_SERIES',
        bestOf: 5,
        home: slotFromSeed(leagueSeeds[1]),
        away: placeholderSlot(`Highest remaining ${league} wild card`),
      },
      {
        id: `${league}-CS-1`,
        round: 'CHAMPIONSHIP_SERIES',
        bestOf: 7,
        home: placeholderSlot(`Winner of ${league} DS 1`),
        away: placeholderSlot(`Winner of ${league} DS 2`),
      },
    );
  }

  series.push({
    id: 'WS-1',
    round: 'WORLD_SERIES',
    bestOf: 7,
    home: placeholderSlot('AL Champion'),
    away: placeholderSlot('NL Champion'),
  });

  return series;
}

export function initializePlayoffBracket(
  standings: Record<string, StandingsEntry[]>,
  _rng: GameRNG,
): PlayoffBracket {
  return createBracketFromSeeds(determinePlayoffSeeds(standings));
}

export function simPlayoffGame(
  series: PlayoffSeriesState,
  allPlayers: GeneratedPlayer[],
  rng: GameRNG,
  options: PlayoffSimulationOptions = {},
): PlayoffSeriesState {
  if (series.status === 'complete') {
    return series;
  }

  const gameNumber = series.games.length + 1;
  const homePattern = getHomePattern(series.bestOf);
  const host = homePattern[Math.min(series.games.length, homePattern.length - 1)] === 1
    ? series.higherSeed
    : series.lowerSeed;
  const guest = host.teamId === series.higherSeed.teamId ? series.lowerSeed : series.higherSeed;

  const home = buildGameTeam(host.teamId, allPlayers);
  const away = buildGameTeam(guest.teamId, allPlayers);

  if (home.lineup.length < 9 || away.lineup.length < 9) {
    const higherSeedWins = series.higherSeedWins + 1;
    const completed = {
      ...series,
      higherSeedWins,
      status: 'complete' as const,
      winnerId: series.higherSeed.teamId,
      loserId: series.lowerSeed.teamId,
    };
    return {
      ...completed,
      leaderSummary: buildLeaderSummary(completed),
    };
  }

  const { boxScore, playerStats } = simulateGame(
    rng.fork(),
    away,
    home,
    `${series.id}-G${gameNumber}`,
    true,
    {
      awayOffenseModifier: options.teamModifiers?.get(guest.teamId),
      homeOffenseModifier: options.teamModifiers?.get(host.teamId),
    },
  );
  const winnerId = boxScore.homeScore > boxScore.awayScore ? boxScore.homeTeamId : boxScore.awayTeamId;
  const loserId = winnerId === boxScore.homeTeamId ? boxScore.awayTeamId : boxScore.homeTeamId;
  const higherSeedWon = winnerId === series.higherSeed.teamId;
  const nextHigherSeedWins = series.higherSeedWins + (higherSeedWon ? 1 : 0);
  const nextLowerSeedWins = series.lowerSeedWins + (higherSeedWon ? 0 : 1);
  const winsNeeded = getWinsNeeded(series.bestOf);
  const complete = nextHigherSeedWins >= winsNeeded || nextLowerSeedWins >= winsNeeded;

  const nextSeries: PlayoffSeriesState = {
    ...series,
    games: [
      ...series.games,
      {
        gameNumber,
        winnerId,
        loserId,
        homeTeamId: boxScore.homeTeamId,
        awayTeamId: boxScore.awayTeamId,
        homeScore: boxScore.homeScore,
        awayScore: boxScore.awayScore,
        innings: boxScore.innings,
        keyPerformers: deriveKeyPerformers(allPlayers, playerStats),
        boxScore,
      },
    ],
    higherSeedWins: nextHigherSeedWins,
    lowerSeedWins: nextLowerSeedWins,
    status: complete ? 'complete' : 'in_progress',
    winnerId: complete ? winnerId : null,
    loserId: complete ? loserId : null,
  };

  return {
    ...nextSeries,
    leaderSummary: buildLeaderSummary(nextSeries),
  };
}

export function simulateSeries(
  rng: GameRNG,
  team1Id: string,
  team2Id: string,
  bestOf: 3 | 5 | 7,
  round: PlayoffRound,
  allPlayers: GeneratedPlayer[],
  options: PlayoffSimulationOptions = {},
): SeriesResult {
  const higherSeed: PlayoffSeed = {
    teamId: team1Id,
    seed: 1,
    wins: 0,
    losses: 0,
    league: 'AL',
    divisionWinner: false,
  };
  const lowerSeed: PlayoffSeed = {
    teamId: team2Id,
    seed: 2,
    wins: 0,
    losses: 0,
    league: 'AL',
    divisionWinner: false,
  };
  const completed = simulateSeriesState(
    createSeries(`LEGACY-${team1Id}-${team2Id}`, round, 'AL', bestOf, higherSeed, lowerSeed),
    allPlayers,
    rng.fork(),
    options,
  );
  return toLegacySeries(completed);
}

export function advancePlayoffRound(
  bracket: PlayoffBracket,
  allPlayers?: GeneratedPlayer[],
  rng?: GameRNG,
  options: PlayoffSimulationOptions = {},
): PlayoffBracket {
  let working = bracket;

  if (working.currentRoundSeries.some((series) => series.status !== 'complete')) {
    if (!allPlayers || !rng) {
      return working;
    }
    const completedCurrent = working.currentRoundSeries.map((series) =>
      simulateSeriesState(series, allPlayers, rng.fork(), options),
    );
    working = syncLegacyBracket({
      seeds: working.seeds,
      currentRound: working.currentRound,
      currentRoundSeries: completedCurrent,
      completedRounds: working.completedRounds,
    });
  }

  if (working.currentRoundSeries.some((series) => series.status !== 'complete')) {
    return working;
  }

  const completedRounds = [
    ...working.completedRounds,
    {
      round: working.currentRound,
      series: working.currentRoundSeries,
    },
  ];

  if (working.currentRound === 'WORLD_SERIES') {
    return syncLegacyBracket({
      seeds: working.seeds,
      currentRound: 'WORLD_SERIES',
      currentRoundSeries: working.currentRoundSeries,
      completedRounds,
    });
  }

  const nextRound = buildNextRoundSeries({
    ...working,
    completedRounds,
  });

  const nextRoundLabel: PlayoffRound =
    working.currentRound === 'WILD_CARD'
      ? 'DIVISION_SERIES'
      : working.currentRound === 'DIVISION_SERIES'
        ? 'CHAMPIONSHIP_SERIES'
        : 'WORLD_SERIES';

  return syncLegacyBracket({
    seeds: working.seeds,
    currentRound: nextRoundLabel,
    currentRoundSeries: nextRound,
    completedRounds,
  });
}

export function simPlayoffSeries(
  bracket: PlayoffBracket,
  allPlayers: GeneratedPlayer[],
  rng: GameRNG,
  options: PlayoffSimulationOptions = {},
): PlayoffBracket {
  const activeSeries = bracket.currentRoundSeries.find((series) => series.status !== 'complete');
  if (!activeSeries) {
    return advancePlayoffRound(bracket, allPlayers, rng.fork(), options);
  }

  const updatedSeries = simulateSeriesState(activeSeries, allPlayers, rng.fork(), options);
  const nextCurrentRoundSeries = bracket.currentRoundSeries.map((series) =>
    series.id === updatedSeries.id ? updatedSeries : series,
  );
  const nextBracket = syncLegacyBracket({
    seeds: bracket.seeds,
    currentRound: bracket.currentRound,
    currentRoundSeries: nextCurrentRoundSeries,
    completedRounds: bracket.completedRounds,
  });

  if (nextCurrentRoundSeries.every((series) => series.status === 'complete')) {
    return advancePlayoffRound(nextBracket, allPlayers, rng.fork(), options);
  }

  return nextBracket;
}

export function simNextPlayoffGame(
  bracket: PlayoffBracket,
  allPlayers: GeneratedPlayer[],
  rng: GameRNG,
  options: PlayoffSimulationOptions = {},
): PlayoffBracket {
  const activeSeries = bracket.currentRoundSeries.find((series) => series.status !== 'complete');
  if (!activeSeries) {
    return advancePlayoffRound(bracket, allPlayers, rng.fork(), options);
  }

  const updatedSeries = simPlayoffGame(activeSeries, allPlayers, rng.fork(), options);
  const nextCurrentRoundSeries = bracket.currentRoundSeries.map((series) =>
    series.id === updatedSeries.id ? updatedSeries : series,
  );
  const nextBracket = syncLegacyBracket({
    seeds: bracket.seeds,
    currentRound: bracket.currentRound,
    currentRoundSeries: nextCurrentRoundSeries,
    completedRounds: bracket.completedRounds,
  });

  if (nextCurrentRoundSeries.every((series) => series.status === 'complete')) {
    return advancePlayoffRound(nextBracket, allPlayers, rng.fork(), options);
  }

  return nextBracket;
}

export function simPlayoffRound(
  bracket: PlayoffBracket,
  allPlayers: GeneratedPlayer[],
  rng: GameRNG,
  options: PlayoffSimulationOptions = {},
): PlayoffBracket {
  return advancePlayoffRound(bracket, allPlayers, rng.fork(), options);
}

export function isPlayoffComplete(bracket: PlayoffBracket): boolean {
  return bracket.champion != null;
}

export function simulatePlayoffs(
  rng: GameRNG,
  seeds: PlayoffSeed[],
  allPlayers: GeneratedPlayer[],
  options: PlayoffSimulationOptions = {},
): PlayoffBracket {
  let bracket = createBracketFromSeeds(seeds);
  while (!isPlayoffComplete(bracket)) {
    bracket = advancePlayoffRound(bracket, allPlayers, rng.fork(), options);
  }
  return bracket;
}

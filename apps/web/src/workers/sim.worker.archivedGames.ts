import type { ArchivedGameBoxScore, ArchivedGameKind, SignatureMoment } from '@mbd/contracts';
import {
  generateGameHighlights,
  generateGameRecap,
  getTeamById,
  type GameBoxScore,
  type PlayoffBracket,
  type PlayoffGameResult,
  type PlayoffRound,
  type PlayoffSeriesState,
} from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';

interface ArchiveSourceGame {
  boxScore: GameBoxScore;
  round: PlayoffRound | null;
  gameNumber: number | null;
  clincher: boolean;
}

const MILESTONE_MOMENT_TYPES = new Set<SignatureMoment['type']>([
  'no_hitter',
  'perfect_game',
  'cycle',
  'four_hr_game',
  'twenty_k_game',
  'milestone_500hr',
  'milestone_3000h',
  'milestone_300w',
]);

const HIT_OUTCOMES = new Set(['SINGLE', 'DOUBLE', 'TRIPLE', 'HR']);

function unique<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function parseGameDate(date: string): { season: number; day: number } | null {
  const match = /^S(\d+)D(\d+)$/.exec(date);
  if (!match) {
    return null;
  }

  return {
    season: Number(match[1]),
    day: Number(match[2]),
  };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function teamName(teamId: string): string {
  return getTeamById(teamId)?.name ?? teamId.toUpperCase();
}

function playerNameMap(s: FullGameState, playerIds: readonly string[]): Record<string, string> {
  const requestedIds = new Set(playerIds);
  return Object.fromEntries(
    s.players
      .filter((player) => requestedIds.has(player.id))
      .map((player) => [player.id, `${player.firstName} ${player.lastName}`.trim()]),
  );
}

function gamePlayerIds(boxScore: GameBoxScore, extraPlayerIds: readonly string[] = []): string[] {
  return unique([
    ...boxScore.paResults.flatMap((pa) => [pa.batterId, pa.pitcherId]),
    boxScore.winningPitcherId ?? '',
    boxScore.losingPitcherId ?? '',
    boxScore.savePitcherId ?? '',
    ...extraPlayerIds,
  ].filter((playerId) => playerId.length > 0));
}

function lineScore(boxScore: GameBoxScore): ArchivedGameBoxScore['lineScore'] {
  const runsByInning = new Map<number, { inning: number; awayRuns: number; homeRuns: number }>();

  for (const pa of boxScore.paResults) {
    const entry = runsByInning.get(pa.inning) ?? { inning: pa.inning, awayRuns: 0, homeRuns: 0 };
    const before = pa.halfInning === 'top' ? pa.scoreBefore[0] : pa.scoreBefore[1];
    const after = pa.halfInning === 'top' ? pa.scoreAfter[0] : pa.scoreAfter[1];
    const runs = Math.max(0, after - before);
    if (pa.halfInning === 'top') {
      entry.awayRuns += runs;
    } else {
      entry.homeRuns += runs;
    }
    runsByInning.set(pa.inning, entry);
  }

  return Array.from({ length: boxScore.innings }, (_, index) => {
    const inning = index + 1;
    return runsByInning.get(inning) ?? { inning, awayRuns: 0, homeRuns: 0 };
  });
}

function offenseReachedBase(boxScore: GameBoxScore, halfInning: 'top' | 'bottom'): boolean {
  return boxScore.paResults.some((pa) =>
    pa.halfInning === halfInning
    && (HIT_OUTCOMES.has(pa.outcome) || pa.outcome === 'BB' || pa.outcome === 'HBP'),
  );
}

function noHitKind(boxScore: GameBoxScore): ArchivedGameKind | null {
  const awayNoHit = boxScore.awayHits === 0;
  const homeNoHit = boxScore.homeHits === 0;
  const awayPerfect = awayNoHit && !offenseReachedBase(boxScore, 'top');
  const homePerfect = homeNoHit && !offenseReachedBase(boxScore, 'bottom');

  if (awayPerfect || homePerfect) {
    return 'perfect_game';
  }
  if (awayNoHit || homeNoHit) {
    return 'no_hitter';
  }
  return null;
}

function milestonePlayerIds(s: FullGameState, boxScore: GameBoxScore, season: number, day: number | null): string[] {
  if (day == null && !boxScore.isPlayoff) {
    return [];
  }

  const participants = new Set(gamePlayerIds(boxScore));
  const matchingPlayerIds: string[] = [];
  for (const [playerId, moments] of s.playerMoments.entries()) {
    if (!participants.has(playerId)) {
      continue;
    }
    if (moments.some((moment) =>
      moment.season === season
      && MILESTONE_MOMENT_TYPES.has(moment.type)
      && (
        moment.day === day
        || (moment.isPlayoff && boxScore.isPlayoff)
      ),
    )) {
      matchingPlayerIds.push(playerId);
    }
  }

  return matchingPlayerIds;
}

function rivalryQualifies(s: FullGameState, boxScore: GameBoxScore): boolean {
  const margin = Math.abs(boxScore.homeScore - boxScore.awayScore);
  const intenseRivalry = Array.from(s.rivalries.values()).some((rivalry) =>
    rivalry.intensity >= 85
    && (
      (rivalry.teamA === boxScore.homeTeamId && rivalry.teamB === boxScore.awayTeamId)
      || (rivalry.teamA === boxScore.awayTeamId && rivalry.teamB === boxScore.homeTeamId)
    ),
  );

  return intenseRivalry && (margin <= 1 || boxScore.innings > 9 || boxScore.isPlayoff);
}

function uniqueSeriesFromBracket(bracket: PlayoffBracket | null): PlayoffSeriesState[] {
  if (!bracket) {
    return [];
  }

  const seriesById = new Map<string, PlayoffSeriesState>();
  for (const series of bracket.completedRounds.flatMap((round) => round.series)) {
    seriesById.set(series.id, series);
  }
  for (const series of bracket.currentRoundSeries) {
    seriesById.set(series.id, series);
  }
  return Array.from(seriesById.values()).sort((left, right) => left.id.localeCompare(right.id));
}

function playoffSourceGames(bracket: PlayoffBracket | null): ArchiveSourceGame[] {
  return uniqueSeriesFromBracket(bracket).flatMap((series) =>
    series.games.map((game: PlayoffGameResult, index) => ({
      boxScore: game.boxScore,
      round: series.round,
      gameNumber: game.gameNumber,
      clincher: series.status === 'complete'
        && index === series.games.length - 1
        && series.round === 'WORLD_SERIES',
    })),
  );
}

function sourceGameKey(source: ArchiveSourceGame): string {
  const boxScore = source.boxScore;
  return [
    boxScore.date,
    boxScore.awayTeamId,
    boxScore.homeTeamId,
    boxScore.awayScore,
    boxScore.homeScore,
    source.round ?? '',
    source.gameNumber ?? '',
  ].join(':');
}

function sourceGames(s: FullGameState): ArchiveSourceGame[] {
  const sources = [
    ...s.seasonState.gameLog.map((boxScore) => ({
      boxScore,
      round: null,
      gameNumber: null,
      clincher: false,
    })),
    ...playoffSourceGames(s.playoffBracket),
  ];
  const byKey = new Map<string, ArchiveSourceGame>();
  for (const source of sources) {
    byKey.set(sourceGameKey(source), source);
  }
  return Array.from(byKey.values());
}

function archiveKind(
  s: FullGameState,
  source: ArchiveSourceGame,
  season: number,
  day: number | null,
  matchedMilestonePlayerIds: readonly string[],
): ArchivedGameKind | null {
  const noHit = noHitKind(source.boxScore);
  if (noHit) {
    return noHit;
  }
  if (source.clincher && source.boxScore.isPlayoff && s.playoffBracket?.champion != null) {
    return 'championship';
  }
  if (matchedMilestonePlayerIds.length > 0) {
    return 'milestone';
  }
  if (source.boxScore.isPlayoff && (source.boxScore.homeTeamId === s.userTeamId || source.boxScore.awayTeamId === s.userTeamId)) {
    return 'postseason';
  }
  if (day != null && rivalryQualifies(s, source.boxScore)) {
    return 'rivalry';
  }

  return null;
}

function archiveLabel(kind: ArchivedGameKind, source: ArchiveSourceGame): string {
  switch (kind) {
    case 'perfect_game':
      return 'Perfect Game';
    case 'no_hitter':
      return 'No-Hitter';
    case 'championship':
      return 'Championship Clincher';
    case 'milestone':
      return 'Milestone Game';
    case 'postseason':
      return source.round != null ? source.round.replaceAll('_', ' ') : 'Postseason Game';
    case 'rivalry':
      return 'Rivalry Classic';
  }
}

function buildArchiveId(season: number, source: ArchiveSourceGame, kind: ArchivedGameKind): string {
  const boxScore = source.boxScore;
  return `archived-game-s${season}-${slug(boxScore.date)}-${boxScore.awayTeamId}-${boxScore.homeTeamId}-${kind}`;
}

function compareArchivedGames(left: ArchivedGameBoxScore, right: ArchivedGameBoxScore): number {
  return left.season - right.season
    || (left.day ?? 10_000) - (right.day ?? 10_000)
    || left.id.localeCompare(right.id);
}

function buildArchivedGame(
  s: FullGameState,
  source: ArchiveSourceGame,
  kind: ArchivedGameKind,
  season: number,
  day: number | null,
  matchedMilestonePlayerIds: readonly string[],
): ArchivedGameBoxScore {
  const boxScore = source.boxScore;
  const playerIds = gamePlayerIds(boxScore, matchedMilestonePlayerIds);
  const playerNames = new Map(Object.entries(playerNameMap(s, playerIds)));
  const teamNames = new Map<string, string>([
    [boxScore.awayTeamId, teamName(boxScore.awayTeamId)],
    [boxScore.homeTeamId, teamName(boxScore.homeTeamId)],
  ]);
  const highlights = generateGameHighlights(boxScore, playerNames, teamNames).slice(0, 8);

  return {
    id: buildArchiveId(season, source, kind),
    season,
    day,
    date: boxScore.date,
    kind,
    label: archiveLabel(kind, source),
    homeTeamId: boxScore.homeTeamId,
    awayTeamId: boxScore.awayTeamId,
    homeScore: boxScore.homeScore,
    awayScore: boxScore.awayScore,
    homeHits: boxScore.homeHits,
    awayHits: boxScore.awayHits,
    innings: boxScore.innings,
    isPlayoff: boxScore.isPlayoff,
    round: source.round,
    gameNumber: source.gameNumber,
    winningPitcherId: boxScore.winningPitcherId ?? null,
    losingPitcherId: boxScore.losingPitcherId ?? null,
    savePitcherId: boxScore.savePitcherId ?? null,
    teamIds: unique([boxScore.awayTeamId, boxScore.homeTeamId]),
    playerIds,
    teamNameFallbacks: Object.fromEntries(teamNames.entries()),
    playerNameFallbacks: playerNameMap(s, playerIds),
    lineScore: lineScore(boxScore),
    highlights,
    recap: generateGameRecap(boxScore, highlights, playerNames, teamNames),
  };
}

export function syncArchivedMajorGames(s: FullGameState): void {
  const nextArchives = new Map(s.archivedGames.map((game) => [game.id, game]));

  for (const source of sourceGames(s)) {
    const parsedDate = parseGameDate(source.boxScore.date);
    const season = parsedDate?.season ?? s.season;
    const day = parsedDate?.day ?? null;
    const matchedMilestonePlayerIds = milestonePlayerIds(s, source.boxScore, season, day);
    const kind = archiveKind(s, source, season, day, matchedMilestonePlayerIds);
    if (!kind) {
      continue;
    }

    const archivedGame = buildArchivedGame(s, source, kind, season, day, matchedMilestonePlayerIds);
    nextArchives.set(archivedGame.id, archivedGame);
  }

  s.archivedGames = Array.from(nextArchives.values()).sort(compareArchivedGames);
}

export function buildArchivedGamePlayByPlayView(archivedGame: ArchivedGameBoxScore) {
  return {
    archivedGameId: archivedGame.id,
    recap: archivedGame.recap,
    highlights: archivedGame.highlights,
    plays: archivedGame.highlights.map((highlight) => ({
      inning: highlight.inning,
      halfInning: highlight.halfInning,
      text: highlight.text,
      isHighlight: true,
    })),
    lineScore: archivedGame.lineScore,
    boxScore: {
      homeTeamId: archivedGame.homeTeamId,
      awayTeamId: archivedGame.awayTeamId,
      homeScore: archivedGame.homeScore,
      awayScore: archivedGame.awayScore,
      innings: archivedGame.innings,
      homeHits: archivedGame.homeHits,
      awayHits: archivedGame.awayHits,
    },
  };
}

export function archivedGameView(
  archivedGames: readonly ArchivedGameBoxScore[],
  archivedGameId: string,
) {
  const archivedGame = archivedGames.find((game) => game.id === archivedGameId);
  return archivedGame ? buildArchivedGamePlayByPlayView(archivedGame) : null;
}

export function archivedMomentGameId(
  archivedGames: readonly ArchivedGameBoxScore[],
  entityId: string,
  season: number,
  day: number | null,
  key: 'playerIds' | 'teamIds',
): string | undefined {
  if (day == null) {
    return undefined;
  }

  return archivedGames.find((game) =>
    game.season === season
    && game.day === day
    && game[key].includes(entityId),
  )?.id;
}

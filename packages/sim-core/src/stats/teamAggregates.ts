import { getTeamById } from '../league/teams.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { PlayerGameStats } from '../sim/gameSimulator.js';
import {
  buildLeagueAdvancedContext,
  calculateAdvancedStatLine,
} from './advanced.js';

export const ERA_PLUS_SHUTOUT_CAP = 200;

export interface TeamPitchingAggregate {
  readonly teamId: string;
  readonly innings: number;
  readonly earnedRuns: number;
  readonly era: number;
  readonly leagueEra: number;
  readonly eraPlus: number;
}

export interface StarterEraPlusLine {
  readonly playerId: string;
  readonly playerName: string;
  readonly teamId: string;
  readonly innings: number;
  readonly earnedRuns: number;
  readonly era: number;
  readonly leagueEra: number;
  readonly eraPlus: number;
}

export interface TeamWrcPlusLine {
  readonly teamId: string;
  readonly plateAppearances: number;
  readonly wrcPlus: number;
}

export interface TeamWrcPlusRank extends TeamWrcPlusLine {
  readonly rank: number;
}

export interface LeadingHitterLine {
  readonly playerId: string;
  readonly playerName: string;
  readonly teamId: string;
  readonly plateAppearances: number;
  readonly wrcPlus: number;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function inningsFromOuts(ipOuts: number): number {
  return ipOuts / 3;
}

function playerName(player: Pick<GeneratedPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}

function isPitcher(player: GeneratedPlayer | undefined): boolean {
  return player?.pitcherAttributes != null;
}

function eraFor(earnedRuns: number, innings: number): number {
  return innings > 0 ? (earnedRuns / innings) * 9 : 0;
}

function eraPlusFor(era: number, leagueEra: number): number {
  if (leagueEra <= 0) {
    return 0;
  }
  if (era <= 0) {
    return ERA_PLUS_SHUTOUT_CAP;
  }
  return roundTo((leagueEra / era) * 100, 1);
}

function leaguePitchingTotals(playerSeasonStats: ReadonlyMap<string, PlayerGameStats>) {
  let innings = 0;
  let earnedRuns = 0;
  for (const stats of playerSeasonStats.values()) {
    if (stats.ip <= 0) {
      continue;
    }
    innings += inningsFromOuts(stats.ip);
    earnedRuns += stats.earnedRuns;
  }
  return { innings, earnedRuns };
}

function aggregatePitching(
  teamId: string,
  players: readonly GeneratedPlayer[],
  playerSeasonStats: ReadonlyMap<string, PlayerGameStats>,
  includePlayer: (player: GeneratedPlayer | undefined, stats: PlayerGameStats) => boolean,
): TeamPitchingAggregate {
  const playersById = new Map(players.map((player) => [player.id, player] as const));
  let innings = 0;
  let earnedRuns = 0;

  for (const [playerId, stats] of playerSeasonStats.entries()) {
    if (stats.teamId !== teamId || stats.ip <= 0) {
      continue;
    }
    const player = playersById.get(playerId);
    if (!includePlayer(player, stats)) {
      continue;
    }
    innings += inningsFromOuts(stats.ip);
    earnedRuns += stats.earnedRuns;
  }

  const leagueTotals = leaguePitchingTotals(playerSeasonStats);
  const era = eraFor(earnedRuns, innings);
  const leagueEra = eraFor(leagueTotals.earnedRuns, leagueTotals.innings);
  return {
    teamId,
    innings: roundTo(innings, 1),
    earnedRuns,
    era: roundTo(era, 2),
    leagueEra: roundTo(leagueEra, 2),
    eraPlus: eraPlusFor(era, leagueEra),
  };
}

export function computeTeamEraPlus(
  teamId: string,
  players: readonly GeneratedPlayer[],
  playerSeasonStats: ReadonlyMap<string, PlayerGameStats>,
): TeamPitchingAggregate {
  return aggregatePitching(teamId, players, playerSeasonStats, (_player, stats) => stats.ip > 0);
}

export function computeTeamBullpenEraPlus(
  teamId: string,
  players: readonly GeneratedPlayer[],
  playerSeasonStats: ReadonlyMap<string, PlayerGameStats>,
): TeamPitchingAggregate {
  return aggregatePitching(teamId, players, playerSeasonStats, (player) =>
    player?.position === 'RP' || player?.position === 'CL'
  );
}

export function getPrimaryStarterEraPlusLines(
  teamId: string,
  players: readonly GeneratedPlayer[],
  playerSeasonStats: ReadonlyMap<string, PlayerGameStats>,
  count: number,
): readonly StarterEraPlusLine[] {
  const playersById = new Map(players.map((player) => [player.id, player] as const));
  const leagueTotals = leaguePitchingTotals(playerSeasonStats);
  const leagueEra = eraFor(leagueTotals.earnedRuns, leagueTotals.innings);

  return Array.from(playerSeasonStats.entries())
    .map(([playerId, stats]) => {
      const player = playersById.get(playerId);
      if (stats.teamId !== teamId || stats.ip <= 0 || player?.position !== 'SP') {
        return null;
      }
      const innings = inningsFromOuts(stats.ip);
      const era = eraFor(stats.earnedRuns, innings);
      return {
        playerId,
        playerName: playerName(player),
        teamId,
        innings: roundTo(innings, 1),
        earnedRuns: stats.earnedRuns,
        era: roundTo(era, 2),
        leagueEra: roundTo(leagueEra, 2),
        eraPlus: eraPlusFor(era, leagueEra),
      };
    })
    .filter((entry): entry is StarterEraPlusLine => entry != null)
    .sort((left, right) =>
      right.innings - left.innings
      || right.eraPlus - left.eraPlus
      || left.playerId.localeCompare(right.playerId)
    )
    .slice(0, count);
}

function hitterLinesForTeam(
  teamId: string,
  players: readonly GeneratedPlayer[],
  playerSeasonStats: ReadonlyMap<string, PlayerGameStats>,
): readonly LeadingHitterLine[] {
  const playersById = new Map(players.map((player) => [player.id, player] as const));
  const advancedContext = buildLeagueAdvancedContext([...players], new Map(playerSeasonStats));

  return Array.from(playerSeasonStats.entries())
    .map(([playerId, stats]) => {
      const player = playersById.get(playerId);
      if (stats.teamId !== teamId || stats.pa <= 0 || isPitcher(player) || !player) {
        return null;
      }

      const line = calculateAdvancedStatLine(
        { ...player, teamId: stats.teamId },
        stats,
        {
          ...advancedContext,
          teamParkFactors: new Map([
            ...advancedContext.teamParkFactors,
            [stats.teamId, (getTeamById(stats.teamId) as { parkFactor?: number } | undefined)?.parkFactor ?? 1],
          ]),
        },
      );
      if (line.wrcPlus == null) {
        return null;
      }
      return {
        playerId,
        playerName: playerName(player),
        teamId,
        plateAppearances: stats.pa,
        wrcPlus: line.wrcPlus,
      };
    })
    .filter((entry): entry is LeadingHitterLine => entry != null);
}

export function computeTeamWrcPlus(
  teamId: string,
  players: readonly GeneratedPlayer[],
  playerSeasonStats: ReadonlyMap<string, PlayerGameStats>,
): TeamWrcPlusLine | null {
  const lines = hitterLinesForTeam(teamId, players, playerSeasonStats);
  const plateAppearances = lines.reduce((total, line) => total + line.plateAppearances, 0);
  if (plateAppearances <= 0) {
    return null;
  }

  const weightedWrcPlus = lines.reduce(
    (total, line) => total + (line.wrcPlus * line.plateAppearances),
    0,
  ) / plateAppearances;
  return {
    teamId,
    plateAppearances,
    wrcPlus: roundTo(weightedWrcPlus, 1),
  };
}

export function rankTeamsByWrcPlus(
  teamIds: readonly string[],
  players: readonly GeneratedPlayer[],
  playerSeasonStats: ReadonlyMap<string, PlayerGameStats>,
): readonly TeamWrcPlusRank[] {
  return teamIds
    .map((teamId) => computeTeamWrcPlus(teamId, players, playerSeasonStats))
    .filter((entry): entry is TeamWrcPlusLine => entry != null)
    .sort((left, right) =>
      right.wrcPlus - left.wrcPlus
      || right.plateAppearances - left.plateAppearances
      || left.teamId.localeCompare(right.teamId)
    )
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

export function findLeadingHitterByWrcPlus(
  teamId: string,
  players: readonly GeneratedPlayer[],
  playerSeasonStats: ReadonlyMap<string, PlayerGameStats>,
): LeadingHitterLine | null {
  return [...hitterLinesForTeam(teamId, players, playerSeasonStats)]
    .sort((left, right) =>
      right.wrcPlus - left.wrcPlus
      || right.plateAppearances - left.plateAppearances
      || left.playerId.localeCompare(right.playerId)
    )[0] ?? null;
}

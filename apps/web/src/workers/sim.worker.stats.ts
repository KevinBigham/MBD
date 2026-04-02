import {
  buildLeagueAdvancedContext,
  calculateAdvancedStatLine,
  estimateProjectedWarFromGrade,
  toDisplayRating,
  type GeneratedPlayer,
  type LeaderboardStatKey,
  type PlayerGameStats,
} from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';

export interface PlayerAdvancedStatsDTO {
  war: number;
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  iso: number | null;
  woba: number | null;
  wrcPlus: number | null;
  opsPlus: number | null;
  fip: number | null;
  xfip: number | null;
  whip: number | null;
  kPer9: number | null;
  bbPer9: number | null;
  kBb: number | null;
}

export interface ProjectedWarRangeDTO {
  currentWar: number;
  floorWar: number | null;
  ceilingWar: number | null;
}

interface LeaderboardEntry {
  player: GeneratedPlayer;
  stats: PlayerGameStats;
  advanced: PlayerAdvancedStatsDTO | null;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function hasQualifiedStats(player: GeneratedPlayer, stats: PlayerGameStats): boolean {
  return player.pitcherAttributes != null ? stats.ip > 0 : stats.pa > 0;
}

function isPitchingStat(stat: LeaderboardStatKey): boolean {
  return ['era', 'k', 'fip', 'xfip', 'whip', 'k_per_9', 'bb_per_9', 'k_bb'].includes(stat);
}

function isAscendingStat(stat: LeaderboardStatKey): boolean {
  return ['era', 'fip', 'xfip', 'whip', 'bb_per_9'].includes(stat);
}

function displayBand(value: number | null | undefined): number | null {
  if (value == null) return null;
  return value > 100 ? toDisplayRating(value) : value;
}

export function getProjectedWarRange(player: GeneratedPlayer): ProjectedWarRangeDTO {
  const isPitcher = player.pitcherAttributes != null;
  return {
    currentWar: roundTo(estimateProjectedWarFromGrade(displayBand(player.overallRating) ?? 20, isPitcher), 1),
    floorWar: player.floor == null ? null : roundTo(estimateProjectedWarFromGrade(displayBand(player.floor) ?? 20, isPitcher), 1),
    ceilingWar: player.ceiling == null ? null : roundTo(estimateProjectedWarFromGrade(displayBand(player.ceiling) ?? 20, isPitcher), 1),
  };
}

function toAdvancedStatsDTO(player: GeneratedPlayer, stats: PlayerGameStats, s: FullGameState): PlayerAdvancedStatsDTO | null {
  if (!hasQualifiedStats(player, stats)) {
    return null;
  }

  const context = buildLeagueAdvancedContext(s.players, s.seasonState.playerSeasonStats);
  const line = calculateAdvancedStatLine(player, stats, context);

  return {
    war: line.war,
    avg: line.avg,
    obp: line.obp,
    slg: line.slg,
    ops: line.ops,
    iso: line.iso,
    woba: line.woba,
    wrcPlus: line.wrcPlus,
    opsPlus: line.opsPlus,
    fip: line.fip,
    xfip: line.xfip,
    whip: line.whip,
    kPer9: line.kPer9,
    bbPer9: line.bbPer9,
    kBb: line.kBb,
  };
}

export function buildAdvancedStatsIndex(
  s: FullGameState,
  players: GeneratedPlayer[] = s.players,
): Map<string, PlayerAdvancedStatsDTO> {
  const context = buildLeagueAdvancedContext(s.players, s.seasonState.playerSeasonStats);
  const index = new Map<string, PlayerAdvancedStatsDTO>();

  for (const player of players) {
    const stats = s.seasonState.playerSeasonStats.get(player.id);
    if (!stats || !hasQualifiedStats(player, stats)) {
      continue;
    }

    const line = calculateAdvancedStatLine(player, stats, context);
    index.set(player.id, {
      war: line.war,
      avg: line.avg,
      obp: line.obp,
      slg: line.slg,
      ops: line.ops,
      iso: line.iso,
      woba: line.woba,
      wrcPlus: line.wrcPlus,
      opsPlus: line.opsPlus,
      fip: line.fip,
      xfip: line.xfip,
      whip: line.whip,
      kPer9: line.kPer9,
      bbPer9: line.bbPer9,
      kBb: line.kBb,
    });
  }

  return index;
}

export function getAdvancedStatsForPlayer(
  s: FullGameState,
  playerId: string,
): PlayerAdvancedStatsDTO | null {
  const player = s.players.find((candidate) => candidate.id === playerId);
  const stats = s.seasonState.playerSeasonStats.get(playerId);
  if (!player || !stats) {
    return null;
  }

  return toAdvancedStatsDTO(player, stats, s);
}

function getLeaderboardValue(
  entry: LeaderboardEntry,
  stat: LeaderboardStatKey,
): number {
  switch (stat) {
    case 'hr':
      return entry.stats.hr;
    case 'rbi':
      return entry.stats.rbi;
    case 'hits':
      return entry.stats.hits;
    case 'avg':
      return entry.advanced?.avg ?? 0;
    case 'k':
      return entry.player.pitcherAttributes != null ? entry.stats.strikeouts : entry.stats.k;
    case 'era':
      return entry.stats.ip > 0 ? (entry.stats.earnedRuns / (entry.stats.ip / 3)) * 9 : 99;
    case 'war':
      return entry.advanced?.war ?? 0;
    case 'woba':
      return entry.advanced?.woba ?? 0;
    case 'wrc_plus':
      return entry.advanced?.wrcPlus ?? 0;
    case 'ops_plus':
      return entry.advanced?.opsPlus ?? 0;
    case 'iso':
      return entry.advanced?.iso ?? 0;
    case 'fip':
      return entry.advanced?.fip ?? 99;
    case 'xfip':
      return entry.advanced?.xfip ?? 99;
    case 'whip':
      return entry.advanced?.whip ?? 99;
    case 'k_per_9':
      return entry.advanced?.kPer9 ?? 0;
    case 'bb_per_9':
      return entry.advanced?.bbPer9 ?? 99;
    case 'k_bb':
      return entry.advanced?.kBb ?? 0;
    default:
      return 0;
  }
}

export function buildLeagueLeaderEntries(
  s: FullGameState,
  stat: LeaderboardStatKey,
): LeaderboardEntry[] {
  const advancedIndex = buildAdvancedStatsIndex(s);

  return s.players
    .filter((player) => player.rosterStatus === 'MLB')
    .map((player) => {
      const stats = s.seasonState.playerSeasonStats.get(player.id);
      if (!stats) {
        return null;
      }

      return {
        player,
        stats,
        advanced: advancedIndex.get(player.id) ?? null,
      };
    })
    .filter((entry): entry is LeaderboardEntry => entry != null)
    .filter((entry) => {
      if (stat === 'war') {
        return hasQualifiedStats(entry.player, entry.stats);
      }

      if (isPitchingStat(stat)) {
        return entry.player.pitcherAttributes != null && entry.stats.ip > 0;
      }

      return entry.player.pitcherAttributes == null && entry.stats.pa > 0;
    })
    .sort((left, right) => {
      const leftValue = getLeaderboardValue(left, stat);
      const rightValue = getLeaderboardValue(right, stat);

      if (leftValue === rightValue) {
        return right.player.overallRating - left.player.overallRating;
      }

      return isAscendingStat(stat) ? leftValue - rightValue : rightValue - leftValue;
    });
}

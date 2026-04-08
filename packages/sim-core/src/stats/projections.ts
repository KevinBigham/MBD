import {
  calculateBattingAverage,
  calculateObp,
  calculateOps,
  calculateSlg,
} from './advanced.js';
import type { PlayerGameStats } from '../sim/gameSimulator.js';

export const SEASON_GAMES = 162;

export interface HitterProjectedStatLine {
  pa: number;
  hits: number;
  hr: number;
  rbi: number;
  bb: number;
  k: number;
  avg: string;
  obp: string;
  slg: string;
  ops: string;
}

export interface PitcherProjectedStatLine {
  ip: number;
  wins: number;
  saves: number;
  strikeouts: number;
  era: string;
  whip: string;
}

export type ProjectedStatLine = HitterProjectedStatLine | PitcherProjectedStatLine;

export interface SeasonProjection {
  playerId: string;
  gamesPlayed: number;
  gamesRemaining: number;
  projectedStats: ProjectedStatLine;
  paceLabel: string;
  confidenceLevel: 'high' | 'medium' | 'low';
}

export interface NotableProjection {
  playerId: string;
  category: string;
  projectedValue: string;
  benchmark: string;
  paceDescription: string;
}

interface ProjectionCounts {
  readonly pa: number;
  readonly ab: number;
  readonly hits: number;
  readonly doubles: number;
  readonly triples: number;
  readonly hr: number;
  readonly rbi: number;
  readonly bb: number;
  readonly k: number;
  readonly hbp: number;
  readonly sacFlies: number;
  readonly ip: number;
  readonly earnedRuns: number;
  readonly strikeouts: number;
  readonly walks: number;
  readonly hitsAllowed: number;
  readonly wins: number;
  readonly saves: number;
}

function roundCount(value: number): number {
  return Math.round(value);
}

function formatBattingRate(value: number): string {
  return value.toFixed(3).replace(/^0(?=\.)/, '');
}

function formatPitchingRate(value: number): string {
  return value.toFixed(3);
}

function isPitcherStats(stats: Pick<PlayerGameStats, 'ip'>): boolean {
  return stats.ip > 0;
}

function safeInningsPitched(ipOuts: number): number {
  return ipOuts / 3;
}

function calculateEra(stats: Pick<ProjectionCounts, 'ip' | 'earnedRuns'>): number {
  const innings = safeInningsPitched(stats.ip);
  if (innings <= 0) {
    return 0;
  }

  return (stats.earnedRuns * 9) / innings;
}

function calculateWhip(stats: Pick<ProjectionCounts, 'ip' | 'walks' | 'hitsAllowed'>): number {
  const innings = safeInningsPitched(stats.ip);
  if (innings <= 0) {
    return 0;
  }

  return (stats.walks + stats.hitsAllowed) / innings;
}

function scaleCounts(stats: PlayerGameStats, multiplier: number): ProjectionCounts {
  return {
    pa: roundCount(stats.pa * multiplier),
    ab: roundCount(stats.ab * multiplier),
    hits: roundCount(stats.hits * multiplier),
    doubles: roundCount(stats.doubles * multiplier),
    triples: roundCount(stats.triples * multiplier),
    hr: roundCount(stats.hr * multiplier),
    rbi: roundCount(stats.rbi * multiplier),
    bb: roundCount(stats.bb * multiplier),
    k: roundCount(stats.k * multiplier),
    hbp: roundCount(stats.hbp * multiplier),
    sacFlies: roundCount(stats.sacFlies * multiplier),
    ip: roundCount(stats.ip * multiplier),
    earnedRuns: roundCount(stats.earnedRuns * multiplier),
    strikeouts: roundCount(stats.strikeouts * multiplier),
    walks: roundCount(stats.walks * multiplier),
    hitsAllowed: roundCount(stats.hitsAllowed * multiplier),
    wins: roundCount(stats.wins * multiplier),
    saves: roundCount((stats.saves ?? 0) * multiplier),
  };
}

function getConfidenceLevel(gamesPlayed: number): SeasonProjection['confidenceLevel'] {
  if (gamesPlayed < 30) {
    return 'low';
  }
  if (gamesPlayed <= 80) {
    return 'medium';
  }
  return 'high';
}

function isPitcherProjection(line: ProjectedStatLine): line is PitcherProjectedStatLine {
  return 'ip' in line;
}

function buildPaceLabel(projectedStats: ProjectedStatLine): string {
  if (isPitcherProjection(projectedStats)) {
    const line = projectedStats;

    if (line.strikeouts >= 200 && Number(line.era) <= 3.0) {
      return `On pace for ${line.strikeouts} K with a ${line.era} ERA.`;
    }
    if (line.wins >= 20) {
      return `On pace for ${line.wins} wins and ${line.strikeouts} strikeouts.`;
    }
    if (line.saves >= 40) {
      return `On pace for ${line.saves} saves with a ${line.whip} WHIP.`;
    }

    return `On pace for ${line.strikeouts} K and a ${line.era} ERA.`;
  }

  const line = projectedStats;

  if (line.hr >= 40 || line.rbi >= 100) {
    return `On pace for ${line.hr} HR and ${line.rbi} RBI.`;
  }
  if (Number(`0${line.avg}`) >= 0.300) {
    return `On pace for a ${line.avg} AVG with ${line.hits} hits.`;
  }
  if (Number(line.ops) >= 0.9) {
    return `On pace for a ${line.ops} OPS with ${line.hr} HR.`;
  }

  return `On pace for ${line.hits} hits and ${line.hr} HR.`;
}

export function formatPaceLabel(
  stats: PlayerGameStats,
  gamesPlayed: number,
  totalGames: number,
): string {
  const projection = projectSeasonStats(stats, gamesPlayed, totalGames);

  if (projection == null) {
    return 'No pace available yet.';
  }

  return buildPaceLabel(projection.projectedStats);
}

export function projectSeasonStats(
  stats: PlayerGameStats,
  gamesPlayed: number,
  totalGames: number,
): SeasonProjection | null {
  if (gamesPlayed <= 0 || totalGames <= 0) {
    return null;
  }

  const multiplier = gamesPlayed >= totalGames ? 1 : totalGames / gamesPlayed;
  const counts = scaleCounts(stats, multiplier);
  const gamesRemaining = Math.max(0, totalGames - gamesPlayed);
  const confidenceLevel = getConfidenceLevel(gamesPlayed);

  if (isPitcherStats(stats)) {
    const projectedStats: PitcherProjectedStatLine = {
      ip: counts.ip,
      wins: counts.wins,
      saves: counts.saves,
      strikeouts: counts.strikeouts,
      era: formatPitchingRate(calculateEra(counts)),
      whip: formatPitchingRate(calculateWhip(counts)),
    };

    return {
      playerId: stats.playerId,
      gamesPlayed,
      gamesRemaining,
      projectedStats,
      paceLabel: buildPaceLabel(projectedStats),
      confidenceLevel,
    };
  }

  const battingRateInput = {
    hits: counts.hits,
    ab: counts.ab,
    bb: counts.bb,
    hbp: counts.hbp,
    sacFlies: counts.sacFlies,
    doubles: counts.doubles,
    triples: counts.triples,
    hr: counts.hr,
  };
  const projectedStats: HitterProjectedStatLine = {
    pa: counts.pa,
    hits: counts.hits,
    hr: counts.hr,
    rbi: counts.rbi,
    bb: counts.bb,
    k: counts.k,
    avg: formatBattingRate(calculateBattingAverage(battingRateInput)),
    obp: formatBattingRate(calculateObp(battingRateInput)),
    slg: formatBattingRate(calculateSlg(battingRateInput)),
    ops: formatPitchingRate(calculateOps(battingRateInput)),
  };

  return {
    playerId: stats.playerId,
    gamesPlayed,
    gamesRemaining,
    projectedStats,
    paceLabel: buildPaceLabel(projectedStats),
    confidenceLevel,
  };
}

export function findNotableProjections(
  projections: SeasonProjection[],
): NotableProjection[] {
  return projections.flatMap((projection) => {
    if (isPitcherProjection(projection.projectedStats)) {
      const notable: NotableProjection[] = [];
      const line = projection.projectedStats;

      if (line.strikeouts >= 200) {
        notable.push({
          playerId: projection.playerId,
          category: 'Strikeout Pace',
          projectedValue: `${line.strikeouts} K`,
          benchmark: '200 K',
          paceDescription: projection.paceLabel,
        });
      }
      if (line.wins >= 20) {
        notable.push({
          playerId: projection.playerId,
          category: 'Win Pace',
          projectedValue: `${line.wins} W`,
          benchmark: '20 W',
          paceDescription: projection.paceLabel,
        });
      }
      if (line.saves >= 40) {
        notable.push({
          playerId: projection.playerId,
          category: 'Save Pace',
          projectedValue: `${line.saves} SV`,
          benchmark: '40 SV',
          paceDescription: projection.paceLabel,
        });
      }
      if (Number(line.era) <= 3.0) {
        notable.push({
          playerId: projection.playerId,
          category: 'Run Prevention',
          projectedValue: `${line.era} ERA`,
          benchmark: '3.00 ERA',
          paceDescription: projection.paceLabel,
        });
      }
      if (Number(line.whip) <= 1.1) {
        notable.push({
          playerId: projection.playerId,
          category: 'Traffic Control',
          projectedValue: `${line.whip} WHIP`,
          benchmark: '1.10 WHIP',
          paceDescription: projection.paceLabel,
        });
      }

      return notable;
    }

    const notable: NotableProjection[] = [];
    const line = projection.projectedStats;

    if (line.hr >= 40) {
      notable.push({
        playerId: projection.playerId,
        category: 'Power Pace',
        projectedValue: `${line.hr} HR`,
        benchmark: '40 HR',
        paceDescription: projection.paceLabel,
      });
    }
    if (Number(`0${line.avg}`) >= 0.300) {
      notable.push({
        playerId: projection.playerId,
        category: 'Batting Average',
        projectedValue: `${line.avg} AVG`,
        benchmark: '.300 AVG',
        paceDescription: projection.paceLabel,
      });
    }
    if (Number(line.ops) >= 0.900) {
      notable.push({
        playerId: projection.playerId,
        category: 'OPS Pace',
        projectedValue: `${line.ops} OPS`,
        benchmark: '.900 OPS',
        paceDescription: projection.paceLabel,
      });
    }
    if (line.rbi >= 100) {
      notable.push({
        playerId: projection.playerId,
        category: 'Run Production',
        projectedValue: `${line.rbi} RBI`,
        benchmark: '100 RBI',
        paceDescription: projection.paceLabel,
      });
    }

    return notable;
  });
}

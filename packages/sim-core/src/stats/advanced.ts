import { getTeamById } from '../league/teams.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { RATING_MAX } from '../player/attributes.js';
import type { PlayerGameStats } from '../sim/gameSimulator.js';

const WOBA_WEIGHTS = {
  bb: 0.69,
  hbp: 0.72,
  single: 0.88,
  double: 1.24,
  triple: 1.56,
  hr: 1.95,
} as const;

const WOBA_SCALE = 1.15;
const DEFAULT_HR_PER_FB = 0.11;
const DEFAULT_RUNS_PER_PA = 0.12;
const DEFAULT_RUNS_PER_WIN = 10;
const DEFAULT_FIP_CONSTANT = 3.2;
const REPLACEMENT_RUNS_PER_PA = 0.03;
const HITTER_PROJECTED_WAR_MAX = 8.5;
const PITCHER_PROJECTED_WAR_MAX = 9.5;

const POSITIONAL_ADJUSTMENTS_PER_600_PA: Record<string, number> = {
  C: 12.5,
  SS: 7.5,
  '2B': 3,
  '3B': 2.5,
  CF: 2.5,
  LF: -7.5,
  RF: -7.5,
  '1B': -12.5,
  DH: -17.5,
};

export type LeaderboardStatKey =
  | 'hr'
  | 'rbi'
  | 'avg'
  | 'hits'
  | 'k'
  | 'era'
  | 'war'
  | 'woba'
  | 'wrc_plus'
  | 'ops_plus'
  | 'iso'
  | 'fip'
  | 'xfip'
  | 'whip'
  | 'k_per_9'
  | 'bb_per_9'
  | 'k_bb';

export interface LeagueAdvancedContext {
  leagueWoba: number;
  leagueOps: number;
  leagueEra: number;
  leagueFip: number;
  wobaScale: number;
  fipConstant: number;
  leagueHrPerFlyBall: number;
  runsPerPlateAppearance: number;
  runsPerWin: number;
  teamParkFactors: Map<string, number>;
}

export interface AdvancedStatLine {
  playerId: string;
  teamId: string;
  isPitcher: boolean;
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

export interface ProjectedWarRange {
  currentWar: number;
  floorWar: number | null;
  ceilingWar: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function safeInningsPitched(ipOuts: number): number {
  return ipOuts / 3;
}

function singles(stats: Pick<PlayerGameStats, 'hits' | 'doubles' | 'triples' | 'hr'>): number {
  return Math.max(0, stats.hits - stats.doubles - stats.triples - stats.hr);
}

export function calculateBattingAverage(stats: Pick<PlayerGameStats, 'hits' | 'ab'>): number {
  if (stats.ab <= 0) return 0;
  return stats.hits / stats.ab;
}

export function calculateObp(stats: Pick<PlayerGameStats, 'hits' | 'ab' | 'bb' | 'hbp' | 'sacFlies'>): number {
  const denominator = stats.ab + stats.bb + stats.hbp + stats.sacFlies;
  if (denominator <= 0) return 0;
  return (stats.hits + stats.bb + stats.hbp) / denominator;
}

export function calculateSlg(stats: Pick<PlayerGameStats, 'ab' | 'hits' | 'doubles' | 'triples' | 'hr'>): number {
  if (stats.ab <= 0) return 0;
  const totalBases = singles(stats) + (stats.doubles * 2) + (stats.triples * 3) + (stats.hr * 4);
  return totalBases / stats.ab;
}

export function calculateOps(stats: Pick<PlayerGameStats, 'hits' | 'ab' | 'bb' | 'hbp' | 'sacFlies' | 'doubles' | 'triples' | 'hr'>): number {
  return calculateObp(stats) + calculateSlg(stats);
}

export function calculateIso(stats: Pick<PlayerGameStats, 'hits' | 'ab' | 'doubles' | 'triples' | 'hr'>): number {
  return calculateSlg(stats) - calculateBattingAverage(stats);
}

export function calculateWoba(
  stats: Pick<PlayerGameStats, 'ab' | 'hits' | 'doubles' | 'triples' | 'hr' | 'bb' | 'hbp' | 'sacFlies'>,
): number {
  const denominator = stats.ab + stats.bb + stats.hbp + stats.sacFlies;
  if (denominator <= 0) return 0;
  const numerator =
    (stats.bb * WOBA_WEIGHTS.bb) +
    (stats.hbp * WOBA_WEIGHTS.hbp) +
    (singles(stats) * WOBA_WEIGHTS.single) +
    (stats.doubles * WOBA_WEIGHTS.double) +
    (stats.triples * WOBA_WEIGHTS.triple) +
    (stats.hr * WOBA_WEIGHTS.hr);
  return numerator / denominator;
}

export function calculateFip(
  stats: Pick<PlayerGameStats, 'ip' | 'strikeouts' | 'walks' | 'homeRunsAllowed' | 'hitBatters'>,
  constant: number = DEFAULT_FIP_CONSTANT,
): number {
  const innings = safeInningsPitched(stats.ip);
  if (innings <= 0) return 0;
  return (((13 * stats.homeRunsAllowed) + (3 * (stats.walks + stats.hitBatters)) - (2 * stats.strikeouts)) / innings) + constant;
}

export function calculateXfip(
  stats: Pick<PlayerGameStats, 'ip' | 'strikeouts' | 'walks' | 'flyBallsAllowed' | 'hitBatters'>,
  leagueHrPerFlyBall: number = DEFAULT_HR_PER_FB,
  constant: number = DEFAULT_FIP_CONSTANT,
): number {
  const innings = safeInningsPitched(stats.ip);
  if (innings <= 0) return 0;
  const expectedHomeRuns = stats.flyBallsAllowed * leagueHrPerFlyBall;
  return (((13 * expectedHomeRuns) + (3 * (stats.walks + stats.hitBatters)) - (2 * stats.strikeouts)) / innings) + constant;
}

export function estimateProjectedWarFromGrade(grade: number, isPitcher: boolean): number {
  const normalized = clamp((grade - 20) / 60, 0, 1);
  const ceiling = isPitcher ? PITCHER_PROJECTED_WAR_MAX : HITTER_PROJECTED_WAR_MAX;
  const baseline = -0.4;
  return roundTo(baseline + (Math.pow(normalized, 1.7) * (ceiling - baseline)), 1);
}

export function estimateProjectedWarRange(input: {
  overall: number;
  floor: number | null;
  ceiling: number | null;
  isPitcher: boolean;
}): ProjectedWarRange {
  return {
    currentWar: estimateProjectedWarFromGrade(input.overall, input.isPitcher),
    floorWar: input.floor == null ? null : estimateProjectedWarFromGrade(input.floor, input.isPitcher),
    ceilingWar: input.ceiling == null ? null : estimateProjectedWarFromGrade(input.ceiling, input.isPitcher),
  };
}

function calculateWhip(stats: Pick<PlayerGameStats, 'ip' | 'walks' | 'hitsAllowed'>): number {
  const innings = safeInningsPitched(stats.ip);
  if (innings <= 0) return 0;
  return (stats.walks + stats.hitsAllowed) / innings;
}

function calculateKPer9(stats: Pick<PlayerGameStats, 'ip' | 'strikeouts'>): number {
  const innings = safeInningsPitched(stats.ip);
  if (innings <= 0) return 0;
  return (stats.strikeouts * 9) / innings;
}

function calculateBbPer9(stats: Pick<PlayerGameStats, 'ip' | 'walks'>): number {
  const innings = safeInningsPitched(stats.ip);
  if (innings <= 0) return 0;
  return (stats.walks * 9) / innings;
}

function calculateKBb(stats: Pick<PlayerGameStats, 'strikeouts' | 'walks'>): number {
  if (stats.walks <= 0) return stats.strikeouts;
  return stats.strikeouts / stats.walks;
}

function sumBattingStats(playerStats: Map<string, PlayerGameStats>, players: GeneratedPlayer[]) {
  return players.reduce((totals, player) => {
    const stats = playerStats.get(player.id);
    if (!stats || stats.pa <= 0) return totals;
    totals.pa += stats.pa;
    totals.ab += stats.ab;
    totals.hits += stats.hits;
    totals.doubles += stats.doubles;
    totals.triples += stats.triples;
    totals.hr += stats.hr;
    totals.bb += stats.bb;
    totals.hbp += stats.hbp;
    totals.sacFlies += stats.sacFlies;
    totals.runs += stats.runs;
    return totals;
  }, {
    pa: 0,
    ab: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    bb: 0,
    hbp: 0,
    sacFlies: 0,
    runs: 0,
  });
}

function sumPitchingStats(playerStats: Map<string, PlayerGameStats>, players: GeneratedPlayer[]) {
  return players.reduce((totals, player) => {
    const stats = playerStats.get(player.id);
    if (!stats || stats.ip <= 0 || player.pitcherAttributes == null) return totals;
    totals.ip += stats.ip;
    totals.earnedRuns += stats.earnedRuns;
    totals.strikeouts += stats.strikeouts;
    totals.walks += stats.walks;
    totals.homeRunsAllowed += stats.homeRunsAllowed;
    totals.hitBatters += stats.hitBatters;
    totals.flyBallsAllowed += stats.flyBallsAllowed;
    return totals;
  }, {
    ip: 0,
    earnedRuns: 0,
    strikeouts: 0,
    walks: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    flyBallsAllowed: 0,
  });
}

function calculateLeagueEra(totals: ReturnType<typeof sumPitchingStats>): number {
  const innings = safeInningsPitched(totals.ip);
  if (innings <= 0) return 4.1;
  return (totals.earnedRuns / innings) * 9;
}

function calculateSpeedBaserunningRuns(player: GeneratedPlayer, plateAppearances: number): number {
  const speed = player.hitterAttributes.speed / RATING_MAX;
  const scaled = ((speed - 0.5) * 6) * (plateAppearances / 600);
  return roundTo(scaled, 2);
}

function calculatePositionalAdjustment(player: GeneratedPlayer, plateAppearances: number): number {
  const per600 = POSITIONAL_ADJUSTMENTS_PER_600_PA[player.position] ?? 0;
  return roundTo(per600 * (plateAppearances / 600), 2);
}

export function buildLeagueAdvancedContext(
  players: GeneratedPlayer[],
  playerStats: Map<string, PlayerGameStats>,
): LeagueAdvancedContext {
  const battingTotals = sumBattingStats(playerStats, players);
  const pitchingTotals = sumPitchingStats(playerStats, players);
  const leagueWoba = calculateWoba(battingTotals);
  const leagueOps = calculateOps(battingTotals);
  const leagueEra = calculateLeagueEra(pitchingTotals);
  const rawLeagueFip = calculateFip(pitchingTotals, 0);
  const fipConstant = roundTo(leagueEra - rawLeagueFip, 3) || DEFAULT_FIP_CONSTANT;
  const leagueFip = calculateFip(pitchingTotals, fipConstant);
  const leagueHrPerFlyBall = pitchingTotals.flyBallsAllowed > 0
    ? pitchingTotals.homeRunsAllowed / pitchingTotals.flyBallsAllowed
    : DEFAULT_HR_PER_FB;
  const runsPerPlateAppearance = battingTotals.pa > 0
    ? battingTotals.runs / battingTotals.pa
    : DEFAULT_RUNS_PER_PA;

  return {
    leagueWoba,
    leagueOps,
    leagueEra,
    leagueFip,
    wobaScale: WOBA_SCALE,
    fipConstant,
    leagueHrPerFlyBall,
    runsPerPlateAppearance,
    runsPerWin: DEFAULT_RUNS_PER_WIN,
    teamParkFactors: new Map(players.map((player) => [
      player.teamId,
      (getTeamById(player.teamId) as { parkFactor?: number } | undefined)?.parkFactor ?? 1,
    ])),
  };
}

export function calculateAdvancedStatLine(
  player: GeneratedPlayer,
  stats: PlayerGameStats,
  context: LeagueAdvancedContext,
): AdvancedStatLine {
  const parkFactor = context.teamParkFactors.get(player.teamId) ?? 1;
  if (player.pitcherAttributes != null && stats.ip > 0) {
    const fip = calculateFip(stats, context.fipConstant);
    const xfip = calculateXfip(stats, context.leagueHrPerFlyBall, context.fipConstant);
    const innings = safeInningsPitched(stats.ip);
    const replacementFip = context.leagueFip + 1.4;
    const runsAboveReplacement = ((replacementFip - fip) / 9) * innings;

    return {
      playerId: player.id,
      teamId: player.teamId,
      isPitcher: true,
      war: roundTo(clamp(runsAboveReplacement / context.runsPerWin, -2, 12), 2),
      avg: null,
      obp: null,
      slg: null,
      ops: null,
      iso: null,
      woba: null,
      wrcPlus: null,
      opsPlus: null,
      fip: roundTo(fip, 3),
      xfip: roundTo(xfip, 3),
      whip: roundTo(calculateWhip(stats), 3),
      kPer9: roundTo(calculateKPer9(stats), 2),
      bbPer9: roundTo(calculateBbPer9(stats), 2),
      kBb: roundTo(calculateKBb(stats), 2),
    };
  }

  const avg = calculateBattingAverage(stats);
  const obp = calculateObp(stats);
  const slg = calculateSlg(stats);
  const ops = obp + slg;
  const iso = slg - avg;
  const woba = calculateWoba(stats);
  const wraa = ((woba - context.leagueWoba) / context.wobaScale) * stats.pa;
  const baserunningRuns = calculateSpeedBaserunningRuns(player, stats.pa);
  const positionalAdjustment = calculatePositionalAdjustment(player, stats.pa);
  const replacementRuns = stats.pa * REPLACEMENT_RUNS_PER_PA;
  const wrcPlus = context.runsPerPlateAppearance > 0
    ? ((((woba - context.leagueWoba) / context.wobaScale) + context.runsPerPlateAppearance) / context.runsPerPlateAppearance) * 100 / parkFactor
    : 100;
  const opsPlus = context.leagueOps > 0
    ? (ops / context.leagueOps) * 100 / parkFactor
    : 100;

  return {
    playerId: player.id,
    teamId: player.teamId,
    isPitcher: false,
    war: roundTo(clamp((wraa + baserunningRuns + positionalAdjustment + replacementRuns) / context.runsPerWin, -2, 10), 2),
    avg: roundTo(avg, 3),
    obp: roundTo(obp, 3),
    slg: roundTo(slg, 3),
    ops: roundTo(ops, 3),
    iso: roundTo(iso, 3),
    woba: roundTo(woba, 3),
    wrcPlus: roundTo(wrcPlus, 1),
    opsPlus: roundTo(opsPlus, 1),
    fip: null,
    xfip: null,
    whip: null,
    kPer9: null,
    bbPer9: null,
    kBb: null,
  };
}

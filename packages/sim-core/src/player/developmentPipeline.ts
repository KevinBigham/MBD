/**
 * @module developmentPipeline
 * Monthly development ledgering plus offseason reconciliation.
 */

import type {
  DevelopmentLedgerEntry,
  DevelopmentReportEntry,
  MinorLeagueState,
  PositionConversionRecommendation,
} from '../roster/minorLeagues.js';
import type { GameRNG } from '../math/prng.js';
import { clampRating } from './attributes.js';
import type {
  DevelopmentProgram,
  DevelopmentTrajectory,
  GeneratedPlayer,
  Position,
  RosterLevel,
} from './generation.js';
import type { Coach } from './coaching.js';
import { getCoachingDevelopmentModifier } from './coaching.js';

export interface MonthlyDevelopmentCheckpointResult {
  players: GeneratedPlayer[];
  state: MinorLeagueState;
}

const MAX_MENTORSHIP_DEVELOPMENT_BONUS = 0.2;
const MENTORSHIP_PROGRESS_SCORE_WEIGHT = 18;
const MENTORSHIP_BREAKOUT_PROBABILITY_WEIGHT = 0.25;
const MENTORSHIP_BUST_RISK_WEIGHT = 0.18;

function isActiveProspect(player: GeneratedPlayer): boolean {
  return player.rosterStatus !== 'MLB';
}

function defaultProgramForLevel(
  level: Exclude<RosterLevel, 'MLB' | 'FREE_AGENT' | 'RETIRED'> | null,
): DevelopmentProgram {
  switch (level) {
    case 'ROOKIE':
    case 'INTERNATIONAL':
      return 'tools';
    case 'A':
    case 'A_PLUS':
      return 'fundamentals';
    case 'AA':
      return 'refinement';
    case 'AAA':
    default:
      return 'mlb_prep';
  }
}

function clampProbability(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampMentorshipDevelopmentBonus(value: number): number {
  return Math.max(0, Math.min(MAX_MENTORSHIP_DEVELOPMENT_BONUS, value));
}

function uniqueSortedMonths(months: number[]): number[] {
  return [...new Set(months)].sort((left, right) => left - right);
}

function trajectoryFromProgress(progressScore: number): DevelopmentTrajectory {
  if (progressScore >= 10) return 'ahead_of_curve';
  if (progressScore >= 2) return 'on_track';
  if (progressScore >= -5) return 'below_expectations';
  return 'bust_risk';
}

function monthlyProgramBonus(
  player: GeneratedPlayer,
  defaultProgram: DevelopmentProgram,
): number {
  if (player.developmentProgram === defaultProgram) {
    return 0.12;
  }

  switch (player.developmentProgram) {
    case 'power':
    case 'velocity':
    case 'breaking':
    case 'control':
    case 'contact':
    case 'speed':
    case 'defense':
    case 'stamina':
      return 0.06;
    default:
      return 0;
  }
}

function prospectBand(player: GeneratedPlayer): { floor: number; ceiling: number } {
  const overall = player.overallRating;
  return {
    floor: player.floor ?? clampRating(overall - 25),
    ceiling: player.ceiling ?? clampRating(overall + 45),
  };
}

function progressInputs(
  rng: GameRNG,
  player: GeneratedPlayer,
  staff: Coach[],
  mentorshipBonus: number,
): {
  coachModifier: number;
  programBonus: number;
  progressScore: number;
  breakoutProbability: number;
  bustRisk: number;
} {
  const level = player.minorLeagueLevel ?? null;
  const defaultProgram = defaultProgramForLevel(level);
  const coachModifier = getCoachingDevelopmentModifier(player, staff, level);
  const personalityFactor = 0.8 + ((player.personality.workEthic + player.personality.mentalToughness) / 250);
  const ageFactor = player.age <= 21 ? 1.08 : player.age <= 24 ? 1 : 0.92;
  const programBonus = monthlyProgramBonus(player, defaultProgram);
  const volatility = rng.nextGaussian(0, 2.4);
  const progressScore = Math.round((
    ((coachModifier - 1) * 18)
    + (programBonus * 22)
    + ((personalityFactor - 1) * 20)
    + ((ageFactor - 1) * 16)
    + (mentorshipBonus * MENTORSHIP_PROGRESS_SCORE_WEIGHT)
    + volatility
  ) * 100) / 100;
  const breakoutProbability = clampProbability(
    0.05
    + ((coachModifier - 1) * 0.35)
    + (programBonus * 0.3)
    + ((100 - player.age * 3) / 1000)
    + (mentorshipBonus * MENTORSHIP_BREAKOUT_PROBABILITY_WEIGHT),
  );
  const bustRisk = clampProbability(
    0.2
    - ((coachModifier - 1) * 0.25)
    - (programBonus * 0.2)
    + ((player.age > 24 ? player.age - 24 : 0) * 0.015)
    - (mentorshipBonus * MENTORSHIP_BUST_RISK_WEIGHT),
  );

  return {
    coachModifier,
    programBonus,
    progressScore,
    breakoutProbability,
    bustRisk,
  };
}

function buildSummary(player: GeneratedPlayer, trajectory: DevelopmentTrajectory, progressScore: number): string {
  const playerName = `${player.firstName} ${player.lastName}`;
  switch (trajectory) {
    case 'ahead_of_curve':
      return `${playerName} is trending ahead of curve with a ${progressScore.toFixed(1)} monthly score.`;
    case 'below_expectations':
      return `${playerName} is below expectations and needs a tighter plan.`;
    case 'bust_risk':
      return `${playerName} carries bust risk unless the next checkpoint rebounds.`;
    case 'on_track':
    default:
      return `${playerName} remains on track in the current development lane.`;
  }
}

function getPrimaryConversionTarget(player: GeneratedPlayer): Position | null {
  const targets = getPositionConversionTargets(player);
  return targets[0] ?? null;
}

function applyOverallDelta(player: GeneratedPlayer, delta: number): GeneratedPlayer {
  if (delta === 0) {
    return player;
  }

  if (player.pitcherAttributes) {
    return {
      ...player,
      pitcherAttributes: {
        stuff: clampRating(player.pitcherAttributes.stuff + delta),
        control: clampRating(player.pitcherAttributes.control + Math.round(delta * 0.8)),
        stamina: clampRating(player.pitcherAttributes.stamina + Math.round(delta * 0.55)),
        velocity: clampRating(player.pitcherAttributes.velocity + Math.round(delta * 0.7)),
        movement: clampRating(player.pitcherAttributes.movement + Math.round(delta * 0.65)),
      },
      overallRating: clampRating(player.overallRating + delta),
    };
  }

  return {
    ...player,
    hitterAttributes: {
      contact: clampRating(player.hitterAttributes.contact + Math.round(delta * 0.8)),
      power: clampRating(player.hitterAttributes.power + Math.round(delta * 0.7)),
      eye: clampRating(player.hitterAttributes.eye + Math.round(delta * 0.6)),
      speed: clampRating(player.hitterAttributes.speed + Math.round(delta * 0.45)),
      defense: clampRating(player.hitterAttributes.defense + Math.round(delta * 0.5)),
      durability: clampRating(player.hitterAttributes.durability + Math.round(delta * 0.45)),
    },
    overallRating: clampRating(player.overallRating + delta),
  };
}

export function initializePlayerDevelopmentProfile(
  rng: GameRNG,
  player: GeneratedPlayer,
): GeneratedPlayer {
  const band = prospectBand(player);
  const ceiling = player.ceiling != null && player.ceiling > player.overallRating
    ? player.ceiling
    : clampRating(player.overallRating + rng.nextInt(24, 85));
  const floor = player.floor != null && player.floor > 0
    ? player.floor
    : clampRating(player.overallRating - rng.nextInt(10, 45));
  const level = player.minorLeagueLevel ?? null;

  return {
    ...player,
    ceiling: Math.max(ceiling, band.ceiling),
    floor: Math.min(floor, player.overallRating),
    developmentProgram: defaultProgramForLevel(level),
    developmentTrajectory: player.developmentTrajectory ?? 'on_track',
    extensionHistory: player.extensionHistory ?? [],
  };
}

export function getBreakoutProbability(
  player: GeneratedPlayer,
  staff: Coach[],
  level: Exclude<RosterLevel, 'FREE_AGENT' | 'RETIRED'> | null = player.minorLeagueLevel ?? null,
): number {
  const modifier = getCoachingDevelopmentModifier(player, staff, level);
  const ageFactor = player.age <= 22 ? 0.05 : 0;
  const ceilingGapFactor = Math.max(0, ((player.ceiling ?? player.overallRating + 40) - player.overallRating) / 600);
  return Math.round(clampProbability(0.08 + ((modifier - 1) * 0.45) + ageFactor + ceilingGapFactor) * 1000) / 1000;
}

export function runMonthlyDevelopmentCheckpoint(
  rng: GameRNG,
  season: number,
  month: number,
  players: GeneratedPlayer[],
  coachingStaffs: Map<string, Coach[]>,
  state: MinorLeagueState,
  mentorshipBonuses: ReadonlyMap<string, number> = new Map(),
): MonthlyDevelopmentCheckpointResult {
  if (state.processedDevelopmentMonths.includes(month)) {
    return { players, state };
  }

  const nextLedger: DevelopmentLedgerEntry[] = [...state.developmentLedger];
  const nextReports: DevelopmentReportEntry[] = [...state.developmentReports];
  const nextConversions: PositionConversionRecommendation[] = [...state.conversionRecommendations];

  const nextPlayers = players.map((rawPlayer) => {
    const player = initializePlayerDevelopmentProfile(rng.fork(), rawPlayer);
    if (!isActiveProspect(player)) {
      return player;
    }

    const staff = coachingStaffs.get(player.teamId) ?? [];
    const mentorshipBonus = clampMentorshipDevelopmentBonus(mentorshipBonuses.get(player.id) ?? 0);
    const inputs = progressInputs(rng.fork(), player, staff, mentorshipBonus);
    const trajectory = trajectoryFromProgress(inputs.progressScore);
    const existingIndex = nextConversions.findIndex((entry) => entry.playerId === player.id);
    const conversionTarget = getPrimaryConversionTarget(player);
    if (conversionTarget) {
      const recommendation: PositionConversionRecommendation = {
        playerId: player.id,
        teamId: player.teamId,
        fromPosition: player.position,
        toPosition: conversionTarget,
        confidence: Math.max(0.45, Math.min(0.9, 0.45 + ((180 - (player.hitterAttributes?.defense ?? 180)) / 200))),
        reason: `${player.position} defensive profile fits better at ${conversionTarget}.`,
      };
      if (existingIndex >= 0) {
        nextConversions.splice(existingIndex, 1, recommendation);
      } else {
        nextConversions.push(recommendation);
      }
    }

    nextLedger.push({
      playerId: player.id,
      teamId: player.teamId,
      season,
      month,
      progressScore: inputs.progressScore,
      coachModifier: inputs.coachModifier,
      programBonus: inputs.programBonus,
      breakoutProbability: inputs.breakoutProbability,
      bustRisk: inputs.bustRisk,
    });
    nextReports.push({
      playerId: player.id,
      teamId: player.teamId,
      season,
      month,
      trajectory,
      summary: buildSummary(player, trajectory, inputs.progressScore),
      overallRating: player.overallRating,
    });

    return {
      ...player,
      developmentTrajectory: trajectory,
    };
  });

  return {
    players: nextPlayers,
    state: {
      ...state,
      processedDevelopmentMonths: uniqueSortedMonths([...state.processedDevelopmentMonths, month]),
      developmentLedger: nextLedger.sort((left, right) =>
        left.season - right.season
        || left.month - right.month
        || left.playerId.localeCompare(right.playerId)),
      developmentReports: nextReports.sort((left, right) =>
        left.season - right.season
        || left.month - right.month
        || left.playerId.localeCompare(right.playerId)),
      conversionRecommendations: nextConversions.sort((left, right) => left.playerId.localeCompare(right.playerId)),
    },
  };
}

export function reconcileDevelopmentPipeline(
  rng: GameRNG,
  players: GeneratedPlayer[],
  coachingStaffs: Map<string, Coach[]>,
  state: MinorLeagueState,
): GeneratedPlayer[] {
  const ledgerByPlayer = new Map<string, DevelopmentLedgerEntry[]>();
  for (const entry of state.developmentLedger) {
    const current = ledgerByPlayer.get(entry.playerId) ?? [];
    current.push(entry);
    ledgerByPlayer.set(entry.playerId, current);
  }

  return players.map((rawPlayer) => {
    const player = initializePlayerDevelopmentProfile(rng.fork(), rawPlayer);
    if (!isActiveProspect(player)) {
      return player;
    }

    const band = prospectBand(player);
    const entries = ledgerByPlayer.get(player.id) ?? [];
    const averageProgress = entries.length === 0
      ? 0
      : entries.reduce((sum, entry) => sum + entry.progressScore, 0) / entries.length;
    const coachModifier = getCoachingDevelopmentModifier(
      player,
      coachingStaffs.get(player.teamId) ?? [],
      player.minorLeagueLevel ?? null,
    );
    const direction = averageProgress >= 0 ? 1 : -1;
    const deltaMagnitude = Math.max(
      0,
      Math.round((Math.abs(averageProgress) / 4) * coachModifier + rng.nextGaussian(0, 1.5)),
    );
    const targetRating = clampRating(player.overallRating + (direction * deltaMagnitude));
    const boundedRating = Math.max(band.floor, Math.min(band.ceiling, targetRating));
    const delta = boundedRating - player.overallRating;
    const reconciled = applyOverallDelta(player, delta);

    return {
      ...reconciled,
      overallRating: boundedRating,
      developmentTrajectory: player.developmentTrajectory ?? trajectoryFromProgress(averageProgress),
    };
  });
}

export function getPositionConversionTargets(player: GeneratedPlayer): Position[] {
  if (player.pitcherAttributes) {
    if (player.position === 'SP' && player.pitcherAttributes.stamina < 170) {
      return ['RP', 'CL'];
    }
    if (player.position === 'RP' && player.pitcherAttributes.control < 150) {
      return ['CL'];
    }
    return [];
  }

  if (player.position === 'SS' && player.hitterAttributes.defense < 140) {
    return ['2B', '3B'];
  }
  if (player.position === 'CF' && player.hitterAttributes.defense < 150) {
    return ['LF', 'RF'];
  }
  if (player.position === 'C' && player.hitterAttributes.defense < 155) {
    return ['1B', 'DH'];
  }
  return [];
}

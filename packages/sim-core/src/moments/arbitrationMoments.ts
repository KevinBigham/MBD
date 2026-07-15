import type { GeneratedPlayer } from '../player/generation.js';
import type { Moment, MomentRound } from './momentDetector.js';

const ARBITRATION_WIN_IMPACT = 28;
const ARBITRATION_LOSS_IMPACT = -20;
const SUPER_TWO_DEBUT_IMPACT = 18;
const HOLDOUT_RESOLUTION_IMPACT = 16;

export interface ArbitrationMomentDetectionContext {
  season: number;
  day: number;
}

export interface HoldoutResolutionDetectionContext {
  season: number;
  day: number;
}

export interface ArbitrationDetectedMoment {
  playerId: string;
  moment: Moment & {
    day: number;
    timestamp: string;
  };
}

function formatMoney(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function playerName(player: Pick<GeneratedPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}

function latestArbitrationEntry(player: GeneratedPlayer, season: number) {
  const currentSeasonEntries = player.arbitrationHistory.filter((entry) => entry.season === season);
  return currentSeasonEntries[currentSeasonEntries.length - 1] ?? null;
}

function createMoment(
  type: Moment['type'],
  description: string,
  impact: number,
  season: number,
  day: number,
): ArbitrationDetectedMoment['moment'] {
  return {
    season,
    day,
    timestamp: `S${season}D${day}`,
    type,
    description,
    impact,
    relevance: Math.abs(impact),
    isPlayoff: false,
    isEliminationGame: false,
    worldSeriesClincher: false,
    round: null as MomentRound | null,
  };
}

export function detectArbitrationMoments(
  players: readonly GeneratedPlayer[],
  context: ArbitrationMomentDetectionContext,
): ArbitrationDetectedMoment[] {
  const detected: ArbitrationDetectedMoment[] = [];

  for (const player of [...players].sort((left, right) => left.id.localeCompare(right.id))) {
    const latestEntry = latestArbitrationEntry(player, context.season);
    if (!latestEntry) {
      continue;
    }

    const name = playerName(player);

    if (!latestEntry.teamWon) {
      detected.push({
        playerId: player.id,
        moment: createMoment(
          'arbitration_win',
          `${name} beat the club's filing and secured ${formatMoney(latestEntry.awardedSalary)} in arbitration.`,
          ARBITRATION_WIN_IMPACT,
          context.season,
          context.day,
        ),
      });
    }

    if (latestEntry.teamWon) {
      detected.push({
        playerId: player.id,
        moment: createMoment(
          'arbitration_loss',
          `${name} lost the arbitration case and settled at ${formatMoney(latestEntry.awardedSalary)}.`,
          ARBITRATION_LOSS_IMPACT,
          context.season,
          context.day,
        ),
      });
    }

    if (player.superTwoQualified && player.arbitrationHistory.length === 1) {
      detected.push({
        playerId: player.id,
        moment: createMoment(
          'super_two_debut',
          `${name} reached arbitration early as a Super Two qualifier.`,
          SUPER_TWO_DEBUT_IMPACT,
          context.season,
          context.day,
        ),
      });
    }
  }

  return detected;
}

function formatDays(days: number): string {
  return `${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Detect holdout_resolution moments when arbitration-related reporting delays
 * close at the same offseason's spring-training boundary. Emit this before the
 * worker clears holdoutState and applies the retained service-day consequence.
 *
 * Output is sorted by playerId for determinism.
 */
export function detectHoldoutResolutions(
  players: readonly GeneratedPlayer[],
  context: HoldoutResolutionDetectionContext,
): ArbitrationDetectedMoment[] {
  const detected: ArbitrationDetectedMoment[] = [];

  for (const player of [...players].sort((left, right) => left.id.localeCompare(right.id))) {
    const holdout = player.holdoutState;
    if (!holdout) {
      continue;
    }

    const name = playerName(player);
    detected.push({
      playerId: player.id,
      moment: createMoment(
        'holdout_resolution',
        `${name} closed a ${formatDays(holdout.holdoutDays)} holdout (${formatMoney(holdout.salaryGap)} gap) and reported back to camp.`,
        HOLDOUT_RESOLUTION_IMPACT,
        context.season,
        context.day,
      ),
    });
  }

  return detected;
}

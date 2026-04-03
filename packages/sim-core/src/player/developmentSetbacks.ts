import type { DevelopmentSetback } from '@mbd/contracts';
import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from './generation.js';
import { clampRating } from './attributes.js';

function addMonths(
  season: number,
  month: number,
  monthsToAdd: number,
): { season: number; month: number } {
  let nextSeason = season;
  let nextMonth = month + monthsToAdd;
  while (nextMonth > 12) {
    nextMonth -= 12;
    nextSeason += 1;
  }
  return { season: nextSeason, month: nextMonth };
}

function buildSummary(player: GeneratedPlayer, type: DevelopmentSetback['type']): string {
  const playerName = `${player.firstName} ${player.lastName}`;
  switch (type) {
    case 'mental_block':
      return `${playerName} is struggling with consistency and needs time to reset.`;
    case 'nagging_injury':
      return `${playerName} is battling a nagging issue that is dragging development.`;
    case 'off_field_distraction':
      return `${playerName} has an off-field distraction that is pulling focus for now.`;
    case 'hot_streak':
      return `${playerName} is riding a hot streak and looks like a breakout candidate.`;
  }
}

export function applyDevelopmentSetback(
  player: GeneratedPlayer,
  setback: DevelopmentSetback,
): GeneratedPlayer {
  return {
    ...player,
    overallRating: clampRating(player.overallRating + setback.overallModifier),
  };
}

export function recoverDevelopmentSetback(
  player: GeneratedPlayer,
  setback: DevelopmentSetback,
): GeneratedPlayer {
  return {
    ...player,
    overallRating: clampRating(player.overallRating - setback.overallModifier),
  };
}

export function isDevelopmentSetbackExpired(
  setback: DevelopmentSetback,
  currentSeason: number,
  currentMonth: number,
): boolean {
  return currentSeason > setback.endSeason
    || (currentSeason === setback.endSeason && currentMonth > setback.endMonth);
}

export function checkDevelopmentSetback(
  rng: GameRNG,
  player: GeneratedPlayer,
  currentMonth: number,
  currentSeason: number = 1,
): DevelopmentSetback | null {
  if (player.rosterStatus === 'MLB' || player.rosterStatus === 'INTERNATIONAL' || player.teamId.length === 0) {
    return null;
  }

  if (rng.nextFloat() >= 0.05) {
    return null;
  }

  const roll = rng.nextInt(1, 100);
  let type: DevelopmentSetback['type'];
  let overallModifier: number;
  let duration: number;

  if (roll <= 40) {
    type = 'mental_block';
    overallModifier = -rng.nextInt(5, 10);
    duration = rng.nextInt(2, 3);
  } else if (roll <= 70) {
    type = 'nagging_injury';
    overallModifier = -rng.nextInt(3, 8);
    duration = rng.nextInt(1, 2);
  } else if (roll <= 85) {
    type = 'off_field_distraction';
    overallModifier = -rng.nextInt(2, 5);
    duration = 1;
  } else {
    type = 'hot_streak';
    overallModifier = rng.nextInt(5, 10);
    duration = rng.nextInt(1, 2);
  }

  const end = addMonths(currentSeason, currentMonth, duration - 1);
  return {
    playerId: player.id,
    type,
    overallModifier,
    startSeason: currentSeason,
    startMonth: currentMonth,
    endSeason: end.season,
    endMonth: end.month,
    summary: buildSummary(player, type),
    active: true,
  };
}

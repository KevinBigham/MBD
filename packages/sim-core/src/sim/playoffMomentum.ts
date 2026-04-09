import type { GameRNG } from '../math/prng.js';

export interface FatigueResult {
  modifier: number;
  isTired: boolean;
  penaltyDescription: string;
}

export interface PressureModifier {
  offenseModifier: number;
  varianceBoost: number;
  description: string;
}

export interface PlayoffGameContext {
  homeTeamWins: number;
  homeTeamLosses: number;
  awayTeamWins: number;
  awayTeamLosses: number;
  seriesHomeWins: number;
  seriesAwayWins: number;
  homeStarterGamesInSeries: number;
  awayStarterGamesInSeries: number;
  homeStarterDaysSinceStart: number;
  awayStarterDaysSinceStart: number;
  homeStarterStamina: number;
  awayStarterStamina: number;
  homeRecentResults: boolean[];
  awayRecentResults: boolean[];
  isElimination: boolean;
  round: 'WC' | 'DS' | 'CS' | 'WS';
}

export interface GameModifiers {
  homeOffenseModifier: number;
  awayOffenseModifier: number;
  homePitchingModifier: number;
  awayPitchingModifier: number;
  varianceMultiplier: number;
  momentumNarrative: string;
}

const PLAYOFF_BASE_HOME_ADVANTAGE = 0.04;
const REGULAR_BASE_HOME_ADVANTAGE = 0.03;
const ROUND_MULTIPLIERS: Record<PlayoffGameContext['round'], number> = {
  WC: 1,
  DS: 1.2,
  CS: 1.4,
  WS: 1.6,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToThousand(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function calculateFatigueModifier(
  pitcherGamesInSeries: number,
  daysSinceLastStart: number,
  stamina: number,
): number {
  let penalty = 0;

  if (pitcherGamesInSeries >= 3) {
    penalty -= 0.08;
  } else if (pitcherGamesInSeries >= 2) {
    penalty -= 0.03;
  }

  if (daysSinceLastStart < 4) {
    penalty -= 0.05;
  }

  if (stamina > 400) {
    penalty *= 0.6;
  }

  return roundToThousand(penalty);
}

export function calculateHomeFieldAdvantage(
  teamWins: number,
  teamLosses: number,
  isPlayoff: boolean,
): number {
  const gamesPlayed = Math.max(1, teamWins + teamLosses);
  const winPct = teamWins / gamesPlayed;
  const baseAdvantage = isPlayoff ? PLAYOFF_BASE_HOME_ADVANTAGE : REGULAR_BASE_HOME_ADVANTAGE;
  const winAdjustment = clamp((winPct - 0.5) * 0.04, -0.01, 0.02);

  return roundToThousand(baseAdvantage + winAdjustment);
}

export function calculatePitcherFatigue(
  rng: GameRNG,
  pitcherGamesInSeries: number,
  daysSinceLastStart: number,
  stamina: number,
): FatigueResult {
  const modifier = calculateFatigueModifier(pitcherGamesInSeries, daysSinceLastStart, stamina);
  const isTired = Math.abs(modifier) >= 0.05;
  const freshTemplates = [
    'The starter looks fresh heading into the outing.',
    'Rest patterns are favorable for this arm.',
  ] as const;
  const tiredTemplates = [
    'Fatigue is creeping in after the recent workload.',
    'The arm is carrying a visible rest penalty into this game.',
  ] as const;

  return {
    modifier,
    isTired,
    penaltyDescription: rng.weightedPick(
      [...(isTired ? tiredTemplates : freshTemplates)],
      [1, 1],
    ),
  };
}

export function calculateMustWinPressure(
  seriesWins: number,
  seriesLosses: number,
  isElimination: boolean,
): PressureModifier {
  if (!isElimination || seriesLosses <= seriesWins) {
    return {
      offenseModifier: 0,
      varianceBoost: 0,
      description: 'No elimination pressure is active.',
    };
  }

  const deficit = seriesLosses - seriesWins;
  const offenseModifier = roundToThousand(clamp(0.02 + (Math.max(0, deficit - 1) * 0.005), 0, 0.035));
  const varianceBoost = roundToThousand(clamp(0.15 + (Math.max(0, deficit - 1) * 0.045), 0, 0.24));

  return {
    offenseModifier,
    varianceBoost,
    description: deficit >= 3
      ? 'The club is in the maximum-pressure elimination lane.'
      : 'Elimination pressure is adding urgency and volatility.',
  };
}

export function calculateStreakMomentum(recentResults: boolean[]): number {
  if (recentResults.length < 3) {
    return 0;
  }

  const lastResult = recentResults[recentResults.length - 1];
  let streakLength = 0;

  for (let index = recentResults.length - 1; index >= 0; index -= 1) {
    if (recentResults[index] !== lastResult) {
      break;
    }
    streakLength += 1;
  }

  if (streakLength < 3) {
    return 0;
  }

  const rawMomentum = clamp(0.02 + ((streakLength - 3) * 0.005), 0.02, 0.04);
  return roundToThousand(lastResult ? rawMomentum : -rawMomentum);
}

function buildDeterministicNarrative(parts: string[]): string {
  if (parts.length === 0) {
    return 'No obvious momentum edge is active.';
  }
  return parts.join(' ');
}

export function buildPlayoffGameModifiers(
  context: PlayoffGameContext,
): GameModifiers {
  const baseHomeAdvantage = calculateHomeFieldAdvantage(
    context.homeTeamWins,
    context.homeTeamLosses,
    true,
  ) * ROUND_MULTIPLIERS[context.round];
  const homeFatigue = calculateFatigueModifier(
    context.homeStarterGamesInSeries,
    context.homeStarterDaysSinceStart,
    context.homeStarterStamina,
  );
  const awayFatigue = calculateFatigueModifier(
    context.awayStarterGamesInSeries,
    context.awayStarterDaysSinceStart,
    context.awayStarterStamina,
  );
  const homeStreak = calculateStreakMomentum(context.homeRecentResults);
  const awayStreak = calculateStreakMomentum(context.awayRecentResults);
  const homePressure = context.isElimination && context.seriesHomeWins < context.seriesAwayWins
    ? calculateMustWinPressure(context.seriesHomeWins, context.seriesAwayWins, true)
    : calculateMustWinPressure(context.seriesHomeWins, context.seriesAwayWins, false);
  const awayPressure = context.isElimination && context.seriesAwayWins < context.seriesHomeWins
    ? calculateMustWinPressure(context.seriesAwayWins, context.seriesHomeWins, true)
    : calculateMustWinPressure(context.seriesAwayWins, context.seriesHomeWins, false);
  const homeOffenseModifier = roundToThousand(baseHomeAdvantage + homeStreak + homePressure.offenseModifier);
  const awayOffenseModifier = roundToThousand((-baseHomeAdvantage) + awayStreak + awayPressure.offenseModifier);
  const homePitchingModifier = roundToThousand(homeFatigue + (homeStreak * 0.5));
  const awayPitchingModifier = roundToThousand(awayFatigue + (awayStreak * 0.5));
  const varianceMultiplier = roundToThousand(1 + Math.max(homePressure.varianceBoost, awayPressure.varianceBoost));
  const narrativeParts: string[] = [];

  if (baseHomeAdvantage > 0) {
    narrativeParts.push('Home field is shaping the scoring environment.');
  }
  if (homeFatigue < 0 || awayFatigue < 0) {
    narrativeParts.push('Starter fatigue is part of the pregame equation.');
  }
  if (varianceMultiplier > 1) {
    narrativeParts.push('Elimination pressure is pushing variance upward.');
  }
  if (homeStreak !== 0 || awayStreak !== 0) {
    narrativeParts.push('Recent streaks are still carrying momentum.');
  }

  return {
    homeOffenseModifier,
    awayOffenseModifier,
    homePitchingModifier,
    awayPitchingModifier,
    varianceMultiplier,
    momentumNarrative: buildDeterministicNarrative(narrativeParts),
  };
}

export function generateMomentumNarrative(
  rng: GameRNG,
  modifiers: GameModifiers,
): string {
  const lead = rng.weightedPick(
    [
      'October leverage is stacking the board.',
      'The series context is tilting this matchup before first pitch.',
    ],
    [1, 1],
  );
  const parts: string[] = [lead];

  if (modifiers.homeOffenseModifier > modifiers.awayOffenseModifier) {
    parts.push('The home crowd and park edge are giving the host club extra oxygen.');
  }
  if (modifiers.homePitchingModifier <= -0.04 || modifiers.awayPitchingModifier <= -0.04) {
    parts.push('Starter fatigue and rest management are hanging over the mound matchups.');
  }
  if (modifiers.varianceMultiplier > 1.05) {
    parts.push('Elimination pressure is injecting more variance into every inning.');
  }
  if (/streak|surge|run/i.test(modifiers.momentumNarrative) || Math.abs(modifiers.homePitchingModifier) < 0.03 || Math.abs(modifiers.awayPitchingModifier) < 0.03) {
    parts.push('Recent streak energy is still shaping the emotional tone of the game.');
  }

  parts.push(modifiers.momentumNarrative);
  return parts.join(' ');
}

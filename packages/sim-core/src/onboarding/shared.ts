import type { GameRNG } from '../math/prng.js';
import { ALL_POSITIONS, PITCHER_POSITIONS, type GeneratedPlayer, type Position } from '../player/generation.js';

export type OnboardingGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export const ONBOARDING_POSITION_ORDER: readonly Position[] = [...ALL_POSITIONS];

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function fullNameFromParts(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

export function getPlayerFullName(player: Pick<GeneratedPlayer, 'firstName' | 'lastName'>): string {
  return fullNameFromParts(player.firstName, player.lastName);
}

export function pickTemplate<T>(rng: GameRNG, templates: readonly T[]): T {
  const index = rng.nextInt(0, templates.length - 1);
  return templates[index]!;
}

export function byString(left: string, right: string): number {
  return left.localeCompare(right);
}

export function sortPlayersByRating(players: readonly GeneratedPlayer[]): GeneratedPlayer[] {
  return [...players].sort((left, right) => {
    if (right.overallRating !== left.overallRating) {
      return right.overallRating - left.overallRating;
    }

    return byString(left.id, right.id);
  });
}

export function gradeFromThresholds(
  value: number,
  thresholds: { readonly A: number; readonly B: number; readonly C: number; readonly D: number },
): Exclude<OnboardingGrade, 'F'> {
  if (value >= thresholds.A) return 'A';
  if (value >= thresholds.B) return 'B';
  if (value >= thresholds.C) return 'C';
  return 'D';
}

export function isPitcherPosition(position: Position): boolean {
  return (PITCHER_POSITIONS as readonly string[]).includes(position);
}

export function splitRoster(players: readonly GeneratedPlayer[]) {
  const hitters = players.filter((player) => !isPitcherPosition(player.position));
  const pitchers = players.filter((player) => isPitcherPosition(player.position));

  return { hitters, pitchers };
}

export function findBestPlayerAtPosition(
  players: readonly GeneratedPlayer[],
  position: Position,
): GeneratedPlayer | null {
  const matches = sortPlayersByRating(players.filter((player) => player.position === position));
  return matches[0] ?? null;
}

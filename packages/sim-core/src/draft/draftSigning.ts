import type { GameRNG } from '../math/prng.js';
import type { DraftProspect } from './draftPool.js';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface DraftSigningOutcome {
  signed: boolean;
  offeredBonus: number;
  askBonus: number;
  slotValue: number;
  acceptanceChance: number;
  returnPath: 'organization' | 'college';
}

export function resolveDraftSigning(
  rng: GameRNG,
  prospect: DraftProspect,
  offeredBonus: number,
): DraftSigningOutcome {
  const safeOffer = Math.max(0, Math.round(offeredBonus * 100) / 100);

  if (prospect.background === 'college_senior') {
    return {
      signed: safeOffer > 0,
      offeredBonus: safeOffer,
      askBonus: prospect.askBonus,
      slotValue: prospect.slotValue,
      acceptanceChance: 1,
      returnPath: 'organization',
    };
  }

  const offerRatio = safeOffer / Math.max(0.01, prospect.askBonus);

  if (
    prospect.background === 'high_school' &&
    prospect.commitmentStrength >= 0.75 &&
    offerRatio < 0.85
  ) {
    return {
      signed: false,
      offeredBonus: safeOffer,
      askBonus: prospect.askBonus,
      slotValue: prospect.slotValue,
      acceptanceChance: 0,
      returnPath: 'college',
    };
  }

  const baseChance =
    prospect.background === 'college_underclass'
      ? 0.52 + prospect.signability * 0.28 + (offerRatio - 1) * 0.55 - prospect.commitmentStrength * 0.18
      : 0.18 + prospect.signability * 0.22 + (offerRatio - 1) * 0.8 - prospect.commitmentStrength * 0.35;
  const acceptanceChance = clamp(baseChance, 0.02, 0.98);
  const signed = offerRatio >= 1.2 || rng.nextFloat() < acceptanceChance;

  return {
    signed,
    offeredBonus: safeOffer,
    askBonus: prospect.askBonus,
    slotValue: prospect.slotValue,
    acceptanceChance,
    returnPath: signed ? 'organization' : 'college',
  };
}

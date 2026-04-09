import type { GameRNG } from '../math/prng.js';
import { getTeamById } from './teams.js';
import type { GMPersonality } from '../trade/tradeAI.js';
import type { GMRelationship } from './gmRelationships.js';

export interface RelationshipEffect {
  type: 'fa_block' | 'waiver_pass' | 'draft_premium' | 'rule5_target';
  teamId: string;
  magnitude: number;
  description: string;
}

const HOSTILE_BID_DELTA = 0.15;
const FRIENDLY_BID_DELTA = -0.1;
const MARGINAL_WAIVER_VALUE = 200;
const WAIVER_PASS_SCORE = 30;
const WAIVER_PASS_CHANCE = 0.7;
const HOSTILE_DRAFT_PREMIUM = 1.3;
const FRIENDLY_DRAFT_DISCOUNT = 0.85;
const RULE5_SPITE_BONUS = 0.05;

const PERSONALITY_EFFECT_MULTIPLIERS: Record<GMPersonality, number> = {
  aggressive: 1.2,
  win_now: 1.2,
  conservative: 1,
  analytical: 0.85,
  prospect_hugger: 0.85,
};

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function personalityDelta(personality: GMPersonality, delta: number): number {
  return delta * PERSONALITY_EFFECT_MULTIPLIERS[personality];
}

export function adjustFABidForRelationship(
  baseBid: number,
  relationship: GMRelationship,
  personality: GMPersonality,
  isTargetedByUser: boolean,
): number {
  if (!isTargetedByUser) {
    return roundToHundredths(baseBid);
  }

  if (relationship.score < -50) {
    return roundToHundredths(baseBid * (1 + personalityDelta(personality, HOSTILE_BID_DELTA)));
  }

  if (relationship.score > 50) {
    return roundToHundredths(baseBid * (1 + personalityDelta(personality, FRIENDLY_BID_DELTA)));
  }

  return roundToHundredths(baseBid);
}

export function shouldPassOnWaiverClaim(
  rng: GameRNG,
  relationship: GMRelationship,
  playerValue: number,
  isUserClaiming: boolean,
): boolean {
  if (!isUserClaiming || playerValue >= MARGINAL_WAIVER_VALUE || relationship.score <= WAIVER_PASS_SCORE) {
    return false;
  }

  return rng.nextFloat() < WAIVER_PASS_CHANCE;
}

export function adjustDraftPickTradeValue(
  baseValue: number,
  relationship: GMRelationship,
  _personality: GMPersonality,
): number {
  if (relationship.score < -40) {
    return roundToHundredths(baseValue * HOSTILE_DRAFT_PREMIUM);
  }
  if (relationship.score > 40) {
    return roundToHundredths(baseValue * FRIENDLY_DRAFT_DISCOUNT);
  }
  return roundToHundredths(baseValue);
}

export function getRule5TargetingBonus(relationship: GMRelationship): number {
  return relationship.score < -40 ? RULE5_SPITE_BONUS : 0;
}

export function generateRelationshipEffectNarrative(
  rng: GameRNG,
  effect: RelationshipEffect,
): string {
  const teamName = teamLabel(effect.teamId);

  if (effect.type === 'fa_block') {
    const lead = rng.nextInt(0, 1) === 0
      ? `${teamName} pushed the market higher on purpose.`
      : `${teamName} made a point of staying in the bidding longer than expected.`;
    return `${lead} ${effect.description}`;
  }

  if (effect.type === 'waiver_pass') {
    const lead = rng.nextInt(0, 1) === 0
      ? `${teamName} quietly stepped aside on the waiver wire.`
      : `${teamName} passed on the marginal claim and let the line move.`;
    return `${lead} ${effect.description}`;
  }

  if (effect.type === 'draft_premium') {
    const lead = rng.nextInt(0, 1) === 0
      ? `${teamName} raised the draft-pick asking price in the room.`
      : `${teamName} treated the pick price like a personal tax.`;
    return `${lead} ${effect.description}`;
  }

  const lead = rng.nextInt(0, 1) === 0
    ? `${teamName} leaned harder into the Rule 5 board against you.`
    : `${teamName} circled your exposed prospects with unusual intent.`;
  return `${lead} ${effect.description}`;
}

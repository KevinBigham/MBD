import { getTeamById } from './teams.js';
import type { GMPersonality } from '../trade/tradeAI.js';

export type RelationshipEventType =
  | 'trade_won'
  | 'trade_lost'
  | 'trade_fair'
  | 'offer_rejected'
  | 'playoff_loss'
  | 'fa_poached'
  | 'dfa_claimed'
  | 'player_became_allstar'
  | 'time_passed';

export type RelationshipTier = 'hostile' | 'strained' | 'neutral' | 'friendly' | 'trusted';

export interface TradeMemory {
  season: number;
  surplusValue: number;
  permanentMemory: boolean;
  description: string;
}

export interface RelationshipEvent {
  type: RelationshipEventType;
  magnitude: number;
  permanent: boolean;
  description: string;
  season: number;
}

export interface GMRelationship {
  targetTeamId: string;
  score: number;
  tradeHistory: TradeMemory[];
  lastInteractionSeason: number;
}

export const RELATIONSHIP_TIER_THRESHOLDS: Record<RelationshipTier, { min: number; max: number }> = {
  hostile: { min: -100, max: -75 },
  strained: { min: -74, max: -25 },
  neutral: { min: -24, max: 24 },
  friendly: { min: 25, max: 74 },
  trusted: { min: 75, max: 100 },
};

export const GRUDGE_DECAY_RATE = 0.85;
export const PERMANENT_DECAY_RATE = 0.95;
export const MAX_TRADE_HISTORY = 10;
export const MAX_TRADE_PENALTY_PCT = 25;

const RELATIONSHIP_SCORE_MIN = -100;
const RELATIONSHIP_SCORE_MAX = 100;

const TIER_TRADE_ADJUSTMENTS: Record<RelationshipTier, number> = {
  hostile: -25,
  strained: -10,
  neutral: 0,
  friendly: 5,
  trusted: 10,
};

const PERSONALITY_MULTIPLIERS: Record<GMPersonality, number> = {
  aggressive: 1.5,
  win_now: 1.5,
  conservative: 1,
  prospect_hugger: 0.5,
  analytical: 0.5,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

function createNeutralRelationship(teamId: string): GMRelationship {
  return {
    targetTeamId: teamId,
    score: 0,
    tradeHistory: [],
    lastInteractionSeason: 0,
  };
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

export function createRelationshipMap(teamIds: string[], userTeamId: string): Map<string, GMRelationship> {
  const relationships = new Map<string, GMRelationship>();
  const seen = new Set<string>();
  for (const teamId of teamIds) {
    if (teamId === userTeamId || seen.has(teamId)) {
      continue;
    }
    relationships.set(teamId, createNeutralRelationship(teamId));
    seen.add(teamId);
  }
  return relationships;
}

export function getRelationship(
  relationships: Map<string, GMRelationship>,
  teamId: string,
): GMRelationship {
  return relationships.get(teamId) ?? createNeutralRelationship(teamId);
}

export function modifyRelationship(
  relationship: GMRelationship,
  event: RelationshipEvent,
): GMRelationship {
  return {
    ...relationship,
    score: clamp(
      roundToHundredths(relationship.score + event.magnitude),
      RELATIONSHIP_SCORE_MIN,
      RELATIONSHIP_SCORE_MAX,
    ),
    lastInteractionSeason: event.season,
  };
}

export function addTradeMemory(
  relationship: GMRelationship,
  memory: TradeMemory,
): GMRelationship {
  return {
    ...relationship,
    tradeHistory: [memory, ...relationship.tradeHistory].slice(0, MAX_TRADE_HISTORY),
  };
}

export function decayRelationships(
  relationships: Map<string, GMRelationship>,
  season: number,
): Map<string, GMRelationship> {
  const decayed = new Map<string, GMRelationship>();
  for (const [teamId, relationship] of relationships.entries()) {
    const seasonsElapsed = Math.max(0, season - relationship.lastInteractionSeason);
    if (seasonsElapsed === 0) {
      decayed.set(teamId, { ...relationship, tradeHistory: [...relationship.tradeHistory] });
      continue;
    }

    const latestMemory = relationship.tradeHistory[0];
    const decayRate = latestMemory?.permanentMemory ? PERMANENT_DECAY_RATE : GRUDGE_DECAY_RATE;
    decayed.set(teamId, {
      ...relationship,
      score: roundToHundredths(relationship.score * (decayRate ** seasonsElapsed)),
      tradeHistory: relationship.tradeHistory.map((memory) => ({ ...memory })),
      lastInteractionSeason: season,
    });
  }
  return decayed;
}

export function getRelationshipTier(score: number): RelationshipTier {
  if (score <= RELATIONSHIP_TIER_THRESHOLDS.hostile.max) {
    return 'hostile';
  }
  if (score <= RELATIONSHIP_TIER_THRESHOLDS.strained.max) {
    return 'strained';
  }
  if (score <= RELATIONSHIP_TIER_THRESHOLDS.neutral.max) {
    return 'neutral';
  }
  if (score <= RELATIONSHIP_TIER_THRESHOLDS.friendly.max) {
    return 'friendly';
  }
  return 'trusted';
}

export function getTradeValueAdjustment(
  relationship: GMRelationship,
  personality: GMPersonality,
): number {
  const tier = getRelationshipTier(relationship.score);
  const scaledAdjustment = roundToHundredths(
    TIER_TRADE_ADJUSTMENTS[tier] * PERSONALITY_MULTIPLIERS[personality],
  );

  if (scaledAdjustment < 0) {
    return Math.max(-MAX_TRADE_PENALTY_PCT, scaledAdjustment);
  }
  return scaledAdjustment;
}

export function generateRelationshipTooltip(
  relationship: GMRelationship,
  teamId: string,
): string {
  const teamName = teamLabel(teamId);
  const tier = getRelationshipTier(relationship.score);
  const latestMemory = relationship.tradeHistory[0];

  if (latestMemory) {
    return `${teamName} remember ${latestMemory.description} in S${latestMemory.season}. Current relationship is ${tier}.`;
  }

  if (tier === 'friendly' || tier === 'trusted') {
    return `${teamName} view you as a ${tier} trade partner.`;
  }
  if (tier === 'hostile' || tier === 'strained') {
    return `${teamName} are carrying a ${tier} read on your front office.`;
  }
  return `${teamName} hold a neutral stance toward your front office.`;
}

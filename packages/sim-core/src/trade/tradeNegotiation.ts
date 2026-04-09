import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { getRelationshipTier, type GMRelationship } from '../league/gmRelationships.js';
import { getTeamById } from '../league/teams.js';
import { generateTradeId, type GMPersonality } from './tradeAI.js';
import { evaluatePlayerTradeValue } from './valuation.js';

export interface NegotiationProposal {
  fromTeamId: string;
  toTeamId: string;
  offering: string[];
  requesting: string[];
  valuationGap: number;
}

export interface NegotiationContext {
  currentDay: number;
  fromTeamPlayers: GeneratedPlayer[];
  toTeamPlayers: GeneratedPlayer[];
  protectedPlayerIds?: string[];
  unavailablePlayerIds?: string[];
}

export type NegotiationPhase =
  | 'proposed'
  | 'pending'
  | 'counter_1'
  | 'counter_2'
  | 'counter_3'
  | 'accepted'
  | 'rejected'
  | 'dead';

export interface NegotiationDialogue {
  speaker: 'rival_gm' | 'agm_advisor';
  text: string;
  tone: string;
}

export interface CounterOffer {
  round: number;
  addedByAI: string[];
  removedByAI: string[];
  adjustedValuationGap: number;
}

export interface CounterOfferResult {
  hasCounter: boolean;
  counter: CounterOffer | null;
  proposal: NegotiationProposal | null;
  reason: string;
}

export interface NegotiationState {
  id: string;
  phase: NegotiationPhase;
  proposal: NegotiationProposal;
  context: NegotiationContext;
  counterOffers: CounterOffer[];
  roundsCompleted: number;
  expiresAtDay: number;
  dialogue: NegotiationDialogue[];
  relationshipChange: number;
}

export interface NegotiationResponse {
  action: 'accept' | 'reject' | 'counter';
  proposal?: NegotiationProposal;
  context?: NegotiationContext;
}

export interface NegotiationOutcome {
  accepted: boolean;
  finalProposal: NegotiationProposal;
  relationshipChange: number;
  narrative: string;
}

export const MAX_NEGOTIATION_ROUNDS = 3;
export const PENDING_EXPIRE_DAYS = 2;
export const INSTANT_REJECT_THRESHOLD = 0.6;
export const COUNTER_RANGE_LOW = 0.6;
export const COUNTER_RANGE_HIGH = 0.9;
const FAIR_RANGE_HIGH = 1.1;

const RELATIONSHIP_THRESHOLD_SHIFT = {
  hostile: 0.15,
  strained: 0.05,
  neutral: 0,
  friendly: -0.05,
  trusted: -0.1,
} as const;

const PHASE_TONES: Record<NegotiationPhase, string> = {
  proposed: 'measured',
  pending: 'measured',
  counter_1: 'firm',
  counter_2: 'firm',
  counter_3: 'firm',
  accepted: 'decisive',
  rejected: 'dismissive',
  dead: 'closed',
};

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function roundToHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

function playerValue(player: GeneratedPlayer): number {
  return evaluatePlayerTradeValue(player).overall;
}

function byValueAscending(players: GeneratedPlayer[]): GeneratedPlayer[] {
  return [...players].sort((left, right) =>
    playerValue(left) - playerValue(right)
    || left.id.localeCompare(right.id),
  );
}

function resolvePlayers(players: GeneratedPlayer[], ids: string[]): GeneratedPlayer[] {
  const byId = new Map(players.map((player) => [player.id, player]));
  return ids.flatMap((id) => {
    const player = byId.get(id);
    return player ? [player] : [];
  });
}

function valuationGapFromProposal(
  proposal: NegotiationProposal,
  context: NegotiationContext,
): number {
  const offering = resolvePlayers(context.fromTeamPlayers, proposal.offering);
  const requesting = resolvePlayers(context.toTeamPlayers, proposal.requesting);
  const offeringValue = offering.reduce((total, player) => total + playerValue(player), 0);
  const requestingValue = requesting.reduce((total, player) => total + playerValue(player), 0);
  return roundToHundredths(offeringValue / Math.max(1, requestingValue));
}

function normalizeProposal(
  proposal: NegotiationProposal,
  context: NegotiationContext,
): NegotiationProposal {
  return {
    ...proposal,
    valuationGap: valuationGapFromProposal(proposal, context),
  };
}

function thresholdShift(relationship: GMRelationship): number {
  return RELATIONSHIP_THRESHOLD_SHIFT[getRelationshipTier(relationship.score)];
}

function thresholdBands(relationship: GMRelationship): {
  reject: number;
  counterHigh: number;
  fairHigh: number;
} {
  const shift = thresholdShift(relationship);
  return {
    reject: INSTANT_REJECT_THRESHOLD + shift,
    counterHigh: COUNTER_RANGE_HIGH + shift,
    fairHigh: FAIR_RANGE_HIGH + shift,
  };
}

function counterPhase(round: number): NegotiationPhase {
  if (round <= 1) {
    return 'counter_1';
  }
  if (round === 2) {
    return 'counter_2';
  }
  return 'counter_3';
}

function isYoungProspect(player: GeneratedPlayer): boolean {
  return player.rosterStatus !== 'MLB' && player.age < 25;
}

function excludedIds(context: NegotiationContext): Set<string> {
  return new Set([
    ...(context.protectedPlayerIds ?? []),
    ...(context.unavailablePlayerIds ?? []),
  ]);
}

function candidateSweeteners(
  proposal: NegotiationProposal,
  context: NegotiationContext,
): GeneratedPlayer[] {
  const excluded = excludedIds(context);
  return byValueAscending(
    context.fromTeamPlayers.filter((player) =>
      !proposal.offering.includes(player.id)
      && !excluded.has(player.id),
    ),
  );
}

function removableRequestedPlayers(
  proposal: NegotiationProposal,
  context: NegotiationContext,
  personality: GMPersonality,
): GeneratedPlayer[] {
  const requested = resolvePlayers(context.toTeamPlayers, proposal.requesting);
  const ordered = byValueAscending(requested);
  if (personality !== 'prospect_hugger') {
    return ordered;
  }

  return [
    ...ordered.filter(isYoungProspect),
    ...ordered.filter((player) => !isYoungProspect(player)),
  ];
}

function applyCounterAdjustments(
  proposal: NegotiationProposal,
  context: NegotiationContext,
  addedByAI: string[],
  removedByAI: string[],
): NegotiationProposal {
  return normalizeProposal({
    ...proposal,
    offering: [...proposal.offering, ...addedByAI],
    requesting: proposal.requesting.filter((playerId) => !removedByAI.includes(playerId)),
  }, context);
}

function canCounter(proposal: NegotiationProposal, relationship: GMRelationship): boolean {
  const bands = thresholdBands(relationship);
  return proposal.valuationGap >= bands.reject && proposal.valuationGap < bands.counterHigh;
}

function buildAcceptanceRelationshipChange(
  proposal: NegotiationProposal,
  relationship: GMRelationship,
): number {
  const overpayMargin = Math.max(0, proposal.valuationGap - thresholdBands(relationship).fairHigh);
  return Math.max(3, Math.round(overpayMargin * 20));
}

function appendDialogue(
  rng: GameRNG,
  state: NegotiationState,
  personality: GMPersonality,
  relationship: GMRelationship,
): NegotiationState {
  return {
    ...state,
    dialogue: [...state.dialogue, ...generateNegotiationDialogue(rng, state, personality, relationship)],
  };
}

export function calculateCounterOffer(
  rng: GameRNG,
  proposal: NegotiationProposal,
  context: NegotiationContext,
  personality: GMPersonality,
  relationship: GMRelationship,
  round = 1,
): CounterOfferResult {
  const normalizedProposal = normalizeProposal(proposal, context);
  if (!canCounter(normalizedProposal, relationship)) {
    return {
      hasCounter: false,
      counter: null,
      proposal: null,
      reason: 'The offer is outside the counter range.',
    };
  }

  const bands = thresholdBands(relationship);
  let addedByAI: string[] = [];
  let removedByAI: string[] = [];
  let workingProposal = normalizedProposal;

  const addSweetener = () => {
    const sweetener = candidateSweeteners(workingProposal, context)[0];
    if (!sweetener) {
      return false;
    }
    addedByAI = [...addedByAI, sweetener.id];
    workingProposal = applyCounterAdjustments(workingProposal, context, [sweetener.id], []);
    return true;
  };

  const removeRequested = () => {
    const removable = removableRequestedPlayers(workingProposal, context, personality)
      .find((player) => !removedByAI.includes(player.id));
    if (!removable || workingProposal.requesting.length <= 1) {
      return false;
    }
    removedByAI = [...removedByAI, removable.id];
    workingProposal = applyCounterAdjustments(workingProposal, context, [], [removable.id]);
    return true;
  };

  const prefersSweetenerFirst = personality === 'aggressive' || personality === 'win_now';
  if (prefersSweetenerFirst) {
    addSweetener();
    while (workingProposal.valuationGap < bands.counterHigh && removeRequested()) {
      // Aggressive rooms still trim the ask if the sweetener alone is not enough.
    }
  } else {
    while (workingProposal.valuationGap < bands.counterHigh && removeRequested()) {
      // Conservative rooms start by shrinking their ask.
    }
    if (workingProposal.valuationGap < bands.counterHigh) {
      addSweetener();
    }
  }

  if (workingProposal.valuationGap <= normalizedProposal.valuationGap) {
    return {
      hasCounter: false,
      counter: null,
      proposal: null,
      reason: 'The AI could not improve the framework.',
    };
  }

  return {
    hasCounter: true,
    counter: {
      round,
      addedByAI,
      removedByAI,
      adjustedValuationGap: workingProposal.valuationGap,
    },
    proposal: workingProposal,
    reason: workingProposal.valuationGap >= bands.counterHigh
      ? 'The counter pushes the offer into a serious range.'
      : 'The counter improves the offer without fully closing the gap.',
  };
}

export function initiateNegotiation(
  rng: GameRNG,
  proposal: NegotiationProposal,
  context: NegotiationContext,
  relationship: GMRelationship,
  personality: GMPersonality,
): NegotiationState {
  const normalizedProposal = normalizeProposal(proposal, context);
  const bands = thresholdBands(relationship);
  const baseState: NegotiationState = {
    id: generateTradeId(rng).replace('trade-', 'negotiation-'),
    phase: 'proposed',
    proposal: normalizedProposal,
    context,
    counterOffers: [],
    roundsCompleted: 0,
    expiresAtDay: context.currentDay + PENDING_EXPIRE_DAYS,
    dialogue: [],
    relationshipChange: 0,
  };

  if (normalizedProposal.valuationGap < bands.reject) {
    return appendDialogue(rng, {
      ...baseState,
      phase: 'rejected',
      relationshipChange: -5,
    }, personality, relationship);
  }

  if (normalizedProposal.valuationGap < bands.counterHigh) {
    const counterResult = calculateCounterOffer(rng, normalizedProposal, context, personality, relationship, 1);
    if (!counterResult.hasCounter || !counterResult.counter || !counterResult.proposal) {
      return appendDialogue(rng, {
        ...baseState,
        phase: 'rejected',
        relationshipChange: -5,
      }, personality, relationship);
    }

    return appendDialogue(rng, {
      ...baseState,
      phase: 'counter_1',
      proposal: counterResult.proposal,
      counterOffers: [counterResult.counter],
      roundsCompleted: 1,
    }, personality, relationship);
  }

  if (normalizedProposal.valuationGap <= bands.fairHigh) {
    return appendDialogue(rng, {
      ...baseState,
      phase: 'pending',
      relationshipChange: 2,
    }, personality, relationship);
  }

  return appendDialogue(rng, {
    ...baseState,
    phase: 'accepted',
    relationshipChange: buildAcceptanceRelationshipChange(normalizedProposal, relationship),
  }, personality, relationship);
}

export function advanceNegotiation(
  rng: GameRNG,
  state: NegotiationState,
  playerResponse: NegotiationResponse,
  relationship: GMRelationship,
  personality: GMPersonality,
): NegotiationState {
  if (isNegotiationComplete(state)) {
    return state;
  }

  const nextContext = playerResponse.context ?? state.context;
  if (state.phase === 'pending' && nextContext.currentDay > state.expiresAtDay && playerResponse.action !== 'accept') {
    return appendDialogue(rng, {
      ...state,
      context: nextContext,
      phase: 'dead',
    }, personality, relationship);
  }

  if (playerResponse.action === 'accept') {
    return appendDialogue(rng, {
      ...state,
      context: nextContext,
      phase: 'accepted',
      relationshipChange: Math.max(state.relationshipChange, buildAcceptanceRelationshipChange(state.proposal, relationship)),
    }, personality, relationship);
  }

  if (playerResponse.action === 'reject') {
    return appendDialogue(rng, {
      ...state,
      context: nextContext,
      phase: 'rejected',
      relationshipChange: state.phase === 'pending' ? state.relationshipChange : -5,
    }, personality, relationship);
  }

  if (!playerResponse.proposal) {
    return appendDialogue(rng, {
      ...state,
      context: nextContext,
      phase: 'dead',
    }, personality, relationship);
  }

  const normalizedProposal = normalizeProposal(playerResponse.proposal, nextContext);
  const bands = thresholdBands(relationship);

  if (normalizedProposal.valuationGap < bands.reject) {
    return appendDialogue(rng, {
      ...state,
      context: nextContext,
      proposal: normalizedProposal,
      phase: 'rejected',
      relationshipChange: -5,
    }, personality, relationship);
  }

  if (normalizedProposal.valuationGap >= bands.counterHigh && normalizedProposal.valuationGap <= bands.fairHigh) {
    return appendDialogue(rng, {
      ...state,
      context: nextContext,
      proposal: normalizedProposal,
      phase: 'pending',
      relationshipChange: 2,
      expiresAtDay: nextContext.currentDay + PENDING_EXPIRE_DAYS,
    }, personality, relationship);
  }

  if (normalizedProposal.valuationGap > bands.fairHigh) {
    return appendDialogue(rng, {
      ...state,
      context: nextContext,
      proposal: normalizedProposal,
      phase: 'accepted',
      relationshipChange: buildAcceptanceRelationshipChange(normalizedProposal, relationship),
    }, personality, relationship);
  }

  if (state.roundsCompleted >= MAX_NEGOTIATION_ROUNDS) {
    return appendDialogue(rng, {
      ...state,
      context: nextContext,
      proposal: normalizedProposal,
      phase: 'dead',
    }, personality, relationship);
  }

  const nextRound = state.roundsCompleted + 1;
  const counterResult = calculateCounterOffer(
    rng,
    normalizedProposal,
    nextContext,
    personality,
    relationship,
    nextRound,
  );

  if (!counterResult.hasCounter || !counterResult.counter || !counterResult.proposal) {
    return appendDialogue(rng, {
      ...state,
      context: nextContext,
      proposal: normalizedProposal,
      phase: 'dead',
    }, personality, relationship);
  }

  return appendDialogue(rng, {
    ...state,
    context: nextContext,
    proposal: counterResult.proposal,
    phase: counterPhase(nextRound),
    roundsCompleted: nextRound,
    counterOffers: [...state.counterOffers, counterResult.counter],
  }, personality, relationship);
}

export function resolveNegotiation(state: NegotiationState): NegotiationOutcome {
  const otherTeam = teamLabel(state.proposal.toTeamId);

  if (state.phase === 'accepted') {
    return {
      accepted: true,
      finalProposal: state.proposal,
      relationshipChange: state.relationshipChange,
      narrative: `${otherTeam} accepted the final trade framework.`,
    };
  }

  if (state.phase === 'rejected') {
    return {
      accepted: false,
      finalProposal: state.proposal,
      relationshipChange: state.relationshipChange,
      narrative: `${otherTeam} rejected the proposal and ended the discussion.`,
    };
  }

  if (state.phase === 'dead') {
    return {
      accepted: false,
      finalProposal: state.proposal,
      relationshipChange: state.relationshipChange,
      narrative: `${otherTeam} let the negotiation die on the table.`,
    };
  }

  return {
    accepted: false,
    finalProposal: state.proposal,
    relationshipChange: state.relationshipChange,
    narrative: `${otherTeam} are still reviewing the proposal.`,
  };
}

export function generateNegotiationDialogue(
  rng: GameRNG,
  state: NegotiationState,
  personality: GMPersonality,
  relationship: GMRelationship,
): NegotiationDialogue[] {
  const otherTeam = teamLabel(state.proposal.toTeamId);
  const tier = getRelationshipTier(relationship.score);
  const tone = PHASE_TONES[state.phase];

  const gmText = state.phase === 'rejected'
    ? personality === 'aggressive'
      ? `${otherTeam} laughed at the offer and told you to come back with a real package.`
      : `${otherTeam} said the value is not close enough to keep the line open.`
    : state.phase.startsWith('counter')
      ? personality === 'win_now'
        ? `${otherTeam} want one more piece and they want it right now.`
        : `${otherTeam} kicked back a firmer counter and asked for a cleaner fit.`
      : state.phase === 'pending'
        ? `${otherTeam} are taking the proposal upstairs for one more review.`
        : state.phase === 'accepted'
          ? `${otherTeam} agreed to the package and want the paperwork immediately.`
          : `${otherTeam} stopped returning calls and the room went quiet.`;

  const advisorText = state.phase === 'accepted'
    ? `Our AGM reads this as a ${tier} club reacting to surplus value they could not pass on.`
    : state.phase === 'pending'
      ? `Our AGM thinks the ${tier} relationship bought us a little patience, but not real leverage.`
      : state.phase === 'dead'
        ? `Our AGM says the room ran out of oxygen after ${state.roundsCompleted} counter round${state.roundsCompleted === 1 ? '' : 's'}.`
        : `Our AGM says ${otherTeam} are still behaving like a ${tier} front office: rigid on value and alert to leverage.`;

  const extraLine = state.phase.startsWith('counter')
    ? {
      speaker: 'rival_gm' as const,
      text: rng.nextInt(0, 1) === 0
        ? 'That is the cleanest version of the deal they will entertain today.'
        : 'They are signaling this is the framework they want answered now.',
      tone,
    }
    : null;

  return [
    { speaker: 'rival_gm', text: gmText, tone },
    { speaker: 'agm_advisor', text: advisorText, tone },
    ...(extraLine ? [extraLine] : []),
  ];
}

export function isNegotiationComplete(state: NegotiationState): boolean {
  return state.phase === 'accepted' || state.phase === 'rejected' || state.phase === 'dead';
}

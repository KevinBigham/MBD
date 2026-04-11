import type {
  BriefingItem,
  PersistentNegotiationState,
  PersistentTradeOffer,
  TradeAsset,
  TradeHistoryEntry,
} from '@mbd/contracts';
import {
  addTradeMemory,
  applyMoraleEvent,
  adjustDraftPickTradeValue,
  buildRosterState,
  calculateTeamChemistry,
  comparePackages,
  createDefaultDraftPickOwnership,
  createInitialPlayerMorale,
  deduplicateNews,
  deriveTradeDeadlineMode,
  evaluateTradeProposal,
  evaluateMultiTeamFairness as evaluateMultiTeamFairnessCore,
  executeTrade,
  generateConditionalClause as generateConditionalClauseCore,
  initiateNegotiation,
  isNegotiationComplete,
  generateRelationshipEffectNarrative,
  generateAITradeOffers,
  generateTradeChatter,
  generateTradeDialogue,
  generateNews,
  generateNewsId,
  getRelationship,
  getDaysUntilTradeDeadline,
  getTradeDeadlineDay,
  getRemainingIFABudget,
  getTeamById,
  isTradeDeadlineModeDay,
  detectTradeCascades,
  modifyRelationship,
  proposeMultiTeamTrade,
  resolveNegotiation as resolveTradeNegotiation,
  recordBlockbusterTradeRivalry,
  rivalryTradePenalty,
  tradeDraftPickOwnership as tradeDraftPickOwnershipCore,
  tradeIFABonusPool as tradeIFABonusPoolCore,
  advanceNegotiation as advanceTradeNegotiation,
} from '@mbd/sim-core';
import type {
  NegotiationDialogue,
  NegotiationPhase,
  NegotiationProposal as CoreNegotiationProposal,
  NegotiationState,
  NegotiationContext,
  GMPersonality,
  TradeChatterItem,
  TradeDeadlineMode,
  TradeDialogue,
  TradeCondition,
  TradeNegotiationType,
  TradeProposal,
  TradeParticipantRole,
} from '@mbd/sim-core';
import type { CascadeEvent, PendingTrade } from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';
import { createStableWorkerRng, getTeamPlayers, timestamp } from './sim.worker.helpers.js';
import { applyTradeConsequences } from './sim.worker.consequences.js';
import { rebuildBriefing } from './sim.worker.narrative.js';
import { getDifficultyAdjustedTradeFairness } from './sim.worker.setup.js';
import { advanceTradeSagaClimax } from './sim.worker.storyArcs.js';

export const TRADE_DEADLINE_DAY = getTradeDeadlineDay();
const DEADLINE_ACTIVITY_CHECKPOINTS = [92, 97, 102, 107, 112, 117, 120, 122] as const;

export interface TradeAssetView {
  key: string;
  type: TradeAsset['type'];
  label: string;
  detail: string;
  asset: TradeAsset;
  playerId?: string;
}

export interface TradeOfferView {
  id: string;
  fromTeamId: string;
  fromTeamName: string;
  fromTeamAbbreviation: string;
  toTeamId: string;
  toTeamName: string;
  toTeamAbbreviation: string;
  fairnessScore: number;
  message: string;
  createdAt: string;
  offeringAssets: TradeAssetView[];
  requestingAssets: TradeAssetView[];
}

export interface TradeHistoryView {
  id: string;
  fromTeamId: string;
  fromTeamName: string;
  fromTeamAbbreviation: string;
  toTeamId: string;
  toTeamName: string;
  toTeamAbbreviation: string;
  fairnessScore: number;
  summary: string;
  timestamp: string;
  offeringAssets: TradeAssetView[];
  requestingAssets: TradeAssetView[];
}

export interface HotTradeOfferView extends TradeOfferView {
  urgencyTag: 'ACTIVE' | 'EXPIRING SOON' | 'FINAL OFFER';
  bidderCount: number;
  biddingSummary: string | null;
  dialogue: TradeDialogue;
}

export interface TradeTickerItem {
  id: string;
  summary: string;
  timestamp: string;
}

export interface TradeDeadlineRecapItem {
  id: string;
  summary: string;
  outcome: 'completed' | 'missed';
  timestamp: string;
}

export interface TradeDeadlineRecapView {
  season: number;
  deadlineDay: number;
  analysisHeadline: string;
  analysisBody: string;
  yourTrades: TradeDeadlineRecapItem[];
  majorMoves: TradeTickerItem[];
  winners: string[];
  losers: string[];
}

export interface TradeDeadlineStateView {
  deadlineDay: number;
  daysUntilDeadline: number | null;
  deadlineMode: boolean;
  teamMode: TradeDeadlineMode;
  modeSummary: string;
  countdownLabel: string;
  hotOffers: HotTradeOfferView[];
  ticker: TradeTickerItem[];
  chatter: TradeChatterItem[];
  recap: TradeDeadlineRecapView | null;
}

export interface TradeAssetInventoryView {
  draftPicks: Array<{
    key: string;
    label: string;
    detail: string;
    asset: Extract<TradeAsset, { type: 'draft_pick' }>;
  }>;
  ifaRemaining: number;
}

export interface TradeCounterPackage {
  offeringAssets: TradeAsset[];
  requestingAssets: TradeAsset[];
}

export interface TradeOfferResponseResult {
  success: boolean;
  decision: 'accepted' | 'declined' | 'countered' | 'rejected';
  message: string;
}

export interface TradeNegotiationView {
  id: string;
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  phase: NegotiationPhase;
  roundsCompleted: number;
  expiresAtDay: number;
  dialogue: NegotiationDialogue[];
  proposal: TradeCounterPackage;
  counterOffer: TradeCounterPackage | null;
  isComplete: boolean;
  canAccept: boolean;
  canCounter: boolean;
  canReject: boolean;
}

export interface TradeNegotiationActionResult {
  success: boolean;
  decision: 'accepted' | 'rejected' | 'countered' | 'pending' | 'dead';
  message: string;
  negotiation: TradeNegotiationView | null;
  tradeExecuted: boolean;
}

export interface MultiTeamTradeParticipantInput {
  teamId: string;
  role: TradeParticipantRole;
  sendingPlayerIds: string[];
  receivingPlayerIds: string[];
}

export interface MultiTeamTradeProposalInput {
  teams: MultiTeamTradeParticipantInput[];
  conditions: TradeCondition[];
}

export interface MultiTeamTeamNetValueView {
  teamId: string;
  teamName: string;
  teamAbbreviation: string;
  netValue: number;
}

export interface MultiTeamFairnessView {
  isBalanced: boolean;
  maxImbalance: number;
  mostDisadvantagedTeam: string;
  fairnessScore: number;
  netValueByTeam: MultiTeamTeamNetValueView[];
}

export interface MultiTeamFairnessResult {
  success: boolean;
  message: string;
  fairness: MultiTeamFairnessView | null;
}

export interface ConditionalClauseResult {
  success: boolean;
  message: string;
  condition: TradeCondition | null;
}

export interface MultiTeamTradeProposalResult {
  success: boolean;
  accepted: boolean;
  message: string;
  narrative: string;
  fairness: MultiTeamFairnessView | null;
  blockingTeamId?: string;
  blockReason?: string;
}

export interface MultiTeamTradeExecutionResult {
  success: boolean;
  accepted: boolean;
  message: string;
  narrative: string;
  fairness: MultiTeamFairnessView | null;
  cascadeEvents: CascadeEvent[];
  pendingTrades: PendingTrade[];
}

let tradeDeadlineRecapCache: TradeDeadlineRecapView | null = null;
const RELATIONSHIP_PERSONALITY_MULTIPLIER: Record<GMPersonality, number> = {
  aggressive: 1.2,
  win_now: 1.15,
  conservative: 1,
  prospect_hugger: 0.9,
  analytical: 0.95,
};
const MULTI_TEAM_ROLE_PRIORITY: Record<TradeParticipantRole, number> = {
  initiator: 0,
  partner: 1,
  facilitator: 2,
};

interface UserRelationshipTradeContext {
  counterpartTeamId: string;
  personality: GMPersonality;
  relationship: ReturnType<typeof getRelationship>;
}

function teamName(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function teamAbbreviation(teamId: string): string {
  return getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase();
}

function getUserRelationshipTradeContext(
  state: FullGameState,
  fromTeamId: string,
  toTeamId: string,
): UserRelationshipTradeContext | null {
  if (fromTeamId === state.userTeamId && toTeamId !== state.userTeamId) {
    return {
      counterpartTeamId: toTeamId,
      personality: state.gmPersonalities.get(toTeamId) ?? 'analytical',
      relationship: getRelationship(state.gmRelationships, toTeamId),
    };
  }

  if (toTeamId === state.userTeamId && fromTeamId !== state.userTeamId) {
    return {
      counterpartTeamId: fromTeamId,
      personality: state.gmPersonalities.get(fromTeamId) ?? 'analytical',
      relationship: getRelationship(state.gmRelationships, fromTeamId),
    };
  }

  return null;
}

function relationshipTradeMargin(
  state: FullGameState,
  proposal: { fromTeamId: string; toTeamId: string },
  fairnessScore: number,
): number {
  return proposal.fromTeamId === state.userTeamId ? fairnessScore : -fairnessScore;
}

function buildTradeMemoryDescription(margin: number): string {
  if (margin >= 18) {
    return 'a trade you clearly won';
  }
  if (margin <= -18) {
    return 'a trade they felt they won';
  }
  return 'a trade both sides could justify';
}

function buildRelationshipDelta(
  personality: GMPersonality,
  userMargin: number,
): number {
  const multiplier = RELATIONSHIP_PERSONALITY_MULTIPLIER[personality] ?? 1;
  if (userMargin >= 18) {
    return -Math.max(4, Math.round(Math.min(20, userMargin * 0.35) * multiplier));
  }
  if (userMargin <= -18) {
    return Math.max(3, Math.round(Math.min(14, Math.abs(userMargin) * 0.22) * multiplier));
  }
  return 4;
}

function applyAcceptedTradeRelationshipUpdate(
  state: FullGameState,
  proposal: { fromTeamId: string; toTeamId: string },
  fairnessScore: number,
) {
  const context = getUserRelationshipTradeContext(state, proposal.fromTeamId, proposal.toTeamId);
  if (!context) {
    return;
  }

  const userMargin = relationshipTradeMargin(state, proposal, fairnessScore);
  let relationship = addTradeMemory(context.relationship, {
    season: state.season,
    surplusValue: Number(userMargin.toFixed(2)),
    permanentMemory: Math.abs(userMargin) >= 25,
    description: buildTradeMemoryDescription(userMargin),
  });
  relationship = modifyRelationship(relationship, {
    type: userMargin >= 18 ? 'trade_won' : userMargin <= -18 ? 'trade_lost' : 'trade_fair',
    magnitude: buildRelationshipDelta(context.personality, userMargin),
    permanent: Math.abs(userMargin) >= 25,
    description: buildTradeMemoryDescription(userMargin),
    season: state.season,
  });
  state.gmRelationships.set(context.counterpartTeamId, relationship);
}

function buildTradeRelationshipNarrative(
  state: FullGameState,
  proposal: {
    fromTeamId: string;
    toTeamId: string;
    offeringAssets: TradeAsset[];
    requestingAssets: TradeAsset[];
  },
): string | null {
  const context = getUserRelationshipTradeContext(state, proposal.fromTeamId, proposal.toTeamId);
  if (!context) {
    return null;
  }

  const includesDraftPick = [...proposal.offeringAssets, ...proposal.requestingAssets]
    .some((asset) => asset.type === 'draft_pick');
  if (!includesDraftPick) {
    return null;
  }

  return generateRelationshipEffectNarrative(
    createStableWorkerRng(
      state,
      `trade:relationship:${proposal.fromTeamId}:${proposal.toTeamId}:${state.season}:${state.day}`,
    ),
    {
      type: 'draft_premium',
      teamId: context.counterpartTeamId,
      magnitude: context.relationship.score,
      description: 'Prior history changed how the draft-pick pieces were priced in the room.',
    },
  );
}

function buildNegotiationPackage(playerIds: string[], counterpartIds: string[]): TradeCounterPackage {
  return {
    offeringAssets: playerAssets(playerIds),
    requestingAssets: playerAssets(counterpartIds),
  };
}

function toPersistentNegotiationState(state: NegotiationState): PersistentNegotiationState {
  return {
    id: state.id,
    phase: state.phase,
    proposal: {
      fromTeamId: state.proposal.fromTeamId,
      toTeamId: state.proposal.toTeamId,
      offering: [...state.proposal.offering],
      requesting: [...state.proposal.requesting],
      valuationGap: state.proposal.valuationGap,
    },
    context: {
      currentDay: state.context.currentDay,
      fromTeamId: state.proposal.fromTeamId,
      toTeamId: state.proposal.toTeamId,
      protectedPlayerIds: [...(state.context.protectedPlayerIds ?? [])],
      unavailablePlayerIds: [...(state.context.unavailablePlayerIds ?? [])],
    },
    counterOffers: state.counterOffers.map((counter) => ({
      round: counter.round,
      addedByAI: [...counter.addedByAI],
      removedByAI: [...counter.removedByAI],
      adjustedValuationGap: counter.adjustedValuationGap,
    })),
    roundsCompleted: state.roundsCompleted,
    expiresAtDay: state.expiresAtDay,
    dialogue: state.dialogue.map((entry) => ({ ...entry })),
    relationshipChange: state.relationshipChange,
  };
}

function hydrateNegotiationContext(
  state: FullGameState,
  persistent: PersistentNegotiationState,
): NegotiationContext {
  return {
    currentDay: state.day,
    fromTeamPlayers: getTeamPlayers(persistent.proposal.fromTeamId),
    toTeamPlayers: getTeamPlayers(persistent.proposal.toTeamId),
    protectedPlayerIds: [...persistent.context.protectedPlayerIds],
    unavailablePlayerIds: [...persistent.context.unavailablePlayerIds],
  };
}

function hydrateNegotiationState(
  state: FullGameState,
  persistent: PersistentNegotiationState,
): NegotiationState {
  return {
    id: persistent.id,
    phase: persistent.phase,
    proposal: {
      fromTeamId: persistent.proposal.fromTeamId,
      toTeamId: persistent.proposal.toTeamId,
      offering: [...persistent.proposal.offering],
      requesting: [...persistent.proposal.requesting],
      valuationGap: persistent.proposal.valuationGap,
    },
    context: hydrateNegotiationContext(state, persistent),
    counterOffers: persistent.counterOffers.map((counter) => ({
      round: counter.round,
      addedByAI: [...counter.addedByAI],
      removedByAI: [...counter.removedByAI],
      adjustedValuationGap: counter.adjustedValuationGap,
    })),
    roundsCompleted: persistent.roundsCompleted,
    expiresAtDay: persistent.expiresAtDay,
    dialogue: persistent.dialogue.map((entry) => ({ ...entry })),
    relationshipChange: persistent.relationshipChange,
  };
}

function upsertNegotiation(state: FullGameState, negotiation: NegotiationState) {
  const persistent = toPersistentNegotiationState(negotiation);
  const next = state.tradeState.negotiations.filter((entry) => entry.id !== persistent.id);
  state.tradeState = {
    ...state.tradeState,
    negotiations: [...next, persistent].sort((left, right) =>
      left.expiresAtDay - right.expiresAtDay || left.id.localeCompare(right.id),
    ),
  };
}

function removeNegotiation(state: FullGameState, negotiationId: string) {
  state.tradeState = {
    ...state.tradeState,
    negotiations: state.tradeState.negotiations.filter((entry) => entry.id !== negotiationId),
  };
}

export function pruneExpiredNegotiations(state: FullGameState) {
  const active = state.tradeState.negotiations.filter((entry) => entry.expiresAtDay >= state.day);
  if (active.length === state.tradeState.negotiations.length) {
    return;
  }
  state.tradeState = {
    ...state.tradeState,
    negotiations: active,
  };
}

function buildNegotiationView(
  state: FullGameState,
  negotiation: NegotiationState,
): TradeNegotiationView {
  const counterpartTeamId = negotiation.proposal.toTeamId;
  const counterOffer = negotiation.phase.startsWith('counter')
    ? buildNegotiationPackage(negotiation.proposal.offering, negotiation.proposal.requesting)
    : null;

  return {
    id: negotiation.id,
    teamId: counterpartTeamId,
    teamName: teamName(counterpartTeamId),
    teamAbbreviation: teamAbbreviation(counterpartTeamId),
    phase: negotiation.phase,
    roundsCompleted: negotiation.roundsCompleted,
    expiresAtDay: negotiation.expiresAtDay,
    dialogue: negotiation.dialogue.map((entry) => ({ ...entry })),
    proposal: buildNegotiationPackage(negotiation.proposal.offering, negotiation.proposal.requesting),
    counterOffer,
    isComplete: isNegotiationComplete(negotiation),
    canAccept: !isNegotiationComplete(negotiation),
    canCounter: !isNegotiationComplete(negotiation),
    canReject: !isNegotiationComplete(negotiation),
  };
}

interface MultiTeamAssignment {
  playerId: string;
  fromTeamId: string;
  toTeamId: string;
}

function sortStringList(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function normalizeMultiTeamProposal(
  proposal: MultiTeamTradeProposalInput,
): MultiTeamTradeProposalInput {
  return {
    teams: proposal.teams.map((team) => ({
      ...team,
      sendingPlayerIds: sortStringList(team.sendingPlayerIds),
      receivingPlayerIds: sortStringList(team.receivingPlayerIds),
    })),
    conditions: [...proposal.conditions].sort((left, right) =>
      left.playerId.localeCompare(right.playerId)
      || left.deadline - right.deadline
      || left.type.localeCompare(right.type),
    ),
  };
}

function multiTeamTeamIds(proposal: MultiTeamTradeProposalInput): string[] {
  return proposal.teams.map((team) => team.teamId);
}

function buildMultiTeamAssignments(
  proposal: MultiTeamTradeProposalInput,
): MultiTeamAssignment[] {
  const senderByPlayerId = new Map<string, string>();
  const receiverByPlayerId = new Map<string, string>();

  for (const team of proposal.teams) {
    for (const playerId of team.sendingPlayerIds) {
      senderByPlayerId.set(playerId, team.teamId);
    }
    for (const playerId of team.receivingPlayerIds) {
      receiverByPlayerId.set(playerId, team.teamId);
    }
  }

  return [...senderByPlayerId.entries()]
    .map(([playerId, fromTeamId]) => ({
      playerId,
      fromTeamId,
      toTeamId: receiverByPlayerId.get(playerId) ?? '',
    }))
    .sort((left, right) =>
      left.fromTeamId.localeCompare(right.fromTeamId)
      || left.toTeamId.localeCompare(right.toTeamId)
      || left.playerId.localeCompare(right.playerId),
    );
}

function validateMultiTeamProposal(
  state: FullGameState,
  proposal: MultiTeamTradeProposalInput,
): string | null {
  if (proposal.teams.length < 3) {
    return 'A multi-team framework needs at least three teams.';
  }
  if (proposal.teams.length > 4) {
    return 'Multi-team trade builder supports up to four teams.';
  }

  const distinctTeamIds = new Set(multiTeamTeamIds(proposal));
  if (distinctTeamIds.size !== proposal.teams.length) {
    return 'Each multi-team lane needs a distinct club.';
  }

  const sentPlayerIds = proposal.teams.flatMap((team) => team.sendingPlayerIds);
  const receivedPlayerIds = proposal.teams.flatMap((team) => team.receivingPlayerIds);
  if (sentPlayerIds.length === 0) {
    return 'Pick at least one outgoing player to build a three-team framework.';
  }
  if (new Set(sentPlayerIds).size !== sentPlayerIds.length) {
    return 'A player cannot be sent by multiple teams in the same framework.';
  }
  if (new Set(receivedPlayerIds).size !== receivedPlayerIds.length) {
    return 'A player cannot be received by multiple teams in the same framework.';
  }

  const sentSet = new Set(sentPlayerIds);
  const receivedSet = new Set(receivedPlayerIds);
  if (sentSet.size !== receivedSet.size || [...sentSet].some((playerId) => !receivedSet.has(playerId))) {
    return 'Every outgoing player must have exactly one destination team.';
  }

  for (const team of proposal.teams) {
    for (const playerId of team.sendingPlayerIds) {
      const player = state.players.find((candidate) => candidate.id === playerId);
      if (!player || player.teamId !== team.teamId) {
        return 'Multi-team framework includes a player on the wrong roster.';
      }
    }

    if (team.sendingPlayerIds.some((playerId) => team.receivingPlayerIds.includes(playerId))) {
      return 'A club cannot send and receive the same player in one framework.';
    }
  }

  for (const assignment of buildMultiTeamAssignments(proposal)) {
    if (!assignment.toTeamId) {
      return 'Each outgoing player needs a destination club.';
    }
    if (assignment.fromTeamId === assignment.toTeamId) {
      return 'A club cannot receive its own outgoing player.';
    }
  }

  return null;
}

function toCoreMultiTeamProposal(proposal: MultiTeamTradeProposalInput) {
  return {
    teams: proposal.teams.map((team) => ({
      teamId: team.teamId,
      role: team.role,
      sending: [...team.sendingPlayerIds],
      receiving: [...team.receivingPlayerIds],
    })),
    conditions: proposal.conditions.map((condition) => ({ ...condition })),
  };
}

function buildMultiTeamValuations(
  state: FullGameState,
  proposal: MultiTeamTradeProposalInput,
): Map<string, number> {
  const valuations = new Map<string, number>();

  for (const playerId of sortStringList(proposal.teams.flatMap((team) => team.sendingPlayerIds))) {
    valuations.set(playerId, assetValue(state, { type: 'player', playerId }));
  }

  return valuations;
}

function buildMultiTeamFairnessView(
  proposal: MultiTeamTradeProposalInput,
  fairness: ReturnType<typeof evaluateMultiTeamFairnessCore>,
  netValueByTeam: Map<string, number>,
): MultiTeamFairnessView {
  const netValues = proposal.teams
    .map((team) => ({
      teamId: team.teamId,
      teamName: teamName(team.teamId),
      teamAbbreviation: teamAbbreviation(team.teamId),
      netValue: Number((netValueByTeam.get(team.teamId) ?? 0).toFixed(1)),
    }))
    .sort((left, right) =>
      MULTI_TEAM_ROLE_PRIORITY[
        proposal.teams.find((team) => team.teamId === left.teamId)?.role ?? 'facilitator'
      ] - MULTI_TEAM_ROLE_PRIORITY[
        proposal.teams.find((team) => team.teamId === right.teamId)?.role ?? 'facilitator'
      ]
      || left.teamAbbreviation.localeCompare(right.teamAbbreviation)
      || left.teamId.localeCompare(right.teamId),
    );

  return {
    isBalanced: fairness.isBalanced,
    maxImbalance: fairness.maxImbalance,
    mostDisadvantagedTeam: fairness.mostDisadvantagedTeam,
    fairnessScore: fairness.fairnessScore,
    netValueByTeam: netValues,
  };
}

function evaluateMultiTeamTradeInternals(
  state: FullGameState,
  proposal: MultiTeamTradeProposalInput,
): {
  normalized: MultiTeamTradeProposalInput;
  fairness: MultiTeamFairnessView;
  netValueByTeam: Map<string, number>;
} | { error: string } {
  const normalized = normalizeMultiTeamProposal(proposal);
  const validationError = validateMultiTeamProposal(state, normalized);
  if (validationError) {
    return { error: validationError };
  }

  const coreProposal = toCoreMultiTeamProposal(normalized);
  const valuations = buildMultiTeamValuations(state, normalized);
  const fairness = evaluateMultiTeamFairnessCore(coreProposal, valuations);
  const proposalPreview = proposeMultiTeamTrade(
    createStableWorkerRng(
      state,
      `trade:multi-team:preview:${normalized.teams.map((team) => team.teamId).join(':')}:${normalized.conditions.length}`,
    ),
    coreProposal,
    valuations,
    new Map(normalized.teams.map((team) => [
      team.teamId,
      state.gmPersonalities.get(team.teamId) ?? 'analytical',
    ])),
  );

  return {
    normalized,
    fairness: buildMultiTeamFairnessView(normalized, fairness, proposalPreview.netValueByTeam),
    netValueByTeam: proposalPreview.netValueByTeam,
  };
}

function appendMultiTeamNews(
  state: FullGameState,
  headline: string,
  body: string,
  relatedPlayerIds: string[],
  relatedTeamIds: string[],
) {
  pushNewsAndBriefing(
    state,
    headline,
    body,
    sortStringList(relatedPlayerIds),
    sortStringList(relatedTeamIds),
  );
}

function recordMultiTeamTradeHistory(
  state: FullGameState,
  tradeId: string,
  proposal: MultiTeamTradeProposalInput,
) {
  const pairMap = new Map<string, {
    leftTeamId: string;
    rightTeamId: string;
    leftToRight: string[];
    rightToLeft: string[];
  }>();

  for (const assignment of buildMultiTeamAssignments(proposal)) {
    const [leftTeamId, rightTeamId] = assignment.fromTeamId.localeCompare(assignment.toTeamId) <= 0
      ? [assignment.fromTeamId, assignment.toTeamId]
      : [assignment.toTeamId, assignment.fromTeamId];
    const key = `${leftTeamId}|${rightTeamId}`;
    const current = pairMap.get(key) ?? {
      leftTeamId,
      rightTeamId,
      leftToRight: [],
      rightToLeft: [],
    };

    if (assignment.fromTeamId === leftTeamId) {
      current.leftToRight.push(assignment.playerId);
    } else {
      current.rightToLeft.push(assignment.playerId);
    }

    pairMap.set(key, current);
  }

  for (const [pairKey, pair] of [...pairMap.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    addTradeHistoryEntry(
      state,
      buildTradeHistoryEntry(
        state,
        {
          id: `${tradeId}:${pairKey}`,
          fromTeamId: pair.leftTeamId,
          toTeamId: pair.rightTeamId,
          offeringAssets: playerAssets(sortStringList(pair.leftToRight)),
          requestingAssets: playerAssets(sortStringList(pair.rightToLeft)),
        },
        compareAssetPackages(
          state,
          playerAssets(pair.leftToRight),
          playerAssets(pair.rightToLeft),
          pair.leftTeamId,
          pair.rightTeamId,
        ).fairness,
      ),
    );
  }
}

function buildMultiTeamPairAssets(
  proposal: MultiTeamTradeProposalInput,
  teamAId: string,
  teamBId: string,
): { offeringAssets: TradeAsset[]; requestingAssets: TradeAsset[] } {
  const assignments = buildMultiTeamAssignments(proposal);
  const teamAToTeamB = assignments
    .filter((assignment) => assignment.fromTeamId === teamAId && assignment.toTeamId === teamBId)
    .map((assignment) => assignment.playerId);
  const teamBToTeamA = assignments
    .filter((assignment) => assignment.fromTeamId === teamBId && assignment.toTeamId === teamAId)
    .map((assignment) => assignment.playerId);

  return {
    offeringAssets: playerAssets(sortStringList(teamAToTeamB)),
    requestingAssets: playerAssets(sortStringList(teamBToTeamA)),
  };
}

function moveMultiTeamPlayers(
  state: FullGameState,
  proposal: MultiTeamTradeProposalInput,
) {
  for (const assignment of buildMultiTeamAssignments(proposal)) {
    const player = state.players.find((candidate) => candidate.id === assignment.playerId);
    if (!player) {
      continue;
    }
    player.teamId = assignment.toTeamId;
  }

  for (const teamId of sortStringList(multiTeamTeamIds(proposal))) {
    state.rosterStates.set(teamId, buildRosterState(teamId, state.players));
  }
}

function appendMultiTeamConditions(
  state: FullGameState,
  tradeId: string,
  conditions: TradeCondition[],
): PendingTrade[] {
  const pendingTrades = conditions.map((condition, index) => ({
    id: `${tradeId}:condition:${index + 1}`,
    requiredPlayerId: condition.playerId,
    triggerCondition: condition.description,
  }));

  state.tradeState = {
    ...state.tradeState,
    multiTeamPendingTrades: [
      ...state.tradeState.multiTeamPendingTrades,
      ...pendingTrades,
    ].sort((left, right) => left.id.localeCompare(right.id)),
  };

  return pendingTrades;
}

function finalizeNegotiatedTrade(
  state: FullGameState,
  negotiation: NegotiationState,
): string | null {
  const offeringAssets = playerAssets(negotiation.proposal.offering);
  const requestingAssets = playerAssets(negotiation.proposal.requesting);
  const fairnessScore = compareAssetPackages(
    state,
    offeringAssets,
    requestingAssets,
    negotiation.proposal.fromTeamId,
    negotiation.proposal.toTeamId,
  ).fairness;
  const preTradeUserPlayers = getTeamPlayers(state.userTeamId);
  const preTradePartnerPlayers = getTeamPlayers(negotiation.proposal.toTeamId);
  const execution = executeAcceptedTrade(state, {
    id: negotiation.id,
    fromTeamId: negotiation.proposal.fromTeamId,
    toTeamId: negotiation.proposal.toTeamId,
    offeringAssets,
    requestingAssets,
  }, fairnessScore);
  advanceTradeSagaClimax(
    state,
    [...negotiation.proposal.offering, ...negotiation.proposal.requesting],
  );
  applyTradeConsequences(
    state,
    negotiation.proposal.offering,
    negotiation.proposal.requesting,
    negotiation.proposal.toTeamId,
    preTradeUserPlayers,
    preTradePartnerPlayers,
  );
  recordLeagueTradeNews(state, {
    id: negotiation.id,
    fromTeamId: negotiation.proposal.fromTeamId,
    toTeamId: negotiation.proposal.toTeamId,
    playersOffered: [...negotiation.proposal.offering],
    playersRequested: [...negotiation.proposal.requesting],
    status: 'accepted',
    reason: 'negotiation accepted',
  }, execution.relationshipNarrative);
  return execution.relationshipNarrative;
}

function tradeSignature(
  fromTeamId: string,
  toTeamId: string,
  offeringAssets: TradeAsset[],
  requestingAssets: TradeAsset[],
): string {
  const serializeAsset = (asset: TradeAsset): string => {
    switch (asset.type) {
      case 'player':
        return `player:${asset.playerId}`;
      case 'draft_pick':
        return `draft:${asset.season}:${asset.round}:${asset.originalTeamId}`;
      case 'ifa_pool_space':
        return `ifa:${asset.amount.toFixed(2)}`;
    }
  };
  const offered = [...offeringAssets].map(serializeAsset).sort().join(',');
  const requested = [...requestingAssets].map(serializeAsset).sort().join(',');
  return `${fromTeamId}->${toTeamId}:${offered}|${requested}`;
}

function ensureDraftPickOwnership(state: FullGameState, season: number) {
  if (state.draftState.pickOwnership.length > 0) {
    return;
  }

  state.draftState = {
    ...state.draftState,
    pickOwnership: createDefaultDraftPickOwnership(
      Array.from(new Set(state.players.map((player) => player.teamId).filter(Boolean))),
      season,
    ),
  };
}

function assetPlayerIds(assets: TradeAsset[]): string[] {
  return assets
    .filter((asset): asset is Extract<TradeAsset, { type: 'player' }> => asset.type === 'player')
    .map((asset) => asset.playerId);
}

function playerAssets(playerIds: string[]): TradeAsset[] {
  return playerIds.map((playerId) => ({
    type: 'player',
    playerId,
  }));
}

function assetViewFor(state: FullGameState, asset: TradeAsset): TradeAssetView {
  switch (asset.type) {
    case 'player': {
      const player = state.players.find((candidate) => candidate.id === asset.playerId);
      return {
        key: `player:${asset.playerId}`,
        type: asset.type,
        label: player ? `${player.firstName} ${player.lastName}` : asset.playerId,
        detail: player?.position ?? 'UNK',
        asset,
        playerId: asset.playerId,
      };
    }
    case 'draft_pick':
      return {
        key: `draft:${asset.season}:${asset.round}:${asset.originalTeamId}`,
        type: asset.type,
        label: `Round ${asset.round} Pick`,
        detail: `${asset.season} ${teamAbbreviation(asset.originalTeamId)} original`,
        asset,
      };
    case 'ifa_pool_space':
      return {
        key: `ifa:${asset.amount.toFixed(2)}`,
        type: asset.type,
        label: `IFA Pool Space`,
        detail: `$${asset.amount.toFixed(2)}M`,
        asset,
      };
  }
}

function assetValue(
  state: FullGameState,
  asset: TradeAsset,
  relationshipContext: UserRelationshipTradeContext | null = null,
): number {
  switch (asset.type) {
    case 'player': {
      const player = state.players.find((candidate) => candidate.id === asset.playerId);
      if (!player) return 0;
      const offered = state.players.filter((candidate) => candidate.id === asset.playerId);
      return comparePackages(offered, []).offerValue;
    }
    case 'draft_pick': {
      const roundWeight = Math.max(1, 22 - asset.round);
      const seasonDiscount = asset.season === state.season ? 1 : 0.85;
      const baseValue = roundWeight * 3 * seasonDiscount;
      return relationshipContext
        ? adjustDraftPickTradeValue(baseValue, relationshipContext.relationship, relationshipContext.personality)
        : baseValue;
    }
    case 'ifa_pool_space':
      return asset.amount * 8;
  }
}

function playerRatingsForAssets(state: FullGameState, assets: TradeAsset[]): number[] {
  return assets
    .filter((asset): asset is Extract<TradeAsset, { type: 'player' }> => asset.type === 'player')
    .map((asset) => state.players.find((candidate) => candidate.id === asset.playerId)?.overallRating ?? 0)
    .filter((rating) => rating > 0);
}

function compareAssetPackages(
  state: FullGameState,
  offeringAssets: TradeAsset[],
  requestingAssets: TradeAsset[],
  fromTeamId: string = state.userTeamId,
  toTeamId: string = '',
) {
  const relationshipContext = getUserRelationshipTradeContext(state, fromTeamId, toTeamId);
  const offerValue = offeringAssets.reduce((sum, asset) => sum + assetValue(state, asset, relationshipContext), 0);
  const requestValue = requestingAssets.reduce((sum, asset) => sum + assetValue(state, asset, relationshipContext), 0);
  const maxValue = Math.max(offerValue, requestValue, 1);
  const rivalryPenalty = rivalryTradePenalty(
    state.rivalries,
    fromTeamId,
    toTeamId,
    playerRatingsForAssets(state, requestingAssets),
  );
  const fairness = getDifficultyAdjustedTradeFairness(
    state,
    Math.max(-100, Math.min(100, Math.round((((requestValue - offerValue) / maxValue) * 100) + rivalryPenalty))),
    fromTeamId,
    toTeamId,
  );
  return { fairness, offerValue, requestValue };
}

function applyTradeAssets(
  state: FullGameState,
  fromTeamId: string,
  toTeamId: string,
  offeringAssets: TradeAsset[],
  requestingAssets: TradeAsset[],
) {
  const proposal: TradeProposal = {
    id: 'asset-trade',
    fromTeamId,
    toTeamId,
    playersOffered: assetPlayerIds(offeringAssets),
    playersRequested: assetPlayerIds(requestingAssets),
    status: 'accepted',
    reason: 'asset trade',
  };

  if (proposal.playersOffered.length > 0 || proposal.playersRequested.length > 0) {
    executeTrade(proposal, state.players);
  }

  ensureDraftPickOwnership(state, state.season);
  let pickOwnership = state.draftState.pickOwnership;

  for (const asset of offeringAssets) {
    if (asset.type === 'draft_pick') {
      pickOwnership = tradeDraftPickOwnershipCore(pickOwnership, asset, toTeamId);
    } else if (asset.type === 'ifa_pool_space') {
      state.internationalScoutingState = tradeIFABonusPoolCore(
        state.internationalScoutingState,
        fromTeamId,
        toTeamId,
        asset.amount,
      );
    }
  }

  for (const asset of requestingAssets) {
    if (asset.type === 'draft_pick') {
      pickOwnership = tradeDraftPickOwnershipCore(pickOwnership, asset, fromTeamId);
    } else if (asset.type === 'ifa_pool_space') {
      state.internationalScoutingState = tradeIFABonusPoolCore(
        state.internationalScoutingState,
        toTeamId,
        fromTeamId,
        asset.amount,
      );
    }
  }

  state.draftState = {
    ...state.draftState,
    pickOwnership,
  };
}

function createBriefingItem(headline: string, body: string, relatedPlayerIds: string[], relatedTeamIds: string[]): BriefingItem {
  return {
    id: `brief-${headline.replace(/\s+/g, '-').toLowerCase()}`,
    priority: 2,
    category: 'news',
    headline,
    body,
    relatedPlayerIds,
    relatedTeamIds,
    timestamp: '',
    acknowledged: false,
  };
}

function pushBriefing(state: FullGameState, item: BriefingItem) {
  const stamped = { ...item, timestamp: timestamp() };
  state.briefingQueue = [stamped, ...state.briefingQueue];
  rebuildBriefing(state);
}

function pushNewsAndBriefing(
  state: FullGameState,
  headline: string,
  body: string,
  relatedPlayerIds: string[],
  relatedTeamIds: string[],
) {
  const newsItem = {
    id: generateNewsId(state.rng.fork()),
    headline,
    body,
    priority: 2 as const,
    category: 'trade' as const,
    timestamp: timestamp(),
    relatedPlayerIds,
    relatedTeamIds,
    read: false,
  };
  state.news = deduplicateNews([newsItem, ...state.news]);
  pushBriefing(
    state,
    createBriefingItem(headline, body, relatedPlayerIds, relatedTeamIds),
  );
}

function applyDeclineMorale(state: FullGameState, playerIds: string[]) {
  for (const playerId of playerIds) {
    const player = state.players.find((candidate) => candidate.id === playerId && candidate.teamId === state.userTeamId);
    if (!player) continue;
    const current = state.playerMorale.get(player.id)
      ?? createInitialPlayerMorale(player, timestamp());
    state.playerMorale.set(player.id, applyMoraleEvent(player, current, {
      type: 'trade',
      impact: 3,
      summary: 'Front office turned away trade talks and kept the room intact.',
      timestamp: timestamp(),
    }));
  }

  state.teamChemistry.set(
    state.userTeamId,
    calculateTeamChemistry(state.userTeamId, state.players, state.playerMorale),
  );
}

function playersStillMatchProposal(state: FullGameState, proposal: TradeProposal): boolean {
  return proposal.playersOffered.every((playerId) =>
    state.players.some((player) => player.id === playerId && player.teamId === proposal.fromTeamId),
  ) && proposal.playersRequested.every((playerId) =>
    state.players.some((player) => player.id === playerId && player.teamId === proposal.toTeamId),
  );
}

function fairValueForProposal(state: FullGameState, proposal: TradeProposal): number {
  return compareAssetPackages(
    state,
    playerAssets(proposal.playersOffered),
    playerAssets(proposal.playersRequested),
    proposal.fromTeamId,
    proposal.toTeamId,
  ).fairness;
}

function applyUserFrontOfficeTradeOverride(
  result: ReturnType<typeof evaluateTradeProposal>,
  fairnessScore: number,
) {
  if (result.decision !== 'accepted' && fairnessScore >= -6) {
    return {
      decision: 'accepted' as const,
      reason: 'The value is close enough for a front office we respect.',
      counter: undefined,
    };
  }

  return result;
}

function buildAssetSummary(state: FullGameState, assets: TradeAsset[]): string {
  return assets
    .map((asset) => assetViewFor(state, asset).label)
    .slice(0, 2)
    .join(', ');
}

function buildTradeHistoryEntry(
  state: FullGameState,
  proposal: Pick<TradeProposal, 'id' | 'fromTeamId' | 'toTeamId'> & {
    offeringAssets: TradeAsset[];
    requestingAssets: TradeAsset[];
  },
  fairnessScore: number,
): TradeHistoryEntry {
  const offeringNames = buildAssetSummary(state, proposal.offeringAssets);
  const requestingNames = buildAssetSummary(state, proposal.requestingAssets);

  return {
    id: proposal.id,
    fromTeamId: proposal.fromTeamId,
    toTeamId: proposal.toTeamId,
    offeringAssets: proposal.offeringAssets,
    requestingAssets: proposal.requestingAssets,
    fairnessScore,
    summary: `${teamName(proposal.fromTeamId)} sent ${offeringNames || 'assets'} to ${teamName(proposal.toTeamId)} for ${requestingNames || 'assets'}.`,
    timestamp: timestamp(),
  };
}

function addTradeHistoryEntry(state: FullGameState, entry: TradeHistoryEntry) {
  const next = [
    entry,
    ...state.tradeState.tradeHistory.filter((existing) => existing.id !== entry.id),
  ];
  state.tradeState = {
    ...state.tradeState,
    tradeHistory: next,
  };
}

function addPendingOffer(state: FullGameState, offer: PersistentTradeOffer) {
  const next = [
    offer,
    ...state.tradeState.pendingOffers.filter((existing) => existing.id !== offer.id),
  ];
  state.tradeState = {
    ...state.tradeState,
    pendingOffers: next,
  };
}

function removePendingOffer(state: FullGameState, offerId: string) {
  state.tradeState = {
    ...state.tradeState,
    pendingOffers: state.tradeState.pendingOffers.filter((offer) => offer.id !== offerId),
  };
}

function existingTradeSignatures(state: FullGameState): Set<string> {
  const signatures = new Set<string>();
  for (const offer of state.tradeState.pendingOffers) {
    signatures.add(tradeSignature(
      offer.fromTeamId,
      offer.toTeamId,
      offer.offeringAssets,
      offer.requestingAssets,
    ));
  }
  for (const history of state.tradeState.tradeHistory) {
    signatures.add(tradeSignature(
      history.fromTeamId,
      history.toTeamId,
      history.offeringAssets,
      history.requestingAssets,
    ));
  }
  return signatures;
}

function isContender(state: FullGameState, teamId: string): boolean {
  const record = state.seasonState.standings.getRecord(teamId);
  if (!record) return false;
  return record.wins >= record.losses;
}

function buildPersistentOffer(
  state: FullGameState,
  proposal: Pick<TradeProposal, 'id' | 'fromTeamId' | 'toTeamId' | 'reason'> & {
    offeringAssets: TradeAsset[];
    requestingAssets: TradeAsset[];
  },
  fairnessScore: number,
): PersistentTradeOffer {
  return {
    id: proposal.id,
    fromTeamId: proposal.fromTeamId,
    toTeamId: proposal.toTeamId,
    offeringAssets: proposal.offeringAssets,
    requestingAssets: proposal.requestingAssets,
    fairnessScore,
    message: `The ${teamName(proposal.fromTeamId)} want to discuss a trade. ${proposal.reason}`,
    createdAt: timestamp(),
  };
}

function buildTradeViews<T extends PersistentTradeOffer | TradeHistoryEntry>(
  state: FullGameState,
  trades: T[],
) {
  return trades.map((trade) => ({
    ...trade,
    fromTeamName: teamName(trade.fromTeamId),
    fromTeamAbbreviation: teamAbbreviation(trade.fromTeamId),
    toTeamName: teamName(trade.toTeamId),
    toTeamAbbreviation: teamAbbreviation(trade.toTeamId),
    offeringAssets: trade.offeringAssets.map((asset) => assetViewFor(state, asset)),
    requestingAssets: trade.requestingAssets.map((asset) => assetViewFor(state, asset)),
  }));
}

function parseTimestampDay(stamp: string | undefined): number | null {
  if (!stamp) {
    return null;
  }

  const match = /^S(\d+)D(\d+)$/.exec(stamp);
  if (!match) {
    return null;
  }

  return Number(match[2]);
}

function tradeUrgencyTag(state: FullGameState, offer: PersistentTradeOffer): HotTradeOfferView['urgencyTag'] {
  const daysUntilDeadline = getDaysUntilTradeDeadline(state.day);
  const createdAtDay = parseTimestampDay(offer.createdAt);

  if (daysUntilDeadline <= 2) {
    return 'FINAL OFFER';
  }

  if (daysUntilDeadline <= 7 || (createdAtDay != null && state.day - createdAtDay >= 14)) {
    return 'EXPIRING SOON';
  }

  return 'ACTIVE';
}

function offerBidderCount(state: FullGameState, offer: PersistentTradeOffer): number {
  const requestedPlayers = offer.requestingAssets
    .filter((asset): asset is Extract<TradeAsset, { type: 'player' }> => asset.type === 'player')
    .map((asset) => asset.playerId);

  if (requestedPlayers.length === 0) {
    return 1;
  }

  let highestCount = 1;
  for (const playerId of requestedPlayers) {
    const directCompetition = state.tradeState.pendingOffers.filter((candidate) =>
      candidate.id !== offer.id
      && candidate.requestingAssets.some((asset) => asset.type === 'player' && asset.playerId === playerId),
    ).length;
    const player = state.players.find((candidate) => candidate.id === playerId);
    const contenderInterest = player
      && player.teamId === state.userTeamId
      && isTradeDeadlineModeDay(state.day)
      && player.contract.years <= 1
      ? Array.from(new Set(state.players.map((candidate) => candidate.teamId)))
        .filter((teamId): teamId is string => Boolean(teamId) && teamId !== state.userTeamId && isContender(state, teamId))
        .length
      : 0;

    highestCount = Math.max(
      highestCount,
      1 + directCompetition + Math.min(2, contenderInterest > 3 ? 2 : contenderInterest > 0 ? 1 : 0),
    );
  }

  return Math.min(highestCount, 5);
}

function offerBiddingSummary(state: FullGameState, offer: PersistentTradeOffer, bidderCount: number): string | null {
  if (bidderCount <= 1) {
    return null;
  }

  const primaryTarget = buildAssetSummary(state, offer.requestingAssets);
  return `${bidderCount} clubs are in on ${primaryTarget || 'this player'}.`;
}

function buildTickerItems(trades: TradeHistoryEntry[]): TradeTickerItem[] {
  return [...trades]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .slice(0, 8)
    .map((trade) => ({
      id: trade.id,
      summary: trade.summary,
      timestamp: trade.timestamp,
    }));
}

function isDeadlineTradeEntry(entry: TradeHistoryEntry, season: number): boolean {
  const match = /^S(\d+)D(\d+)$/.exec(entry.timestamp);
  if (!match) {
    return false;
  }

  const [, entrySeason, entryDay] = match;
  return Number(entrySeason) === season && Number(entryDay) >= 92 && Number(entryDay) <= TRADE_DEADLINE_DAY;
}

function buildDeadlineRecap(
  state: FullGameState,
  expiredOffers: PersistentTradeOffer[],
): TradeDeadlineRecapView | null {
  const deadlineTrades = state.tradeState.tradeHistory.filter((entry) => isDeadlineTradeEntry(entry, state.season));
  const yourTrades: TradeDeadlineRecapItem[] = [
    ...deadlineTrades
      .filter((entry) => entry.fromTeamId === state.userTeamId || entry.toTeamId === state.userTeamId)
      .map((entry) => ({
        id: entry.id,
        summary: entry.summary,
        outcome: 'completed' as const,
        timestamp: entry.timestamp,
      })),
    ...expiredOffers
      .filter((offer) => offer.toTeamId === state.userTeamId || offer.fromTeamId === state.userTeamId)
      .map((offer) => ({
        id: `missed-${offer.id}`,
        summary: `${teamName(offer.fromTeamId)} offer for ${buildAssetSummary(state, offer.requestingAssets) || 'assets'} expired at the deadline.`,
        outcome: 'missed' as const,
        timestamp: timestamp(),
      })),
  ];

  if (deadlineTrades.length === 0 && yourTrades.length === 0) {
    return null;
  }

  const scoreByTeam = new Map<string, number>();
  for (const trade of deadlineTrades) {
    scoreByTeam.set(trade.fromTeamId, (scoreByTeam.get(trade.fromTeamId) ?? 0) + trade.fairnessScore);
    scoreByTeam.set(trade.toTeamId, (scoreByTeam.get(trade.toTeamId) ?? 0) - trade.fairnessScore);
  }

  const rankedTeams = [...scoreByTeam.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const winners = rankedTeams
    .filter(([, score]) => score > 0)
    .slice(0, 2)
    .map(([teamId]) => teamName(teamId));
  const losers = [...rankedTeams]
    .reverse()
    .filter(([, score]) => score < 0)
    .slice(0, 2)
    .map(([teamId]) => teamName(teamId));
  const analysisHeadline = 'Deadline winners and losers';
  const analysisBody = [
    winners.length > 0 ? `Winners: ${winners.join(', ')} pushed the market hardest.` : 'No clear league-wide winner emerged.',
    losers.length > 0 ? `Losers: ${losers.join(', ')} paid a steeper price or stood still.` : 'No obvious loser separated from the pack.',
    yourTrades.length > 0
      ? `${yourTrades.filter((trade) => trade.outcome === 'completed').length} completed move${yourTrades.filter((trade) => trade.outcome === 'completed').length === 1 ? '' : 's'} and ${yourTrades.filter((trade) => trade.outcome === 'missed').length} missed thread${yourTrades.filter((trade) => trade.outcome === 'missed').length === 1 ? '' : 's'} shaped your day.`
      : 'Your club stayed quiet as the deadline passed.',
  ].join(' ');

  return {
    season: state.season,
    deadlineDay: TRADE_DEADLINE_DAY,
    analysisHeadline,
    analysisBody,
    yourTrades,
    majorMoves: buildTickerItems(deadlineTrades).slice(0, 5),
    winners,
    losers,
  };
}

function publishDeadlineAnalysis(state: FullGameState, recap: TradeDeadlineRecapView) {
  const analysisItem = {
    id: `deadline-analysis-${state.season}`,
    headline: recap.analysisHeadline,
    body: recap.analysisBody,
    priority: 2 as const,
    category: 'trade' as const,
    tag: 'ANALYSIS' as const,
    timestamp: timestamp(),
    relatedPlayerIds: [],
    relatedTeamIds: [state.userTeamId],
    read: false,
  };

  state.news = deduplicateNews([analysisItem, ...state.news]);
  pushBriefing(
    state,
    createBriefingItem(recap.analysisHeadline, recap.analysisBody, [], [state.userTeamId]),
  );
}

function positionNeedLabel(position: string): string {
  switch (position) {
    case 'SP':
      return 'rotation help';
    case 'RP':
    case 'CL':
      return 'bullpen depth';
    case 'SS':
      return 'middle-infield help';
    case 'CF':
      return 'center-field help';
    case 'depth':
      return 'depth';
    default:
      return `${position.toLowerCase()} depth`;
  }
}

function recordTradeRumor(state: FullGameState, proposal: TradeProposal) {
  const targetPlayer = state.players.find((player) => player.id === proposal.playersRequested[0]);
  const rumorItems = generateNews(
    state.rng.fork(),
    {
      type: 'rumor',
      season: state.season,
      day: state.day,
      data: {
        teamId: proposal.fromTeamId,
        teamName: teamName(proposal.fromTeamId),
        targetPlayerId: proposal.playersRequested[0],
        targetName: targetPlayer ? `${targetPlayer.firstName} ${targetPlayer.lastName}` : 'a league target',
        need: positionNeedLabel(targetPlayer?.position ?? 'depth'),
        daysToDeadline: getDaysUntilTradeDeadline(state.day),
      },
    },
    state.players,
    state.season,
    state.day,
  );

  if (rumorItems.length === 0) {
    return;
  }

  state.news = deduplicateNews([...rumorItems, ...state.news]);
}

export function isTradeMarketOpen(state: FullGameState): boolean {
  return state.phase === 'regular' && state.day <= TRADE_DEADLINE_DAY;
}

export function buildTradeOffersView(state: FullGameState): TradeOfferView[] {
  return buildTradeViews(state, state.tradeState.pendingOffers) as TradeOfferView[];
}

export function buildTradeHistoryView(state: FullGameState): TradeHistoryView[] {
  return buildTradeViews(state, state.tradeState.tradeHistory) as TradeHistoryView[];
}

export function getNegotiationView(state: FullGameState, negotiationId: string): TradeNegotiationView | null {
  const persistent = state.tradeState.negotiations.find((entry) => entry.id === negotiationId);
  if (!persistent) {
    return null;
  }
  return buildNegotiationView(state, hydrateNegotiationState(state, persistent));
}

export function getOpenNegotiationViews(state: FullGameState): TradeNegotiationView[] {
  return state.tradeState.negotiations
    .map((entry) => buildNegotiationView(state, hydrateNegotiationState(state, entry)))
    .sort((left, right) =>
      left.expiresAtDay - right.expiresAtDay
      || left.teamName.localeCompare(right.teamName)
      || left.id.localeCompare(right.id),
    );
}

export function evaluateMultiTeamTradeFairness(
  state: FullGameState,
  proposal: MultiTeamTradeProposalInput,
): MultiTeamFairnessResult {
  const evaluation = evaluateMultiTeamTradeInternals(state, proposal);
  if ('error' in evaluation) {
    return {
      success: false,
      message: evaluation.error,
      fairness: null,
    };
  }

  return {
    success: true,
    message: evaluation.fairness.isBalanced
      ? 'The three-team framework stays inside the current balance thresholds.'
      : `${teamName(evaluation.fairness.mostDisadvantagedTeam)} is carrying too much of the value gap.`,
    fairness: evaluation.fairness,
  };
}

export function generateMultiTeamConditionalClause(
  state: FullGameState,
  playerId: string,
): ConditionalClauseResult {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    return {
      success: false,
      message: 'Conditional clause target is no longer on an active roster.',
      condition: null,
    };
  }

  return {
    success: true,
    message: 'Conditional clause added to the framework.',
    condition: generateConditionalClauseCore(
      createStableWorkerRng(
        state,
        `trade:multi-team:condition:${playerId}:${state.tradeState.multiTeamPendingTrades.length}:${state.tradeState.tradeHistory.length}`,
      ),
      {
        playerId,
        playerAge: player.age,
        playerRating: player.overallRating,
        contractYearsRemaining: Math.max(1, player.contract.years),
      },
    ),
  };
}

export function proposeMultiTeamFramework(
  state: FullGameState,
  proposal: MultiTeamTradeProposalInput,
): MultiTeamTradeProposalResult {
  const evaluation = evaluateMultiTeamTradeInternals(state, proposal);
  if ('error' in evaluation) {
    return {
      success: false,
      accepted: false,
      message: evaluation.error,
      narrative: evaluation.error,
      fairness: null,
    };
  }

  const personalities = new Map(evaluation.normalized.teams.map((team) => [
    team.teamId,
    state.gmPersonalities.get(team.teamId) ?? 'analytical',
  ]));
  const coreResult = proposeMultiTeamTrade(
    createStableWorkerRng(
      state,
      `trade:multi-team:proposal:${evaluation.normalized.teams.map((team) => team.teamId).join(':')}:${evaluation.normalized.conditions.length}`,
    ),
    toCoreMultiTeamProposal(evaluation.normalized),
    buildMultiTeamValuations(state, evaluation.normalized),
    personalities,
  );

  return {
    success: true,
    accepted: coreResult.accepted,
    message: coreResult.accepted
      ? 'All clubs signed off on the current framework.'
      : coreResult.blockReason ?? 'The room could not get every club over the line.',
    narrative: coreResult.narrative,
    fairness: buildMultiTeamFairnessView(
      evaluation.normalized,
      evaluateMultiTeamFairnessCore(
        toCoreMultiTeamProposal(evaluation.normalized),
        buildMultiTeamValuations(state, evaluation.normalized),
      ),
      coreResult.netValueByTeam,
    ),
    blockingTeamId: coreResult.blockingTeamId,
    blockReason: coreResult.blockReason,
  };
}

export function executeMultiTeamTradeFramework(
  state: FullGameState,
  proposal: MultiTeamTradeProposalInput,
): MultiTeamTradeExecutionResult {
  const proposed = proposeMultiTeamFramework(state, proposal);
  if (!proposed.success || !proposed.accepted || proposed.fairness == null) {
    return {
      success: false,
      accepted: false,
      message: proposed.message,
      narrative: proposed.narrative,
      fairness: proposed.fairness,
      cascadeEvents: [],
      pendingTrades: [],
    };
  }

  const normalized = normalizeMultiTeamProposal(proposal);
  const tradeId = `multi-team-${state.season}-${state.day}-${normalized.teams.map((team) => team.teamId).join('-')}`;
  const relatedPlayerIds = sortStringList(normalized.teams.flatMap((team) => team.sendingPlayerIds));
  const relatedTeamIds = sortStringList(multiTeamTeamIds(normalized));
  const preTradeUserPlayers = getTeamPlayers(state.userTeamId);
  const preTradeCounterpartRosters = new Map(
    relatedTeamIds
      .filter((teamId) => teamId !== state.userTeamId)
      .map((teamId) => [teamId, getTeamPlayers(teamId)]),
  );
  const cascadeEvents = buildMultiTeamAssignments(normalized)
    .flatMap((assignment) => detectTradeCascades(
      {
        playerIds: [assignment.playerId],
        fromTeamId: assignment.fromTeamId,
        toTeamId: assignment.toTeamId,
        season: state.season,
      },
      state.tradeState.multiTeamPendingTrades,
    ))
    .filter((event, index, events) =>
      events.findIndex((candidate) => candidate.triggeredTradeId === event.triggeredTradeId) === index,
    )
    .sort((left, right) => left.triggeredTradeId.localeCompare(right.triggeredTradeId));
  const triggeredCascadeIds = new Set(cascadeEvents.map((event) => event.triggeredTradeId));

  state.tradeState = {
    ...state.tradeState,
    multiTeamPendingTrades: state.tradeState.multiTeamPendingTrades.filter((entry) => !triggeredCascadeIds.has(entry.id)),
  };

  moveMultiTeamPlayers(state, normalized);
  recordMultiTeamTradeHistory(state, tradeId, normalized);

  const relationshipNarratives = relatedTeamIds
    .filter((teamId) => teamId !== state.userTeamId)
    .flatMap((teamId) => {
      const pairAssets = buildMultiTeamPairAssets(normalized, state.userTeamId, teamId);
      if (pairAssets.offeringAssets.length === 0 && pairAssets.requestingAssets.length === 0) {
        return [];
      }

      const fairnessScore = compareAssetPackages(
        state,
        pairAssets.offeringAssets,
        pairAssets.requestingAssets,
        state.userTeamId,
        teamId,
      ).fairness;
      applyAcceptedTradeRelationshipUpdate(state, {
        fromTeamId: state.userTeamId,
        toTeamId: teamId,
      }, fairnessScore);

      const narrative = buildTradeRelationshipNarrative(state, {
        fromTeamId: state.userTeamId,
        toTeamId: teamId,
        offeringAssets: pairAssets.offeringAssets,
        requestingAssets: pairAssets.requestingAssets,
      });
      return narrative ? [narrative] : [];
    });

  for (const teamId of relatedTeamIds) {
    state.rosterStates.set(teamId, buildRosterState(teamId, state.players));
  }

  for (const teamId of relatedTeamIds) {
    if (teamId === state.userTeamId) {
      continue;
    }
    const pairAssets = buildMultiTeamPairAssets(normalized, state.userTeamId, teamId);
    if (pairAssets.offeringAssets.length === 0 && pairAssets.requestingAssets.length === 0) {
      continue;
    }
    applyTradeConsequences(
      state,
      assetPlayerIds(pairAssets.offeringAssets),
      assetPlayerIds(pairAssets.requestingAssets),
      teamId,
      preTradeUserPlayers,
      preTradeCounterpartRosters.get(teamId) ?? [],
    );
  }

  advanceTradeSagaClimax(state, relatedPlayerIds);

  const pendingTrades = appendMultiTeamConditions(state, tradeId, normalized.conditions);
  const cascadeSummary = cascadeEvents.length > 0
    ? ` Cascade watch: ${cascadeEvents.map((event) => event.reason).join(' ')}`
    : '';
  const conditionSummary = pendingTrades.length > 0
    ? ` ${pendingTrades.length} conditional clause${pendingTrades.length === 1 ? '' : 's'} will stay on the watch list.`
    : '';
  const relationshipSummary = relationshipNarratives.length > 0
    ? ` ${relationshipNarratives.join(' ')}`
    : '';

  appendMultiTeamNews(
    state,
    `${normalized.teams.length}-team trade completed`,
    `${proposed.narrative}${relationshipSummary}${cascadeSummary}${conditionSummary}`.trim(),
    relatedPlayerIds,
    relatedTeamIds,
  );

  return {
    success: true,
    accepted: true,
    message: 'Three-team framework executed.',
    narrative: proposed.narrative,
    fairness: proposed.fairness,
    cascadeEvents,
    pendingTrades,
  };
}

function buildHotTradeOfferView(state: FullGameState, offer: PersistentTradeOffer): HotTradeOfferView {
  const bidderCount = offerBidderCount(state, offer);
  const offerValue = offer.offeringAssets.reduce((sum, asset) => sum + assetValue(state, asset), 0);
  const requestValue = offer.requestingAssets.reduce((sum, asset) => sum + assetValue(state, asset), 0);
  return {
    ...(buildTradeViews(state, [offer])[0] as TradeOfferView),
    urgencyTag: tradeUrgencyTag(state, offer),
    bidderCount,
    biddingSummary: offerBiddingSummary(state, offer, bidderCount),
    dialogue: buildTradeDialogueView(state, offer.fromTeamId, offerValue, requestValue, 'offer'),
  };
}

function buildTradeModeContext(state: FullGameState, teamId: string) {
  const team = getTeamById(teamId);
  const record = state.seasonState.standings.getRecord(teamId);
  const divisionStandings = team ? state.seasonState.standings.getDivisionStandings(team.division) : [];
  const standingEntry = divisionStandings.find((entry) => entry.teamId === teamId);
  const totalGames = (record?.wins ?? 0) + (record?.losses ?? 0);
  const winPct = totalGames > 0 ? (record?.wins ?? 0) / totalGames : 0.5;
  const daysUntilDeadline = state.phase === 'regular' && state.day <= TRADE_DEADLINE_DAY
    ? getDaysUntilTradeDeadline(state.day)
    : null;
  const gmPersonality = state.gmPersonalities.get(teamId) ?? 'analytical';
  const mode = deriveTradeDeadlineMode({
    winPct,
    gamesBack: standingEntry?.gamesBack ?? 0,
    daysUntilDeadline,
    gmPersonality,
  });

  return {
    teamName: teamName(teamId),
    gmPersonality,
    daysUntilDeadline,
    mode,
  };
}

function countdownLabel(daysUntilDeadline: number | null): string {
  if (daysUntilDeadline == null) {
    return 'Market Closed';
  }
  if (daysUntilDeadline <= 0) {
    return 'Deadline Day';
  }
  return `${daysUntilDeadline} day${daysUntilDeadline === 1 ? '' : 's'} to deadline`;
}

function modeSummary(mode: TradeDeadlineMode): string {
  switch (mode) {
    case 'buyer':
      return 'The room expects you to push for MLB impact before the deadline shuts.';
    case 'seller':
      return 'Rival clubs think present value can be pried loose for future pieces.';
    default:
      return 'The market reads you as flexible, but not urgent enough to blink first.';
  }
}

export function buildTradeDialogueView(
  state: FullGameState,
  teamId: string,
  offerValue: number,
  requestValue: number,
  negotiationType: TradeNegotiationType = 'proposal',
): TradeDialogue {
  const context = buildTradeModeContext(state, teamId);

  return generateTradeDialogue(
    createStableWorkerRng(state, `trade-dialogue:${teamId}:${negotiationType}:${Math.round(offerValue)}:${Math.round(requestValue)}`),
    {
      teamName: context.teamName,
      gmPersonality: context.gmPersonality,
      mode: context.mode,
      daysUntilDeadline: context.daysUntilDeadline,
      offerValue,
      requestValue,
      negotiationType,
    },
  );
}

function deriveTradeDeadlineRecap(state: FullGameState): TradeDeadlineRecapView | null {
  if (tradeDeadlineRecapCache?.season === state.season) {
    return tradeDeadlineRecapCache;
  }

  if (state.day <= TRADE_DEADLINE_DAY) {
    return null;
  }

  return buildDeadlineRecap(state, []);
}

export function buildTradeDeadlineStateView(state: FullGameState): TradeDeadlineStateView {
  const userModeContext = buildTradeModeContext(state, state.userTeamId);
  const hotOffers = state.tradeState.pendingOffers.map((offer) => buildHotTradeOfferView(state, offer));
  const ticker = buildTickerItems(state.tradeState.tradeHistory);

  return {
    deadlineDay: TRADE_DEADLINE_DAY,
    daysUntilDeadline:
      state.phase === 'regular' && state.day <= TRADE_DEADLINE_DAY
        ? getDaysUntilTradeDeadline(state.day)
        : null,
    deadlineMode: state.phase === 'regular' && isTradeDeadlineModeDay(state.day),
    teamMode: userModeContext.mode,
    modeSummary: modeSummary(userModeContext.mode),
    countdownLabel: countdownLabel(userModeContext.daysUntilDeadline),
    hotOffers,
    ticker,
    chatter: generateTradeChatter(
      createStableWorkerRng(state, `trade-chatter:${state.day}:${hotOffers.length}:${ticker.length}`),
      {
        userTeamName: teamName(state.userTeamId),
        userMode: userModeContext.mode,
        daysUntilDeadline: userModeContext.daysUntilDeadline,
        activeTeams: hotOffers.map((offer) => ({
          teamId: offer.fromTeamId,
          teamName: offer.fromTeamName,
          mode: buildTradeModeContext(state, offer.fromTeamId).mode,
        })),
        recentTradeSummaries: ticker.map((item) => item.summary),
      },
    ),
    recap: deriveTradeDeadlineRecap(state),
  };
}

export function buildTradeAssetInventoryView(state: FullGameState, teamId: string): TradeAssetInventoryView {
  ensureDraftPickOwnership(state, state.season);
  const draftPicks = state.draftState.pickOwnership
    .filter((pick) =>
      pick.currentTeamId === teamId
      && !pick.forfeited
      && (pick.season === state.season || pick.season === state.season + 1),
    )
    .sort((left, right) => left.season - right.season || left.round - right.round || left.originalTeamId.localeCompare(right.originalTeamId))
    .map((pick) => {
      const asset = {
        type: 'draft_pick' as const,
        season: pick.season,
        round: pick.round,
        originalTeamId: pick.originalTeamId,
      };
      return {
        key: `draft:${pick.season}:${pick.round}:${pick.originalTeamId}`,
        label: `R${pick.round} ${pick.season}`,
        detail: `${teamAbbreviation(pick.originalTeamId)} original`,
        asset,
      };
    });

  const budget = state.internationalScoutingState.budgets.get(teamId);
  return {
    draftPicks,
    ifaRemaining: budget ? getRemainingIFABudget(budget) : 0,
  };
}

export function clearPendingTradeOffers(state: FullGameState) {
  if (state.tradeState.pendingOffers.length === 0) return;
  state.tradeState = {
    ...state.tradeState,
    pendingOffers: [],
  };
}

export function resetTradeDeadlineState() {
  tradeDeadlineRecapCache = null;
}

function recordLeagueTradeNews(
  state: FullGameState,
  proposal: TradeProposal,
  relationshipNarrative: string | null = null,
) {
  const players = state.players.filter((player) =>
    proposal.playersOffered.includes(player.id) || proposal.playersRequested.includes(player.id),
  );
  const items = generateNews(
    state.rng.fork(),
    {
      type: 'trade',
      season: state.season,
      day: state.day,
      data: {
        player1Id: proposal.playersOffered[0],
        player2Id: proposal.playersRequested[0],
        team1Id: proposal.fromTeamId,
        team2Id: proposal.toTeamId,
        team1Name: teamName(proposal.fromTeamId),
        team2Name: teamName(proposal.toTeamId),
      },
    },
    players,
    state.season,
    state.day,
  );

  if (items.length === 0) return;

  const itemsWithNarrative = relationshipNarrative
    ? items.map((item) => ({
      ...item,
      body: `${item.body} ${relationshipNarrative}`,
    }))
    : items;

  const taggedItems = isTradeDeadlineModeDay(state.day)
    ? itemsWithNarrative.map((item) => ({
      ...item,
      tag: 'BREAKING' as const,
    }))
    : itemsWithNarrative;

  state.news = deduplicateNews([...taggedItems, ...state.news]);
  const userDivision = getTeamById(state.userTeamId)?.division;
  const involvesRelevantTeam = [proposal.fromTeamId, proposal.toTeamId].some((teamId) =>
    teamId === state.userTeamId || getTeamById(teamId)?.division === userDivision,
  );
  if (involvesRelevantTeam) {
    for (const item of taggedItems) {
      pushBriefing(state, createBriefingItem(item.headline, item.body, item.relatedPlayerIds, item.relatedTeamIds));
    }
  }
}

function executeAcceptedTrade(
  state: FullGameState,
  proposal: Pick<TradeProposal, 'id' | 'fromTeamId' | 'toTeamId'> & {
    offeringAssets: TradeAsset[];
    requestingAssets: TradeAsset[];
  },
  fairnessScore: number,
) {
  const tradePackageValue = compareAssetPackages(
    state,
    proposal.offeringAssets,
    proposal.requestingAssets,
    proposal.fromTeamId,
    proposal.toTeamId,
  );
  const tradeImpactScore = Math.max(tradePackageValue.offerValue, tradePackageValue.requestValue);
  applyTradeAssets(state, proposal.fromTeamId, proposal.toTeamId, proposal.offeringAssets, proposal.requestingAssets);
  state.rosterStates.set(proposal.fromTeamId, buildRosterState(proposal.fromTeamId, state.players));
  state.rosterStates.set(proposal.toTeamId, buildRosterState(proposal.toTeamId, state.players));
  addTradeHistoryEntry(state, buildTradeHistoryEntry(state, proposal, fairnessScore));
  state.rivalries = recordBlockbusterTradeRivalry(state.rivalries, {
    season: state.season,
    fromTeamId: proposal.fromTeamId,
    toTeamId: proposal.toTeamId,
    impactScore: tradeImpactScore,
    summary: 'Blockbuster trade changed the tone of the matchup',
  });
  applyAcceptedTradeRelationshipUpdate(state, proposal, fairnessScore);
  return {
    relationshipNarrative: buildTradeRelationshipNarrative(state, proposal),
  };
}

function buildMonthlyTradeCandidates(state: FullGameState) {
  const userCandidates: TradeProposal[] = [];
  const aiCandidates: TradeProposal[] = [];
  const signatures = existingTradeSignatures(state);
  const contenderTeamIds = Array.from(
    new Set(
      state.players
        .map((player) => player.teamId)
        .filter((teamId): teamId is string => Boolean(teamId) && isContender(state, teamId)),
    ),
  );

  for (const team of Array.from(new Set(state.players.map((player) => player.teamId))).filter((teamId) => teamId && teamId !== state.userTeamId)) {
    const gm = state.gmPersonalities.get(team);
    if (!gm) continue;

    const proposals = generateAITradeOffers(
      state.rng.fork(),
      team,
      getTeamPlayers(team),
      state.players,
      gm,
      isContender(state, team),
      {
        currentDay: state.day,
        contenderTeamIds,
      },
    );

    for (const proposal of proposals) {
      if (!playersStillMatchProposal(state, proposal)) continue;

      const signature = tradeSignature(
        proposal.fromTeamId,
        proposal.toTeamId,
        playerAssets(proposal.playersOffered),
        playerAssets(proposal.playersRequested),
      );
      if (signatures.has(signature)) continue;
      signatures.add(signature);

      if (proposal.toTeamId === state.userTeamId) {
        userCandidates.push(proposal);
      } else if (proposal.fromTeamId !== state.userTeamId) {
        aiCandidates.push(proposal);
      }
    }
  }

  return {
    userCandidates: state.rng
      .shuffle(userCandidates)
      .sort((left, right) => fairValueForProposal(state, right) - fairValueForProposal(state, left)),
    aiCandidates: state.rng.shuffle(aiCandidates),
  };
}

function rankedDeadlineTeams(state: FullGameState, excludeTeamIds: string[] = []): string[] {
  const excluded = new Set(excludeTeamIds);
  return Array.from(new Set(state.players.map((player) => player.teamId).filter(Boolean)))
    .filter((teamId): teamId is string => Boolean(teamId) && !excluded.has(teamId))
    .sort((left, right) => {
      const leftAggressive = state.gmPersonalities.get(left) === 'aggressive' ? 1 : 0;
      const rightAggressive = state.gmPersonalities.get(right) === 'aggressive' ? 1 : 0;
      if (rightAggressive !== leftAggressive) {
        return rightAggressive - leftAggressive;
      }
      const leftContender = isContender(state, left) ? 1 : 0;
      const rightContender = isContender(state, right) ? 1 : 0;
      if (rightContender !== leftContender) {
        return rightContender - leftContender;
      }
      return left.localeCompare(right);
    });
}

function pickFallbackTradeChip(
  state: FullGameState,
  teamId: string,
  direction: 'offer' | 'target',
) {
  const players = state.players
    .filter((player) =>
      player.teamId === teamId
      && player.rosterStatus === 'MLB'
      && player.pitcherAttributes == null,
    )
    .sort((left, right) => {
      if (direction === 'target') {
        if (left.contract.years !== right.contract.years) {
          return left.contract.years - right.contract.years;
        }
      }
      if (right.overallRating !== left.overallRating) {
        return right.overallRating - left.overallRating;
      }
      return left.id.localeCompare(right.id);
    });

  return players[0] ?? null;
}

function buildFallbackTradePackage(
  state: FullGameState,
  fromTeamId: string,
  toTeamId: string,
) {
  const offered = pickFallbackTradeChip(state, fromTeamId, 'offer');
  const requested = pickFallbackTradeChip(state, toTeamId, 'target');
  if (!offered || !requested || offered.id === requested.id) {
    return null;
  }

  const offeringAssets = playerAssets([offered.id]);
  const requestingAssets = playerAssets([requested.id]);
  return {
    offeringAssets,
    requestingAssets,
    fairnessScore: compareAssetPackages(state, offeringAssets, requestingAssets, fromTeamId, toTeamId).fairness,
  };
}

function createFallbackUserDeadlineOffer(state: FullGameState): boolean {
  const signatures = existingTradeSignatures(state);

  for (const fromTeamId of rankedDeadlineTeams(state, [state.userTeamId])) {
    const fallback = buildFallbackTradePackage(state, fromTeamId, state.userTeamId);
    if (!fallback) {
      continue;
    }

    const signature = tradeSignature(
      fromTeamId,
      state.userTeamId,
      fallback.offeringAssets,
      fallback.requestingAssets,
    );
    if (signatures.has(signature)) {
      continue;
    }

    addPendingOffer(state, {
      id: `deadline-fallback-offer-${state.season}-${state.day}-${fromTeamId}`,
      fromTeamId,
      toTeamId: state.userTeamId,
      offeringAssets: fallback.offeringAssets,
      requestingAssets: fallback.requestingAssets,
      fairnessScore: fallback.fairnessScore,
      message: `The ${teamName(fromTeamId)} are making one more push before the deadline.`,
      createdAt: timestamp(),
    });
    return true;
  }

  return false;
}

function createFallbackLeagueDeadlineTrade(state: FullGameState): boolean {
  const signatures = existingTradeSignatures(state);
  const rankedTeams = rankedDeadlineTeams(state, [state.userTeamId]);

  for (const fromTeamId of rankedTeams) {
    for (const toTeamId of rankedTeams) {
      if (fromTeamId === toTeamId) {
        continue;
      }

      const fallback = buildFallbackTradePackage(state, fromTeamId, toTeamId);
      if (!fallback) {
        continue;
      }

      const signature = tradeSignature(
        fromTeamId,
        toTeamId,
        fallback.offeringAssets,
        fallback.requestingAssets,
      );
      if (signatures.has(signature)) {
        continue;
      }

      const execution = executeAcceptedTrade(state, {
        id: `deadline-fallback-trade-${state.season}-${state.day}-${fromTeamId}-${toTeamId}`,
        fromTeamId,
        toTeamId,
        offeringAssets: fallback.offeringAssets,
        requestingAssets: fallback.requestingAssets,
      }, fallback.fairnessScore);
      advanceTradeSagaClimax(
        state,
        [...assetPlayerIds(fallback.offeringAssets), ...assetPlayerIds(fallback.requestingAssets)],
      );
      recordLeagueTradeNews(state, {
        id: `deadline-fallback-trade-${state.season}-${state.day}-${fromTeamId}-${toTeamId}`,
        fromTeamId,
        toTeamId,
        playersOffered: assetPlayerIds(fallback.offeringAssets),
        playersRequested: assetPlayerIds(fallback.requestingAssets),
        status: 'accepted',
        reason: 'deadline fallback',
      }, execution.relationshipNarrative);
      return true;
    }
  }

  return false;
}

function generateMonthlyTradeActivity(
  state: FullGameState,
  options: {
    userOfferRange?: readonly [number, number];
    aiTradeRange?: readonly [number, number];
    rumorRepeats?: number;
  } = {},
) {
  const { userCandidates, aiCandidates } = buildMonthlyTradeCandidates(state);
  const [userOfferMin, userOfferMax] = options.userOfferRange ?? [2, 4];
  const [aiTradeMin, aiTradeMax] = options.aiTradeRange ?? [1, 2];
  const rumorRepeats = options.rumorRepeats ?? 1;
  const userOfferTarget = state.rng.nextInt(userOfferMin, Math.max(userOfferMin, userOfferMax));

  for (const proposal of userCandidates.slice(0, userOfferTarget)) {
    for (let repeat = 0; repeat < rumorRepeats; repeat++) {
      recordTradeRumor(state, proposal);
    }
    const fairnessScore = fairValueForProposal(state, proposal);
    addPendingOffer(state, buildPersistentOffer(state, {
      ...proposal,
      offeringAssets: playerAssets(proposal.playersOffered),
      requestingAssets: playerAssets(proposal.playersRequested),
    }, fairnessScore));
  }

  const aiTradeTarget = state.rng.nextInt(aiTradeMin, Math.max(aiTradeMin, aiTradeMax));
  for (const proposal of aiCandidates.slice(0, aiTradeTarget)) {
    for (let repeat = 0; repeat < rumorRepeats; repeat++) {
      recordTradeRumor(state, proposal);
    }
    const gm = state.gmPersonalities.get(proposal.toTeamId);
    if (!gm || !playersStillMatchProposal(state, proposal)) continue;
    const result = evaluateTradeProposal(
      state.rng.fork(),
      proposal,
      getTeamPlayers(proposal.fromTeamId),
      getTeamPlayers(proposal.toTeamId),
      gm,
      isContender(state, proposal.toTeamId),
    );
    if (result.decision !== 'accepted') continue;

    const fairnessScore = fairValueForProposal(state, proposal);
    const execution = executeAcceptedTrade(state, {
      ...proposal,
      offeringAssets: playerAssets(proposal.playersOffered),
      requestingAssets: playerAssets(proposal.playersRequested),
    }, fairnessScore);
    advanceTradeSagaClimax(
      state,
      [...proposal.playersOffered, ...proposal.playersRequested],
    );
    recordLeagueTradeNews(state, proposal, execution.relationshipNarrative);
  }
}

function generateDeadlineTradeBurst(state: FullGameState) {
  const pendingOffersBefore = state.tradeState.pendingOffers.length;
  const tradeHistoryBefore = state.tradeState.tradeHistory.length;
  generateMonthlyTradeActivity(state, {
    userOfferRange: [3, 5],
    aiTradeRange: [3, 5],
    rumorRepeats: 4,
  });

  if (state.tradeState.pendingOffers.length === pendingOffersBefore) {
    createFallbackUserDeadlineOffer(state);
  }

  let fallbackTradesCreated = 0;
  while (
    state.tradeState.tradeHistory.length < tradeHistoryBefore + 3
    && fallbackTradesCreated < 3
  ) {
    if (!createFallbackLeagueDeadlineTrade(state)) {
      break;
    }
    fallbackTradesCreated += 1;
  }
}

export function processTradeMarketActivity(
  state: FullGameState,
  previousDay: number,
  currentDay: number,
) {
  pruneExpiredNegotiations(state);
  if (state.phase !== 'regular' || currentDay <= previousDay) {
    return;
  }

  if (previousDay <= TRADE_DEADLINE_DAY && currentDay > TRADE_DEADLINE_DAY) {
    const expiredOffers = [...state.tradeState.pendingOffers];
    tradeDeadlineRecapCache = buildDeadlineRecap(state, expiredOffers);
    if (tradeDeadlineRecapCache) {
      publishDeadlineAnalysis(state, tradeDeadlineRecapCache);
    }
    clearPendingTradeOffers(state);
  }

  const previousWindow = Math.floor((Math.max(previousDay, 1) - 1) / 30);
  const currentWindow = Math.floor((Math.max(currentDay, 1) - 1) / 30);
  for (let windowIndex = previousWindow + 1; windowIndex <= currentWindow; windowIndex++) {
    const windowStartDay = windowIndex * 30 + 1;
    if (windowStartDay > TRADE_DEADLINE_DAY) continue;
    generateMonthlyTradeActivity(state);
  }

  for (const checkpointDay of DEADLINE_ACTIVITY_CHECKPOINTS) {
    if (previousDay < checkpointDay && checkpointDay <= currentDay && checkpointDay <= TRADE_DEADLINE_DAY) {
      generateDeadlineTradeBurst(state);
    }
  }
}

export function recordAcceptedUserTrade(
  state: FullGameState,
  proposal: {
    id: string;
    fromTeamId: string;
    toTeamId: string;
    offeringAssets: TradeAsset[];
    requestingAssets: TradeAsset[];
  },
) {
  addTradeHistoryEntry(state, buildTradeHistoryEntry(
    state,
    proposal,
    compareAssetPackages(state, proposal.offeringAssets, proposal.requestingAssets, proposal.fromTeamId, proposal.toTeamId).fairness,
  ));
}

function validateTradeAssetsForTeam(
  state: FullGameState,
  teamId: string,
  assets: TradeAsset[],
): string | null {
  ensureDraftPickOwnership(state, state.season);

  for (const asset of assets) {
    if (asset.type === 'player') {
      const player = state.players.find((candidate) => candidate.id === asset.playerId);
      if (!player || player.teamId !== teamId) {
        return 'Trade package includes a player not controlled by that team.';
      }
      continue;
    }

    if (asset.type === 'draft_pick') {
      const pick = state.draftState.pickOwnership.find((entry) =>
        entry.season === asset.season
        && entry.round === asset.round
        && entry.originalTeamId === asset.originalTeamId,
      );
      if (!pick || pick.currentTeamId !== teamId || pick.forfeited) {
        return 'Trade package includes a draft pick not owned by that team.';
      }
      continue;
    }

    const budget = state.internationalScoutingState.budgets.get(teamId);
    if (!budget || getRemainingIFABudget(budget) < asset.amount) {
      return 'Trade package includes IFA pool space that exceeds the available balance.';
    }
  }

  return null;
}

function hasNonPlayerAssets(assets: TradeAsset[]): boolean {
  return assets.some((asset) => asset.type !== 'player');
}

export function proposeTradePackage(
  state: FullGameState,
  offeringAssets: TradeAsset[],
  requestingAssets: TradeAsset[],
  toTeamId: string,
) {
  if (!isTradeMarketOpen(state)) {
    return { decision: 'rejected', reason: 'Trade market closed — reopens in offseason' };
  }

  const gm = state.gmPersonalities.get(toTeamId);
  if (!gm) {
    return { decision: 'rejected', reason: 'Unknown team' };
  }

  const offeredValidation = validateTradeAssetsForTeam(state, state.userTeamId, offeringAssets);
  if (offeredValidation) {
    return { decision: 'rejected', reason: offeredValidation };
  }

  const requestedValidation = validateTradeAssetsForTeam(state, toTeamId, requestingAssets);
  if (requestedValidation) {
    return { decision: 'rejected', reason: requestedValidation };
  }

  const preTradeUserPlayers = getTeamPlayers(state.userTeamId);
  const preTradePartnerPlayers = getTeamPlayers(toTeamId);
  const playerOnlyProposal: TradeProposal = {
    id: `user-${timestamp()}`,
    fromTeamId: state.userTeamId,
    toTeamId,
    playersOffered: assetPlayerIds(offeringAssets),
    playersRequested: assetPlayerIds(requestingAssets),
    status: 'proposed',
    reason: '',
  };

  const fairnessScore = compareAssetPackages(state, offeringAssets, requestingAssets, state.userTeamId, toTeamId).fairness;
  const usesNonPlayerAssets = hasNonPlayerAssets(offeringAssets) || hasNonPlayerAssets(requestingAssets);
  const evaluation = usesNonPlayerAssets
    ? {
      decision: (-fairnessScore >= -10 ? 'accepted' : 'rejected') as 'accepted' | 'rejected',
      reason: -fairnessScore >= -10 ? 'The value framework works for us.' : 'The value gap is too wide for us.',
      counter: undefined,
    }
    : evaluateTradeProposal(
      state.rng.fork(),
      playerOnlyProposal,
      preTradeUserPlayers,
      preTradePartnerPlayers,
      gm,
      false,
    );
  const result = applyUserFrontOfficeTradeOverride(evaluation, fairnessScore);

  if (result.decision === 'accepted') {
    const execution = executeAcceptedTrade(state, {
      id: playerOnlyProposal.id,
      fromTeamId: state.userTeamId,
      toTeamId,
      offeringAssets,
      requestingAssets,
    }, fairnessScore);
    advanceTradeSagaClimax(
      state,
      [...assetPlayerIds(offeringAssets), ...assetPlayerIds(requestingAssets)],
    );
    applyTradeConsequences(
      state,
      assetPlayerIds(offeringAssets),
      assetPlayerIds(requestingAssets),
      toTeamId,
      preTradeUserPlayers,
      preTradePartnerPlayers,
    );
    recordLeagueTradeNews(state, {
      ...playerOnlyProposal,
      status: 'accepted',
      reason: result.reason,
    }, execution.relationshipNarrative);
  }

  return {
    decision: result.decision,
    reason: result.reason,
    counter: result.counter
      ? {
        ...result.counter,
        offeringAssets: playerAssets(result.counter.playersOffered),
        requestingAssets: playerAssets(result.counter.playersRequested),
      }
      : undefined,
  };
}

export function startNegotiation(
  state: FullGameState,
  offeringAssets: TradeAsset[],
  requestingAssets: TradeAsset[],
  toTeamId: string,
): TradeNegotiationActionResult {
  if (!isTradeMarketOpen(state)) {
    return {
      success: false,
      decision: 'rejected',
      message: 'Trade market closed — reopens in offseason',
      negotiation: null,
      tradeExecuted: false,
    };
  }

  const gm = state.gmPersonalities.get(toTeamId);
  if (!gm) {
    return {
      success: false,
      decision: 'rejected',
      message: 'Unknown team',
      negotiation: null,
      tradeExecuted: false,
    };
  }

  const offeredValidation = validateTradeAssetsForTeam(state, state.userTeamId, offeringAssets);
  if (offeredValidation) {
    return {
      success: false,
      decision: 'rejected',
      message: offeredValidation,
      negotiation: null,
      tradeExecuted: false,
    };
  }

  const requestedValidation = validateTradeAssetsForTeam(state, toTeamId, requestingAssets);
  if (requestedValidation) {
    return {
      success: false,
      decision: 'rejected',
      message: requestedValidation,
      negotiation: null,
      tradeExecuted: false,
    };
  }

  if (hasNonPlayerAssets(offeringAssets) || hasNonPlayerAssets(requestingAssets)) {
    const directResult = proposeTradePackage(state, offeringAssets, requestingAssets, toTeamId);
    return {
      success: directResult.decision !== 'rejected',
      decision: directResult.decision === 'countered'
        ? 'countered'
        : directResult.decision === 'accepted'
          ? 'accepted'
          : 'rejected',
      message: directResult.reason,
      negotiation: null,
      tradeExecuted: directResult.decision === 'accepted',
    };
  }

  const liveState = initiateNegotiation(
    state.rng.fork(),
    {
      fromTeamId: state.userTeamId,
      toTeamId,
      offering: assetPlayerIds(offeringAssets),
      requesting: assetPlayerIds(requestingAssets),
      valuationGap: 0,
    },
    {
      currentDay: state.day,
      fromTeamPlayers: getTeamPlayers(state.userTeamId),
      toTeamPlayers: getTeamPlayers(toTeamId),
    },
    getRelationship(state.gmRelationships, toTeamId),
    gm,
  );

  if (!isNegotiationComplete(liveState) || liveState.phase === 'accepted') {
    upsertNegotiation(state, liveState);
  }

  return {
    success: liveState.phase !== 'rejected',
    decision:
      liveState.phase === 'accepted'
        ? 'accepted'
        : liveState.phase === 'rejected'
          ? 'rejected'
          : liveState.phase.startsWith('counter')
            ? 'countered'
            : 'pending',
    message: liveState.dialogue[liveState.dialogue.length - 1]?.text ?? 'Negotiation opened.',
    negotiation: buildNegotiationView(state, liveState),
    tradeExecuted: false,
  };
}

export function advanceNegotiationSession(
  state: FullGameState,
  negotiationId: string,
  counterPackage: TradeCounterPackage,
): TradeNegotiationActionResult {
  const persistent = state.tradeState.negotiations.find((entry) => entry.id === negotiationId);
  if (!persistent) {
    return {
      success: false,
      decision: 'dead',
      message: 'Negotiation no longer exists.',
      negotiation: null,
      tradeExecuted: false,
    };
  }

  const gm = state.gmPersonalities.get(persistent.proposal.toTeamId) ?? 'analytical';
  const liveState = hydrateNegotiationState(state, persistent);
  const nextState = advanceTradeNegotiation(
    state.rng.fork(),
    liveState,
    {
      action: 'counter',
      proposal: {
        fromTeamId: state.userTeamId,
        toTeamId: persistent.proposal.toTeamId,
        offering: assetPlayerIds(counterPackage.offeringAssets),
        requesting: assetPlayerIds(counterPackage.requestingAssets),
        valuationGap: 0,
      },
      context: {
        currentDay: state.day,
        fromTeamPlayers: getTeamPlayers(state.userTeamId),
        toTeamPlayers: getTeamPlayers(persistent.proposal.toTeamId),
        protectedPlayerIds: [...persistent.context.protectedPlayerIds],
        unavailablePlayerIds: [...persistent.context.unavailablePlayerIds],
      },
    },
    getRelationship(state.gmRelationships, persistent.proposal.toTeamId),
    gm,
  );

  if (isNegotiationComplete(nextState) && nextState.phase !== 'accepted') {
    removeNegotiation(state, negotiationId);
  } else {
    upsertNegotiation(state, nextState);
  }

  return {
    success: nextState.phase !== 'rejected' && nextState.phase !== 'dead',
    decision:
      nextState.phase === 'accepted'
        ? 'accepted'
        : nextState.phase === 'rejected'
          ? 'rejected'
          : nextState.phase === 'dead'
            ? 'dead'
            : nextState.phase.startsWith('counter')
              ? 'countered'
              : 'pending',
    message: nextState.dialogue[nextState.dialogue.length - 1]?.text ?? 'Negotiation updated.',
    negotiation: isNegotiationComplete(nextState) && nextState.phase !== 'accepted'
      ? null
      : buildNegotiationView(state, nextState),
    tradeExecuted: false,
  };
}

export function resolveNegotiationSession(
  state: FullGameState,
  negotiationId: string,
  action: 'accept' | 'reject',
): TradeNegotiationActionResult {
  const persistent = state.tradeState.negotiations.find((entry) => entry.id === negotiationId);
  if (!persistent) {
    return {
      success: false,
      decision: 'dead',
      message: 'Negotiation no longer exists.',
      negotiation: null,
      tradeExecuted: false,
    };
  }

  const gm = state.gmPersonalities.get(persistent.proposal.toTeamId) ?? 'analytical';
  let liveState = hydrateNegotiationState(state, persistent);
  if (!isNegotiationComplete(liveState)) {
    liveState = advanceTradeNegotiation(
      state.rng.fork(),
      liveState,
      {
        action,
        context: hydrateNegotiationContext(state, persistent),
      },
      getRelationship(state.gmRelationships, persistent.proposal.toTeamId),
      gm,
    );
  }

  const outcome = resolveTradeNegotiation(liveState);
  removeNegotiation(state, negotiationId);

  if (outcome.accepted) {
    finalizeNegotiatedTrade(state, liveState);
  }

  return {
    success: outcome.accepted,
    decision: outcome.accepted ? 'accepted' : liveState.phase === 'dead' ? 'dead' : 'rejected',
    message: outcome.narrative,
    negotiation: null,
    tradeExecuted: outcome.accepted,
  };
}

export function respondToTradeOffer(
  state: FullGameState,
  offerId: string,
  action: 'accept' | 'decline' | 'counter',
  counterPackage?: TradeCounterPackage,
): TradeOfferResponseResult {
  const offer = state.tradeState.pendingOffers.find((candidate) => candidate.id === offerId);
  if (!offer) {
    return { success: false, decision: 'rejected', message: 'Trade offer no longer exists.' };
  }

  const proposal: TradeProposal = {
    id: offer.id,
    fromTeamId: offer.fromTeamId,
    toTeamId: offer.toTeamId,
    playersOffered: assetPlayerIds(offer.offeringAssets),
    playersRequested: assetPlayerIds(offer.requestingAssets),
    status: 'proposed',
    reason: offer.message,
  };
  const offerPlayerIds = assetPlayerIds(offer.offeringAssets);
  const requestedPlayerIds = assetPlayerIds(offer.requestingAssets);

  if (action === 'decline') {
    removePendingOffer(state, offerId);
    applyDeclineMorale(state, requestedPlayerIds);
    pushNewsAndBriefing(
      state,
      `${teamName(offer.fromTeamId)} offer declined`,
      `${teamName(state.userTeamId)} declined a trade proposal involving ${assetViewFor(state, offer.requestingAssets[0] ?? { type: 'ifa_pool_space', amount: 0.01 }).label}.`,
      [...offerPlayerIds, ...requestedPlayerIds],
      [offer.fromTeamId, offer.toTeamId],
    );
    return {
      success: true,
      decision: 'declined',
      message: 'Offer declined and the room took note.',
    };
  }

  if (action === 'accept') {
    if (!isTradeMarketOpen(state) || !playersStillMatchProposal(state, proposal)) {
      removePendingOffer(state, offerId);
      return {
        success: false,
        decision: 'rejected',
        message: 'That offer is no longer actionable.',
      };
    }

    const preTradeUserPlayers = getTeamPlayers(state.userTeamId);
    const preTradePartnerPlayers = getTeamPlayers(offer.fromTeamId);
    const execution = executeAcceptedTrade(state, {
      id: proposal.id,
      fromTeamId: proposal.fromTeamId,
      toTeamId: proposal.toTeamId,
      offeringAssets: offer.offeringAssets,
      requestingAssets: offer.requestingAssets,
    }, offer.fairnessScore);
    removePendingOffer(state, offerId);
    advanceTradeSagaClimax(
      state,
      [...requestedPlayerIds, ...offerPlayerIds],
    );
    applyTradeConsequences(
      state,
      requestedPlayerIds,
      offerPlayerIds,
      offer.fromTeamId,
      preTradeUserPlayers,
      preTradePartnerPlayers,
    );
    recordLeagueTradeNews(state, {
      ...proposal,
      status: 'accepted',
      reason: 'offer accepted',
    }, execution.relationshipNarrative);
    return {
      success: true,
      decision: 'accepted',
      message: 'Trade accepted.',
    };
  }

  if (!counterPackage || !isTradeMarketOpen(state)) {
    return {
      success: false,
      decision: 'rejected',
      message: 'Counter-offer could not be sent.',
    };
  }

  const counterProposal: TradeProposal = {
    id: offer.id,
    fromTeamId: state.userTeamId,
    toTeamId: offer.fromTeamId,
    playersOffered: assetPlayerIds(counterPackage.offeringAssets),
    playersRequested: assetPlayerIds(counterPackage.requestingAssets),
    status: 'proposed',
    reason: 'Counter-offer from user GM',
  };

  const gm = state.gmPersonalities.get(offer.fromTeamId);
  if (!gm) {
    return { success: false, decision: 'rejected', message: 'Unable to reach the other front office.' };
  }

  const usesNonPlayerAssets = hasNonPlayerAssets(counterPackage.offeringAssets) || hasNonPlayerAssets(counterPackage.requestingAssets);
  const counterFairness = compareAssetPackages(
    state,
    counterPackage.offeringAssets,
    counterPackage.requestingAssets,
    state.userTeamId,
    offer.fromTeamId,
  ).fairness;
  const evaluation = usesNonPlayerAssets
    ? {
      decision: (-counterFairness >= -10
        ? 'accepted'
        : 'rejected') as 'accepted' | 'rejected',
      reason: 'Counter framework evaluated.',
      counter: undefined,
    }
    : evaluateTradeProposal(
      state.rng.fork(),
      counterProposal,
      getTeamPlayers(state.userTeamId),
      getTeamPlayers(offer.fromTeamId),
      gm,
      isContender(state, offer.fromTeamId),
    );
  const result = applyUserFrontOfficeTradeOverride(evaluation, counterFairness);

  removePendingOffer(state, offerId);

  if (result.decision === 'accepted') {
    const preTradeUserPlayers = getTeamPlayers(state.userTeamId);
    const preTradePartnerPlayers = getTeamPlayers(offer.fromTeamId);
    const fairnessScore = compareAssetPackages(
      state,
      counterPackage.offeringAssets,
      counterPackage.requestingAssets,
      state.userTeamId,
      offer.fromTeamId,
    ).fairness;
    const execution = executeAcceptedTrade(state, {
      id: counterProposal.id,
      fromTeamId: counterProposal.fromTeamId,
      toTeamId: counterProposal.toTeamId,
      offeringAssets: counterPackage.offeringAssets,
      requestingAssets: counterPackage.requestingAssets,
    }, fairnessScore);
    advanceTradeSagaClimax(
      state,
      [...counterProposal.playersOffered, ...counterProposal.playersRequested],
    );
    applyTradeConsequences(
      state,
      counterProposal.playersOffered,
      counterProposal.playersRequested,
      counterProposal.toTeamId,
      preTradeUserPlayers,
      preTradePartnerPlayers,
    );
    recordLeagueTradeNews(state, {
      ...counterProposal,
      status: 'accepted',
      reason: 'counter accepted',
    }, execution.relationshipNarrative);
    return {
      success: true,
      decision: 'accepted',
      message: 'Counter-offer accepted.',
    };
  }

  if (result.decision === 'countered' && result.counter) {
    const fairnessScore = fairValueForProposal(state, result.counter);
    addPendingOffer(state, buildPersistentOffer(state, {
      ...result.counter,
      offeringAssets: playerAssets(result.counter.playersOffered),
      requestingAssets: playerAssets(result.counter.playersRequested),
    }, fairnessScore));
    pushNewsAndBriefing(
      state,
      `${teamName(offer.fromTeamId)} countered back`,
      `${teamName(offer.fromTeamId)} sent a revised trade framework back to ${teamName(state.userTeamId)}.`,
      [...result.counter.playersOffered, ...result.counter.playersRequested],
      [result.counter.fromTeamId, result.counter.toTeamId],
    );
    return {
      success: true,
      decision: 'countered',
      message: 'The other GM sent a revised proposal.',
    };
  }

  pushNewsAndBriefing(
    state,
    `${teamName(offer.fromTeamId)} walked away from talks`,
    `${teamName(offer.fromTeamId)} rejected the counter-offer.`,
    [...counterProposal.playersOffered, ...counterProposal.playersRequested],
    [offer.fromTeamId, state.userTeamId],
  );
  return {
    success: true,
    decision: 'rejected',
    message: result.reason,
  };
}
